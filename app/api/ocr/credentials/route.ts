import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

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
  // Creating an ImageAnnotatorClient succeeds even without credentials,
  // so we need to actually verify that ADC is configured by getting credentials
  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-vision"],
    });
    // This will throw if no credentials are available
    await auth.getClient();
    credentials.google = true;
  } catch {
    // ADC not configured or invalid
    credentials.google = false;
  }

  return NextResponse.json(credentials);
}
