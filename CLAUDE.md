# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JustOCR is a web app for OCR processing using multiple providers. Users can upload documents (images or PDFs), select an OCR provider, and extract text.

## Commands

```bash
bun dev          # Start development server at localhost:3000
bun run build    # Production build (only run when asked)
bun run lint     # Run ESLint
bun run test     # Run test suite (loads .env.local)
```

**Note**: Do not run `bun dev` - the dev server is already running in a separate terminal.

## Architecture

This is a Next.js 16 project using the App Router with React 19 and TypeScript.

**UI Framework**: shadcn/ui with the "base-vega" style variant, using:
- Tailwind CSS 4 for styling
- @base-ui/react as the component primitive library
- lucide-react for icons
- Stone color palette with CSS variables defined in `app/globals.css`

**Path Aliases** (configured in tsconfig.json):
- `@/*` maps to root (e.g., `@/components`, `@/lib`)

**Key Directories**:
- `app/` - Next.js App Router pages and layouts
- `app/api/ocr/` - OCR processing API endpoint
- `components/` - App components (upload-zone, provider-selector, ocr-results)
- `components/ui/` - shadcn/ui components
- `lib/ocr/` - OCR provider abstraction layer
- `lib/ocr/providers/` - Individual OCR provider implementations
- `lib/pdf.ts` - Server-side PDF to image conversion (uses pdftoppm)
- `lib/pdf-browser.ts` - Client-side PDF to image conversion (uses PDF.js)
- `tests/` - Test suite (unit tests + integration tests for live API calls)

## OCR System

**Provider Abstraction** (`lib/ocr/`):
- `types.ts` - OCRProvider, OCRResult, and benchmark interfaces
- `index.ts` - Provider registry and processOCR function
- `benchmark.ts` - Benchmark comparison utilities and export functions
- `providers/tesseract.ts` - Server-side Tesseract.js provider
- `providers/tesseract-browser.ts` - Client-side Tesseract for Privacy Mode
- `providers/mistral.ts` - Mistral OCR API provider (server-side)
- `providers/google.ts` - Google Cloud Vision provider (server-side)
- `client/` - Browser-side BYOK providers (direct API calls, keys never touch server)
  - `mistral.ts` - Direct Mistral API calls
  - `google.ts` - Direct Google Vision API calls
  - `index.ts` - BYOK provider registry

**Adding a new OCR provider**:
1. Create `lib/ocr/providers/<name>.ts` implementing `OCRProvider` interface
2. Register in `lib/ocr/index.ts` providers object
3. Add to `components/provider-selector.tsx` PROVIDERS array
4. For BYOK support: add client in `lib/ocr/client/<name>.ts`

**Environment Variables & Auth**:
- `MISTRAL_API_KEY` - Mistral OCR API key (in `.env.local`, optional if using BYOK)
- Google Cloud Vision uses Application Default Credentials (ADC):
  - Run `gcloud auth application-default login` for local dev
  - Or set `GOOGLE_APPLICATION_CREDENTIALS` pointing to service account JSON
- **Production without keys**: Users can still use Tesseract (server/local) and BYOK for cloud providers

**PDF Support**:
- Server-side: Uses `pdftoppm` (poppler) for PDF to PNG conversion at 300 DPI
  - Requires poppler installed on the system (`brew install poppler` on macOS)
- Client-side: Uses PDF.js (`lib/pdf-browser.ts`) for in-browser PDF to image conversion
  - Privacy Mode now fully supports PDFs - data never leaves the browser

**Features**:
- **Privacy Mode**: "Tesseract (Local)" processes images and PDFs entirely in browser - data never leaves device
- **BYOK**: Users provide their own API keys for Mistral/Google, stored in localStorage
- **Benchmarking**: Compare up to 4 providers side-by-side, export results as JSON/CSV

## External Dependencies

- `tesseract.js` - Local OCR engine (configured with legacyCore/legacyLang for Node.js compatibility)
- `pdfjs-dist` - Client-side PDF rendering (PDF.js)
- `sharp` - Image metadata
- `pdftoppm` - Server-side PDF rendering (system dependency via poppler, not npm)

## Adding shadcn Components

```bash
bunx --bun shadcn@latest add <component-name>
```

## Future Work

- Cloud providers: AWS Textract
- User authentication and usage tracking
- Stripe integration for paid tiers
- See `planning/roadmap.md` for full roadmap
