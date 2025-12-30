import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import {
  isBYOKProvider,
  getBYOKProviderName,
  getApiKeyHelpUrl,
  BYOK_PROVIDERS,
} from "../lib/ocr/client/index";
import {
  getStorageKey,
  getStoredApiKey,
  storeApiKey,
  removeApiKey,
} from "../components/api-key-input";

// Mock localStorage for testing
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

// Store original values
const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;

// Install mock localStorage and window before tests
beforeEach(() => {
  const mockStorage = createMockLocalStorage();
  // @ts-expect-error - Mocking global window for SSR check
  globalThis.window = {};
  // @ts-expect-error - Mocking global localStorage
  globalThis.localStorage = mockStorage;
});

// Restore original values after tests
afterEach(() => {
  // @ts-expect-error - Restoring
  globalThis.window = originalWindow;
  // @ts-expect-error - Restoring
  globalThis.localStorage = originalLocalStorage;
});

describe("BYOK (Bring Your Own Key) Utilities", () => {
  describe("BYOK_PROVIDERS constant", () => {
    test("should include mistral as a supported provider", () => {
      expect(BYOK_PROVIDERS).toContain("mistral");
    });

    test("should include google as a supported provider", () => {
      expect(BYOK_PROVIDERS).toContain("google");
    });

    test("should have exactly 2 supported providers", () => {
      expect(BYOK_PROVIDERS.length).toBe(2);
    });
  });

  describe("isBYOKProvider", () => {
    test("should return true for mistral provider", () => {
      expect(isBYOKProvider("mistral")).toBe(true);
    });

    test("should return true for google provider", () => {
      expect(isBYOKProvider("google")).toBe(true);
    });

    test("should return false for tesseract provider", () => {
      expect(isBYOKProvider("tesseract")).toBe(false);
    });

    test("should return false for tesseract-local provider", () => {
      expect(isBYOKProvider("tesseract-local")).toBe(false);
    });

    test("should return false for unknown provider", () => {
      expect(isBYOKProvider("unknown")).toBe(false);
    });

    test("should return false for empty string", () => {
      expect(isBYOKProvider("")).toBe(false);
    });

    test("should be case-sensitive", () => {
      expect(isBYOKProvider("Mistral")).toBe(false);
      expect(isBYOKProvider("GOOGLE")).toBe(false);
    });
  });

  describe("getBYOKProviderName", () => {
    test("should return 'Mistral' for mistral provider", () => {
      expect(getBYOKProviderName("mistral")).toBe("Mistral");
    });

    test("should return 'Google Cloud Vision' for google provider", () => {
      expect(getBYOKProviderName("google")).toBe("Google Cloud Vision");
    });
  });

  describe("getApiKeyHelpUrl", () => {
    test("should return Mistral console URL for mistral provider", () => {
      const url = getApiKeyHelpUrl("mistral");
      expect(url).toBe("https://console.mistral.ai/api-keys/");
    });

    test("should return Google Cloud console URL for google provider", () => {
      const url = getApiKeyHelpUrl("google");
      expect(url).toBe("https://console.cloud.google.com/apis/credentials");
    });

    test("should return valid URLs that start with https", () => {
      for (const providerId of BYOK_PROVIDERS) {
        const url = getApiKeyHelpUrl(providerId);
        expect(url.startsWith("https://")).toBe(true);
      }
    });
  });
});

