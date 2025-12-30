import vision from "@google-cloud/vision";
import type { OCRProvider } from "../types";

export const googleVisionProvider: OCRProvider = {
  id: "google",
  name: "Google Cloud Vision",

  async process(imageBuffer: Buffer, _mimeType: string): Promise<string> {
    // Uses Application Default Credentials (ADC)
    // Set up with: gcloud auth application-default login
    // Or set GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
    const client = new vision.ImageAnnotatorClient();

    try {
      // Use documentTextDetection for better handling of dense text (book pages, documents)
      const [result] = await client.documentTextDetection({
        image: {
          content: imageBuffer.toString("base64"),
        },
      });

      const fullTextAnnotation = result.fullTextAnnotation;

      if (!fullTextAnnotation?.text) {
        return "";
      }

      return fullTextAnnotation.text;
    } finally {
      await client.close();
    }
  },
};
