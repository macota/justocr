"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Cpu, Cloud, Shield, Key, BarChart3, Check } from "lucide-react";
import type { OCRProviderConfig } from "@/lib/ocr/types";

export type OCRProviderOption = OCRProviderConfig & {
  supportsBYOK?: boolean;
};

const PROVIDERS: OCRProviderOption[] = [
  {
    id: "tesseract",
    name: "Tesseract",
    description: "Local OCR - Free, runs on server",
    isLocal: true,
    isClientSide: false,
    available: true,
    supportsBYOK: false,
  },
  {
    id: "tesseract-local",
    name: "Tesseract (Local)",
    description: "Privacy Mode - Data never leaves your device",
    isLocal: true,
    isClientSide: true,
    available: true,
    supportsBYOK: false,
  },
  {
    id: "mistral",
    name: "Mistral OCR",
    description: "Cloud OCR - High accuracy with Mistral OCR 3 (BYOK supported)",
    isLocal: false,
    isClientSide: false,
    available: true,
    supportsBYOK: true,
  },
  {
    id: "google",
    name: "Google Cloud Vision",
    description: "Cloud OCR - Enterprise grade document text detection (BYOK supported)",
    isLocal: false,
    isClientSide: false,
    available: true,
    supportsBYOK: true,
  },
];

const MAX_BENCHMARK_PROVIDERS = 4;

interface ProviderSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  // Benchmark mode props
  benchmarkMode?: boolean;
  onBenchmarkModeChange?: (enabled: boolean) => void;
  selectedProviders?: string[];
  onSelectedProvidersChange?: (providers: string[]) => void;
}

function ProviderIcon({ provider }: { provider: OCRProviderOption }) {
  if (provider.isClientSide) {
    return <Shield className="h-4 w-4 text-emerald-500" />;
  }
  if (provider.isLocal) {
    return <Cpu className="h-4 w-4 text-green-500" />;
  }
  return <Cloud className="h-4 w-4 text-blue-500" />;
}

function ProviderBadges({ provider }: { provider: OCRProviderOption }) {
  return (
    <>
      {provider.isClientSide && (
        <span className="text-xs text-emerald-600 font-medium">Privacy</span>
      )}
      {provider.supportsBYOK && (
        <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium">
          <Key className="h-3 w-3" />
          BYOK
        </span>
      )}
      {!provider.available && (
        <span className="text-xs text-muted-foreground">(Coming soon)</span>
      )}
    </>
  );
}

export function ProviderSelector({
  value,
  onChange,
  disabled = false,
  benchmarkMode = false,
  onBenchmarkModeChange,
  selectedProviders = [],
  onSelectedProvidersChange,
}: ProviderSelectorProps) {
  const selectedProvider = PROVIDERS.find((p) => p.id === value);

  const handleProviderToggle = (providerId: string) => {
    if (!onSelectedProvidersChange) return;

    if (selectedProviders.includes(providerId)) {
      // Remove provider
      onSelectedProvidersChange(selectedProviders.filter((p) => p !== providerId));
    } else {
      // Add provider if under limit
      if (selectedProviders.length < MAX_BENCHMARK_PROVIDERS) {
        onSelectedProvidersChange([...selectedProviders, providerId]);
      }
    }
  };

  const handleBenchmarkToggle = () => {
    if (!onBenchmarkModeChange) return;

    const newMode = !benchmarkMode;
    onBenchmarkModeChange(newMode);

    // When switching to benchmark mode, initialize with current selection
    if (newMode && onSelectedProvidersChange && value) {
      onSelectedProvidersChange([value]);
    }
  };

  // Single-select mode (original behavior)
  if (!benchmarkMode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            OCR Provider
          </label>
          {onBenchmarkModeChange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBenchmarkToggle}
              disabled={disabled}
              className="text-xs h-7 px-2"
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1" />
              Compare Providers
            </Button>
          )}
        </div>
        <Select value={value} onValueChange={(v) => v && onChange(v)} disabled={disabled}>
          <SelectTrigger className="w-full">
            {value ? <SelectValue /> : <span className="text-muted-foreground">Select a provider</span>}
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((provider) => (
              <SelectItem
                key={provider.id}
                value={provider.id}
                disabled={!provider.available}
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon provider={provider} />
                  <span>{provider.name}</span>
                  <ProviderBadges provider={provider} />
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedProvider && (
          <p className="text-xs text-muted-foreground">
            {selectedProvider.description}
          </p>
        )}
      </div>
    );
  }

  // Multi-select benchmark mode
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Compare Providers
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {selectedProviders.length} of {MAX_BENCHMARK_PROVIDERS} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBenchmarkToggle}
            disabled={disabled}
            className="text-xs h-7 px-2"
          >
            Single Provider
          </Button>
        </div>
      </div>
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
        <CardContent className="py-2 px-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Benchmark Mode</span>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Select up to {MAX_BENCHMARK_PROVIDERS} providers to compare their OCR results side-by-side.
          </p>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {PROVIDERS.filter((p) => p.available).map((provider) => {
          const isSelected = selectedProviders.includes(provider.id);
          const isDisabled =
            disabled ||
            (!isSelected && selectedProviders.length >= MAX_BENCHMARK_PROVIDERS);

          return (
            <button
              key={provider.id}
              onClick={() => handleProviderToggle(provider.id)}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              } ${isDisabled && !isSelected ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div
                className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                }`}
              >
                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <ProviderIcon provider={provider} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{provider.name}</span>
                  <ProviderBadges provider={provider} />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {provider.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { PROVIDERS };
