export interface OCRPage {
  pageNumber: number;
  text: string;
}

export interface OCRResult {
  text: string;
  pages: OCRPage[];
  processingTimeMs: number;
  provider: string;
}

export interface OCRProvider {
  id: string;
  name: string;
  process(imageBuffer: Buffer, mimeType: string): Promise<string>;
}

export interface OCRRequest {
  file: Buffer;
  mimeType: string;
  provider: string;
  apiKey?: string;
}

/**
 * Provider configuration for UI display
 */
export interface OCRProviderConfig {
  id: string;
  name: string;
  description: string;
  isLocal: boolean;
  isClientSide: boolean;
  available: boolean;
}

/**
 * Progress callback for client-side OCR processing
 */
export type OCRProgressStatus =
  | "loading"
  | "initializing"
  | "recognizing"
  | "complete"
  | "error";

export interface OCRProgressInfo {
  status: OCRProgressStatus;
  progress: number; // 0-100
  message: string;
}

export type OCRProgressCallback = (info: OCRProgressInfo) => void;

/**
 * BYOK (Bring Your Own Key) provider configuration
 */
export interface BYOKProviderConfig {
  providerId: string;
  providerName: string;
  apiKeyHelpUrl: string;
  keyFormat?: {
    minLength: number;
    prefix?: string;
  };
}

/**
 * Benchmark mode types for multi-provider comparison
 */

/**
 * Result from a single provider in benchmark mode
 */
export interface BenchmarkProviderResult {
  providerId: string;
  providerName: string;
  result: OCRResult | null;
  error: string | null;
  status: "pending" | "processing" | "completed" | "error";
}

/**
 * Complete benchmark results for all providers
 */
export interface BenchmarkResults {
  results: BenchmarkProviderResult[];
  completedAt: number;
}

/**
 * Statistics computed from benchmark results
 */
export interface BenchmarkStats {
  fastest: {
    providerId: string;
    providerName: string;
    timeMs: number;
  } | null;
  slowest: {
    providerId: string;
    providerName: string;
    timeMs: number;
  } | null;
  mostCharacters: {
    providerId: string;
    providerName: string;
    charCount: number;
  } | null;
  leastCharacters: {
    providerId: string;
    providerName: string;
    charCount: number;
  } | null;
  averageTimeMs: number;
  averageCharCount: number;
  successCount: number;
  errorCount: number;
}
