# JustOCR

A web application for OCR processing using multiple providers. Upload documents (images or PDFs), select an OCR provider, and extract text.

## Features

- **Multiple OCR Providers**: Choose from Tesseract, Mistral OCR, or Google Cloud Vision
- **Privacy Mode**: Process documents entirely in your browser with Tesseract - data never leaves your device
- **BYOK (Bring Your Own Key)**: Use your own API keys for cloud providers, stored securely in localStorage
- **PDF Support**: Full PDF processing on both server and client side
- **Benchmarking**: Compare up to 4 providers side-by-side, export results as JSON/CSV

## OCR Providers

| Provider | Type | Notes |
|----------|------|-------|
| Tesseract (Local) | Client-side | Privacy Mode - runs entirely in browser |
| Mistral OCR | Server/BYOK | Requires API key |
| Google Cloud Vision | Server/BYOK | Requires ADC or API key |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime
- [Poppler](https://poppler.freedesktop.org/) for server-side PDF processing (optional)

```bash
# macOS
brew install poppler
```

### Installation

```bash
bun install
```

### Environment Variables

Create a `.env.local` file with optional API keys:

```env
MISTRAL_API_KEY=your_mistral_key  # Optional if using BYOK
```

For Google Cloud Vision, use Application Default Credentials:

```bash
gcloud auth application-default login
```

Or set `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service account JSON file.

### Development

```bash
bun dev          # Start development server at localhost:3000
bun run build    # Production build
bun run lint     # Run ESLint
bun run test     # Run test suite
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19 and TypeScript
- **UI**: shadcn/ui with Tailwind CSS 4
- **OCR**: tesseract.js, Mistral OCR API, Google Cloud Vision API
- **PDF**: PDF.js (client), pdftoppm (server)

## Project Structure

```
app/              # Next.js App Router pages and API routes
components/       # React components
lib/ocr/          # OCR provider abstraction layer
  providers/      # Server-side provider implementations
  client/         # Client-side BYOK providers
tests/            # Test suite
```

## License

MIT
