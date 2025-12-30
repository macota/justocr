"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cpu, Cloud, Shield } from "lucide-react";
import type { OCRProviderConfig } from "@/lib/ocr/types";

export type OCRProviderOption = OCRProviderConfig;

const PROVIDERS: OCRProviderOption[] = [
  {
    id: "tesseract",
    name: "Tesseract",
    description: "Local OCR - Free, runs on server",
    isLocal: true,
    isClientSide: false,
    available: true,
  },
  {
    id: "tesseract-local",
    name: "Tesseract (Local)",
    description: "Privacy Mode - Data never leaves your device",
    isLocal: true,
    isClientSide: true,
    available: true,
  },
  {
    id: "mistral",
    name: "Mistral OCR",
    description: "Cloud OCR - High accuracy with Mistral OCR 3",
    isLocal: false,
    isClientSide: false,
    available: true,
  },
  {
    id: "google",
    name: "Google Cloud Vision",
    description: "Cloud OCR - Enterprise grade document text detection",
    isLocal: false,
    isClientSide: false,
    available: true,
  },
];

interface ProviderSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ProviderSelector({
  value,
  onChange,
  disabled = false,
}: ProviderSelectorProps) {
  const selectedProvider = PROVIDERS.find((p) => p.id === value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        OCR Provider
      </label>
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
                {provider.isClientSide ? (
                  <Shield className="h-4 w-4 text-emerald-500" />
                ) : provider.isLocal ? (
                  <Cpu className="h-4 w-4 text-green-500" />
                ) : (
                  <Cloud className="h-4 w-4 text-blue-500" />
                )}
                <span>{provider.name}</span>
                {provider.isClientSide && (
                  <span className="text-xs text-emerald-600 font-medium">Privacy</span>
                )}
                {!provider.available && (
                  <span className="text-xs text-muted-foreground">(Coming soon)</span>
                )}
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

export { PROVIDERS };
