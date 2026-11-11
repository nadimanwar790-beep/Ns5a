import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 5000;

  app.use(express.json());

  // API: Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API: Solve Math / Reasoning Question
  app.post("/api/ai/solve", async (req, res) => {
    try {
      const { question, language = "both", context } = req.body;
      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "Question is required" });
      }

      const ai = getAI();
      if (!ai) {
        return res.status(200).json({
          fallback: true,
          answer: "GEMINI_API_KEY is not configured in settings, but here are the general formulas and steps for your calculation.",
          formula: "Volume = depend on shape, e.g. Belan: πr²h, Ghan: a³, Ghanabh: l×b×h",
        });
      }

      const systemPrompt = `You are a world-class Indian competitive exam and school Math & Reasoning mentor (expert in Mensuration 3D, Cube Cutting Reasoning, Dice/पासा, Cube coloring, Belan/Cylinder, Sanku/Cone, Ghan/Cube, Ghanabh/Cuboid, Gola/Sphere).
Provide a crystal clear, step-by-step breakdown in Hindi (Devanagari/Hinglish) and English.
Include:
1. Short Concept Summary (मुख्य सिद्धांत)
2. Formulae used (सूत्र)
3. Step-by-step substitution and arithmetic (हल)
4. Fast Reasoning Shortcut / Trick (शॉर्टकट ट्रिक)
5. 3D Visualization hint (visual explanation of what happens in 3D).
Output clean, well-formatted text with clear bullet points.`;

      const prompt = `Context: ${context || "3D Geometry & Reasoning"}\nLanguage preference: ${language}\n\nQuestion / Problem: ${question}\n\nPlease provide detailed step-by-step solution with formulas, shortcuts, and 3D geometric intuition in Hindi and English.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      return res.json({
        success: true,
        answer: response.text || "No response generated.",
      });
    } catch (err: any) {
      console.error("AI Solver error:", err);
      return res.status(500).json({ error: err.message || "Failed to process question with AI" });
    }
  });

  // API: Generate Custom Practice Question
  app.post("/api/ai/generate-question", async (req, res) => {
    try {
      const { topic = "cube_cutting", difficulty = "medium" } = req.body;
      const ai = getAI();
      if (!ai) {
        return res.json({
          fallback: true,
          question: "A cube of 4 cm side painted red is cut into 1 cm cubes. Find total 1-face painted cubes.",
          options: ["16", "24", "8", "32"],
          correctIndex: 1,
          explanation: "Formula: 6 × (n - 2)² = 6 × (4 - 2)² = 6 × 4 = 24",
        });
      }

      const prompt = `Generate 1 multiple choice practice question for topic: "${topic}" (difficulty: ${difficulty}).
Topics can be:
- "cube_cutting": A painted cube cut into smaller cubes, asking for 3-face, 2-face, 1-face, or 0-face painted cubes.
- "cuboid_cutting": A cuboid with dimensions L x B x H cut into unit cubes.
- "dice_opposite": Finding opposite face on standard/ordinary dice with given positions.
- "open_dice": Unfolded dice net folding into cube.
- "mensuration_cylinder": Cylinder (बेलन) radius, height, volume, curved surface area.
- "mensuration_cone": Cone (शंकु) radius, height, slant height, volume, CSA, TSA.
- "mensuration_cuboid": Cuboid (घनाभ) length, breadth, height, diagonal, volume.

Format your response strictly as JSON with this structure:
{
  "questionHi": "Hindi question statement",
  "questionEn": "English question statement",
  "topic": "${topic}",
  "parameters": {
    "n": 4,
    "shape": "cube",
    "cuts": 4
  },
  "options": [
    "Option A",
    "Option B",
    "Option C",
    "Option D"
  ],
  "correctIndex": 0,
  "explanationHi": "Hindi step-by-step solution with shortcut formula",
  "explanationEn": "English step-by-step solution with formula"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const json = JSON.parse(response.text || "{}");
      return res.json({ success: true, data: json });
    } catch (err: any) {
      console.error("AI question generation error:", err);
      return res.status(500).json({ error: err.message || "Failed to generate question" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
