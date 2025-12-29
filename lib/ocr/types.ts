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
