/**
 * Integration tests for OCR providers that require live API access.
 *
 * These tests are skipped by default unless the required environment
 * variables are set. They make real API calls and may incur costs.
 *
 * To run:
 * - Mistral: Set MISTRAL_API_KEY environment variable
 * - Google: Set up Application Default Credentials (gcloud auth application-default login)
 *           or set GOOGLE_APPLICATION_CREDENTIALS. Use SKIP_GOOGLE_VISION_TEST=1 to skip.
 */
import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { processOCR } from "../lib/ocr";

const TEST_FILES_DIR = join(__dirname, "../test_files");

describe("OCR Integration Tests", () => {
  describe("Mistral OCR", () => {
    test("should extract text from Feynman screenshot using Mistral", async () => {
      // Skip if no API key
      if (!process.env.MISTRAL_API_KEY) {
        console.log("Skipping Mistral test - MISTRAL_API_KEY not set");
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

      console.log("\n=== Mistral OCR Result ===");
      console.log(`Processing time: ${result.processingTimeMs}ms`);
      console.log(`Text length: ${result.text.length} characters`);
      console.log("Sample text (first 500 chars):");
      console.log(result.text.slice(0, 500));
    }, 60000); // 60 second timeout for API call
  });

  describe("Google Cloud Vision OCR", () => {
    test("should extract text from Feynman screenshot using Google Vision", async () => {
      // Skip if explicitly disabled or no GCP credentials configured
      if (process.env.SKIP_GOOGLE_VISION_TEST) {
        console.log("Skipping Google Vision test - SKIP_GOOGLE_VISION_TEST is set");
        return;
      }

      const imagePath = join(TEST_FILES_DIR, "Feynman_screenshot_1_page_excerpt.png");
      const imageBuffer = readFileSync(imagePath);

      const result = await processOCR("google", [
        { buffer: imageBuffer, mimeType: "image/png", pageNumber: 1 },
      ]);

      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(100);
      expect(result.pages).toHaveLength(1);
      expect(result.provider).toBe("Google Cloud Vision");

      // Check for some expected content from the index
      const textLower = result.text.toLowerCase();
      expect(textLower).toContain("quantum");

      console.log("\n=== Google Cloud Vision OCR Result ===");
      console.log(`Processing time: ${result.processingTimeMs}ms`);
      console.log(`Text length: ${result.text.length} characters`);
      console.log("Sample text (first 500 chars):");
      console.log(result.text.slice(0, 500));
    }, 60000); // 60 second timeout for API call
  });

  describe("Provider Comparison", () => {
    test("should compare Tesseract and Mistral results", async () => {
      // Skip if no Mistral API key
      if (!process.env.MISTRAL_API_KEY) {
        console.log("Skipping comparison test - MISTRAL_API_KEY not set");
        return;
      }

      const imagePath = join(TEST_FILES_DIR, "Feynman_screenshot_1_page_excerpt.png");
      const imageBuffer = readFileSync(imagePath);

      const [tesseractResult, mistralResult] = await Promise.all([
        processOCR("tesseract", [
          { buffer: imageBuffer, mimeType: "image/png", pageNumber: 1 },
        ]),
        processOCR("mistral", [
          { buffer: imageBuffer, mimeType: "image/png", pageNumber: 1 },
        ]),
      ]);

      // Both should produce non-empty results
      expect(tesseractResult.text.length).toBeGreaterThan(0);
      expect(mistralResult.text.length).toBeGreaterThan(0);

      // Both should find key terms
      const keyTerms = ["quantum", "radiation"];
      const tesseractLower = tesseractResult.text.toLowerCase();
      const mistralLower = mistralResult.text.toLowerCase();

      expect(keyTerms.some((t) => tesseractLower.includes(t))).toBe(true);
      expect(keyTerms.some((t) => mistralLower.includes(t))).toBe(true);

      console.log("\n=== Provider Comparison ===");
      console.log(`Tesseract: ${tesseractResult.text.length} chars, ${tesseractResult.processingTimeMs}ms`);
      console.log(`Mistral: ${mistralResult.text.length} chars, ${mistralResult.processingTimeMs}ms`);
    }, 120000);
  });
});
