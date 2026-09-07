import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
config();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error("No GEMINI_API_KEY"); process.exit(1); }
const genAI = new GoogleGenerativeAI(apiKey);
const models = ["gemini-3.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
const prompt = { contents: [{ role: "user", parts: [{ text: "Say hello in 3 words." }] }] };
for (const modelName of models) {
  const m = genAI.getGenerativeModel({ model: modelName });
  const start = Date.now();
  try {
    const result = await m.generateContent(prompt);
    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    console.log(`✅ ${modelName}: "${text}" (${Date.now()-start}ms)`);
  } catch (e) {
    console.log(`❌ ${modelName}: ${e.message.split('\n')[0]}`);
  }
}
