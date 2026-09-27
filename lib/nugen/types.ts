/**
 * Nugen Intelligence API Type Definitions
 * Based on official Nugen API v3 specification (https://docs.nugen.in)
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}

export interface NugenChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  top_p?: number;
  top_k?: number;
  prompt_truncate_len?: number;
}

export interface NugenChatChoice {
  index: number;
  message: {
    role: "assistant";
    content: string;
  };
  finish_reason: "stop" | "length" | string;
}

export interface NugenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface NugenChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: NugenChatChoice[];
  usage?: NugenUsage;
  confidence_score?: number | null; // 0-100 on aligned models; null on base models
}

export interface NugenClientConfig {
  apiKey: string;
  apiUrl: string;
  modelId: string;
  baseModelId?: string;
  timeoutMs?: number;
}

export interface TourismChatResult {
  reply: string;
  provider: "NUGEN" | "GEMINI_FALLBACK";
  model: string;
  confidenceScore?: number | null;
  usage?: NugenUsage;
}

export interface AlignmentProjectRequest {
  alignment_name: string;
  base_model_id: string;
  document_ids: string[];
  benchmark_id?: string;
  description?: string;
}

export interface AlignmentProjectResponse {
  alignment_id: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  model_id?: string;
}
