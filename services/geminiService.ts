import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Message, AuditResult } from "../types";

const SYSTEM_PROMPT = `
You are the "PROXIMA-7" Lead Partner. Your goal is to scale clothing/beauty brands with Meta Ads.

EXECUTIVE PROTOCOL:
- Tone: Professional, data-driven, direct.
- Rules: 
  1. Ask 10 questions to build a profile.
  2. After Q10, always wrap your strategy in a CLEAR JSON BLOCK using the format: \`\`\`json { ... } \`\`\`.
  3. For Bangladesh, emphasize mobile-first and bKash/Nagad.

CRITICAL: If generating an audit or strategy, ensure the JSON is valid and complete.
`;

export class GeminiService {
  private chat: any = null;
  private history: any[] = [];
  private conversationId: number | null = null;

  private getClient() {
    const apiKey = (import.meta as any).env?.VITE_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
    if (!apiKey) {
      console.error("GeminiService: No API key found in environment.");
    }
    return new GoogleGenAI({ apiKey });
  }

  private extractJson(text: string) {
    if (!text) return null;
    try {
      // Try direct parse first
      return JSON.parse(text);
    } catch (e) {
      try {
        // Fallback to regex for markdown blocks
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      } catch (e2) {
        console.error("JSON Parse Error", e2, "Raw text:", text);
      }
    }
    return null;
  }

  async generateStrategyFromProfile(profile: any): Promise<string> {
    const ai = this.getClient();
    const intelligenceRules = `
    INTELLIGENCE PROTOCOL:
    - IF AOV < 20 USD: Prioritize volume, broader audiences, lower CPA targets.
    - IF AOV 20-80 USD: Balanced testing approach.
    - IF AOV > 80 USD: Allow higher CPA, emphasize creative storytelling, longer learning phase.
    - IF Country is Bangladesh: Emphasize mobile-first, include bKash/Nagad payment considerations, adjust CPM expectations for local market.
    `;

    const prompt = `
    Generate a production-grade Ad Strategy JSON for the following brand profile:
    - Niche: ${profile.niche}
    - AOV: ${profile.aov} USD
    - Country: ${profile.country}
    - Goal: ${profile.goal}
    - Monthly Budget: ${profile.monthly_budget} USD
    - Demographic: ${profile.demographic}
    - Creative Assets: ${profile.creative_assets}

    ${intelligenceRules}

    Return ONLY a valid JSON object with this schema:
    {
      "campaign_structure": string,
      "creative_angles": string[],
      "budget_allocation": { "testing": string, "scaling": string },
      "targeting_parameters": string,
      "testing_plan": string,
      "scaling_rules": string
    }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              campaign_structure: { type: Type.STRING },
              creative_angles: { type: Type.ARRAY, items: { type: Type.STRING } },
              budget_allocation: { 
                type: Type.OBJECT, 
                properties: { 
                  testing: { type: Type.STRING }, 
                  scaling: { type: Type.STRING } 
                } 
              },
              targeting_parameters: { type: Type.STRING },
              testing_plan: { type: Type.STRING },
              scaling_rules: { type: Type.STRING }
            },
            required: ["campaign_structure", "creative_angles", "budget_allocation", "targeting_parameters", "testing_plan", "scaling_rules"]
          }
        }
      });
      return response.text || "";
    } catch (error: any) {
      this.handleApiError(error);
      throw error;
    }
  }

  async sendMessage(message: string): Promise<string> {
    const ai = this.getClient();
    if (!this.chat) {
      this.chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.7 },
        history: this.history
      });
    }
    try {
      const response: GenerateContentResponse = await this.chat.sendMessage({ message });
      return response.text || "";
    } catch (error: any) {
      this.handleApiError(error);
      throw error;
    }
  }

  setHistory(history: any[]) {
    this.history = history;
    this.chat = null;
  }

  setConversationId(id: number) {
    this.conversationId = id;
  }

  private handleApiError(error: any) {
    console.error("Gemini API Error:", error);
    const errorStr = JSON.stringify(error).toLowerCase();
    if (errorStr.includes('429') || errorStr.includes('quota')) throw new Error("QUOTA_EXCEEDED");
    if (errorStr.includes('401') || errorStr.includes('api_key')) throw new Error("KEY_INVALID");
    throw new Error("API_ERROR");
  }

  async getViralTrends(country: string = "Global"): Promise<{ trends: any[], sources: any[] }> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Identify 3 viral Meta ad trends for clothing/beauty in ${country} (${new Date().getFullYear()}). 
        Focus on localized patterns and high-converting hook architectures.`,
        config: { 
          tools: [{ googleSearch: {} }], 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              trends: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    hook_angle: { type: Type.STRING },
                    vibe_check: { type: Type.STRING },
                    relevance_score: { type: Type.NUMBER }
                  },
                  required: ["title", "category", "hook_angle", "vibe_check", "relevance_score"]
                }
              }
            },
            required: ["trends"]
          }
        },
      });
      
      const text = response.text || '{"trends": []}';
      const data = this.extractJson(text) || { trends: [] };
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks.filter(c => c.web).map(c => ({ title: c.web?.title || "Node", uri: c.web?.uri }));
      
      return { trends: data.trends, sources };
    } catch (error: any) {
      this.handleApiError(error);
      throw error;
    }
  }

  async runWebsiteAudit(url: string): Promise<AuditResult> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Audit ${url} for conversion leaks in clothing/beauty. 
        Focus on 'Kill' (leak points) and 'Shine' (advantages). 
        Identify trust deficits and performance bottlenecks.`,
        config: { 
          tools: [{ googleSearch: {} }], 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scores: {
                type: Type.OBJECT,
                properties: {
                  trust: { type: Type.NUMBER },
                  speed: { type: Type.NUMBER },
                  mobile: { type: Type.NUMBER },
                  conversion: { type: Type.NUMBER },
                  seo: { type: Type.NUMBER }
                },
                required: ["trust", "speed", "mobile", "conversion", "seo"]
              },
              weaknesses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    issue: { type: Type.STRING },
                    impact: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
                  },
                  required: ["title", "issue", "impact"]
                }
              },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              conversion_roadmap: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    step: { type: Type.STRING },
                    action: { type: Type.STRING },
                    expected_result: { type: Type.STRING }
                  },
                  required: ["step", "action", "expected_result"]
                }
              }
            },
            required: ["scores", "weaknesses", "suggestions", "conversion_roadmap"]
          }
        },
      });
      
      const result = this.extractJson(response.text || "{}");
      if (!result) throw new Error("PARSE_ERROR");
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks.filter(c => c.web).map(c => ({ title: c.web?.title || "Link", uri: c.web?.uri }));
      
      return { ...result, grounding_sources: sources };
    } catch (error: any) {
      this.handleApiError(error);
      throw error;
    }
  }

  async generateMoodboard(prompt: string): Promise<string> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: [{ text: `A professional commercial campaign moodboard: ${prompt}. Editorial fashion.` }] },
        config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
      });
      const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      return part?.inlineData?.data ? `data:image/png;base64,${part.inlineData.data}` : "";
    } catch (e) { return ""; }
  }

  async generateProductDescription(productName: string): Promise<string> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `High-conversion description for "${productName}".`,
      });
      return response.text || "";
    } catch (e) { throw e; }
  }

  async generateCreativeStudioImages(productImageBase64: string, productName: string, productDetails: string, mode: 'variant' | 'lifestyle' = 'variant', inspirationImageBase64?: string, quality: 'standard' | 'studio' = 'studio'): Promise<string[]> {
    const ai = this.getClient();
    const modelName = quality === 'studio' ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
    
    const productPart = {
      inlineData: {
        data: productImageBase64.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: "image/png"
      }
    };

    const fidelityInstruction = `CRITICAL: The uploaded product photo shows the EXACT product. Maintain 100% fidelity to:
