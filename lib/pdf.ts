import { execSync, spawnSync } from "child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const DPI = 300;

export interface PDFPage {
  pageNumber: number;
  imageBuffer: Buffer;
  width: number;
  height: number;
}

export async function pdfToImages(pdfBuffer: Buffer): Promise<PDFPage[]> {
  // Create a temp directory for the conversion
  const tempDir = mkdtempSync(join(tmpdir(), "ocr-pdf-"));
  const pdfPath = join(tempDir, "input.pdf");
  const outputPrefix = join(tempDir, "page");

  try {
    // Write PDF to temp file
    writeFileSync(pdfPath, pdfBuffer);

    // Use pdftoppm to convert PDF to PNG images
    const result = spawnSync("pdftoppm", [
      "-png",
      "-r", String(DPI),
      pdfPath,
      outputPrefix,
    ], {
      encoding: "utf-8",
      maxBuffer: 100 * 1024 * 1024, // 100MB
    });

    if (result.error) {
      throw new Error(`pdftoppm error: ${result.error.message}`);
    }

    if (result.status !== 0) {
      throw new Error(`pdftoppm failed: ${result.stderr}`);
    }

    // Read all generated PNG files
    const files = readdirSync(tempDir)
      .filter((f) => f.startsWith("page-") && f.endsWith(".png"))
      .sort();

    const pages: PDFPage[] = [];

    for (let i = 0; i < files.length; i++) {
      const filePath = join(tempDir, files[i]);
      const imageBuffer = readFileSync(filePath);

      // Get image dimensions using sharp (just for metadata, not conversion)
      const sharp = (await import("sharp")).default;
      const metadata = await sharp(imageBuffer).metadata();

      pages.push({
        pageNumber: i + 1,
        imageBuffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
      });
    }

    return pages;
  } finally {
    // Clean up temp directory
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function getPDFPageCount(pdfBuffer: Buffer): Promise<number> {
  // Create a temp file for the PDF
  const tempDir = mkdtempSync(join(tmpdir(), "ocr-pdf-count-"));
  const pdfPath = join(tempDir, "input.pdf");

  try {
    writeFileSync(pdfPath, pdfBuffer);

    // Use pdfinfo to get page count
    const result = execSync(`pdfinfo "${pdfPath}" | grep "Pages:" | awk '{print $2}'`, {
      encoding: "utf-8",
    });

    return parseInt(result.trim(), 10) || 1;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
