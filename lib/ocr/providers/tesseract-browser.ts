"use client";

import { createWorker, PSM, OEM, Worker } from "tesseract.js";
import type { OCRResult, OCRPage } from "../types";
import {
  pdfToImagesInBrowser,
  isBrowserPDFSupported,
} from "@/lib/pdf-browser";

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
 * Creates a Tesseract worker with progress logging
 */
async function createTesseractWorker(
  onProgress?: (info: ProgressInfo) => void,
  progressOffset = 0,
  progressScale = 1
): Promise<Worker> {
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    logger: (m) => {
      if (m.status === "loading tesseract core") {
        onProgress?.({
          status: "loading",
          progress: progressOffset + Math.round(m.progress * 30 * progressScale),
          message: "Loading Tesseract core...",
        });
      } else if (m.status === "initializing tesseract") {
        onProgress?.({
          status: "initializing",
          progress: progressOffset + Math.round((30 + m.progress * 10) * progressScale),
          message: "Initializing Tesseract...",
        });
      } else if (m.status === "loading language traineddata") {
        onProgress?.({
          status: "loading",
          progress: progressOffset + Math.round((40 + m.progress * 20) * progressScale),
          message: "Loading language data...",
        });
      } else if (m.status === "initializing api") {
        onProgress?.({
          status: "initializing",
          progress: progressOffset + Math.round((60 + m.progress * 5) * progressScale),
          message: "Initializing API...",
        });
      } else if (m.status === "recognizing text") {
        onProgress?.({
          status: "recognizing",
          progress: progressOffset + Math.round((65 + m.progress * 35) * progressScale),
          message: "Recognizing text...",
        });
      }
    },
  });

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
  });

  return worker;
}

/**
 * Process a PDF file using Tesseract.js in the browser.
 * Converts each page to an image using PDF.js, then runs OCR.
 */
async function processPdfClientSide(
  file: File,
  options: TesseractBrowserOptions = {}
): Promise<OCRResult> {
  const { onProgress } = options;
  const startTime = performance.now();

  if (!isBrowserPDFSupported()) {
    throw new Error("Browser does not support PDF conversion");
  }

  onProgress?.({
    status: "loading",
    progress: 0,
    message: "Converting PDF pages...",
  });

  try {
    // Convert PDF to images (takes ~30% of progress)
    const pdfPages = await pdfToImagesInBrowser(file, (pdfProgress) => {
      const progress = Math.round(
        (pdfProgress.currentPage / pdfProgress.totalPages) * 30
      );
      onProgress?.({
        status: "loading",
        progress,
        message: pdfProgress.message,
      });
    });

    if (pdfPages.length === 0) {
      throw new Error("No pages found in PDF");
    }

    onProgress?.({
      status: "loading",
      progress: 30,
      message: "Loading Tesseract engine...",
    });

    // Create worker once for all pages
    const worker = await createTesseractWorker(onProgress, 30, 0.3);

    try {
      const pages: OCRPage[] = [];
      const allText: string[] = [];

      // Process each page (remaining 40% of progress)
      const ocrProgressPerPage = 40 / pdfPages.length;

      for (let i = 0; i < pdfPages.length; i++) {
        const pdfPage = pdfPages[i];
        const pageProgressStart = 60 + i * ocrProgressPerPage;

        onProgress?.({
          status: "recognizing",
          progress: Math.round(pageProgressStart),
          message: `Processing page ${pdfPage.pageNumber} of ${pdfPages.length}...`,
        });

        // Recognize text from the image blob
        const result = await worker.recognize(pdfPage.imageBlob);
        const pageText = result.data.text;

        pages.push({
          pageNumber: pdfPage.pageNumber,
          text: pageText,
        } as OCRPage);
        allText.push(pageText);
      }

      const endTime = performance.now();

      onProgress?.({
        status: "complete",
        progress: 100,
        message: "Complete!",
      });

      return {
        text: allText.join("\n\n"),
        pages,
        processingTimeMs: Math.round(endTime - startTime),
        provider: "tesseract-local",
      };
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    onProgress?.({
      status: "error",
      progress: 0,
      message: error instanceof Error ? error.message : "PDF processing failed",
    });
    throw error;
  }
}

/**
 * Process an image file using Tesseract.js in the browser.
 * This function runs entirely client-side - no data is sent to any server.
 */
export async function processImageClientSide(
  file: File,
  options: TesseractBrowserOptions = {}
): Promise<OCRResult> {
  // Handle PDFs separately
  if (isPdfFile(file)) {
    return processPdfClientSide(file, options);
  }

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
      `Unsupported file type: ${file.type}. Client-side OCR supports images (PNG, JPEG, GIF, WebP, BMP) and PDFs.`
    );
  }

  onProgress?.({
    status: "loading",
    progress: 0,
    message: "Loading Tesseract engine...",
  });

  try {
    const worker = await createTesseractWorker(onProgress);

    try {
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
  // Now supports PDFs via PDF.js conversion
  return validImageTypes.includes(file.type) || file.type === "application/pdf";
}

/**
 * Check if the file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf";
}