- Product shape and silhouette
- Exact colors (do not alter any color)
- All text, logos, labels, branding
- Product proportions and scale
Only change: lighting, background, environment.
The product itself must be pixel-perfect identical to the uploaded photo.`;

    const qualityInstruction = quality === 'studio' ? "Ultra high resolution. Maximum detail. Print quality. 300 DPI equivalent." : "";

    const replacePlaceholders = (prompt: string) => {
      return prompt
        .replace(/\[PRODUCT_NAME\]/g, productName)
        .replace(/\[PRODUCT_DETAILS\]/g, productDetails);
    };

    let prompts: string[] = [];

    if (inspirationImageBase64) {
      // MODE B: Style Transfer
      const inspirationPart = {
        inlineData: {
          data: inspirationImageBase64.replace(/^data:image\/\w+;base64,/, ""),
          mimeType: "image/png"
        }
      };

      const basePrompt = `
        You are the AI engine for AdStrat AI's Creative Studio.
        MODE B — Style Transfer:
        - Image 1 = product photo (SACRED — NEVER ALTER IT).
        - Image 2 = style inspiration (extract only: lighting, background, color grading, mood, composition).
        - MISSION: Recreate the product from image 1 inside the visual world of image 2.
        
        ${fidelityInstruction}
        
        ${qualityInstruction}
      `;

      prompts = [
        `${basePrompt} Variant 1: Primary composition matching the inspiration mood. Hero shot.`,
        `${basePrompt} Variant 2: Alternative angle/composition while maintaining the inspiration style. Dynamic perspective.`,
        `${basePrompt} Variant 3: Close-up focus with the inspiration's lighting and color palette. Detail shot.`,
        `${basePrompt} Variant 4: Minimalist interpretation of the inspiration style.`
      ];

      try {
        const requests = prompts.map(p => ai.models.generateContent({
          model: modelName,
          contents: { parts: [productPart, inspirationPart, { text: p }] },
          config: { 
            imageConfig: { aspectRatio: "1:1", imageSize: quality === 'studio' ? "1K" : undefined },
            tools: quality === 'studio' ? [{ googleSearch: { searchTypes: { webSearch: {}, imageSearch: {} } } } as any] : undefined
          }
        }));
        const responses = await Promise.all(requests);
        return responses.map(r => {
          const p = r.candidates?.[0]?.content?.parts.find(part => part.inlineData);
          return p?.inlineData?.data ? `data:image/png;base64,${p.inlineData.data}` : "";
        }).filter(img => img !== "");
      } catch (e) { throw e; }

    } else {
      // MODE A: Professional Render
      const studioPrompt = `Professional commercial product photography. 
[PRODUCT_NAME], [PRODUCT_DETAILS]. 
Shot on Phase One IQ4 150MP medium format camera. 
Lens: Schneider Kreuznach 110mm f/2.8. 
Lighting: 3-point softbox setup — key light at 
45 degrees left, fill light at 1:3 ratio right, 
rim light behind for separation. 
Background: Pure white seamless paper #FFFFFF. 
Shadows: Soft natural drop shadow beneath product. 
Color grading: Neutral, accurate colors, 
slight warmth +200K. 
Style: Apple product photography, Zara e-commerce. 
Output: High resolution, razor sharp focus on product, 
zero background distractions. 
The product must be centered, fill 70% of frame. 
NO AI artifacts. NO distortion. 
Photorealistic — indistinguishable from real photography.`;

      const editorialPrompt = `High fashion editorial product photography for 
luxury magazine spread. 
[PRODUCT_NAME], [PRODUCT_DETAILS].
Shot on Hasselblad X2D 100C.
Lens: 90mm f/2.5.
Lighting: Single large octabox overhead, 
dramatic shadows, chiaroscuro effect. 
Deep contrast — shadows are true black, 
highlights are clean white.
Background: Dark charcoal #1a1a1a or deep navy, 
gradient to black at edges.
Mood: Vogue, Harper's Bazaar, luxury brand campaign.
Composition: Rule of thirds, product at intersection.
Post-processing: High contrast, slight desaturation 
except product colors which are vivid and accurate.
The product texture must be hyperdetailed — 
every thread, every grain visible.
NO AI look. Shot by Nick Knight or Harley Weir style.`;

      const lifestylePrompt = `Authentic lifestyle product photography.
[PRODUCT_NAME], [PRODUCT_DETAILS].
Shot on Sony A7R V, 50mm f/1.4 lens.
Natural window light from left — soft, diffused, 
golden hour warmth.
Setting: Clean minimal interior — white marble surface 
or light oak wood table, soft bokeh background.
Mood: Instagram worthy, aspirational but real.
Color palette: Warm whites, soft creams, natural tones.
Depth of field: Product sharp, background 
beautifully blurred f/1.4.
Style: Kinfolk magazine, @thefoundingfarmers aesthetic.
The scene feels lived-in and real — slight imperfections,
natural shadows, no artificial HDR.
People: None. Product only.
This should look like a real person took it, 
not AI generated.`;

      const minimalistPrompt = `Ultra minimalist luxury product photography.
[PRODUCT_NAME], [PRODUCT_DETAILS].
Shot on Leica M11, 35mm Summilux f/1.4.
Lighting: Single diffused light source — 
large window or 150cm softbox, feathered edge.
Background: Pure white or very light grey #F5F5F5.
Negative space: Product takes up only 40% of frame, 
surrounded by breathing room.
Shadow: One soft, elegant long shadow at 30 degrees.
Style: Jil Sander, Muji, Bottega Veneta campaigns.
Color: Achromatic everything except the product 
which retains its true colors.
This is the opposite of busy — 
one product, perfect light, nothing else.
The silence in this photo should be loud.`;

      const rawPrompts = [studioPrompt, editorialPrompt, lifestylePrompt, minimalistPrompt];
      
      prompts = rawPrompts.map(p => {
        let fullPrompt = replacePlaceholders(p);
        fullPrompt = `${fidelityInstruction}\n\n${fullPrompt}\n\n${qualityInstruction}`;
        return fullPrompt;
      });

      try {
        const requests = prompts.map(p => ai.models.generateContent({
          model: modelName,
          contents: { parts: [productPart, { text: p }] },
          config: { 
            imageConfig: { aspectRatio: "1:1", imageSize: quality === 'studio' ? "1K" : undefined },
            tools: quality === 'studio' ? [{ googleSearch: { searchTypes: { webSearch: {}, imageSearch: {} } } } as any] : undefined
          }
        }));
        const responses = await Promise.all(requests);
        return responses.map(r => {
          const p = r.candidates?.[0]?.content?.parts.find(part => part.inlineData);
          return p?.inlineData?.data ? `data:image/png;base64,${p.inlineData.data}` : "";
        }).filter(img => img !== "");
      } catch (e) { throw e; }
    }
  }
}
