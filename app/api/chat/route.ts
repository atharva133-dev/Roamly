import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)!;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are Roamly's AI Travel Assistant — a friendly, knowledgeable travel expert.
You ONLY answer travel-related questions. Topics you can help with:
- Destination recommendations and information
- Itinerary planning and optimization
- Budget estimates and money-saving tips
- Hotel, accommodation, and stay suggestions
- Transportation options (flights, trains, buses, cars)
- Local food, cuisine, and restaurant recommendations
- Activities, experiences, and things to do
- Visa, passport, and travel document requirements
- Packing lists and travel gear
- Weather and best time to visit
- Cultural tips and etiquette
- Safety advice and travel insurance
- Travel disruptions, cancellations, alternatives

If asked anything NOT related to travel, politely decline and redirect to travel topics.
Keep responses concise, warm, and actionable. Use bullet points and emojis to make responses engaging.
Always give costs in Indian Rupees (₹) when relevant.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Build history for multi-turn conversation
    const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "What are your capabilities?" }],
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

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response.text();

    return NextResponse.json({ reply: response });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to get response from AI" },
      { status: 500 }
    );
  }
}
