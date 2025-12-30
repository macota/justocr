"use client";

import { useState } from "react";
import { UploadZone } from "@/components/upload-zone";
import { ProviderSelector, PROVIDERS } from "@/components/provider-selector";
import { OCRResults, type OCRResult } from "@/components/ocr-results";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileSearch, Shield, AlertCircle } from "lucide-react";
import {
  processImageClientSide,
  isPdfFile,
  type ProgressInfo,
} from "@/lib/ocr/providers/tesseract-browser";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [provider, setProvider] = useState("tesseract");
  const [result, setResult] = useState<OCRResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressInfo, setProgressInfo] = useState<ProgressInfo | null>(null);

  const selectedProvider = PROVIDERS.find((p) => p.id === provider);
  const isClientSide = selectedProvider?.isClientSide ?? false;
  const isPdf = selectedFile ? isPdfFile(selectedFile) : false;

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
    setProgressInfo(null);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setProgressInfo(null);
  };

  const handleProgressUpdate = (info: ProgressInfo) => {
    setProgressInfo(info);
  };

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

  const handleProcess = async () => {
    if (isClientSide) {
      await handleProcessClientSide();
    } else {
      await handleProcessServer();
    }
  };

  // Determine if the button should be disabled
  const isButtonDisabled = !selectedFile || isLoading || (isClientSide && isPdf);

  // Get button text based on state
  const getButtonText = () => {
    if (isLoading && progressInfo) {
      return progressInfo.message;
    }
    if (isLoading) {
      return "Processing...";
    }
    return "Extract Text";
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
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
            onChange={setProvider}
            disabled={isLoading}
          />

          {/* Privacy Mode Banner */}
          {isClientSide && (
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

          {/* PDF Warning for Client-side Mode */}
          {isClientSide && isPdf && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">PDF Not Supported in Privacy Mode</span>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Client-side OCR only supports image files (PNG, JPEG, GIF, WebP, BMP).
                  Please select a different provider for PDF processing, or upload an image file.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Progress Indicator for Client-side Processing */}
          {isLoading && isClientSide && progressInfo && (
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
            <FileSearch className="h-5 w-5 mr-2" />
            {getButtonText()}
          </Button>

          <OCRResults result={result} isLoading={isLoading && !isClientSide} error={error} />
        </div>
      </div>
    </main>
  );
}
