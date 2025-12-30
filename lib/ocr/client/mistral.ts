"use client";

import type { OCRResult, OCRPage, OCRProgressCallback } from "../types";

interface MistralOCRPage {
  index: number;
  markdown: string;
  images?: {
    id: string;
    top_left_x: number;
    top_left_y: number;
    bottom_right_x: number;
    bottom_right_y: number;
    image_base64?: string;
  }[];
  tables?: unknown[];
  hyperlinks?: unknown[];
  header?: string | null;
  footer?: string | null;
}

interface MistralOCRResponse {
  pages: MistralOCRPage[];
  model: string;
  usage_info: {
    pages_processed: number;
    doc_size_bytes: number;
  };
}

/**
 * Convert a File to a base64 data URL
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
 * Process an image using Mistral OCR directly from the browser.
 * This function runs entirely client-side with the user's API key.
 * The key is sent directly to Mistral's API - it never touches our servers.
 */
export async function processMistralOCR(
  file: File,
  apiKey: string,
  onProgress?: OCRProgressCallback
): Promise<OCRResult> {
  const startTime = performance.now();

  onProgress?.({
    status: "loading",
    progress: 10,
    message: "Preparing image...",
  });

  // Convert file to data URL
  const dataUrl = await fileToDataUrl(file);

  onProgress?.({
    status: "recognizing",
    progress: 30,
    message: "Sending to Mistral OCR...",
  });

  // Call Mistral's OCR API directly from the browser
  const response = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: {
        type: "image_url",
        image_url: dataUrl,
      },
    }),
  });

  onProgress?.({
    status: "recognizing",
    progress: 70,
    message: "Processing response...",
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error?.message || errorText;
    } catch {
      errorMessage = errorText;
    }

    // Provide user-friendly error messages
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your Mistral API key and try again.");
    } else if (response.status === 403) {
      throw new Error("API key does not have permission for OCR. Please ensure your Mistral API key has OCR access.");
    } else if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }

    throw new Error(`Mistral API error (${response.status}): ${errorMessage}`);
  }

  const data: MistralOCRResponse = await response.json();

  onProgress?.({
    status: "complete",
    progress: 100,
    message: "Complete!",
  });

  const endTime = performance.now();

  if (!data.pages || data.pages.length === 0) {
    return {
      text: "",
      pages: [],
      processingTimeMs: Math.round(endTime - startTime),
      provider: "mistral",
    };
  }

  // Combine markdown content from all pages
  const extractedText = data.pages
    .map((page) => page.markdown)
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const pages: OCRPage[] = data.pages.map((page, index) => ({
    pageNumber: index + 1,
    text: page.markdown || "",
  }));

  return {
    text: extractedText,
    pages,
    processingTimeMs: Math.round(endTime - startTime),
    provider: "mistral",
  };
}
