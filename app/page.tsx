"use client";

import { useState } from "react";
import { UploadZone } from "@/components/upload-zone";
import { ProviderSelector } from "@/components/provider-selector";
import { OCRResults, type OCRResult } from "@/components/ocr-results";
import { Button } from "@/components/ui/button";
import { FileSearch } from "lucide-react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [provider, setProvider] = useState("tesseract");
  const [result, setResult] = useState<OCRResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
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

          <Button
            onClick={handleProcess}
            disabled={!selectedFile || isLoading}
            className="w-full"
            size="lg"
          >
            <FileSearch className="h-5 w-5 mr-2" />
            {isLoading ? "Processing..." : "Extract Text"}
          </Button>

          <OCRResults result={result} isLoading={isLoading} error={error} />
        </div>
      </div>
    </main>
  );
}
