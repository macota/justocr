"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cpu, Cloud, Shield, Key, BarChart3, Check, Eye, EyeOff, AlertCircle } from "lucide-react";
import type { OCRProviderConfig } from "@/lib/ocr/types";
import { storeApiKey } from "@/components/api-key-input";

export type OCRProviderOption = OCRProviderConfig & {
  supportsBYOK?: boolean;
};

const PROVIDERS: OCRProviderOption[] = [
  {
    id: "tesseract-local",
    name: "Tesseract in Browser",
    description: "Data never leaves your device",
    isLocal: true,
    isClientSide: true,
    available: true,
    supportsBYOK: false,
  },
  {
    id: "tesseract",
    name: "Tesseract on Server",
    description: "Simple, fast and free server OCR",
    isLocal: true,
    isClientSide: false,
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
  // BYOK key tracking for benchmark mode
  providersMissingKeys?: string[];
  onBenchmarkKeyProvided?: (providerId: string, key: string) => void;
}

// Compact inline key input for benchmark mode
function InlineKeyInput({
  providerId,
  providerName,
  onKeySubmit,
  disabled,
}: {
  providerId: string;
  providerName: string;
  onKeySubmit: (key: string) => void;
  disabled?: boolean;
}) {
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmedKey = keyInput.trim();
    if (!trimmedKey) {
      setError("API key is required");
      return;
    }

    // Basic validation
    const minLength = providerId === "google" ? 30 : 20;
    if (trimmedKey.length < minLength) {
      setError(`API key appears too short`);
      return;
    }

    setError(null);
    storeApiKey(providerId, trimmedKey);
    onKeySubmit(trimmedKey);
    setKeyInput("");
  };

  return (
    <div className="mt-2 ml-8 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md space-y-2">
      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
        <AlertCircle className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">API key required for {providerName}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? "text" : "password"}
            placeholder={`Enter your ${providerName} API key`}
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={disabled}
            className="pr-8 text-xs h-8 font-mono"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowKey(!showKey);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleSubmit();
          }}
          disabled={disabled || !keyInput.trim()}
          className="h-8 px-3 text-xs"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-amber-600 dark:text-amber-400">
        Key stored locally & sent directly to {providerName}
      </p>
    </div>
  );
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
  providersMissingKeys = [],
  onBenchmarkKeyProvided,
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
              Run Parallel
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
          OCR Providers
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
            Run Single
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {PROVIDERS.filter((p) => p.available).map((provider) => {
          const isSelected = selectedProviders.includes(provider.id);
          const isDisabled =
            disabled ||
            (!isSelected && selectedProviders.length >= MAX_BENCHMARK_PROVIDERS);
          const isMissingKey = isSelected && providersMissingKeys.includes(provider.id);

          return (
            <div key={provider.id}>
              <button
                onClick={() => handleProviderToggle(provider.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  isSelected
                    ? isMissingKey
                      ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/50"
                      : "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                } ${isDisabled && !isSelected ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div
                  className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? isMissingKey
                        ? "border-amber-400 bg-amber-400"
                        : "border-primary bg-primary"
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
                    {isMissingKey && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        Key needed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {provider.description}
                  </p>
                </div>
              </button>
              {isMissingKey && onBenchmarkKeyProvided && (
                <InlineKeyInput
                  providerId={provider.id}
                  providerName={provider.name}
                  onKeySubmit={(key) => onBenchmarkKeyProvided(provider.id, key)}
                  disabled={disabled}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { PROVIDERS };
