/**
 * Nugen API Client
 * Communicates with the official Nugen Inference API (v3)
 * Endpoint: POST /api/v3/inference/chat/completions
 * Spec: https://docs.nugen.in/api-reference/inference/generate-chat-completions
 */

import {
  ChatMessage,
  NugenChatCompletionRequest,
  NugenChatCompletionResponse,
  NugenClientConfig,
} from "./types";

const DEFAULT_NUGEN_API_URL = "https://api.nugen.in";
const DEFAULT_MODEL_ID = "roamly-tourism-aligned-v1";
const DEFAULT_TIMEOUT_MS = 25000;

/**
 * Returns current Nugen server configuration from environment.
 * Never exposes the raw API key to client bundles.
 */
export function getNugenConfig(): NugenClientConfig {
  return {
    apiKey: process.env.NUGEN_API_KEY?.trim() || "",
    apiUrl: (process.env.NUGEN_API_URL?.trim() || DEFAULT_NUGEN_API_URL).replace(/\/+$/, ""),
    modelId: process.env.NUGEN_MODEL_ID?.trim() || DEFAULT_MODEL_ID,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

/**
 * Check whether Nugen is configured with a valid non-placeholder API key.
 */
export function isNugenConfigured(): boolean {
  const { apiKey } = getNugenConfig();
  return Boolean(apiKey && apiKey.length > 5 && !apiKey.includes("placeholder") && !apiKey.includes("your-nugen"));
}

/**
 * Sends a chat completion request to Nugen Inference API
 */
export async function createNugenChatCompletion(
  messages: ChatMessage[],
  options: Partial<NugenChatCompletionRequest> = {}
): Promise<NugenChatCompletionResponse> {
  const config = getNugenConfig();

  if (!config.apiKey) {
    throw new Error("NUGEN_API_KEY is not configured in environment variables.");
  }

  const endpoint = `${config.apiUrl}/api/v3/inference/chat/completions`;
  const modelToUse = options.model || config.modelId;

  const requestBody: NugenChatCompletionRequest = {
    model: modelToUse,
    messages,
    max_tokens: options.max_tokens ?? 800,
    temperature: options.temperature ?? 0.7,
    stream: false,
    prompt_truncate_len: options.prompt_truncate_len ?? 2000,
    ...options,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
        "User-Agent": "Roamly-Tourism-Bot/1.0",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let errorMessage = `Nugen API responded with HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message || errorJson.error) {
          errorMessage = `${errorMessage}: ${errorJson.message || errorJson.error}`;
        }
      } catch {
        if (errorText) {
          errorMessage = `${errorMessage}: ${errorText.slice(0, 150)}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data: NugenChatCompletionResponse = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Nugen request timed out after ${config.timeoutMs}ms.`);
    }
    throw error;
  }
}
