import type { OCRProvider } from "../types";

interface MistralOCRPage {
  index: number;
  markdown: string;
  images?: {
    id: string;
    top_left_x: number;
    top_left_y: number;
    bottom_right_x: number;
    bottom_right_y: number;
    image_base64?: string;
  }[];
  tables?: unknown[];
  hyperlinks?: unknown[];
  header?: string | null;
  footer?: string | null;
}

interface MistralOCRResponse {
  pages: MistralOCRPage[];
  model: string;
  usage_info: {
    pages_processed: number;
    doc_size_bytes: number;
  };
}

export const mistralProvider: OCRProvider = {
  id: "mistral",
  name: "Mistral OCR",

  async process(imageBuffer: Buffer, mimeType: string): Promise<string> {
    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      throw new Error(
        "MISTRAL_API_KEY environment variable is not set. Please add it to your .env.local file."
      );
    }

    // Convert buffer to base64 data URL
    const base64Image = imageBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Use Mistral's dedicated OCR endpoint with ImageURLChunk format
    const response = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: {
          type: "image_url",
          image_url: dataUrl,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage =
          errorJson.message || errorJson.error?.message || errorText;
      } catch {
        errorMessage = errorText;
      }

      throw new Error(`Mistral API error (${response.status}): ${errorMessage}`);
    }

    const data: MistralOCRResponse = await response.json();

    if (!data.pages || data.pages.length === 0) {
      return "";
    }

    // Combine markdown content from all pages
    const extractedText = data.pages
      .map((page) => page.markdown)
      .filter(Boolean)
      .join("\n\n");

    return extractedText.trim();
  },
};
