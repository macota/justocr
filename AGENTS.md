# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains Next.js App Router pages, layouts, and API routes (see `app/api/ocr/`).
- `components/` holds feature UI (upload, provider selection, results); `components/ui/` is the shadcn/ui layer.
- `lib/` contains core logic; OCR providers live in `lib/ocr/` and its `providers/` and `client/` subfolders.
- `public/` stores static assets; `tests/` contains Bun tests (`*.test.ts`).
- `scripts/` and `planning/` hold helper scripts and roadmap docs.

## Build, Test, and Development Commands
- `bun dev` runs the local dev server at `http://localhost:3000`.
- `bun run build` creates a production build; `bun run start` serves it.
- `bun run lint` runs ESLint (`eslint.config.mjs`).
- `bun run test` runs the Bun test suite (loads `.env.local`).
- `bunx --bun shadcn@latest add <component>` adds a shadcn/ui component.

## Coding Style & Naming Conventions
- TypeScript + React (TSX) across the app; use 2-space indentation and double quotes to match existing files.
- Component files use kebab-case (`upload-zone.tsx`); exported components use PascalCase (`UploadZone`).
- Path alias `@/*` maps to the repo root (e.g., `@/components`, `@/lib`).

## Testing Guidelines
- Tests live in `tests/` with `*.test.ts` naming (`ocr.test.ts`, `privacy-mode.test.ts`).
- Prefer unit tests for providers and integration tests for API behavior.
- Run `bun run test` before opening a PR, especially for OCR provider changes.

## Commit & Pull Request Guidelines
- Commit history mixes short imperative messages with Conventional Commits. Prefer `feat:`, `fix:`, `refactor:`, `test:`, or `docs:` when possible.
- PRs should include: a short summary, testing notes (commands run), and screenshots for UI changes.
- Link relevant issues and note any provider/API credentials required for reviewers.

## Configuration & Dependencies
- Store secrets in `.env.local` (e.g., `MISTRAL_API_KEY`); never commit credentials.
- Google Vision uses ADC via `GOOGLE_APPLICATION_CREDENTIALS` or `gcloud auth application-default login`.
- PDF support requires `pdftoppm` (Poppler) installed on the host system.
