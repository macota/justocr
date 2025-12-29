import { NextRequest, NextResponse } from "next/server";
import { processOCR, getAvailableProviders } from "@/lib/ocr";
import { pdfToImages } from "@/lib/pdf";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const provider = formData.get("provider") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!provider) {
      return NextResponse.json(
        { success: false, error: "No provider specified" },
        { status: 400 }
      );
    }

    const availableProviders = getAvailableProviders();
    if (!availableProviders.includes(provider)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid provider. Available: ${availableProviders.join(", ")}`,
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

    if (isPDF) {
      const pages = await pdfToImages(buffer);
      const imageBuffers = pages.map((page) => ({
        buffer: page.imageBuffer,
        mimeType: "image/png",
        pageNumber: page.pageNumber,
      }));

      const result = await processOCR(provider, imageBuffers);
      return NextResponse.json({ success: true, result });
    }

    // Process single image
    const result = await processOCR(provider, [
      { buffer, mimeType, pageNumber: 1 },
    ]);

    return NextResponse.json({ success: true, result });
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
