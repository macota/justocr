import { describe, test, expect } from "bun:test";
import {
  compareBenchmarks,
  exportAsJSON,
  exportAsCSV,
  createInitialBenchmarkResults,
  updateBenchmarkResult,
  isBenchmarkComplete,
} from "../lib/ocr/benchmark";
import type { BenchmarkResults, BenchmarkProviderResult, OCRResult } from "../lib/ocr/types";

// Helper to create mock OCR results
function createMockOCRResult(overrides: Partial<OCRResult> = {}): OCRResult {
  return {
    text: "Sample extracted text from the document",
    pages: [{ pageNumber: 1, text: "Sample extracted text from the document" }],
    processingTimeMs: 1500,
    provider: "Test Provider",
    ...overrides,
  };
}

// Helper to create mock benchmark results
function createMockBenchmarkResults(
  providerResults: Partial<BenchmarkProviderResult>[]
): BenchmarkResults {
  return {
    results: providerResults.map((pr, index) => ({
      providerId: `provider-${index}`,
      providerName: `Provider ${index}`,
      result: null,
      error: null,
      status: "completed" as const,
      ...pr,
    })),
    completedAt: Date.now(),
  };
}

describe("Benchmark Utilities", () => {
  describe("compareBenchmarks", () => {
    test("should return empty stats when no successful results", () => {
      const results = createMockBenchmarkResults([
        { providerId: "p1", status: "error", error: "Failed" },
        { providerId: "p2", status: "error", error: "Also failed" },
      ]);

      const stats = compareBenchmarks(results);

      expect(stats.fastest).toBeNull();
      expect(stats.slowest).toBeNull();
      expect(stats.mostCharacters).toBeNull();
      expect(stats.leastCharacters).toBeNull();
      expect(stats.averageTimeMs).toBe(0);
      expect(stats.averageCharCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.errorCount).toBe(2);
    });

    test("should correctly identify fastest and slowest providers", () => {
      const results = createMockBenchmarkResults([
        {
          providerId: "fast",
          providerName: "Fast Provider",
          result: createMockOCRResult({ processingTimeMs: 500 }),
          status: "completed",
        },
        {
          providerId: "medium",
          providerName: "Medium Provider",
          result: createMockOCRResult({ processingTimeMs: 1500 }),
          status: "completed",
        },
        {
          providerId: "slow",
          providerName: "Slow Provider",
          result: createMockOCRResult({ processingTimeMs: 3000 }),
          status: "completed",
        },
      ]);

      const stats = compareBenchmarks(results);

      expect(stats.fastest).not.toBeNull();
      expect(stats.fastest?.providerId).toBe("fast");
      expect(stats.fastest?.timeMs).toBe(500);

      expect(stats.slowest).not.toBeNull();
      expect(stats.slowest?.providerId).toBe("slow");
      expect(stats.slowest?.timeMs).toBe(3000);
    });

    test("should correctly identify most and least characters", () => {
      const results = createMockBenchmarkResults([
        {
          providerId: "most",
          providerName: "Most Text Provider",
          result: createMockOCRResult({ text: "A".repeat(1000) }),
          status: "completed",
        },
        {
          providerId: "medium",
          providerName: "Medium Text Provider",
          result: createMockOCRResult({ text: "B".repeat(500) }),
          status: "completed",
        },
        {
          providerId: "least",
          providerName: "Least Text Provider",
          result: createMockOCRResult({ text: "C".repeat(100) }),
          status: "completed",
        },
      ]);

      const stats = compareBenchmarks(results);

      expect(stats.mostCharacters).not.toBeNull();
      expect(stats.mostCharacters?.providerId).toBe("most");
      expect(stats.mostCharacters?.charCount).toBe(1000);

      expect(stats.leastCharacters).not.toBeNull();
      expect(stats.leastCharacters?.providerId).toBe("least");
      expect(stats.leastCharacters?.charCount).toBe(100);
    });

    test("should calculate correct averages", () => {
      const results = createMockBenchmarkResults([
        {
          providerId: "p1",
          result: createMockOCRResult({ processingTimeMs: 1000, text: "A".repeat(100) }),
          status: "completed",
        },
        {
          providerId: "p2",
          result: createMockOCRResult({ processingTimeMs: 2000, text: "B".repeat(200) }),
          status: "completed",
        },
        {
          providerId: "p3",
          result: createMockOCRResult({ processingTimeMs: 3000, text: "C".repeat(300) }),
          status: "completed",
        },
      ]);

      const stats = compareBenchmarks(results);

      expect(stats.averageTimeMs).toBe(2000); // (1000 + 2000 + 3000) / 3
      expect(stats.averageCharCount).toBe(200); // (100 + 200 + 300) / 3
      expect(stats.successCount).toBe(3);
      expect(stats.errorCount).toBe(0);
    });

    test("should handle mixed success and error results", () => {
      const results = createMockBenchmarkResults([
        {
          providerId: "success1",
          result: createMockOCRResult({ processingTimeMs: 1000, text: "Success" }),
          status: "completed",
        },
        {
          providerId: "error1",
          result: null,
          error: "Provider failed",
          status: "error",
        },
        {
          providerId: "success2",
          result: createMockOCRResult({ processingTimeMs: 2000, text: "Also success" }),
          status: "completed",
        },
      ]);

      const stats = compareBenchmarks(results);

      expect(stats.successCount).toBe(2);
      expect(stats.errorCount).toBe(1);
      expect(stats.averageTimeMs).toBe(1500); // Only from successful results
    });

    test("should handle single provider result", () => {
      const results = createMockBenchmarkResults([
        {
          providerId: "only",
          providerName: "Only Provider",
          result: createMockOCRResult({ processingTimeMs: 1234, text: "Only text" }),
          status: "completed",
        },
      ]);

      const stats = compareBenchmarks(results);

      expect(stats.fastest?.providerId).toBe("only");
      expect(stats.slowest?.providerId).toBe("only");
      expect(stats.mostCharacters?.providerId).toBe("only");
      expect(stats.leastCharacters?.providerId).toBe("only");
      expect(stats.successCount).toBe(1);
    });
  });

  describe("exportAsJSON", () => {
    test("should export valid JSON with correct structure", () => {
      const results = createMockBenchmarkResults([
        {
          providerId: "tesseract",
          providerName: "Tesseract",
          result: createMockOCRResult({
            processingTimeMs: 1500,
            text: "Extracted text",
            pages: [{ pageNumber: 1, text: "Extracted text" }],
          }),
          status: "completed",
        },
      ]);

      const json = exportAsJSON(results);
      const parsed = JSON.parse(json);

      expect(parsed.timestamp).toBeDefined();
      expect(parsed.statistics).toBeDefined();
      expect(parsed.providers).toBeInstanceOf(Array);
      expect(parsed.providers).toHaveLength(1);
      expect(parsed.providers[0].providerId).toBe("tesseract");
      expect(parsed.providers[0].result.text).toBe("Extracted text");
      expect(parsed.providers[0].result.processingTimeMs).toBe(1500);
      expect(parsed.providers[0].result.characterCount).toBe(14);
    });

    test("should include statistics in JSON export", () => {
      const results = createMockBenchmarkResults([
        {
          providerId: "fast",
          providerName: "Fast Provider",
          result: createMockOCRResult({ processingTimeMs: 500 }),
          status: "completed",
        },
        {
          providerId: "slow",
          providerName: "Slow Provider",
          result: createMockOCRResult({ processingTimeMs: 2000 }),
          status: "completed",
        },
      ]);

      const json = exportAsJSON(results);
      const parsed = JSON.parse(json);

      expect(parsed.statistics.fastest.providerId).toBe("fast");
      expect(parsed.statistics.slowest.providerId).toBe("slow");
      expect(parsed.statistics.successCount).toBe(2);
    });

    test("should handle error results in JSON export", () => {
      const results = createMockBenchmarkResults([
        {
          providerId: "failed",
          providerName: "Failed Provider",
          result: null,
          error: "Processing error",
          status: "error",
        },
      ]);

      const json = exportAsJSON(results);
      const parsed = JSON.parse(json);

      expect(parsed.providers[0].status).toBe("error");
      expect(parsed.providers[0].error).toBe("Processing error");
      expect(parsed.providers[0].result).toBeNull();
    });
  });

  describe("exportAsCSV", () => {
    test("should export valid CSV with headers", () => {
      const results = createMockBenchmarkResults([
        {
          providerId: "tesseract",
          providerName: "Tesseract",
          result: createMockOCRResult({
            processingTimeMs: 1500,
            text: "Test text",
            pages: [{ pageNumber: 1, text: "Test text" }],
          }),
          status: "completed",
        },
      ]);

      const csv = exportAsCSV(results);
      const lines = csv.split("\n");

      expect(lines.length).toBe(2); // Header + 1 row
      expect(lines[0]).toBe(
        "Provider ID,Provider Name,Status,Processing Time (ms),Character Count,Page Count,Error"
      );
    });

    test("should correctly format CSV data rows", () => {
      const results = createMockBenchmarkResults([
        {
          providerId: "tesseract",
          providerName: "Tesseract Provider",
          result: createMockOCRResult({
            processingTimeMs: 1500,
            text: "Test text",
            pages: [
              { pageNumber: 1, text: "Test" },
              { pageNumber: 2, text: "text" },
            ],
          }),
          status: "completed",
        },
      ]);

      const csv = exportAsCSV(results);
      const lines = csv.split("\n");
      const dataRow = lines[1].split(",");

      expect(dataRow[0]).toBe("tesseract");
      expect(dataRow[1]).toBe('"Tesseract Provider"');
      expect(dataRow[2]).toBe("completed");
      expect(dataRow[3]).toBe("1500");
      expect(dataRow[4]).toBe("9"); // "Test text" length
      expect(dataRow[5]).toBe("2");
    });

    test("should escape quotes in CSV values", () => {
      const results = createMockBenchmarkResults([
        {
          providerId: "error-provider",
          providerName: "Error Provider",
          result: null,
          error: 'Error with "quotes" inside',
          status: "error",
        },
      ]);

      const csv = exportAsCSV(results);

      expect(csv).toContain('""quotes""'); // Double-escaped quotes
    });

    test("should handle multiple providers in CSV", () => {
      const results = createMockBenchmarkResults([
        {
          providerId: "p1",
          providerName: "Provider 1",
          result: createMockOCRResult({ processingTimeMs: 1000 }),
          status: "completed",
        },
        {
          providerId: "p2",
          providerName: "Provider 2",
          result: createMockOCRResult({ processingTimeMs: 2000 }),
          status: "completed",
        },
        {
          providerId: "p3",
          providerName: "Provider 3",
          result: null,
          error: "Failed",
          status: "error",
        },
      ]);

      const csv = exportAsCSV(results);
      const lines = csv.split("\n");

      expect(lines.length).toBe(4); // Header + 3 rows
    });
  });

  describe("createInitialBenchmarkResults", () => {
    test("should create results with pending status for all providers", () => {
      const providers = [
        { id: "tesseract", name: "Tesseract" },
        { id: "mistral", name: "Mistral OCR" },
        { id: "google", name: "Google Cloud Vision" },
      ];

      const results = createInitialBenchmarkResults(providers);

      expect(results.results).toHaveLength(3);
      expect(results.results.every((r) => r.status === "pending")).toBe(true);
      expect(results.results.every((r) => r.result === null)).toBe(true);
      expect(results.results.every((r) => r.error === null)).toBe(true);
      expect(results.completedAt).toBe(0);
    });

    test("should preserve provider IDs and names", () => {
      const providers = [
        { id: "custom-id", name: "Custom Provider Name" },
      ];

      const results = createInitialBenchmarkResults(providers);

      expect(results.results[0].providerId).toBe("custom-id");
      expect(results.results[0].providerName).toBe("Custom Provider Name");
    });
  });

  describe("updateBenchmarkResult", () => {
    test("should update specific provider result", () => {
      const initial = createInitialBenchmarkResults([
        { id: "p1", name: "Provider 1" },
        { id: "p2", name: "Provider 2" },
      ]);

      const updated = updateBenchmarkResult(initial, "p1", {
        status: "completed",
        result: createMockOCRResult(),
      });

      expect(updated.results[0].status).toBe("completed");
      expect(updated.results[0].result).not.toBeNull();
      expect(updated.results[1].status).toBe("pending"); // Unchanged
    });

    test("should not modify other providers", () => {
      const initial = createInitialBenchmarkResults([
        { id: "p1", name: "Provider 1" },
        { id: "p2", name: "Provider 2" },
      ]);

      const updated = updateBenchmarkResult(initial, "p1", {
        status: "error",
        error: "Failed",
      });

      expect(updated.results[1]).toEqual(initial.results[1]);
    });

    test("should handle updating non-existent provider gracefully", () => {
      const initial = createInitialBenchmarkResults([
        { id: "p1", name: "Provider 1" },
      ]);

      const updated = updateBenchmarkResult(initial, "non-existent", {
        status: "completed",
      });

      // Should return unchanged results
      expect(updated.results).toHaveLength(1);
      expect(updated.results[0].providerId).toBe("p1");
      expect(updated.results[0].status).toBe("pending");
    });
  });

  describe("isBenchmarkComplete", () => {
    test("should return true when all results are completed", () => {
      const results = createMockBenchmarkResults([
        { providerId: "p1", status: "completed" },
        { providerId: "p2", status: "completed" },
      ]);

      expect(isBenchmarkComplete(results)).toBe(true);
    });

    test("should return true when all results are either completed or error", () => {
      const results = createMockBenchmarkResults([
        { providerId: "p1", status: "completed" },
        { providerId: "p2", status: "error", error: "Failed" },
      ]);

      expect(isBenchmarkComplete(results)).toBe(true);
    });

    test("should return false when some results are pending", () => {
      const results = createMockBenchmarkResults([
        { providerId: "p1", status: "completed" },
        { providerId: "p2", status: "pending" },
      ]);

      expect(isBenchmarkComplete(results)).toBe(false);
    });

    test("should return false when some results are processing", () => {
      const results = createMockBenchmarkResults([
        { providerId: "p1", status: "completed" },
        { providerId: "p2", status: "processing" },
      ]);

      expect(isBenchmarkComplete(results)).toBe(false);
    });

    test("should return true for empty results", () => {
      const results: BenchmarkResults = {
        results: [],
        completedAt: Date.now(),
      };

      expect(isBenchmarkComplete(results)).toBe(true);
    });
  });
});
