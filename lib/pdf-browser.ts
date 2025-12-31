"use client";

const DPI = 300;
const SCALE = DPI / 72; // PDF.js uses 72 DPI as base

export interface BrowserPDFPage {
  pageNumber: number;
  imageBlob: Blob;
  width: number;
  height: number;
}

export interface PDFConversionProgress {
  currentPage: number;
  totalPages: number;
  message: string;
}

// Lazy-load pdfjs-dist only when needed (browser only)
async function getPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");

  // Set up the worker on first load
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  return pdfjsLib;
}

/**
 * Convert a PDF file to images in the browser using PDF.js
 * Each page is rendered to a canvas at 300 DPI and converted to a PNG blob
 */
export async function pdfToImagesInBrowser(
  file: File,
  onProgress?: (progress: PDFConversionProgress) => void
): Promise<BrowserPDFPage[]> {
  const pdfjsLib = await getPdfJs();

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Load the PDF document
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    disableAutoFetch: true,
  }).promise;

  const totalPages = pdf.numPages;
  const pages: BrowserPDFPage[] = [];

  try {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.({
        currentPage: pageNum,
        totalPages,
        message: `Converting page ${pageNum} of ${totalPages}...`,
      });

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: SCALE });

      // Create canvas for rendering
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Failed to get canvas 2D context");
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render the page to the canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Convert canvas to blob (more memory efficient than data URL)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to convert canvas to blob"));
            }
          },
          "image/png"
        );
      });

      pages.push({
        pageNumber: pageNum,
        imageBlob: blob,
        width: viewport.width,
        height: viewport.height,
      });

      // Clean up the page to free memory
      page.cleanup();
    }

    return pages;
  } finally {
    // Clean up the PDF document
    await pdf.destroy();
  }
}

/**
 * Get the number of pages in a PDF file
 */
export async function getPDFPageCountInBrowser(file: File): Promise<number> {
  const pdfjsLib = await getPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    disableAutoFetch: true,
  }).promise;

  const numPages = pdf.numPages;
  await pdf.destroy();

  return numPages;
}

/**
 * Check if the browser supports the required APIs for PDF conversion
 */
export function isBrowserPDFSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof document.createElement === "function" &&
    typeof HTMLCanvasElement !== "undefined"
  );
}
