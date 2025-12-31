import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { isClientSideSupported, isPdfFile } from "../lib/ocr/providers/tesseract-browser";

// Helper to create a mock File object
function createMockFile(name: string, type: string, size: number = 1024): File {
  const blob = new Blob([""], { type });
  return new File([blob], name, { type });
}

describe("Privacy Mode - Client-side Tesseract", () => {
  describe("isClientSideSupported", () => {
    test("should return true for PNG files", () => {
      const file = createMockFile("test.png", "image/png");
      expect(isClientSideSupported(file)).toBe(true);
    });

    test("should return true for JPEG files", () => {
      const file = createMockFile("test.jpg", "image/jpeg");
      expect(isClientSideSupported(file)).toBe(true);
    });

    test("should return true for image/jpg MIME type", () => {
      const file = createMockFile("test.jpg", "image/jpg");
      expect(isClientSideSupported(file)).toBe(true);
    });

    test("should return true for GIF files", () => {
      const file = createMockFile("test.gif", "image/gif");
      expect(isClientSideSupported(file)).toBe(true);
    });

    test("should return true for WebP files", () => {
      const file = createMockFile("test.webp", "image/webp");
      expect(isClientSideSupported(file)).toBe(true);
    });

    test("should return true for BMP files", () => {
      const file = createMockFile("test.bmp", "image/bmp");
      expect(isClientSideSupported(file)).toBe(true);
    });

    test("should return true for PDF files (supported via PDF.js)", () => {
      const file = createMockFile("test.pdf", "application/pdf");
      expect(isClientSideSupported(file)).toBe(true);
    });

    test("should return false for TIFF files", () => {
      const file = createMockFile("test.tiff", "image/tiff");
      expect(isClientSideSupported(file)).toBe(false);
    });

    test("should return false for SVG files", () => {
      const file = createMockFile("test.svg", "image/svg+xml");
      expect(isClientSideSupported(file)).toBe(false);
    });

    test("should return false for text files", () => {
      const file = createMockFile("test.txt", "text/plain");
      expect(isClientSideSupported(file)).toBe(false);
    });

    test("should return false for unknown MIME types", () => {
      const file = createMockFile("test.unknown", "application/octet-stream");
      expect(isClientSideSupported(file)).toBe(false);
    });

    test("should return false for empty MIME type", () => {
      const file = createMockFile("test", "");
      expect(isClientSideSupported(file)).toBe(false);
    });

    test("should handle uppercase MIME types (File API normalizes to lowercase)", () => {
      // Note: The File API in browsers normalizes MIME types to lowercase,
      // so "IMAGE/PNG" becomes "image/png". This test documents that behavior.
      const file = createMockFile("test.png", "IMAGE/PNG");
      // Browser File API normalizes the type, so this returns true
      expect(isClientSideSupported(file)).toBe(true);
    });

    test("should handle mixed case MIME types (File API normalizes to lowercase)", () => {
      const file = createMockFile("test.jpg", "Image/Jpeg");
      // Browser File API normalizes the type, so this returns true
      expect(isClientSideSupported(file)).toBe(true);
    });
  });

  describe("isPdfFile", () => {
    test("should return true for PDF files", () => {
      const file = createMockFile("document.pdf", "application/pdf");
      expect(isPdfFile(file)).toBe(true);
    });

    test("should return false for PNG files", () => {
      const file = createMockFile("image.png", "image/png");
      expect(isPdfFile(file)).toBe(false);
    });

    test("should return false for JPEG files", () => {
      const file = createMockFile("image.jpg", "image/jpeg");
      expect(isPdfFile(file)).toBe(false);
    });

    test("should return false for text files", () => {
      const file = createMockFile("document.txt", "text/plain");
      expect(isPdfFile(file)).toBe(false);
    });

    test("should return false for files with .pdf extension but wrong MIME type", () => {
      // Edge case: file has .pdf extension but wrong MIME type
      const file = createMockFile("fake.pdf", "image/png");
      expect(isPdfFile(file)).toBe(false);
    });

    test("should return false for empty MIME type", () => {
      const file = createMockFile("unknown.pdf", "");
      expect(isPdfFile(file)).toBe(false);
    });
  });

  describe("File type validation combinations", () => {
    test("PDF files should be supported for client-side and identified as PDF", () => {
      const file = createMockFile("document.pdf", "application/pdf");
      expect(isClientSideSupported(file)).toBe(true);
      expect(isPdfFile(file)).toBe(true);
    });

    test("Image files should be supported for client-side and not identified as PDF", () => {
      const imageTypes = [
        { name: "test.png", type: "image/png" },
        { name: "test.jpg", type: "image/jpeg" },
        { name: "test.gif", type: "image/gif" },
        { name: "test.webp", type: "image/webp" },
        { name: "test.bmp", type: "image/bmp" },
      ];

      for (const { name, type } of imageTypes) {
        const file = createMockFile(name, type);
        expect(isClientSideSupported(file)).toBe(true);
        expect(isPdfFile(file)).toBe(false);
      }
    });

    test("Unsupported formats should not be client-side supported and not identified as PDF", () => {
      const unsupportedTypes = [
        { name: "test.tiff", type: "image/tiff" },
        { name: "test.svg", type: "image/svg+xml" },
        { name: "test.doc", type: "application/msword" },
      ];

      for (const { name, type } of unsupportedTypes) {
        const file = createMockFile(name, type);
        expect(isClientSideSupported(file)).toBe(false);
        expect(isPdfFile(file)).toBe(false);
      }
    });
  });
});
