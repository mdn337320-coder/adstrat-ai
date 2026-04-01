
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import db from "./server/db.js";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable trust proxy for rate limiting behind Google Cloud Run/Nginx
app.set('trust proxy', 1);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET environment variable is missing. Using insecure fallback for development.");
  JWT_SECRET = "dev-secret-key-change-me-in-production";
}

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Vite dev
}));
app.use(cors());

// Body parser with limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Increased for development
  message: { error: "Too many attempts, try again later." }
});

// --- MIDDLEWARE ---
const auditLog = (userId: number | null, action: string, resource?: string, metadata?: any, ip?: string) => {
  try {
    db.prepare("INSERT INTO audit_logs (user_id, action, resource, metadata, ip_address) VALUES (?, ?, ?, ?, ?)")
      .run(userId, action, resource, metadata ? JSON.stringify(metadata) : null, ip);
  } catch (e) {
    console.error("Audit logging failed", e);
  }
};

const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as any;
    
    // Check if session is revoked
    const session = db.prepare("SELECT * FROM device_sessions WHERE user_id = ? AND token_id = ? AND is_revoked = 0").get(decoded.id, decoded.tokenId) as any;
    if (!session) {
      return res.status(401).json({ error: "Session expired or revoked" });
    }

    // Update last active
    db.prepare("UPDATE device_sessions SET last_active = CURRENT_TIMESTAMP WHERE id = ?").run(session.id);

    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const rbac = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!roles.includes(req.user?.role)) {
    auditLog(req.user?.id, "ACCESS_DENIED", req.originalUrl, { requiredRoles: roles });
    return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
  }
  next();
};

const isAdmin = rbac(['admin', 'super_admin']);

