import { GoogleGenerativeAI } from "@google/generative-ai";
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
console.log("Testing Gemini 3.5 Flash...");
const start = Date.now();
try {
  const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: "Say hello in 3 words." }] }] });
  const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  console.log("✅ Response:", text);
  console.log("✅ Latency:", Date.now() - start, "ms");
  process.exit(0);
} catch (e) {
  console.error("❌ Error:", e.message);
  process.exit(1);
}
