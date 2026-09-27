/**
 * Roamly Personalized Tourism Assistant
 * Domain-specialized chatbot powered by Nugen Intelligence
 * with automatic fallback to Gemini.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createNugenChatCompletion, getNugenConfig, isNugenConfigured } from "./client";
import { ChatMessage, TourismChatResult } from "./types";

export const TOURISM_SYSTEM_PROMPT = `You are Roamly's Personalized Tourism Assistant — an intelligent, domain-aligned travel guide powered by Nugen AI.

Your dedicated expertise covers:
1. Tourist Destinations & Hidden Gems: Major Indian & international hotspots, focusing on regional circuits (e.g. Mumbai, Pune, Lonavala, Goa, Delhi, Agra, Jaipur, Kerala, Rajasthan).
2. Personalized Travel Recommendations: Curated day-by-day itineraries tailored to traveler type (Solo, Family with kids, Couples, Adventure seekers, Heritage lovers, Foodies, Relaxed pace).
3. Budget Optimization & Estimates: Realistic cost envelopes in Indian Rupees (₹) across accommodation, local transit, food, and sightseeing fees.
4. Local Culture, Food & Experiences: Signature culinary trails, street food safety, authentic cultural etiquettes, best visiting seasons and hours.
5. Roamly Verified Local Guides: Recommend connecting with verified local guides for deep cultural immersion, language translation, safety, and customized local exploration.
6. Practical Transit & Logistics: Intercity trains, cabs, airport transfers, metro routes, and optimal route pacing to avoid traveler fatigue.

Operational Guidelines:
- If a user asks questions completely unrelated to travel or tourism, politely decline and redirect them back to travel planning.
- Keep recommendations structured, engaging, and highly actionable using bullet points, emojis, and estimated costs in ₹.
- Emphasize authentic local insights over generic travel brochures.`;

/**
 * Format conversation history into valid Nugen ChatMessage objects,
 * injecting the tourism domain system prompt as the first message.
 */
export function formatConversationForNugen(
  incomingMessages: { role: string; content: string }[]
): ChatMessage[] {
  const formatted: ChatMessage[] = [
    {
      role: "system",
      content: TOURISM_SYSTEM_PROMPT,
    },
  ];

  for (const msg of incomingMessages) {
    const role = msg.role === "assistant" || msg.role === "model" ? "assistant" : "user";
    formatted.push({
      role,
      content: msg.content.trim(),
    });
  }

  return formatted;
}

/**
 * Fallback response generator using Google Gemini
 */
async function generateGeminiFallback(
  messages: { role: string; content: string }[]
): Promise<string> {
  const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
  if (!geminiApiKey) {
    throw new Error("Neither NUGEN_API_KEY nor GEMINI_API_KEY is available.");
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-flash"
  ].filter(Boolean) as string[];

  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));

  const lastMessage = messages[messages.length - 1];
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
            parts: [{ text: TOURISM_SYSTEM_PROMPT }],
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
        return text.trim();
      }
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("Failed to generate response from Gemini fallback.");
}

/**
 * Main entry point: Generates tourism chat completion using Nugen aligned model,
 * with automatic fallback to Gemini if Nugen is unconfigured or encounters an error.
 */
export async function generateTourismChatCompletion(
  messages: { role: string; content: string }[]
): Promise<TourismChatResult> {
  if (!messages || messages.length === 0) {
    throw new Error("No messages provided for chat completion.");
  }

  const nugenConfig = getNugenConfig();
  const nugenAvailable = isNugenConfigured();

  // 1. Attempt Nugen Aligned Model if configured
  if (nugenAvailable) {
    try {
      const nugenMessages = formatConversationForNugen(messages);
      const nugenResponse = await createNugenChatCompletion(nugenMessages, {
        model: nugenConfig.modelId,
        temperature: 0.7,
        max_tokens: 900,
      });

      const replyContent = nugenResponse.choices?.[0]?.message?.content;
      if (replyContent && replyContent.trim().length > 0) {
        console.log(`[Roamly Chatbot] AI_PROVIDER=NUGEN model=${nugenResponse.model} score=${nugenResponse.confidence_score ?? "N/A"}`);
        return {
          reply: replyContent.trim(),
          provider: "NUGEN",
          model: nugenResponse.model || nugenConfig.modelId,
          confidenceScore: nugenResponse.confidence_score ?? null,
          usage: nugenResponse.usage,
        };
      }
    } catch (nugenErr: any) {
      console.warn(`[Roamly Chatbot] Nugen inference failed: ${nugenErr.message}. Falling back to Gemini.`);
    }
  } else {
    console.log("[Roamly Chatbot] NUGEN_API_KEY not configured or placeholder detected. Using Gemini fallback.");
  }

  // 2. Fallback to Gemini
  console.log("[Roamly Chatbot] AI_PROVIDER=GEMINI_FALLBACK model=gemini-1.5-flash");
  const fallbackReply = await generateGeminiFallback(messages);

  return {
    reply: fallbackReply,
    provider: "GEMINI_FALLBACK",
    model: "gemini-1.5-flash",
    confidenceScore: null,
  };
}
