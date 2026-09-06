import { config } from "dotenv";
config();

import { createChatCompletion, getExperientialClientConfig } from "../lib/experiential";

async function testExperientialGateway() {
  console.log("=== Testing Experiential Gateway Client ===");
  try {
    const cfg = getExperientialClientConfig();
    console.log(`Base URL: ${cfg.baseUrl}`);
    console.log(`Model ID: ${cfg.model}`);
    console.log(`API Key:  ${cfg.apiKey.substring(0, 8)}...`);

    const result = await createChatCompletion([
      { role: "user", content: "Hello! Say hi in 5 words." }
    ]);

    console.log("\nResponse object:");
    console.log(JSON.stringify(result, null, 2));

    const reply = result.choices?.[0]?.message?.content;
    const usage = result.usage;

    console.log("\n--- Reply ---");
    console.log(reply);

    console.log("\n--- Token Usage ---");
    console.log(usage);

  } catch (error: any) {
    console.error("\n[Experiential Gateway Test Error]");
    console.error(error.message);
  }
}

testExperientialGateway();
