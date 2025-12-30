"use client";

import { createWorker, PSM, OEM } from "tesseract.js";
import type { OCRResult, OCRPage } from "../types";

export type ProgressStatus =
  | "loading"
  | "initializing"
  | "recognizing"
  | "complete"
  | "error";

export interface ProgressInfo {
  status: ProgressStatus;
  progress: number; // 0-100
  message: string;
}

export interface TesseractBrowserOptions {
  onProgress?: (info: ProgressInfo) => void;
}

/**
 * Converts a File to a data URL for Tesseract.js processing
 */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Process an image file using Tesseract.js in the browser.
 * This function runs entirely client-side - no data is sent to any server.
 */
export async function processImageClientSide(
  file: File,
  options: TesseractBrowserOptions = {}
): Promise<OCRResult> {
  const { onProgress } = options;
  const startTime = performance.now();

  // Validate file type
  const validImageTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "image/bmp",
  ];

  if (!validImageTypes.includes(file.type)) {
    throw new Error(
      `Unsupported file type: ${file.type}. Client-side OCR only supports images (PNG, JPEG, GIF, WebP, BMP).`
    );
  }

  onProgress?.({
    status: "loading",
    progress: 0,
    message: "Loading Tesseract engine...",
  });

  try {
    // Create worker with progress logging
    const worker = await createWorker("eng", OEM.LSTM_ONLY, {
      logger: (m) => {
        // Map Tesseract.js progress events to our progress info
        if (m.status === "loading tesseract core") {
          onProgress?.({
            status: "loading",
            progress: Math.round(m.progress * 30),
            message: "Loading Tesseract core...",
          });
        } else if (m.status === "initializing tesseract") {
          onProgress?.({
            status: "initializing",
            progress: 30 + Math.round(m.progress * 10),
            message: "Initializing Tesseract...",
          });
        } else if (m.status === "loading language traineddata") {
          onProgress?.({
            status: "loading",
            progress: 40 + Math.round(m.progress * 20),
            message: "Loading language data...",
          });
        } else if (m.status === "initializing api") {
          onProgress?.({
            status: "initializing",
            progress: 60 + Math.round(m.progress * 5),
            message: "Initializing API...",
          });
        } else if (m.status === "recognizing text") {
          onProgress?.({
            status: "recognizing",
            progress: 65 + Math.round(m.progress * 35),
            message: "Recognizing text...",
          });
        }
      },
    });

    try {
      // Set page segmentation mode for automatic detection
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
      });

      // Convert file to data URL for browser processing
      const dataUrl = await fileToDataUrl(file);

      // Perform OCR
      const result = await worker.recognize(dataUrl);
      const text = result.data.text;

      const endTime = performance.now();

      onProgress?.({
        status: "complete",
        progress: 100,
        message: "Complete!",
      });

      const ocrResult: OCRResult = {
        text,
        pages: [
          {
            pageNumber: 1,
            text,
          } as OCRPage,
        ],
        processingTimeMs: Math.round(endTime - startTime),
        provider: "tesseract-local",
      };

      return ocrResult;
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    onProgress?.({
      status: "error",
      progress: 0,
      message: error instanceof Error ? error.message : "OCR processing failed",
    });
    throw error;
  }
}

/**
 * Check if a file type is supported for client-side OCR
 */
export function isClientSideSupported(file: File): boolean {
  const validImageTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "image/bmp",
  ];
  return validImageTypes.includes(file.type);
}

/**
 * Check if the file is a PDF (not supported client-side)
 */
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf";
}
