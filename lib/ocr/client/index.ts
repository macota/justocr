"use client";

import type { OCRResult, OCRProgressCallback } from "../types";
import { processMistralOCR } from "./mistral";
import { processGoogleVisionOCR } from "./google";

/**
 * Supported BYOK providers
 */
export const BYOK_PROVIDERS = ["mistral", "google"] as const;
export type BYOKProviderId = (typeof BYOK_PROVIDERS)[number];

/**
 * Check if a provider supports BYOK (Bring Your Own Key)
 */
export function isBYOKProvider(providerId: string): providerId is BYOKProviderId {
  return BYOK_PROVIDERS.includes(providerId as BYOKProviderId);
}

/**
 * Client-side provider registry
 */
const clientProviders: Record<
  BYOKProviderId,
  (file: File, apiKey: string, onProgress?: OCRProgressCallback) => Promise<OCRResult>
> = {
  mistral: processMistralOCR,
  google: processGoogleVisionOCR,
};

/**
 * Process a file using a cloud OCR provider with the user's API key.
 * This function runs entirely client-side - the API key is sent directly
 * to the provider's API and never touches our servers.
 *
 * @param providerId - The provider to use (mistral or google)
 * @param file - The file to process
 * @param apiKey - The user's API key for the provider
 * @param onProgress - Optional progress callback
 * @returns The OCR result
 */
export async function processOCRWithKey(
  providerId: string,
  file: File,
  apiKey: string,
  onProgress?: OCRProgressCallback
): Promise<OCRResult> {
  if (!isBYOKProvider(providerId)) {
    throw new Error(`Provider "${providerId}" does not support BYOK`);
  }

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("API key is required");
  }

  const processor = clientProviders[providerId];
  return processor(file, apiKey.trim(), onProgress);
}

/**
 * Get provider display name for BYOK providers
 */
export function getBYOKProviderName(providerId: BYOKProviderId): string {
  const names: Record<BYOKProviderId, string> = {
    mistral: "Mistral",
    google: "Google Cloud Vision",
  };
  return names[providerId];
}

/**
 * Get help text for obtaining an API key
 */
export function getApiKeyHelpUrl(providerId: BYOKProviderId): string {
  const urls: Record<BYOKProviderId, string> = {
    mistral: "https://console.mistral.ai/api-keys/",
    google: "https://console.cloud.google.com/apis/credentials",
  };
  return urls[providerId];
}
