import Database from 'better-sqlite3';
import path from 'path';

console.log("DB.TS: INITIALIZING DATABASE...");
const db = new Database('adstrat.db');
console.log("DB.TS: DATABASE OPENED.");

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    refresh_token TEXT,
    role TEXT DEFAULT 'user', -- 'user', 'admin', 'super_admin'
    last_login_ip TEXT,
    deleted_at DATETIME, -- Soft delete
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS device_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_id TEXT UNIQUE NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_revoked INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource TEXT,
    metadata TEXT, -- JSON
    ip_address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS creative_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'moodboard', 'variant'
    status TEXT DEFAULT 'queued', -- 'queued', 'processing', 'done', 'failed'
    prompt TEXT,
    seed INTEGER,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    product_image TEXT,
    inspiration_image TEXT,
    product_name TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS creative_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    storage_path TEXT NOT NULL, -- URL or path
    mime_type TEXT,
    metadata TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES creative_jobs(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS creative_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_asset_id INTEGER NOT NULL,
    asset_id INTEGER NOT NULL,
    variant_type TEXT,
    FOREIGN KEY(parent_asset_id) REFERENCES creative_assets(id),
    FOREIGN KEY(asset_id) REFERENCES creative_assets(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT DEFAULT 'New Conversation',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  
  CREATE TABLE IF NOT EXISTS strategy_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    conversation_id INTEGER NOT NULL,
    niche TEXT,
    aov REAL,
    country TEXT,
    goal TEXT,
    monthly_budget REAL,
    demographic TEXT,
    creative_assets TEXT,
    current_step INTEGER DEFAULT 1,
    completion_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'collecting', -- 'collecting', 'ready', 'generated'
    generated_strategy TEXT, -- JSON string
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
  );

  CREATE INDEX IF NOT EXISTS idx_strategy_profiles_user ON strategy_profiles(user_id);
  CREATE INDEX IF NOT EXISTS idx_strategy_profiles_conv ON strategy_profiles(conversation_id);

  -- Ensure columns exist for existing databases
  PRAGMA table_info(creative_jobs);
  -- SQLite doesn't have a clean 'IF NOT EXISTS' for ADD COLUMN, but we can try/catch in logic if needed
  -- For simplicity in this environment, we'll just try to add them
`);

try { db.exec("ALTER TABLE creative_jobs ADD COLUMN product_image TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE creative_jobs ADD COLUMN inspiration_image TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE creative_jobs ADD COLUMN product_name TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE creative_jobs ADD COLUMN quality TEXT DEFAULT 'studio';"); } catch(e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("DB.TS: SCHEMA INITIALIZED.");

export default db;
