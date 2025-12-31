"use client";

import { useState, useCallback, useMemo } from "react";
import { UploadZone } from "@/components/upload-zone";
import { ProviderSelector, PROVIDERS } from "@/components/provider-selector";
import { OCRResults, type OCRResult } from "@/components/ocr-results";
import { BenchmarkResultsView } from "@/components/benchmark-results";
import { ApiKeyInput, getStoredApiKey } from "@/components/api-key-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileSearch, Shield, BarChart3 } from "lucide-react";
import {
  processImageClientSide,
  type ProgressInfo,
} from "@/lib/ocr/providers/tesseract-browser";
import {
  processOCRWithKey,
  isBYOKProvider,
  getBYOKProviderName,
} from "@/lib/ocr/client";
import type { BenchmarkResults, BenchmarkProviderResult } from "@/lib/ocr/types";
import { createInitialBenchmarkResults } from "@/lib/ocr/benchmark";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [provider, setProvider] = useState("tesseract-local");
  const [result, setResult] = useState<OCRResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressInfo, setProgressInfo] = useState<ProgressInfo | null>(null);
  const [byokApiKey, setByokApiKey] = useState<string | null>(null);

  // Benchmark mode state
  const [benchmarkMode, setBenchmarkMode] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResults | null>(null);
  // Track when BYOK keys are provided in benchmark mode (forces re-render to update missing keys)
  const [benchmarkKeysVersion, setBenchmarkKeysVersion] = useState(0);

  const selectedProvider = PROVIDERS.find((p) => p.id === provider);
  const isClientSide = selectedProvider?.isClientSide ?? false;
  const supportsBYOK = selectedProvider?.supportsBYOK ?? false;
  const hasByokKey = byokApiKey !== null && byokApiKey.length > 0;

  // Compute which BYOK providers are missing keys in benchmark mode
  const providersMissingKeys = useMemo(() => {
    if (!benchmarkMode) return [];

    return selectedProviders.filter((providerId) => {
      const config = PROVIDERS.find((p) => p.id === providerId);
      if (!config?.supportsBYOK) return false;
      const storedKey = getStoredApiKey(providerId);
      return !storedKey;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benchmarkMode, selectedProviders, benchmarkKeysVersion]);

  // Handle BYOK key changes
  const handleByokKeyChange = useCallback((key: string | null) => {
    setByokApiKey(key);
  }, []);

  // Check for stored BYOK key when provider changes
  const handleProviderChange = useCallback((newProvider: string) => {
    setProvider(newProvider);
    // Check if the new provider has a stored key
    if (isBYOKProvider(newProvider)) {
      const storedKey = getStoredApiKey(newProvider);
      setByokApiKey(storedKey);
    } else {
      setByokApiKey(null);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setBenchmarkResults(null);
    setError(null);
    setProgressInfo(null);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setResult(null);
    setBenchmarkResults(null);
    setError(null);
    setProgressInfo(null);
  };

  const handleProgressUpdate = (info: ProgressInfo) => {
    setProgressInfo(info);
  };

  // Handle benchmark mode toggle
  const handleBenchmarkModeChange = useCallback((enabled: boolean) => {
    setBenchmarkMode(enabled);
    // Clear previous results
    setResult(null);
    setBenchmarkResults(null);
    setError(null);
  }, []);

  // Handle selected providers change in benchmark mode
  const handleSelectedProvidersChange = useCallback((providers: string[]) => {
    setSelectedProviders(providers);
  }, []);

  // Handle when a BYOK key is provided in benchmark mode
  const handleBenchmarkKeyProvided = useCallback((_providerId: string, _key: string) => {
    // Key is already stored by the InlineKeyInput component
    // Just increment version to trigger re-computation of providersMissingKeys
    setBenchmarkKeysVersion((v) => v + 1);
  }, []);

  const handleProcessClientSide = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgressInfo(null);

    try {
      const ocrResult = await processImageClientSide(selectedFile, {
        onProgress: handleProgressUpdate,
      });
      setResult(ocrResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setProgressInfo(null);
    }
  };

  const handleProcessServer = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("provider", provider);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OCR processing failed");
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle BYOK processing (directly from browser to provider API)
  const handleProcessBYOK = async () => {
    if (!selectedFile || !byokApiKey) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgressInfo(null);

    try {
      const ocrResult = await processOCRWithKey(
        provider,
        selectedFile,
        byokApiKey,
        handleProgressUpdate
      );
      setResult(ocrResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setProgressInfo(null);
    }
  };

  // Process a single provider in benchmark mode
  const processBenchmarkProvider = async (
    providerId: string,
    file: File
  ): Promise<BenchmarkProviderResult> => {
    const providerConfig = PROVIDERS.find((p) => p.id === providerId);
    const providerName = providerConfig?.name || providerId;

    try {
      let ocrResult: OCRResult;

      if (providerConfig?.isClientSide) {
        // Client-side processing (tesseract-local)
        ocrResult = await processImageClientSide(file);
      } else if (providerConfig?.supportsBYOK) {
        // BYOK provider - check for stored key
        const storedKey = getStoredApiKey(providerId);
        if (storedKey) {
          ocrResult = await processOCRWithKey(providerId, file, storedKey);
        } else {
          // Fall back to server if no BYOK key
          const formData = new FormData();
          formData.append("file", file);
          formData.append("provider", providerId);

          const response = await fetch("/api/ocr", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "OCR processing failed");
          }
          ocrResult = data.result;
        }
      } else {
        // Server-side processing
        const formData = new FormData();
        formData.append("file", file);
        formData.append("provider", providerId);

        const response = await fetch("/api/ocr", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "OCR processing failed");
        }
        ocrResult = data.result;
      }

      return {
        providerId,
        providerName,
        result: ocrResult,
        error: null,
        status: "completed" as const,
      };
    } catch (err) {
      return {
        providerId,
        providerName,
        result: null,
        error: err instanceof Error ? err.message : "Processing failed",
        status: "error" as const,
      };
    }
  };

  // Handle benchmark mode processing
  const handleProcessBenchmark = async () => {
    if (!selectedFile || selectedProviders.length === 0) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setBenchmarkResults(null);

    // Initialize benchmark results with all providers in "processing" state
    const initialResults = createInitialBenchmarkResults(
      selectedProviders.map((id) => ({
        id,
        name: PROVIDERS.find((p) => p.id === id)?.name || id,
      }))
    );

    // Update all to processing
    const currentResults: BenchmarkResults = {
      ...initialResults,
      results: initialResults.results.map((r) => ({
        ...r,
        status: "processing" as const,
      })),
    };
    setBenchmarkResults(currentResults);

    // Separate providers by type for optimal processing
    const clientSideProviders = selectedProviders.filter((id) => {
      const config = PROVIDERS.find((p) => p.id === id);
      return config?.isClientSide;
    });

    const serverProviders = selectedProviders.filter((id) => {
      const config = PROVIDERS.find((p) => p.id === id);
      return !config?.isClientSide;
    });

    // Check if any server providers need BYOK but don't have keys
    const byokProviders = serverProviders.filter((id) => {
      const config = PROVIDERS.find((p) => p.id === id);
      return config?.supportsBYOK;
    });

    const serverProvidersWithoutBYOK = serverProviders.filter((id) => {
      const config = PROVIDERS.find((p) => p.id === id);
      if (!config?.supportsBYOK) return true;
      const key = getStoredApiKey(id);
      return !key;
    });

    try {
      // Process all providers in parallel
      const allPromises: Promise<BenchmarkProviderResult>[] = [];

      // Add client-side processing promises
      for (const providerId of clientSideProviders) {
        allPromises.push(processBenchmarkProvider(providerId, selectedFile));
      }

      // For server providers without BYOK, use batch API if multiple
      if (serverProvidersWithoutBYOK.length > 0) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("providers", JSON.stringify(serverProvidersWithoutBYOK));

        const serverPromise = fetch("/api/ocr", {
          method: "POST",
          body: formData,
        })
          .then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error || "OCR processing failed");
            }

            // Return array of results from batch API
            if (data.benchmark && data.results) {
              return data.results.map((r: BenchmarkProviderResult) => ({
                ...r,
                status: r.error ? "error" : "completed",
              }));
            }

            // Single result (shouldn't happen here but handle it)
            return [
              {
                providerId: serverProvidersWithoutBYOK[0],
                providerName: data.result.provider,
                result: data.result,
                error: null,
                status: "completed" as const,
              },
            ];
          })
          .catch((err) => {
            // Return errors for all server providers
            return serverProvidersWithoutBYOK.map((providerId) => ({
              providerId,
              providerName: PROVIDERS.find((p) => p.id === providerId)?.name || providerId,
              result: null,
              error: err instanceof Error ? err.message : "Processing failed",
              status: "error" as const,
            }));
          });

        allPromises.push(serverPromise as Promise<BenchmarkProviderResult>);
      }

      // Add BYOK provider promises (process individually client-side)
      for (const providerId of byokProviders) {
        const key = getStoredApiKey(providerId);
        if (key) {
          allPromises.push(processBenchmarkProvider(providerId, selectedFile));
        }
      }

      // Wait for all to complete
      const allResults = await Promise.all(allPromises);

      // Flatten and merge results
      const flatResults: BenchmarkProviderResult[] = allResults.flat();

      // Create final results object
      const finalResults: BenchmarkResults = {
        results: selectedProviders.map((providerId) => {
          const result = flatResults.find((r) => r.providerId === providerId);
          if (result) {
            return result;
          }
          // Fallback for missing results
          return {
            providerId,
            providerName: PROVIDERS.find((p) => p.id === providerId)?.name || providerId,
            result: null,
            error: "Provider not processed",
            status: "error" as const,
          };
        }),
        completedAt: Date.now(),
      };

      setBenchmarkResults(finalResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcess = async () => {
    if (benchmarkMode) {
      await handleProcessBenchmark();
    } else if (isClientSide) {
      await handleProcessClientSide();
    } else if (supportsBYOK && hasByokKey) {
      // BYOK mode: process directly from browser with user's API key
      await handleProcessBYOK();
    } else {
      await handleProcessServer();
    }
  };

  // Determine if the button should be disabled
  // For BYOK providers, require an API key (only in single mode)
  const needsByokKey = !benchmarkMode && supportsBYOK && !hasByokKey;
  const noProvidersSelected = benchmarkMode && selectedProviders.length === 0;
  const hasMissingBenchmarkKeys = benchmarkMode && providersMissingKeys.length > 0;

  const isButtonDisabled =
    !selectedFile ||
    isLoading ||
    needsByokKey ||
    noProvidersSelected ||
    hasMissingBenchmarkKeys;

  // Get button text based on state
  const getButtonText = () => {
    if (isLoading && progressInfo) {
      return progressInfo.message;
    }
    if (isLoading) {
      return "Processing...";
    }
    if (benchmarkMode) {
      if (hasMissingBenchmarkKeys) {
        return `API key${providersMissingKeys.length > 1 ? "s" : ""} required`;
      }
      return `Compare ${selectedProviders.length} Provider${selectedProviders.length !== 1 ? "s" : ""}`;
    }
    return "Extract Text";
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">JustOCR</h1>
          <p className="text-muted-foreground">
            Extract text from documents using your choice of OCR engine
          </p>
        </div>

        <div className="space-y-6">
          <UploadZone
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            onClear={handleClear}
            disabled={isLoading}
          />

          <ProviderSelector
            value={provider}
            onChange={handleProviderChange}
            disabled={isLoading}
            benchmarkMode={benchmarkMode}
            onBenchmarkModeChange={handleBenchmarkModeChange}
            selectedProviders={selectedProviders}
            onSelectedProvidersChange={handleSelectedProvidersChange}
            providersMissingKeys={providersMissingKeys}
            onBenchmarkKeyProvided={handleBenchmarkKeyProvided}
          />

          {/* BYOK API Key Input for cloud providers (only in single provider mode) */}
          {!benchmarkMode && supportsBYOK && isBYOKProvider(provider) && (
            <ApiKeyInput
              providerId={provider}
              providerName={getBYOKProviderName(provider)}
              onKeyChange={handleByokKeyChange}
              disabled={isLoading}
            />
          )}

          {/* Privacy Mode Banner (only in single provider mode) */}
          {!benchmarkMode && isClientSide && (
            <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">Privacy Mode Active</span>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Your document will be processed entirely in your browser. No data is sent to any server.
                </p>
              </CardContent>
            </Card>
          )}


          {/* Progress Indicator for Client-side and BYOK Processing */}
          {isLoading && !benchmarkMode && (isClientSide || (supportsBYOK && hasByokKey)) && progressInfo && (
            <Card>
              <CardContent className="py-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{progressInfo.message}</span>
                    <span className="font-medium">{progressInfo.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${progressInfo.progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleProcess}
            disabled={isButtonDisabled}
            className="w-full"
            size="lg"
          >
            {benchmarkMode ? (
              <BarChart3 className="h-5 w-5 mr-2" />
            ) : (
              <FileSearch className="h-5 w-5 mr-2" />
            )}
            {getButtonText()}
          </Button>

          {/* Show single result or benchmark results */}
          {!benchmarkMode && (
            <OCRResults
              result={result}
              isLoading={isLoading && !isClientSide && !(supportsBYOK && hasByokKey)}
              error={error}
            />
          )}

          {benchmarkMode && (
            <BenchmarkResultsView
              results={benchmarkResults}
              isLoading={isLoading}
            />
          )}

          {/* Show error in benchmark mode */}
          {benchmarkMode && error && !isLoading && (
            <Card className="border-destructive">
              <CardContent className="py-8">
                <p className="text-center text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
