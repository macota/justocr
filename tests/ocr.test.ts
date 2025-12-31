import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { processOCR, getProvider, getAvailableProviders } from "../lib/ocr";
import { pdfToImages } from "../lib/pdf";

const TEST_FILES_DIR = join(__dirname, "../test_files");

describe("OCR Provider Registry", () => {
  describe("getProvider", () => {
    test("should return provider for valid provider ID", () => {
      const provider = getProvider("mistral");
      expect(provider).toBeDefined();
      expect(provider?.name).toBe("Mistral OCR");
    });

    test("should return undefined for unknown provider ID", () => {
      const provider = getProvider("unknown-provider");
      expect(provider).toBeUndefined();
    });

    test("should return undefined for empty string", () => {
      const provider = getProvider("");
      expect(provider).toBeUndefined();
    });
  });

  describe("getAvailableProviders", () => {
    test("should return array of provider IDs", () => {
      const providers = getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers).toContain("mistral");
      expect(providers).toContain("google");
    });
  });

  describe("processOCR error handling", () => {
    test("should throw error for unknown provider", async () => {
      const imageBuffer = Buffer.from("fake image data");

      await expect(
        processOCR("unknown-provider", [
          { buffer: imageBuffer, mimeType: "image/png", pageNumber: 1 },
        ])
      ).rejects.toThrow("Unknown provider: unknown-provider");
    });

    test("should throw error for empty provider ID", async () => {
      const imageBuffer = Buffer.from("fake image data");

      await expect(
        processOCR("", [
          { buffer: imageBuffer, mimeType: "image/png", pageNumber: 1 },
        ])
      ).rejects.toThrow("Unknown provider: ");
    });
  });
});

describe("OCR Tests", () => {
  describe("PNG Image OCR", () => {
    test("should extract text from Feynman screenshot using Mistral", async () => {
      // Skip if no API key
      if (!process.env.MISTRAL_API_KEY) {
        console.log("Skipping PNG OCR test - MISTRAL_API_KEY not set");
        return;
      }

      const imagePath = join(TEST_FILES_DIR, "Feynman_screenshot_1_page_excerpt.png");
      const imageBuffer = readFileSync(imagePath);

      const result = await processOCR("mistral", [
        { buffer: imageBuffer, mimeType: "image/png", pageNumber: 1 },
      ]);

      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(100);
      expect(result.pages).toHaveLength(1);
      expect(result.provider).toBe("Mistral OCR");

      // Check for some expected content from the index
      const textLower = result.text.toLowerCase();
      expect(textLower).toContain("quantum");

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
        "FeynmanHughesLectures_Vol1_1_page_excerpt.pdf"
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

    test("should extract text from PDF via OCR using Mistral", async () => {
      // Skip if no API key
      if (!process.env.MISTRAL_API_KEY) {
        console.log("Skipping PDF OCR test - MISTRAL_API_KEY not set");
        return;
      }

      const pdfPath = join(
        TEST_FILES_DIR,
        "FeynmanHughesLectures_Vol1_1_page_excerpt.pdf"
      );
      const pdfBuffer = readFileSync(pdfPath);

      // Convert PDF to images
      const pages = await pdfToImages(pdfBuffer);

      // Run OCR on converted images
      const result = await processOCR(
        "mistral",
        pages.map((page) => ({
          buffer: page.imageBuffer,
          mimeType: "image/png",
          pageNumber: page.pageNumber,
        }))
      );

      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(100);
      expect(result.pages).toHaveLength(1);
      expect(result.provider).toBe("Mistral OCR");

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

  // Note: Mistral and Google Cloud Vision live API tests have been moved to
  // ocr.integration.test.ts to keep unit tests fast and CI-friendly.

  describe("Result Comparison", () => {
    test("PNG and PDF of same content should produce similar results", async () => {
      // Skip if no API key
      if (!process.env.MISTRAL_API_KEY) {
        console.log("Skipping comparison test - MISTRAL_API_KEY not set");
        return;
      }

      // Load PNG
      const imagePath = join(TEST_FILES_DIR, "Feynman_screenshot_1_page_excerpt.png");
      const imageBuffer = readFileSync(imagePath);

      // Load PDF
      const pdfPath = join(
        TEST_FILES_DIR,
        "FeynmanHughesLectures_Vol1_1_page_excerpt.pdf"
      );
      const pdfBuffer = readFileSync(pdfPath);
      const pdfPages = await pdfToImages(pdfBuffer);

      // OCR both
      const pngResult = await processOCR("mistral", [
        { buffer: imageBuffer, mimeType: "image/png", pageNumber: 1 },
      ]);

      const pdfResult = await processOCR(
        "mistral",
        pdfPages.map((page) => ({
          buffer: page.imageBuffer,
          mimeType: "image/png",
          pageNumber: page.pageNumber,
        }))
      );

      // Guard against silent failures - both outputs must be non-empty
      expect(pngResult.text.length).toBeGreaterThan(0);
      expect(pdfResult.text.length).toBeGreaterThan(0);

      // Both should find similar key terms
      const pngTextLower = pngResult.text.toLowerCase();
      const pdfTextLower = pdfResult.text.toLowerCase();

      // Both should contain at least one key term from the Feynman content
      const keyTerms = ["quantum", "radiation", "equation"];
      const pngHasKeyTerm = keyTerms.some((term) => pngTextLower.includes(term));
      const pdfHasKeyTerm = keyTerms.some((term) => pdfTextLower.includes(term));

      expect(pngHasKeyTerm).toBe(true);
      expect(pdfHasKeyTerm).toBe(true);

      // Log for debugging (optional)
      console.log("\n=== Comparison Results ===");
      console.log(`PNG text length: ${pngResult.text.length}`);
      console.log(`PDF text length: ${pdfResult.text.length}`);
    }, 120000); // 2 minute timeout for comparison test
  });
});
