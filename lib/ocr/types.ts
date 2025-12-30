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
