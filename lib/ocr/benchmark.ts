import type {
  BenchmarkProviderResult,
  BenchmarkResults,
  BenchmarkStats,
  OCRResult,
} from "./types";

/**
 * Compute statistics from benchmark results
 */
export function compareBenchmarks(results: BenchmarkResults): BenchmarkStats {
  const successfulResults = results.results.filter(
    (r): r is BenchmarkProviderResult & { result: OCRResult } =>
      r.status === "completed" && r.result !== null
  );

  const errorResults = results.results.filter((r) => r.status === "error");

  if (successfulResults.length === 0) {
    return {
      fastest: null,
      slowest: null,
      mostCharacters: null,
      leastCharacters: null,
      averageTimeMs: 0,
      averageCharCount: 0,
      successCount: 0,
      errorCount: errorResults.length,
    };
  }

  // Find fastest and slowest by processing time
  const sortedByTime = [...successfulResults].sort(
    (a, b) => a.result.processingTimeMs - b.result.processingTimeMs
  );

  const fastestResult = sortedByTime[0];
  const slowestResult = sortedByTime[sortedByTime.length - 1];

  // Find most and least characters
  const sortedByChars = [...successfulResults].sort(
    (a, b) => b.result.text.length - a.result.text.length
  );

  const mostCharsResult = sortedByChars[0];
  const leastCharsResult = sortedByChars[sortedByChars.length - 1];

  // Calculate averages
  const totalTime = successfulResults.reduce(
    (sum, r) => sum + r.result.processingTimeMs,
    0
  );
  const totalChars = successfulResults.reduce(
    (sum, r) => sum + r.result.text.length,
    0
  );

  return {
    fastest: {
      providerId: fastestResult.providerId,
      providerName: fastestResult.providerName,
      timeMs: fastestResult.result.processingTimeMs,
    },
    slowest: {
      providerId: slowestResult.providerId,
      providerName: slowestResult.providerName,
      timeMs: slowestResult.result.processingTimeMs,
    },
    mostCharacters: {
      providerId: mostCharsResult.providerId,
      providerName: mostCharsResult.providerName,
      charCount: mostCharsResult.result.text.length,
    },
    leastCharacters: {
      providerId: leastCharsResult.providerId,
      providerName: leastCharsResult.providerName,
      charCount: leastCharsResult.result.text.length,
    },
    averageTimeMs: Math.round(totalTime / successfulResults.length),
    averageCharCount: Math.round(totalChars / successfulResults.length),
    successCount: successfulResults.length,
    errorCount: errorResults.length,
  };
}

/**
 * Export benchmark results as JSON
 */
export function exportAsJSON(results: BenchmarkResults): string {
  const stats = compareBenchmarks(results);

  const exportData = {
    timestamp: new Date(results.completedAt).toISOString(),
    statistics: stats,
    providers: results.results.map((r) => ({
      providerId: r.providerId,
      providerName: r.providerName,
      status: r.status,
      error: r.error,
      result: r.result
        ? {
            text: r.result.text,
            processingTimeMs: r.result.processingTimeMs,
            characterCount: r.result.text.length,
            pageCount: r.result.pages.length,
          }
        : null,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export benchmark results as CSV
 */
export function exportAsCSV(results: BenchmarkResults): string {
  const headers = [
    "Provider ID",
    "Provider Name",
    "Status",
    "Processing Time (ms)",
    "Character Count",
    "Page Count",
    "Error",
  ];

  const rows = results.results.map((r) => {
    const processingTime = r.result?.processingTimeMs ?? "";
    const charCount = r.result?.text.length ?? "";
    const pageCount = r.result?.pages.length ?? "";
    const error = r.error ? `"${r.error.replace(/"/g, '""')}"` : "";

    return [
      r.providerId,
      `"${r.providerName}"`,
      r.status,
      processingTime,
      charCount,
      pageCount,
      error,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Create initial benchmark results structure for selected providers
 */
export function createInitialBenchmarkResults(
  providers: { id: string; name: string }[]
): BenchmarkResults {
  return {
    results: providers.map((p) => ({
      providerId: p.id,
      providerName: p.name,
      result: null,
      error: null,
      status: "pending" as const,
    })),
    completedAt: 0,
  };
}

/**
 * Update a single provider result in benchmark results
 */
export function updateBenchmarkResult(
  benchmarkResults: BenchmarkResults,
  providerId: string,
  update: Partial<BenchmarkProviderResult>
): BenchmarkResults {
  return {
    ...benchmarkResults,
    results: benchmarkResults.results.map((r) =>
      r.providerId === providerId ? { ...r, ...update } : r
    ),
  };
}

/**
 * Check if all benchmark results are complete (either completed or errored)
 */
export function isBenchmarkComplete(results: BenchmarkResults): boolean {
  return results.results.every(
    (r) => r.status === "completed" || r.status === "error"
  );
}

/**
 * Download helper for exporting results
 */
export function downloadBenchmarkResults(
  results: BenchmarkResults,
  format: "json" | "csv"
): void {
  const content = format === "json" ? exportAsJSON(results) : exportAsCSV(results);
  const mimeType = format === "json" ? "application/json" : "text/csv";
  const extension = format === "json" ? "json" : "csv";

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `benchmark-results-${Date.now()}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
