import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { processMistralOCR } from "../lib/ocr/client/mistral";
import { processGoogleVisionOCR } from "../lib/ocr/client/google";

// Helper to create a mock File
function createMockFile(name: string, type: string, content: string = "test"): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

// Store original fetch and FileReader
const originalFetch = globalThis.fetch;
const originalFileReader = globalThis.FileReader;

// Mock FileReader for Node/Bun environment
class MockFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;

  readAsDataURL(blob: Blob) {
    // Simulate async read
    setTimeout(() => {
      // Create a fake data URL
      this.result = `data:${blob.type};base64,dGVzdA==`;
      if (this.onload) this.onload();
    }, 0);
  }
}

// Install mock before all tests
beforeEach(() => {
  // @ts-expect-error - Mocking global FileReader
  globalThis.FileReader = MockFileReader;
});

describe("BYOK Client - Mistral OCR", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    // @ts-expect-error - Restoring global FileReader
    globalThis.FileReader = originalFileReader;
  });

  test("should send correct request payload shape", async () => {
    let capturedRequest: { url: string; options: RequestInit } | null = null;

    globalThis.fetch = mock(async (url: string, options?: RequestInit) => {
      capturedRequest = { url: url.toString(), options: options! };
      return new Response(
        JSON.stringify({
          pages: [{ index: 0, markdown: "Extracted text" }],
          model: "mistral-ocr-latest",
          usage_info: { pages_processed: 1, doc_size_bytes: 100 },
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");
    await processMistralOCR(file, "test-api-key");

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.url).toBe("https://api.mistral.ai/v1/ocr");
    expect(capturedRequest!.options.method).toBe("POST");
    expect(capturedRequest!.options.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer test-api-key",
    });

    const body = JSON.parse(capturedRequest!.options.body as string);
    expect(body.model).toBe("mistral-ocr-latest");
    expect(body.document.type).toBe("image_url");
    expect(body.document.image_url).toContain("data:");
  });

  test("should handle 401 unauthorized error", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({ message: "Invalid API key" }), {
        status: 401,
      });
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");

    await expect(processMistralOCR(file, "bad-key")).rejects.toThrow(
      "Invalid API key"
    );
  });

  test("should handle 429 rate limit error", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
      });
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");

    await expect(processMistralOCR(file, "api-key")).rejects.toThrow(
      "Rate limit exceeded"
    );
  });

  test("should handle 403 permission error", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({ message: "Forbidden" }), {
        status: 403,
      });
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");

    await expect(processMistralOCR(file, "api-key")).rejects.toThrow(
      "does not have permission"
    );
  });

  test("should return OCR result on success", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          pages: [
            { index: 0, markdown: "Page 1 text" },
            { index: 1, markdown: "Page 2 text" },
          ],
          model: "mistral-ocr-latest",
          usage_info: { pages_processed: 2, doc_size_bytes: 200 },
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");
    const result = await processMistralOCR(file, "api-key");

    expect(result.text).toBe("Page 1 text\n\nPage 2 text");
    expect(result.pages).toHaveLength(2);
    expect(result.provider).toBe("mistral");
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  test("should handle empty pages response", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          pages: [],
          model: "mistral-ocr-latest",
          usage_info: { pages_processed: 0, doc_size_bytes: 0 },
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");
    const result = await processMistralOCR(file, "api-key");

    expect(result.text).toBe("");
    expect(result.pages).toHaveLength(0);
  });
});

describe("BYOK Client - Google Vision OCR", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    // @ts-expect-error - Restoring global FileReader
    globalThis.FileReader = originalFileReader;
  });

  test("should send correct request payload shape", async () => {
    let capturedRequest: { url: string; options: RequestInit } | null = null;

    globalThis.fetch = mock(async (url: string, options?: RequestInit) => {
      capturedRequest = { url: url.toString(), options: options! };
      return new Response(
        JSON.stringify({
          responses: [
            {
              fullTextAnnotation: { text: "Extracted text" },
            },
          ],
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");
    await processGoogleVisionOCR(file, "test-api-key");

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.url).toBe(
      "https://vision.googleapis.com/v1/images:annotate?key=test-api-key"
    );
    expect(capturedRequest!.options.method).toBe("POST");
    expect(capturedRequest!.options.headers).toEqual({
      "Content-Type": "application/json",
    });

    const body = JSON.parse(capturedRequest!.options.body as string);
    expect(body.requests).toHaveLength(1);
    expect(body.requests[0].image.content).toBeDefined();
    expect(body.requests[0].features[0].type).toBe("DOCUMENT_TEXT_DETECTION");
  });

  test("should handle 400 invalid API key error", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({ error: { message: "API key not valid" } }),
        { status: 400 }
      );
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");

    await expect(processGoogleVisionOCR(file, "bad-key")).rejects.toThrow(
      "Invalid API key"
    );
  });

  test("should handle 429 rate limit error", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({ error: { message: "Rate limit" } }),
        { status: 429 }
      );
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");

    await expect(processGoogleVisionOCR(file, "api-key")).rejects.toThrow(
      "Rate limit exceeded"
    );
  });

  test("should handle 403 API not enabled error", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          error: { message: "Cloud Vision API has not been used" },
        }),
        { status: 403 }
      );
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");

    await expect(processGoogleVisionOCR(file, "api-key")).rejects.toThrow(
      "Cloud Vision API is not enabled"
    );
  });

  test("should handle API-level error in response", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          responses: [
            {
              error: {
                code: 3,
                message: "Invalid image data",
                status: "INVALID_ARGUMENT",
              },
            },
          ],
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");

    await expect(processGoogleVisionOCR(file, "api-key")).rejects.toThrow(
      "Invalid image data"
    );
  });

  test("should return OCR result on success", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          responses: [
            {
              fullTextAnnotation: { text: "Extracted document text" },
            },
          ],
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");
    const result = await processGoogleVisionOCR(file, "api-key");

    expect(result.text).toBe("Extracted document text");
    expect(result.pages).toHaveLength(1);
    expect(result.provider).toBe("google");
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  test("should handle empty text response", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          responses: [{ fullTextAnnotation: { text: "" } }],
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const file = createMockFile("test.png", "image/png");
    const result = await processGoogleVisionOCR(file, "api-key");

    expect(result.text).toBe("");
    expect(result.pages).toHaveLength(0);
  });
});
