/**
 * Experiential Gateway LLM Client for gpt-6-astra
 *
 * Configured according to Experiential Gateway specification:
 * - Base URL: https://api.experientiallabs.ai/v1
 * - Auth: EXPLABS_API_KEY environment variable
 * - Model: gpt-6-astra
 */

export interface ExperientialClientConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export function getExperientialClientConfig(): { baseUrl: string; apiKey: string; model: string } {
  const apiKey = process.env.EXPLABS_API_KEY;
  if (!apiKey) {
    throw new Error("EXPLABS_API_KEY environment variable is not set. Please create one under Settings -> API keys and export it.");
  }

  const baseUrl = process.env.EXPERIENTIAL_BASE_URL || "https://api.experientiallabs.ai/v1";
  const model = "gpt-6-astra";

  return {
    baseUrl: baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl,
    apiKey,
    model,
  };
}

export async function createChatCompletion(messages: Array<{ role: string; content: string }>, options: { stream?: boolean; tools?: any[] } = {}) {
  const { baseUrl, apiKey, model } = getExperientialClientConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      ...(options.stream !== undefined ? { stream: options.stream } : {}),
      ...(options.tools !== undefined ? { tools: options.tools } : {}),
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      responseData?.error?.message || `Experiential Gateway API call failed with status ${response.status}`
    );
  }

  return responseData;
}
