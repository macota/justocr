import { createWorker } from "tesseract.js";
import type { OCRProvider } from "../types";

export const tesseractProvider: OCRProvider = {
  id: "tesseract",
  name: "Tesseract",

  async process(imageBuffer: Buffer, _mimeType: string): Promise<string> {
    const worker = await createWorker("eng", 1, {
      legacyCore: true,
      legacyLang: true,
    });

    try {
      const result = await worker.recognize(imageBuffer);
      return result.data.text;
    } finally {
      await worker.terminate();
    }
  },
};
