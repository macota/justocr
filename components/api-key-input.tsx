"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Key, Trash2, Check, Shield } from "lucide-react";

const STORAGE_KEY_PREFIX = "justocr_byok_";

export interface ApiKeyInputProps {
  providerId: string;
  providerName: string;
  onKeyChange: (key: string | null) => void;
  disabled?: boolean;
}

/**
 * Get the localStorage key for a specific provider
 */
export function getStorageKey(providerId: string): string {
  return `${STORAGE_KEY_PREFIX}${providerId}`;
}

/**
 * Get a stored API key for a provider
 */
export function getStoredApiKey(providerId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getStorageKey(providerId));
}

/**
 * Store an API key for a provider
 */
export function storeApiKey(providerId: string, key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey(providerId), key);
}

/**
 * Remove a stored API key for a provider
 */
export function removeApiKey(providerId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getStorageKey(providerId));
}

/**
 * Check if an API key appears to be valid format
 */
function validateKeyFormat(providerId: string, key: string): { valid: boolean; message?: string } {
  if (!key || key.trim().length === 0) {
    return { valid: false, message: "API key is required" };
  }

  // Provider-specific validation
  if (providerId === "mistral") {
    // Mistral keys are typically 32+ characters
    if (key.length < 20) {
      return { valid: false, message: "Mistral API key appears too short" };
    }
  } else if (providerId === "google") {
    // Google API keys are typically 39 characters starting with "AIza"
    if (key.length < 30) {
      return { valid: false, message: "Google API key appears too short" };
    }
  }

  return { valid: true };
}

/**
 * Mask an API key for display, showing only first and last few characters
 */
function maskApiKey(key: string): string {
  if (key.length <= 12) {
    return "*".repeat(key.length);
  }
  return `${key.slice(0, 4)}${"*".repeat(key.length - 8)}${key.slice(-4)}`;
}

/**
 * Inner component that manages key state for a single provider.
 * This is remounted when providerId changes via key prop.
 */
function ApiKeyInputInner({
  providerId,
  providerName,
  onKeyChange,
  disabled = false,
}: ApiKeyInputProps) {
  // Calculate initial state from localStorage (runs once per mount due to key prop)
  const initialState = useMemo(() => {
    const storedKey = getStoredApiKey(providerId);
    return {
      storedKey,
      hasStoredKey: !!storedKey,
      storedKeyMasked: storedKey ? maskApiKey(storedKey) : "",
      isEditing: !storedKey,
    };
    // This is intentionally only calculated once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(initialState.hasStoredKey);
  const [storedKeyMasked, setStoredKeyMasked] = useState(initialState.storedKeyMasked);
  const [rememberKey, setRememberKey] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(initialState.isEditing);

  // Notify parent of initial key state on mount (via ref to ensure only once)
  const hasNotifiedRef = useRef(false);
  useEffect(() => {
    if (!hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      onKeyChange(initialState.storedKey);
    }
  }, [onKeyChange, initialState.storedKey]);

  const handleKeySubmit = () => {
    const trimmedKey = keyInput.trim();
    const validation = validateKeyFormat(providerId, trimmedKey);

    if (!validation.valid) {
      setValidationError(validation.message || "Invalid key");
      return;
    }

    setValidationError(null);

    if (rememberKey) {
      storeApiKey(providerId, trimmedKey);
      setHasStoredKey(true);
      setStoredKeyMasked(maskApiKey(trimmedKey));
    }

    onKeyChange(trimmedKey);
    setIsEditing(false);
    setKeyInput("");
  };

  const handleClearKey = () => {
    removeApiKey(providerId);
    setHasStoredKey(false);
    setStoredKeyMasked("");
    setKeyInput("");
    setIsEditing(true);
    onKeyChange(null);
  };

  const handleEditKey = () => {
    setIsEditing(true);
    setKeyInput("");
  };

  const handleCancelEdit = () => {
    if (hasStoredKey) {
      setIsEditing(false);
      setKeyInput("");
      const storedKey = getStoredApiKey(providerId);
      if (storedKey) {
        onKeyChange(storedKey);
      }
    }
  };

  // If we have a stored key and not editing, show the stored key view
  if (hasStoredKey && !isEditing) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Using your {providerName} API key
                </span>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                  {storedKeyMasked}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditKey}
                disabled={disabled}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Change
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearKey}
                disabled={disabled}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600 dark:text-blue-400">
            <Shield className="h-3 w-3" />
            <span>Your key is stored locally and sent directly to {providerName}. We never see it.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Editing or no stored key - show input form
  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <CardContent className="py-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Enter your {providerName} API key
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                placeholder={`Paste your ${providerName} API key here`}
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setValidationError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleKeySubmit();
                  }
                }}
                disabled={disabled}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <Button
              onClick={handleKeySubmit}
              disabled={disabled || !keyInput.trim()}
              size="sm"
            >
              <Check className="h-4 w-4" />
            </Button>
            {hasStoredKey && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={disabled}
              >
                Cancel
              </Button>
            )}
          </div>

          {validationError && (
            <p className="text-xs text-red-500">{validationError}</p>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`remember-key-${providerId}`}
              checked={rememberKey}
              onChange={(e) => setRememberKey(e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
            />
            <label
              htmlFor={`remember-key-${providerId}`}
              className="text-xs text-amber-700 dark:text-amber-300"
            >
              Remember this key in browser storage
            </label>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <Shield className="h-3 w-3" />
            <span>Your key is stored only in your browser and sent directly to {providerName}. We never see or store your key on our servers.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Wrapper component that remounts the inner component when providerId changes.
 * This avoids needing to use setState in effects to reset state.
 */
export function ApiKeyInput(props: ApiKeyInputProps) {
  // Using key prop to force remount when provider changes
  return <ApiKeyInputInner key={props.providerId} {...props} />;
}
