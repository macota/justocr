import { NextRequest, NextResponse } from "next/server";
import { processOCR, getAvailableProviders } from "@/lib/ocr";
import { pdfToImages } from "@/lib/pdf";
import type { OCRResult } from "@/lib/ocr/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
];

interface BenchmarkProviderResult {
  providerId: string;
  providerName: string;
  result: OCRResult | null;
  error: string | null;
}

async function processWithProvider(
  providerId: string,
  imageBuffers: { buffer: Buffer; mimeType: string; pageNumber: number }[]
): Promise<BenchmarkProviderResult> {
  try {
    const result = await processOCR(providerId, imageBuffers);
    return {
      providerId,
      providerName: result.provider,
      result,
      error: null,
    };
  } catch (error) {
    return {
      providerId,
      providerName: providerId, // Fallback to ID if we don't have the name
      result: null,
      error: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const provider = formData.get("provider") as string | null;
    const providersJson = formData.get("providers") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Parse providers array if provided, otherwise use single provider
    let providers: string[] = [];
    if (providersJson) {
      try {
        providers = JSON.parse(providersJson);
        if (!Array.isArray(providers) || providers.length === 0) {
          return NextResponse.json(
            { success: false, error: "Invalid providers array" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid providers JSON" },
          { status: 400 }
        );
      }
    } else if (provider) {
      providers = [provider];
    } else {
      return NextResponse.json(
        { success: false, error: "No provider specified" },
        { status: 400 }
      );
    }

    // Validate providers
    const availableProviders = getAvailableProviders();
    const invalidProviders = providers.filter(
      (p) => !availableProviders.includes(p)
    );
    if (invalidProviders.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid provider(s): ${invalidProviders.join(", ")}. Available: ${availableProviders.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    const mimeType = file.type;
    const isPDF = mimeType === "application/pdf";
    const isImage = SUPPORTED_IMAGE_TYPES.includes(mimeType);

    if (!isPDF && !isImage) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported file type. Please upload a PDF or image.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Prepare image buffers
    let imageBuffers: { buffer: Buffer; mimeType: string; pageNumber: number }[];

    if (isPDF) {
      const pages = await pdfToImages(buffer);
      imageBuffers = pages.map((page) => ({
        buffer: page.imageBuffer,
        mimeType: "image/png",
        pageNumber: page.pageNumber,
      }));
    } else {
      imageBuffers = [{ buffer, mimeType, pageNumber: 1 }];
    }

    // Single provider mode (backward compatible)
    if (providers.length === 1) {
      const result = await processOCR(providers[0], imageBuffers);
      return NextResponse.json({ success: true, result });
    }

    // Benchmark mode: process multiple providers in parallel
    const results = await Promise.all(
      providers.map((providerId) => processWithProvider(providerId, imageBuffers))
    );

    return NextResponse.json({
      success: true,
      benchmark: true,
      results,
    });
  } catch (error) {
    console.error("OCR processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "OCR processing failed",
      },
      { status: 500 }
    );
  }
}
