/**
 * Core travel plan generation logic — shared between:
 *  - app/api/generatePlanWithSummary/route.ts  (HTTP API route)
 *  - lib/queues.ts                              (queue worker, direct call)
 *
 * Calling this directly avoids the circular self-HTTP-call pattern
 * which breaks on Vercel serverless (setTimeout is killed after response)
 * and during Next.js Fast Refresh rebuilds in dev.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ItineraryDay {
  day: string;
  city: string;
  morning: string;
  afternoon: string;
  evening: string;
  accommodation: string;
  meals: string;
  estimated_cost: string;
}

export interface TravelPlan {
  itinerary: ItineraryDay[];
  total_estimated_cost: string;
  travel_tips: string[];
  packing_list: string[];
  emergency_contacts: {
    local_emergency: string;
    embassy: string;
    hotel: string;
  };
}

export interface TravelDetails {
  destinations: string[];
  start_date: string;
  end_date: string;
  budget: string;
  travel_style: string;
  interests: string[];
  accommodation: string;
  transportation: string;
  special_requests?: string;
}

const PROMPT_TEMPLATE = `
You are an expert travel planner. Create a multi-city itinerary.

DESTINATIONS: {destinations}
TRIP_DATES: {start_date} to {end_date} ({duration} days)
BUDGET: {budget}
TRAVEL_STYLE: {travel_style}
INTERESTS: {interests}
ACCOMMODATION_PREFERENCE: {accommodation}
TRANSPORTATION_PREFERENCE: {transportation}
SPECIAL_REQUESTS: {special_requests}

Important:
1. Divide the trip days between the cities in a logical way.
2. Each itinerary day must include the "city" field.
3. ALL costs must be provided in Indian Rupees (₹) regardless of destination country.
4. For international destinations, convert local currency to INR using approximate exchange rates:
   - USD to INR: 1 USD ≈ ₹85
   - EUR to INR: 1 EUR ≈ ₹92
   - GBP to INR: 1 GBP ≈ ₹108
   - JPY to INR: 1 JPY ≈ ₹0.58
   - AUD to INR: 1 AUD ≈ ₹56
   - CAD to INR: 1 CAD ≈ ₹63
5. Always prefix costs with ₹ symbol (e.g., "₹2,500", "₹15,000")
6. Respond with ONLY valid JSON - no markdown formatting, no backticks, no code blocks. Start directly with the opening brace { and end with the closing brace }.

{
  "itinerary": [
    {
      "day": "Day 1",
      "city": "City Name",
      "morning": "Activity",
      "afternoon": "Activity",
      "evening": "Activity",
      "accommodation": "Hotel",
      "meals": "Breakfast, lunch suggestion",
      "estimated_cost": "₹2,500"
    }
  ],
  "total_estimated_cost": "₹15,000",
  "travel_tips": ["Tip1", "Tip2"],
  "packing_list": ["Item1", "Item2"],
  "emergency_contacts": {
    "local_emergency": "Number",
    "embassy": "Number",
    "hotel": "Number"
  }
}
`;

function convertToRupees(costString: string): string {
  if (!costString) return "₹0";
  const cleanCost = costString.replace(/[₹$€£¥₽₩₪₨₦₡₢₣₤₥₦₧₨₩₪₫₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿]/g, "").trim();
  const cost = parseFloat(cleanCost.replace(/,/g, ""));
  if (isNaN(cost)) return "₹0";
  if (costString.includes("$")) return `₹${Math.round(cost * 85)}`;
  if (costString.includes("€")) return `₹${Math.round(cost * 92)}`;
  if (costString.includes("£")) return `₹${Math.round(cost * 108)}`;
  if (!costString.includes("₹")) return `₹${cost}`;
  return costString.includes("₹") ? costString : `₹${cost}`;
}

export async function generateTravelPlanDirect(data: TravelDetails): Promise<TravelPlan> {
  const { destinations, start_date, end_date, budget, travel_style, interests, accommodation, transportation, special_requests } = data;

  const duration = Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const prompt = PROMPT_TEMPLATE
    .replace("{destinations}", destinations.join(", "))
    .replace("{start_date}", start_date)
    .replace("{end_date}", end_date)
    .replace("{duration}", duration.toString())
    .replace("{budget}", budget)
    .replace("{travel_style}", travel_style)
    .replace("{interests}", interests.join(", "))
    .replace("{accommodation}", accommodation)
    .replace("{transportation}", transportation)
    .replace("{special_requests}", special_requests || "None");

  let text = "";

  // Try Experiential Gateway (gpt-6-astra) if configured
  const explabsKey = process.env.EXPLABS_API_KEY;
  if (explabsKey && explabsKey !== "your_explabs_api_key_here") {
    try {
      console.log("🤖 Generating itinerary with Experiential Gateway model: gpt-6-astra");
      const { createChatCompletion } = await import("@/lib/experiential");
      const completion = await createChatCompletion([{ role: "user", content: prompt }]);
      text = completion.choices?.[0]?.message?.content?.trim() || "";
      if (text) console.log("✅ Itinerary generation succeeded with Experiential gpt-6-astra");
    } catch (expError: any) {
      console.warn(`⚠️ Experiential gpt-6-astra issue: ${expError.message}. Falling back to Gemini...`);
    }
  } else {
    console.log("ℹ️ EXPLABS_API_KEY not set. Using Gemini directly.");
  }

  // Fall back to Gemini
  if (!text) {
    const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)!;
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const preferredModel = process.env.GEMINI_MODEL;
    const candidateModels = preferredModel
      ? [preferredModel, "gemini-3.5-flash", "gemini-3.7-flash", "gemini-2.5-pro"]
      : ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-2.5-pro"];

    let result: any = null;
    let lastError: unknown = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`🤖 Generating itinerary with Gemini model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        if (result) {
          console.log(`✅ Itinerary generation succeeded with model: ${modelName}`);
          break;
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn(`⚠️ Model ${modelName} failed (${errorMsg}). Trying next...`);
        lastError = err;
      }
    }

    if (!result && !text) throw lastError || new Error("All LLM models failed");
    if (!text && result) {
      text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    }
  }

  // Clean up markdown formatting if present
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  // Parse JSON with auto-fix - try multiple strategies
  let travelPlan: TravelPlan;
  try {
    travelPlan = JSON.parse(text);
  } catch (firstError) {
    // Try to extract JSON by finding first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonText = text.substring(firstBrace, lastBrace + 1);
      try {
        travelPlan = JSON.parse(jsonText);
      } catch (secondError) {
        // Try fixing trailing commas
        const fixed = jsonText.replace(/,\s*([\]}])/g, '$1');
        try {
          travelPlan = JSON.parse(fixed);
        } catch (thirdError) {
          throw new Error(`Failed to parse AI response as JSON: ${text.substring(0, 200)}...`);
        }
      }
    } else {
      throw new Error(`Failed to parse AI response as JSON: ${text.substring(0, 200)}...`);
    }
  }

  // Normalize all costs to ₹
  if (travelPlan.itinerary) {
    travelPlan.itinerary.forEach((day) => {
      if (day.estimated_cost) day.estimated_cost = convertToRupees(day.estimated_cost);
    });
  }
  if (travelPlan.total_estimated_cost) {
    travelPlan.total_estimated_cost = convertToRupees(travelPlan.total_estimated_cost);
  }

  return travelPlan;
}
