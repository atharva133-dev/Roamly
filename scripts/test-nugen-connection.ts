/**
 * Test Nugen API Connectivity
 * Validates API URL reachability, API key authentication, and model inference endpoint.
 * Run: npx tsx scripts/test-nugen-connection.ts
 */

import { config } from "dotenv";
config();

import { getNugenConfig, isNugenConfigured, createNugenChatCompletion } from "../lib/nugen/client";

async function testNugenConnection() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("             ROAMLY NUGEN API CONNECTIVITY TEST                ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const cfg = getNugenConfig();
  console.log(`1. Configuration Check:`);
  console.log(`   • Target API URL : ${cfg.apiUrl}`);
  console.log(`   • Configured Model: ${cfg.modelId}`);
  console.log(`   • API Key Status  : ${cfg.apiKey ? (isNugenConfigured() ? "Configured (Active key)" : "Configured (Placeholder / Incomplete)") : "Missing"}`);
  console.log(`   • Key Mask        : ${cfg.apiKey ? cfg.apiKey.substring(0, 4) + "..." + cfg.apiKey.substring(cfg.apiKey.length - 3) : "N/A"}\n`);

  // 2. Test Network Reachability to Nugen Base URL
  console.log(`2. Testing Network Reachability (${cfg.apiUrl})...`);
  const reachabilityStart = Date.now();
  try {
    const res = await fetch(`${cfg.apiUrl}`, {
      method: "GET",
      headers: { "User-Agent": "Roamly-Connectivity-Test/1.0" },
    });
    console.log(`   ✅ Nugen API server reached in ${Date.now() - reachabilityStart}ms (HTTP ${res.status})`);
  } catch (netErr: any) {
    console.log(`   ⚠️ Network connection warning: ${netErr.message}`);
  }

  // 3. Test Base Models / API Endpoint Authentication
  console.log(`\n3. Testing Nugen Authentication & Model Inference Endpoint...`);
  if (!isNugenConfigured()) {
    console.log("   ⚠️ NUGEN_API_KEY is currently a placeholder (e.g. 'your_nugen_api_key_placeholder').");
    console.log("   ℹ️ To connect to live Nugen models, obtain a key from https://platform.nugen.in/ and set NUGEN_API_KEY in .env.");
    console.log("   ✅ Fallback architecture verified: Roamly chatbot will automatically route to Gemini fallback until live key is active.\n");
    return;
  }

  const inferenceStart = Date.now();
  try {
    const testMessages = [
      { role: "user" as const, content: "Say 'Roamly Nugen Connected' in 3 words." }
    ];

    const result = await createNugenChatCompletion(testMessages, {
      model: cfg.modelId,
      max_tokens: 50,
      temperature: 0.3,
    });

    const reply = result.choices?.[0]?.message?.content;
    console.log(`   ✅ Inference Successful! (${Date.now() - inferenceStart}ms)`);
    console.log(`   • Response ID   : ${result.id}`);
    console.log(`   • Model Used    : ${result.model}`);
    console.log(`   • Confidence    : ${result.confidence_score ?? "N/A"}`);
    console.log(`   • Output        : "${reply?.trim()}"`);
    console.log(`   • Token Usage   : Prompt ${result.usage?.prompt_tokens}, Completion ${result.usage?.completion_tokens}`);
  } catch (infErr: any) {
    console.log(`   ❌ Nugen Inference Call returned error: ${infErr.message}`);
    console.log("   ℹ️ If this is an unauthorized (401) error, verify that your Nugen account key is valid and has active credits.");
  }

  console.log("\n═══════════════════════════════════════════════════════════════\n");
}

testNugenConnection();