// --- AUTH ROUTES ---
app.post("/api/auth/register", authLimiter, async (req, res) => {
  const { email } = req.body;
  try {
    const result = db.prepare("INSERT INTO users (email) VALUES (?)").run(email);
    const userId = result.lastInsertRowid as number;
    
    const tokenId = Math.random().toString(36).substring(7);
    const token = jwt.sign({ id: userId, email, role: 'user', tokenId }, JWT_SECRET!, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ id: userId, tokenId }, JWT_SECRET!, { expiresIn: "30d" });
    
    db.prepare("INSERT INTO device_sessions (user_id, token_id, ip_address) VALUES (?, ?, ?)").run(userId, tokenId, req.ip);
    db.prepare("UPDATE users SET refresh_token = ? WHERE id = ?").run(refreshToken, userId);
    
    auditLog(userId, "USER_REGISTERED", "auth", { email });
    res.json({ token, refreshToken, user: { id: userId, email, role: 'user' } });
  } catch (e: any) {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND deleted_at IS NULL").get(email) as any;
  
  if (user) {
    const tokenId = Math.random().toString(36).substring(7);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, tokenId }, JWT_SECRET!, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ id: user.id, tokenId }, JWT_SECRET!, { expiresIn: "30d" });
    
    db.prepare("INSERT INTO device_sessions (user_id, token_id, ip_address) VALUES (?, ?, ?)").run(user.id, tokenId, req.ip);
    db.prepare("UPDATE users SET refresh_token = ? WHERE id = ?").run(refreshToken, user.id);
    
    auditLog(user.id, "USER_LOGIN", "auth", { ip: req.ip });
    res.json({ token, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
  } else {
    auditLog(null, "LOGIN_FAILED", "auth", { email, ip: req.ip });
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: "Refresh token required" });
  
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET!) as any;
    const user = db.prepare("SELECT * FROM users WHERE id = ? AND refresh_token = ? AND deleted_at IS NULL").get(decoded.id, refreshToken) as any;
    
    if (!user) return res.status(401).json({ error: "Invalid refresh token" });
    
    const newTokenId = Math.random().toString(36).substring(7);
    const newToken = jwt.sign({ id: user.id, email: user.email, role: user.role, tokenId: newTokenId }, JWT_SECRET!, { expiresIn: "1h" });
    const newRefreshToken = jwt.sign({ id: user.id, tokenId: newTokenId }, JWT_SECRET!, { expiresIn: "30d" });
    
    db.prepare("INSERT INTO device_sessions (user_id, token_id, ip_address) VALUES (?, ?, ?)").run(user.id, newTokenId, req.ip);
    db.prepare("UPDATE users SET refresh_token = ? WHERE id = ?").run(newRefreshToken, user.id);
    
    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (e) {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

app.post("/api/auth/logout", authenticate, (req: any, res) => {
  db.prepare("UPDATE device_sessions SET is_revoked = 1 WHERE user_id = ? AND token_id = ?").run(req.user.id, req.user.tokenId);
  auditLog(req.user.id, "USER_LOGOUT", "auth");
  res.json({ success: true });
});

app.post("/api/auth/promote", async (req, res) => {
  const { email, secret } = req.body;
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  
  if (!adminSecret || secret !== adminSecret) {
    auditLog(null, "UNAUTHORIZED_PROMOTION_ATTEMPT", "admin", { email });
    return res.status(403).json({ error: "Invalid or missing secret key" });
  }
  
  const result = db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);
  if (result.changes > 0) {
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;
    auditLog(user.id, "USER_PROMOTED_TO_ADMIN", "admin");
    res.json({ success: true, message: `${email} is now an admin. Please re-login.` });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// --- ADMIN ROUTES ---
app.get("/api/admin/stats", authenticate, isAdmin, async (req: any, res) => {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL").get() as any;
  const recentAuditLogs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 20").all();
  res.json({ userCount: userCount.count, recentLogs: recentAuditLogs });
});

app.get("/api/admin/users", authenticate, isAdmin, (req: any, res) => {
  const users = db.prepare("SELECT id, email, role, created_at FROM users WHERE deleted_at IS NULL").all();
  res.json(users);
});

app.delete("/api/admin/users/:id", authenticate, rbac(['super_admin']), (req: any, res) => {
  db.prepare("UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  auditLog(req.user.id, "USER_SOFT_DELETE", "user", { targetId: req.params.id });
  res.json({ success: true });
});

app.post("/api/admin/promote", authenticate, rbac(['super_admin']), async (req: any, res) => {
  const { email, role } = req.body;
  if (!['admin', 'super_admin'].includes(role)) return res.status(400).json({ error: "Invalid role" });
  
  const result = db.prepare("UPDATE users SET role = ? WHERE email = ?").run(role, email);
  if (result.changes > 0) {
    auditLog(req.user.id, "USER_PROMOTED", "admin", { email, role });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// --- CREATIVE STUDIO ROUTES ---
app.post("/api/creative/generate", authenticate, async (req: any, res) => {
  const { productName, productImage, inspirationImage, type, quality } = req.body;
  
  try {
    const jobId = db.prepare(`
      INSERT INTO creative_jobs (user_id, product_name, status, product_image, inspiration_image, type, quality)
      VALUES (?, ?, 'pending', ?, ?, ?, ?)
    `).run(req.user.id, productName, productImage, inspirationImage, type || 'variant', quality || 'studio').lastInsertRowid;

    res.json({ jobId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/creative/jobs/pending", authenticate, (req: any, res) => {
  // Get one pending job to process (Client-side worker pattern)
  const job = db.prepare("SELECT * FROM creative_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1").get() as any;
  res.json(job || null);
});

app.get("/api/creative/jobs/:id", authenticate, (req: any, res) => {
  const job = db.prepare("SELECT * FROM creative_jobs WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id) as any;
  if (!job) return res.status(404).json({ error: "Job not found" });
  
  const assets = db.prepare("SELECT * FROM creative_assets WHERE job_id = ?").all(job.id);
  res.json({ ...job, assets });
});

app.post("/api/creative/complete", authenticate, async (req: any, res) => {
  const { jobId, assets, error } = req.body;
  try {
    const job = db.prepare("SELECT * FROM creative_jobs WHERE id = ? AND user_id = ?").get(jobId, req.user.id) as any;
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (error) {
      db.prepare("UPDATE creative_jobs SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(error, jobId);
      return res.json({ success: true });
    }

    db.prepare("UPDATE creative_jobs SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(jobId);

    if (Array.isArray(assets)) {
      for (const assetUrl of assets) {
        db.prepare(`
          INSERT INTO creative_assets (job_id, user_id, storage_path, mime_type)
          VALUES (?, ?, ?, ?)
        `).run(jobId, req.user.id, assetUrl, 'image/png');
      }
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: "Chat rate limit exceeded" }
});

app.get("/api/chat/conversations", authenticate, (req: any, res) => {
  const conversations = db.prepare("SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC").all(req.user.id);
  res.json(conversations);
});

app.post("/api/chat/conversations", authenticate, (req: any, res) => {
  const { title } = req.body;
  const result = db.prepare("INSERT INTO conversations (user_id, title) VALUES (?, ?)").run(req.user.id, title || "New Conversation");
  res.json({ id: result.lastInsertRowid, title: title || "New Conversation" });
});

app.get("/api/chat/conversations/:id", authenticate, (req: any, res) => {
  const conversation = db.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id) as any;
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });
  
  const messages = db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(req.params.id);
  res.json({ ...conversation, messages });
});

app.post("/api/chat/messages", authenticate, chatLimiter, (req: any, res) => {
  const { conversationId, role, content } = req.body;
  
  // Verify ownership
  const conversation = db.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?").get(conversationId, req.user.id);
  if (!conversation) return res.status(403).json({ error: "Forbidden" });
  
  db.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)").run(conversationId, role, content);
  db.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conversationId);
  
  res.json({ success: true });
});

app.delete("/api/chat/conversations/:id", authenticate, (req: any, res) => {
  // Verify ownership first
  const conversation = db.prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });

  // Delete child records first to satisfy foreign key constraints
  db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(req.params.id);
  db.prepare("DELETE FROM strategy_profiles WHERE conversation_id = ?").run(req.params.id);
  
  // Finally delete the conversation
  const result = db.prepare("DELETE FROM conversations WHERE id = ?").run(req.params.id);
  
  res.json({ success: true });
});

// --- STRATEGY PROFILE ROUTES ---
const STRATEGY_STEPS = [
  { id: 1, field: 'niche', question: "What is your brand's niche? (e.g., Luxury Skincare, Streetwear, Fast Fashion)", validation: (v: string) => v.length > 2 },
  { id: 2, field: 'aov', question: "What is your Average Order Value (AOV) in USD?", validation: (v: any) => !isNaN(parseFloat(v)) && parseFloat(v) > 0 },
  { id: 3, field: 'country', question: "Which primary country are you targeting?", validation: (v: string) => v.length > 1 },
  { id: 4, field: 'goal', question: "What is your primary goal? (e.g., Scaling Sales, Launching New Collection, Liquidating Stock)", validation: (v: string) => v.length > 3 },
  { id: 5, field: 'monthly_budget', question: "What is your estimated monthly ad budget in USD?", validation: (v: any) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0 },
  { id: 6, field: 'demographic', question: "Describe your ideal customer demographic (Age, Gender, Interests).", validation: (v: string) => v.length > 5 },
  { id: 7, field: 'creative_assets', question: "What creative assets do you have available? (e.g., Professional Video, UGC, High-res Stills)", validation: (v: string) => v.length > 2 },
];

app.get("/api/strategy/profile", authenticate, (req: any, res) => {
  let profile = db.prepare("SELECT * FROM strategy_profiles WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1").get(req.user.id) as any;
  
  if (!profile) {
    // Create a new conversation and profile if none exists
    const conv = db.prepare("INSERT INTO conversations (user_id, title) VALUES (?, ?)").run(req.user.id, "Strategy Session");
    const result = db.prepare("INSERT INTO strategy_profiles (user_id, conversation_id) VALUES (?, ?)").run(req.user.id, conv.lastInsertRowid);
    profile = db.prepare("SELECT * FROM strategy_profiles WHERE id = ?").get(result.lastInsertRowid);
  }
  
  const currentStepData = STRATEGY_STEPS.find(s => s.id === profile.current_step);
  res.json({ profile, nextStep: currentStepData });
});

app.post("/api/strategy/answer", authenticate, (req: any, res) => {
  const { answer } = req.body;
  const profile = db.prepare("SELECT * FROM strategy_profiles WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1").get(req.user.id) as any;
  
  if (!profile || profile.status !== 'collecting') {
    return res.status(400).json({ error: "No active collection session" });
  }
  
  const step = STRATEGY_STEPS.find(s => s.id === profile.current_step);
  if (!step) return res.status(400).json({ error: "Invalid step" });
  
  if (!step.validation(answer)) {
    return res.status(400).json({ error: "Invalid answer format" });
  }
  
  const nextStep = profile.current_step + 1;
  const completionScore = Math.round((profile.current_step / STRATEGY_STEPS.length) * 100);
  const status = nextStep > STRATEGY_STEPS.length ? 'ready' : 'collecting';
  
  db.prepare(`
    UPDATE strategy_profiles 
    SET ${step.field} = ?, current_step = ?, completion_score = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(answer, nextStep, completionScore, status, profile.id);
  
  // Log message to conversation
  db.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)").run(profile.conversation_id, 'user', answer);
  
  const updatedProfile = db.prepare("SELECT * FROM strategy_profiles WHERE id = ?").get(profile.id) as any;
  const nextStepData = STRATEGY_STEPS.find(s => s.id === updatedProfile.current_step);
  
  if (status === 'ready') {
    db.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)")
      .run(profile.conversation_id, 'assistant', "Profile complete. Synthesis engine ready. Triggering generation...");
  } else if (nextStepData) {
    db.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)")
      .run(profile.conversation_id, 'assistant', nextStepData.question);
  }

  res.json({ profile: updatedProfile, nextStep: nextStepData });
});

app.post("/api/strategy/save", authenticate, (req: any, res) => {
  const { profileId, strategy } = req.body;
  db.prepare("UPDATE strategy_profiles SET generated_strategy = ?, status = 'generated', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?")
    .run(strategy, profileId, req.user.id);
  res.json({ success: true });
});

// --- BILLING ROUTES ---
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthly_price: 0,
    yearly_price: 0,
    quota_limit: 50,
    features: ['Standard Quality AI Generation', 'Basic Strategy Synthesis', 'Community Support', 'Web Dashboard']
  },
  {
    id: 'pro',
    name: 'Professional',
    monthly_price: 4900,
    yearly_price: 39000,
    quota_limit: 500,
    features: ['Studio Quality AI Generation', 'Advanced Neural Strategy', 'Priority Support', 'Custom Branding', 'API Access']
  },
  {
    id: 'elite',
    name: 'Elite',
    monthly_price: 19900,
    yearly_price: 159000,
    quota_limit: 2500,
    features: ['Unlimited Studio Renders', 'Dedicated Account Partner', 'White-labeling', 'Custom AI Training', 'On-premise Options']
  }
];

app.get("/api/billing/plans", (req, res) => {
  res.json(PLANS);
});

app.post("/api/billing/checkout", authenticate, (req: any, res) => {
  const { planId, interval } = req.body;
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  // Mock checkout URL
  res.json({ url: `${process.env.APP_URL || ''}/billing/success?session_id=mock_session_${Date.now()}` });
});

app.get("/api/billing/subscription", authenticate, (req: any, res) => {
  // Mock subscription data
  res.json({
    planId: 'starter',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false
  });
});

// --- SITE AUDITOR ROUTES ---
app.post("/api/audit/analyze", authenticate, async (req: any, res) => {
  // Audits are now handled on the client side.
  res.status(404).json({ error: "Use client-side GeminiService for audits." });
});

// --- VIRAL PULSE ROUTES ---
app.get("/api/viral/trends", authenticate, async (req: any, res) => {
  // Trends are now handled on the client side.
  res.status(404).json({ error: "Use client-side GeminiService for trends." });
});

// --- GLOBAL ERROR HANDLER ---
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global Error:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error",
    status
  });
});

// --- API 404 HANDLER ---
app.use("/api/*all", (req, res) => {
  res.status(404).json({ error: "API Route Not Found" });
});

async function startServer() {
  console.log("SERVER.TS: Initializing server...");
  try {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*all", (req, res) => res.sendFile(path.join(distPath, "index.html")));
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`SERVER.TS: Server successfully running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("SERVER.TS: FAILED TO START SERVER:", error);
  }
}

startServer().catch(err => {
  console.error("SERVER.TS: Unhandled error in startServer:", err);
});
