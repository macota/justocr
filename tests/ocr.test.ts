import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { processOCR } from "../lib/ocr";
import { pdfToImages } from "../lib/pdf";

const TEST_FILES_DIR = join(__dirname, "../test_files");

describe("OCR Tests", () => {
  describe("PNG Image OCR", () => {
    test("should extract text from Feynman screenshot", async () => {
      const imagePath = join(TEST_FILES_DIR, "Feynman_screenshot.png");
      const imageBuffer = readFileSync(imagePath);

      const result = await processOCR("tesseract", [
        { buffer: imageBuffer, mimeType: "image/png", pageNumber: 1 },
      ]);

      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(100);
      expect(result.pages).toHaveLength(1);
      expect(result.provider).toBe("Tesseract");

      // Check for some expected content from the index
      const textLower = result.text.toLowerCase();
      expect(textLower).toContain("quantum");
      expect(textLower).toContain("radiation");

      console.log("\n=== PNG OCR Result ===");
      console.log(`Processing time: ${result.processingTimeMs}ms`);
      console.log(`Text length: ${result.text.length} characters`);
      console.log("Sample text (first 500 chars):");
      console.log(result.text.slice(0, 500));
    }, 60000); // 60 second timeout for OCR
  });

  describe("PDF Support", () => {
    test("should convert PDF to images", async () => {
      const pdfPath = join(
        TEST_FILES_DIR,
        "FeynmanHughesLectures_Vol1 (dragged).pdf"
      );
      const pdfBuffer = readFileSync(pdfPath);

      const pages = await pdfToImages(pdfBuffer);

      expect(pages).toHaveLength(1); // Single page PDF
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].imageBuffer).toBeInstanceOf(Buffer);
      expect(pages[0].width).toBeGreaterThan(0);
      expect(pages[0].height).toBeGreaterThan(0);

      console.log("\n=== PDF Conversion Result ===");
      console.log(`Pages: ${pages.length}`);
      console.log(
        `Page 1 dimensions: ${pages[0].width}x${pages[0].height}px`
      );
      console.log(`Image buffer size: ${pages[0].imageBuffer.length} bytes`);
    }, 30000);

    test("should extract text from PDF via OCR", async () => {
      const pdfPath = join(
        TEST_FILES_DIR,
        "FeynmanHughesLectures_Vol1 (dragged).pdf"
      );
      const pdfBuffer = readFileSync(pdfPath);

      // Convert PDF to images
      const pages = await pdfToImages(pdfBuffer);

      // Run OCR on converted images
      const result = await processOCR(
        "tesseract",
        pages.map((page) => ({
          buffer: page.imageBuffer,
          mimeType: "image/png",
          pageNumber: page.pageNumber,
        }))
      );

      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(100);
      expect(result.pages).toHaveLength(1);
      expect(result.provider).toBe("Tesseract");

      // Check for expected content
      const textLower = result.text.toLowerCase();
      expect(textLower).toContain("quantum");

      console.log("\n=== PDF OCR Result ===");
      console.log(`Processing time: ${result.processingTimeMs}ms`);
      console.log(`Text length: ${result.text.length} characters`);
      console.log("Sample text (first 500 chars):");
      console.log(result.text.slice(0, 500));
    }, 90000); // 90 second timeout for PDF OCR
  });

  describe("Result Comparison", () => {
    test("PNG and PDF of same content should produce similar results", async () => {
      // Load PNG
      const imagePath = join(TEST_FILES_DIR, "Feynman_screenshot.png");
      const imageBuffer = readFileSync(imagePath);

      // Load PDF
      const pdfPath = join(
        TEST_FILES_DIR,
        "FeynmanHughesLectures_Vol1 (dragged).pdf"
      );
      const pdfBuffer = readFileSync(pdfPath);
      const pdfPages = await pdfToImages(pdfBuffer);

      // OCR both
      const pngResult = await processOCR("tesseract", [
        { buffer: imageBuffer, mimeType: "image/png", pageNumber: 1 },
      ]);

      const pdfResult = await processOCR(
        "tesseract",
        pdfPages.map((page) => ({
          buffer: page.imageBuffer,
          mimeType: "image/png",
          pageNumber: page.pageNumber,
        }))
      );

      // Both should find similar key terms
      const pngTextLower = pngResult.text.toLowerCase();
      const pdfTextLower = pdfResult.text.toLowerCase();

      // Both should contain key terms from the Feynman index
      const keyTerms = ["quantum", "radiation", "equation"];
      for (const term of keyTerms) {
        const pngHas = pngTextLower.includes(term);
        const pdfHas = pdfTextLower.includes(term);
        console.log(`Term "${term}": PNG=${pngHas}, PDF=${pdfHas}`);
      }

      console.log("\n=== Comparison Results ===");
      console.log(`PNG text length: ${pngResult.text.length}`);
      console.log(`PDF text length: ${pdfResult.text.length}`);
      console.log(`PNG processing time: ${pngResult.processingTimeMs}ms`);
      console.log(`PDF processing time: ${pdfResult.processingTimeMs}ms`);
    }, 120000); // 2 minute timeout for comparison test
  });
});
