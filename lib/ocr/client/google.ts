"use client";

import type { OCRResult, OCRPage, OCRProgressCallback } from "../types";

interface GoogleVisionTextAnnotation {
  locale?: string;
  description: string;
  boundingPoly?: {
    vertices: { x: number; y: number }[];
  };
}

interface GoogleVisionFullTextAnnotation {
  pages?: {
    width: number;
    height: number;
    blocks?: unknown[];
  }[];
  text: string;
}

interface GoogleVisionResponse {
  responses: {
    textAnnotations?: GoogleVisionTextAnnotation[];
    fullTextAnnotation?: GoogleVisionFullTextAnnotation;
    error?: {
      code: number;
      message: string;
      status: string;
    };
  }[];
}

/**
 * Convert a File to base64 (without the data URL prefix)
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Process an image using Google Cloud Vision directly from the browser.
 * This function runs entirely client-side with the user's API key.
 * The key is sent directly to Google's API - it never touches our servers.
 *
 * Note: For browser access, you need a Google Cloud API key (not a service account).
 * Create one at: https://console.cloud.google.com/apis/credentials
 * Ensure the Cloud Vision API is enabled for your project.
 */
export async function processGoogleVisionOCR(
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

  // Convert file to base64
  const base64Image = await fileToBase64(file);

  onProgress?.({
    status: "recognizing",
    progress: 30,
    message: "Sending to Google Cloud Vision...",
  });

  // Call Google Vision API directly from the browser
  // Using DOCUMENT_TEXT_DETECTION for better handling of dense text
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: "DOCUMENT_TEXT_DETECTION",
                maxResults: 1,
              },
            ],
          },
        ],
      }),
    }
  );

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
      errorMessage = errorJson.error?.message || errorText;
    } catch {
      errorMessage = errorText;
    }

    // Provide user-friendly error messages
    if (response.status === 400) {
      if (errorMessage.includes("API key not valid")) {
        throw new Error("Invalid API key. Please check your Google Cloud API key and try again.");
      }
      throw new Error(`Invalid request: ${errorMessage}`);
    } else if (response.status === 403) {
      if (errorMessage.includes("has not been used") || errorMessage.includes("disabled")) {
        throw new Error("Cloud Vision API is not enabled. Please enable it in your Google Cloud Console.");
      }
      throw new Error("API key does not have permission for Vision API. Please check your API key restrictions.");
    } else if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }

    throw new Error(`Google Vision API error (${response.status}): ${errorMessage}`);
  }

  const data: GoogleVisionResponse = await response.json();

  // Check for API-level errors in the response
  const firstResponse = data.responses?.[0];
  if (firstResponse?.error) {
    const err = firstResponse.error;
    throw new Error(`Google Vision API error: ${err.message}`);
  }

  onProgress?.({
    status: "complete",
    progress: 100,
    message: "Complete!",
  });

  const endTime = performance.now();

  // Extract text from fullTextAnnotation (preferred) or textAnnotations
  const fullTextAnnotation = firstResponse?.fullTextAnnotation;
  const extractedText = fullTextAnnotation?.text || "";

  if (!extractedText) {
    return {
      text: "",
      pages: [],
      processingTimeMs: Math.round(endTime - startTime),
      provider: "google",
    };
  }

  // For images, we typically have one "page"
  const pages: OCRPage[] = [
    {
      pageNumber: 1,
      text: extractedText,
    },
  ];

  return {
    text: extractedText.trim(),
    pages,
    processingTimeMs: Math.round(endTime - startTime),
    provider: "google",
  };
}
