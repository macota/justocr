import type { OCRProvider, OCRResult } from "./types";
import { tesseractProvider } from "./providers/tesseract";

const providers: Record<string, OCRProvider> = {
  tesseract: tesseractProvider,
};

export function getProvider(id: string): OCRProvider | undefined {
  return providers[id];
}

export function getAvailableProviders(): string[] {
  return Object.keys(providers);
}

export async function processOCR(
  providerId: string,
  imageBuffers: { buffer: Buffer; mimeType: string; pageNumber: number }[]
): Promise<OCRResult> {
  const provider = getProvider(providerId);

  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const startTime = Date.now();
  const pages: { pageNumber: number; text: string }[] = [];

  for (const { buffer, mimeType, pageNumber } of imageBuffers) {
    const text = await provider.process(buffer, mimeType);
    pages.push({ pageNumber, text });
  }

  const processingTimeMs = Date.now() - startTime;
  const fullText = pages.map((p) => p.text).join("\n\n");

  return {
    text: fullText,
    pages,
    processingTimeMs,
    provider: provider.name,
  };
}

export type { OCRProvider, OCRResult } from "./types";
