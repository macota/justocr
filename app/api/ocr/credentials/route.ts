import { NextResponse } from "next/server";
import vision from "@google-cloud/vision";

export interface ServerCredentialsResponse {
  mistral: boolean;
  google: boolean;
}

/**
 * Check which OCR providers have server-side credentials configured.
 * This is useful for local development where env vars or ADC are set up.
 */
export async function GET() {
  const credentials: ServerCredentialsResponse = {
    mistral: false,
    google: false,
  };

  // Check Mistral API key
  if (process.env.MISTRAL_API_KEY) {
    credentials.mistral = true;
  }

  // Check Google Cloud Vision ADC
  try {
    // Attempt to create a client - this will fail if ADC is not configured
    const client = new vision.ImageAnnotatorClient();
    // If we get here, ADC is configured
    await client.close();
    credentials.google = true;
  } catch {
    // ADC not configured or invalid
    credentials.google = false;
  }

  return NextResponse.json(credentials);
}
