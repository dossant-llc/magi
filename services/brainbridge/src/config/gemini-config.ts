/**
 * Google Gemini Configuration Constants
 * Contains Gemini-specific configuration options and constants
 */

export interface GeminiConfig {
  apiKey: string;
  model: string;
  dimensions: number;
  baseUrl: string;
  requestDelay: number; // Rate limiting delay in ms
}

export const GEMINI_MODELS = {
  TEXT_EMBEDDING_004: 'text-embedding-004',
  GEMINI_EMBEDDING_001: 'gemini-embedding-001',
} as const;

export const GEMINI_DIMENSIONS = {
  [GEMINI_MODELS.TEXT_EMBEDDING_004]: 768,
  [GEMINI_MODELS.GEMINI_EMBEDDING_001]: 3072, // Can be configured to 1536 or 768
} as const;

export const GEMINI_RATE_LIMITS = {
  FREE_TIER: {
    REQUESTS_PER_MINUTE: 5,
    DELAY_MS: 12000, // 12 seconds between requests
    REQUESTS_PER_DAY: 25,
  },
  PAID_TIER: {
    REQUESTS_PER_MINUTE: 360,
    DELAY_MS: 167, // ~6 requests per second
    REQUESTS_PER_DAY: 'unlimited',
  },
} as const;

export const GEMINI_ENDPOINTS = {
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  EMBED_CONTENT: (model: string) => `${GEMINI_ENDPOINTS.BASE_URL}/${model}:embedContent`,
} as const;

export const GEMINI_LIMITS = {
  MAX_INPUT_TEXTS_PER_REQUEST: 1, // Gemini embedding API limitation
  MAX_TOKENS_PER_INPUT: 2048,
  MAX_CHARS_APPROXIMATION: 8000, // Conservative estimate for 2048 tokens
  BATCH_SIZE: 1, // Process one at a time due to API limitation
} as const;

/**
 * Default Gemini configuration
 */
export const DEFAULT_GEMINI_CONFIG: Partial<GeminiConfig> = {
  model: GEMINI_MODELS.TEXT_EMBEDDING_004,
  baseUrl: GEMINI_ENDPOINTS.BASE_URL,
  requestDelay: GEMINI_RATE_LIMITS.FREE_TIER.DELAY_MS,
  dimensions: GEMINI_DIMENSIONS[GEMINI_MODELS.TEXT_EMBEDDING_004],
} as const;

/**
 * Get Gemini configuration from environment variables
 */
export function getGeminiConfig(): GeminiConfig {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required');
  }

  const model = (process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_GEMINI_CONFIG.model) as string;
  const isPaidTier = process.env.GEMINI_PAID_TIER === 'true';

  return {
    apiKey,
    model,
    baseUrl: DEFAULT_GEMINI_CONFIG.baseUrl!,
    dimensions: GEMINI_DIMENSIONS[model as keyof typeof GEMINI_DIMENSIONS] || 768,
    requestDelay: isPaidTier 
      ? GEMINI_RATE_LIMITS.PAID_TIER.DELAY_MS
      : GEMINI_RATE_LIMITS.FREE_TIER.DELAY_MS,
  };
}

/**
 * Validate Gemini model name
 */
export function isValidGeminiModel(model: string): model is keyof typeof GEMINI_DIMENSIONS {
  return model in GEMINI_DIMENSIONS;
}

/**
 * Get dimensions for a Gemini model
 */
export function getGeminiModelDimensions(model: string): number {
  if (!isValidGeminiModel(model)) {
    throw new Error(`Invalid Gemini model: ${model}`);
  }
  return GEMINI_DIMENSIONS[model];
}

/**
 * Get appropriate request delay based on tier
 */
export function getRequestDelay(isPaidTier: boolean = false): number {
  return isPaidTier 
    ? GEMINI_RATE_LIMITS.PAID_TIER.DELAY_MS
    : GEMINI_RATE_LIMITS.FREE_TIER.DELAY_MS;
}

/**
 * Calculate approximate token count (rough estimation)
 */
export function estimateTokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Check if text exceeds token limit
 */
export function exceedsTokenLimit(text: string): boolean {
  return estimateTokenCount(text) > GEMINI_LIMITS.MAX_TOKENS_PER_INPUT;
}

/**
 * Truncate text to fit within token limits
 */
export function truncateToTokenLimit(text: string): string {
  if (!exceedsTokenLimit(text)) {
    return text;
  }
  
  // Use character approximation with buffer
  const maxChars = GEMINI_LIMITS.MAX_CHARS_APPROXIMATION;
  return text.substring(0, maxChars);
}