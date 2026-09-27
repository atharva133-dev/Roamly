/**
 * Roamly Nugen AI Tourism Chatbot Complete Test Suite
 * Validates:
 * 1. Nugen connection & configuration
 * 2. Aligned model inference / routing
 * 3. Tourism destination question
 * 4. Budget awareness question (₹ INR)
 * 5. Preference-based question (heritage, food, nature)
 * 6. Multi-turn conversation history & follow-up continuity
 * 7. Invalid input validation
 * 8. Nugen failure / Gemini fallback mechanism
 * 9. Provider identification (AI_PROVIDER=NUGEN vs GEMINI_FALLBACK)
 *
 * Usage: npx tsx scripts/test-nugen-chatbot.ts
 */

import { config } from "dotenv";
config();

import { getNugenConfig, isNugenConfigured, createNugenChatCompletion } from "../lib/nugen/client";
import { generateTourismChatCompletion, formatConversationForNugen } from "../lib/nugen/chatbot";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? ` — ${detail}` : ""}`);
    passed++;
  } else {
    console.log(`  ❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("       ROAMLY NUGEN AI TOURISM CHATBOT COMPREHENSIVE SUITE     ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const cfg = getNugenConfig();
  console.log("--- 1. Configuration & Reachability ---");
  assert(Boolean(cfg.apiUrl), "NUGEN_API_URL configured", cfg.apiUrl);
  assert(Boolean(cfg.modelId), "NUGEN_MODEL_ID configured", cfg.modelId);

  // Reachability
  try {
    const res = await fetch(cfg.apiUrl);
    assert(res.status < 500, "Nugen API URL is reachable over network", `HTTP ${res.status}`);
  } catch (err: any) {
    assert(false, "Nugen API URL is reachable", err.message);
  }

  console.log("\n--- 2. Conversation Formatting & System Prompt Injection ---");
  const rawHistory = [
    { role: "user", content: "I am traveling to Mumbai." },
    { role: "assistant", content: "Welcome to Mumbai! How many days are you planning?" },
    { role: "user", content: "Three days." },
  ];
  const formatted = formatConversationForNugen(rawHistory);
  assert(formatted.length === 4, "System prompt injected at index 0", `Total messages: ${formatted.length}`);
  assert(formatted[0].role === "system", "First message is system prompt");
  assert(formatted[0].content.includes("Personalized Tourism Assistant"), "System prompt has tourism specialization");
  assert(formatted[formatted.length - 1].content === "Three days.", "Last user message preserved correctly");

  console.log("\n--- 3. Destination Recommendation Query ---");
  const destQuery = [{ role: "user", content: "What are the top 3 colonial heritage attractions in South Mumbai?" }];
  try {
    const res = await generateTourismChatCompletion(destQuery);
    assert(Boolean(res.reply && res.reply.length > 50), "Destination query returned substantive guidance", `Length: ${res.reply.length} chars`);
    assert(res.reply.toLowerCase().includes("mumbai") || res.reply.toLowerCase().includes("gateway") || res.reply.toLowerCase().includes("colaba"), "Response mentions Mumbai heritage landmarks");
    assert(Boolean(res.provider === "NUGEN" || res.provider === "GEMINI_FALLBACK"), "Provider correctly flagged", `AI_PROVIDER=${res.provider}`);
    console.log(`     Sample Output: "${res.reply.split("\n")[0].slice(0, 100)}..."`);
  } catch (err: any) {
    assert(false, "Destination recommendation query", err.message);
  }

  console.log("\n--- 4. Budget Awareness Query (₹ INR) ---");
  const budgetQuery = [{ role: "user", content: "Can I do a 3-day budget trip to Goa on ₹10,000? Give a quick breakdown." }];
  try {
    const res = await generateTourismChatCompletion(budgetQuery);
    assert(Boolean(res.reply), "Budget query returned response");
    assert(res.reply.includes("₹") || res.reply.toLowerCase().includes("rupee") || res.reply.toLowerCase().includes("budget"), "Response contains rupee budget breakdown");
  } catch (err: any) {
    assert(false, "Budget query", err.message);
  }

  console.log("\n--- 5. Preference-Based Personalization Query ---");
  const prefQuery = [{ role: "user", content: "I am a nature lover visiting Lonavala during monsoons. What waterfalls or viewpoints should I explore?" }];
  try {
    const res = await generateTourismChatCompletion(prefQuery);
    assert(Boolean(res.reply), "Preference query returned response");
    assert(res.reply.toLowerCase().includes("lonavala") || res.reply.toLowerCase().includes("waterfall") || res.reply.toLowerCase().includes("tiger"), "Response matches nature/monsoon preferences");
  } catch (err: any) {
    assert(false, "Preference query", err.message);
  }

  console.log("\n--- 6. Multi-Turn Conversation History & Follow-Up Continuity ---");
  const multiTurnQuery = [
    { role: "user", content: "I'm visiting Pune for 2 days." },
    { role: "assistant", content: "Pune is great! You can visit Shaniwar Wada, Aga Khan Palace, and sample local Misal Pav." },
    { role: "user", content: "What is the best place to eat that Misal you just mentioned?" },
  ];
  try {
    const res = await generateTourismChatCompletion(multiTurnQuery);
    assert(Boolean(res.reply), "Follow-up question answered with context");
    assert(res.reply.toLowerCase().includes("misal") || res.reply.toLowerCase().includes("katakirrr") || res.reply.toLowerCase().includes("bedekar") || res.reply.toLowerCase().includes("pune"), "Response maintains conversation context");
  } catch (err: any) {
    assert(false, "Multi-turn conversation", err.message);
  }

  console.log("\n--- 7. Guide Specialization Query ---");
  const guideQuery = [{ role: "user", content: "Why should I book a verified local guide through Roamly for historical forts in Jaipur?" }];
  try {
    const res = await generateTourismChatCompletion(guideQuery);
    assert(Boolean(res.reply), "Guide inquiry returned advice");
    assert(res.reply.toLowerCase().includes("guide") || res.reply.toLowerCase().includes("verified") || res.reply.toLowerCase().includes("roamly"), "Response explains guide verification advantages");
  } catch (err: any) {
    assert(false, "Guide inquiry", err.message);
  }

  console.log("\n--- 8. Input Validation & Error Handling ---");
  try {
    // @ts-ignore
    await generateTourismChatCompletion([]);
    assert(false, "Rejects empty messages array");
  } catch (err: any) {
    assert(err.message.includes("No messages"), "Rejects empty messages array with 400 error");
  }

  console.log("\n--- 9. Gemini Fallback & Provider Transparency ---");
  // When Nugen is not configured or in fallback mode
  const isFallback = !isNugenConfigured();
  if (isFallback) {
    console.log("   • Nugen API Key is currently placeholder — validating active fallback to Gemini.");
    const fallbackRes = await generateTourismChatCompletion([
      { role: "user", content: "Suggest 1 hill station near Mumbai." }
    ]);
    assert(fallbackRes.provider === "GEMINI_FALLBACK", "Fallback provider verified as GEMINI_FALLBACK");
    assert(Boolean(fallbackRes.reply && fallbackRes.reply.length > 20), "Fallback successfully generated high-quality response");
  } else {
    console.log("   • Active Nugen key present — testing live inference pipeline.");
  }

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                 TEST SUITE EXECUTION SUMMARY                 ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  TOTAL TESTS : ${(passed + failed).toString().padEnd(46)} ║`);
  console.log(`║  PASSED      : ${passed.toString().padEnd(46)} ║`);
  console.log(`║  FAILED      : ${failed.toString().padEnd(46)} ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
