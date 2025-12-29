"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cpu, Cloud } from "lucide-react";

export interface OCRProviderOption {
  id: string;
  name: string;
  description: string;
  isLocal: boolean;
  available: boolean;
}

const PROVIDERS: OCRProviderOption[] = [
  {
    id: "tesseract",
    name: "Tesseract",
    description: "Local OCR - Free, runs on server",
    isLocal: true,
    available: true,
  },
  {
    id: "tesseract-local",
    name: "Tesseract (Browser)",
    description: "Local OCR - Data never leaves your device",
    isLocal: true,
    available: false, // Coming soon
  },
  {
    id: "mistral",
    name: "Mistral OCR",
    description: "Cloud OCR - High accuracy",
    isLocal: false,
    available: false, // Requires API key
  },
  {
    id: "google",
    name: "Google Cloud Vision",
    description: "Cloud OCR - Enterprise grade",
    isLocal: false,
    available: false, // Requires API key
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
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a provider" />
        </SelectTrigger>
        <SelectContent>
          {PROVIDERS.map((provider) => (
            <SelectItem
              key={provider.id}
              value={provider.id}
              disabled={!provider.available}
            >
              <div className="flex items-center gap-2">
                {provider.isLocal ? (
                  <Cpu className="h-4 w-4 text-green-500" />
                ) : (
                  <Cloud className="h-4 w-4 text-blue-500" />
                )}
                <span>{provider.name}</span>
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
