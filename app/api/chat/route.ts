import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are Roamly's AI Travel Assistant & Itinerary Planner — a knowledgeable, friendly, and localized travel expert powered by Google Gemini.

Your dedicated expertise covers:
1. Personalized Travel Itineraries: Curated day-by-day itineraries tailored to traveler style (Solo, Family with kids, Couples, Adventure seekers, Heritage lovers, Foodies, Relaxed pace) with morning, afternoon, and evening activities.
2. Tourist Destinations & Hidden Gems: Major Indian & international hotspots, focusing on regional circuits (e.g. Mumbai, Pune, Lonavala, Goa, Delhi, Agra, Jaipur, Kerala, Rajasthan).
3. Budget Optimization & Estimates: Realistic cost envelopes in Indian Rupees (₹) across accommodation, local transit, food, and sightseeing fees.
4. Local Culture, Food & Experiences: Signature culinary trails, street food safety, authentic cultural etiquettes, best visiting seasons and hours.
5. Roamly Verified Local Guides: Recommend connecting with verified local guides for deep cultural immersion, language translation, safety, and customized local exploration.
6. Practical Transit & Logistics: Intercity trains, cabs, airport transfers, metro routes, and optimal route pacing to avoid traveler fatigue.

Operational Guidelines:
- If a user asks questions completely unrelated to travel or tourism, politely decline and redirect them back to travel planning.
- Keep recommendations structured, engaging, and highly actionable using bullet points, emojis, and estimated costs in ₹.
- Emphasize authentic local insights over generic travel brochures.`;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const messages = body?.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Valid messages array is required" },
        { status: 400 }
      );
    }

    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in the environment." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = [
      process.env.GEMINI_MODEL,
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
    ].filter(Boolean) as string[];

    const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    let replyText = "";
    let modelUsed = "";
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const chat = model.startChat({
          history: [
            {
              role: "user",
              parts: [{ text: "What is your role?" }],
            },
            {
              role: "model",
              parts: [{ text: SYSTEM_PROMPT }],
            },
            ...history,
          ],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
          },
        });

        const result = await chat.sendMessage(lastMessage.content);
        const text = result.response.text();
        if (text && text.trim().length > 0) {
          replyText = text.trim();
          modelUsed = modelName;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Roamly Chat Gemini] Model ${modelName} failed (${err.message}). Trying next...`);
      }
    }

    if (!replyText) {
      throw lastError || new Error("Failed to generate response with Gemini.");
    }

    return NextResponse.json({
      reply: replyText,
      provider: "GEMINI",
      model: modelUsed,
    });
  } catch (error: any) {
    console.error("[Roamly Chatbot API Error]:", error);
    return NextResponse.json(
      { error: "Failed to generate travel assistance response. Please try again." },
      { status: 500 }
    );
  }
}