describe("API Key Storage Utilities", () => {
  describe("getStorageKey", () => {
    test("should prefix provider ID with justocr_byok_", () => {
      expect(getStorageKey("mistral")).toBe("justocr_byok_mistral");
    });

    test("should work with google provider", () => {
      expect(getStorageKey("google")).toBe("justocr_byok_google");
    });

    test("should work with any string provider ID", () => {
      expect(getStorageKey("custom-provider")).toBe("justocr_byok_custom-provider");
    });
  });

  describe("storeApiKey and getStoredApiKey", () => {
    test("should store and retrieve an API key", () => {
      storeApiKey("mistral", "test-api-key-12345");
      expect(getStoredApiKey("mistral")).toBe("test-api-key-12345");
    });

    test("should return null for non-existent key", () => {
      expect(getStoredApiKey("nonexistent")).toBeNull();
    });

    test("should store keys separately per provider", () => {
      storeApiKey("mistral", "mistral-key-abc");
      storeApiKey("google", "google-key-xyz");

      expect(getStoredApiKey("mistral")).toBe("mistral-key-abc");
      expect(getStoredApiKey("google")).toBe("google-key-xyz");
    });

    test("should overwrite existing key when storing new one", () => {
      storeApiKey("mistral", "old-key");
      storeApiKey("mistral", "new-key");

      expect(getStoredApiKey("mistral")).toBe("new-key");
    });

    test("should handle empty string as key value", () => {
      storeApiKey("mistral", "");
      expect(getStoredApiKey("mistral")).toBe("");
    });

    test("should handle keys with special characters", () => {
      const specialKey = "key_with-special.chars/and+more=stuff";
      storeApiKey("mistral", specialKey);
      expect(getStoredApiKey("mistral")).toBe(specialKey);
    });
  });

  describe("removeApiKey", () => {
    test("should remove a stored API key", () => {
      storeApiKey("mistral", "test-key");
      expect(getStoredApiKey("mistral")).toBe("test-key");

      removeApiKey("mistral");
      expect(getStoredApiKey("mistral")).toBeNull();
    });

    test("should not throw when removing non-existent key", () => {
      expect(() => removeApiKey("nonexistent")).not.toThrow();
    });

    test("should only remove the specified provider key", () => {
      storeApiKey("mistral", "mistral-key");
      storeApiKey("google", "google-key");

      removeApiKey("mistral");

      expect(getStoredApiKey("mistral")).toBeNull();
      expect(getStoredApiKey("google")).toBe("google-key");
    });
  });

  describe("localStorage unavailable (SSR)", () => {
    test("getStoredApiKey should return null when window is undefined", () => {
      // Save current mocks
      const currentWindow = globalThis.window;
      const currentStorage = globalThis.localStorage;

      // Simulate SSR environment where window is undefined
      // @ts-expect-error - Testing SSR scenario
      globalThis.window = undefined;

      // The function checks typeof window === "undefined" and returns null
      const result = getStoredApiKey("mistral");
      expect(result).toBeNull();

      // Restore mocks for other tests
      // @ts-expect-error - Restoring
      globalThis.window = currentWindow;
      // @ts-expect-error - Restoring
      globalThis.localStorage = currentStorage;
    });

    test("storeApiKey should do nothing when window is undefined", () => {
      // Save current mocks
      const currentWindow = globalThis.window;
      const currentStorage = globalThis.localStorage;

      // Simulate SSR environment
      // @ts-expect-error - Testing SSR scenario
      globalThis.window = undefined;

      // Should not throw
      expect(() => storeApiKey("mistral", "test-key")).not.toThrow();

      // Restore mocks
      // @ts-expect-error - Restoring
      globalThis.window = currentWindow;
      // @ts-expect-error - Restoring
      globalThis.localStorage = currentStorage;

      // Verify nothing was stored (key should still be null when we restore window)
      expect(getStoredApiKey("mistral")).toBeNull();
    });

    test("removeApiKey should do nothing when window is undefined", () => {
      // First store a key while window is defined
      storeApiKey("mistral", "test-key");
      expect(getStoredApiKey("mistral")).toBe("test-key");

      // Save current mocks
      const currentWindow = globalThis.window;
      const currentStorage = globalThis.localStorage;

      // Simulate SSR environment
      // @ts-expect-error - Testing SSR scenario
      globalThis.window = undefined;

      // Should not throw
      expect(() => removeApiKey("mistral")).not.toThrow();

      // Restore mocks
      // @ts-expect-error - Restoring
      globalThis.window = currentWindow;
      // @ts-expect-error - Restoring
      globalThis.localStorage = currentStorage;

      // Key should still exist because remove was skipped in SSR mode
      expect(getStoredApiKey("mistral")).toBe("test-key");
    });
  });
});

describe("BYOK Provider Type Guards", () => {
  test("type guard should narrow type correctly for valid providers", () => {
    const providerId = "mistral" as string;

    if (isBYOKProvider(providerId)) {
      // If we're here, TypeScript knows providerId is BYOKProviderId
      // We can safely use it with functions that expect BYOKProviderId
      const name = getBYOKProviderName(providerId);
      expect(name).toBe("Mistral");
    }
  });

  test("should work in filtering arrays", () => {
    const providers = ["tesseract", "mistral", "google", "unknown"];
    const byokProviders = providers.filter(isBYOKProvider);

    expect(byokProviders).toHaveLength(2);
    expect(byokProviders).toContain("mistral");
    expect(byokProviders).toContain("google");
    expect(byokProviders).not.toContain("tesseract");
    expect(byokProviders).not.toContain("unknown");
  });
});
