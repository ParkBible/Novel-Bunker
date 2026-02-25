# CLAUDE.md — Novel-Bunker AI Assistant Guide

This file provides essential context for AI assistants (Claude and others) working in this repository.

---

## Project Overview

**Novel-Bunker** is a local-first web application for writing novels. It features a 3-panel layout — a chapter/scene tree, a rich-text editor, and a context panel with AI feedback. All data is stored in the browser's IndexedDB (no server-side database or auth required).

**Language:** The project UI, demo data, commit messages, and PR templates are all written in **Korean**.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19, Tailwind CSS 4, Lucide React |
| State | Zustand 5 |
| Database | Dexie.js 4 (IndexedDB) |
| Rich Text | TipTap 3 |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| AI | Google Gemini API (`@google/generative-ai`) |
| Linter/Formatter | Biome 2 |
| Package Manager | pnpm |

---

## Directory Structure

```
Novel-Bunker/
├── app/
│   ├── (shared)/               # Shared non-route code (no UI pages here)
│   │   ├── db/
│   │   │   ├── index.ts        # Dexie DB schema and entity types
│   │   │   └── operations.ts   # All CRUD operations (single source of truth)
│   │   ├── stores/
│   │   │   └── editorStore.ts  # Zustand global state
│   │   └── utils/
│   │       ├── gemini.ts       # Gemini API client utilities
│   │       └── demoData.ts     # Demo data seeding
│   ├── api/
│   │   └── ai/
│   │       ├── feedback/route.ts   # POST /api/ai/feedback
│   │       └── grammar/route.ts    # POST /api/ai/grammar
│   ├── chapter/
│   │   └── [id]/
│   │       ├── page.tsx            # Chapter page (server component shell)
│   │       └── components/
│   │           ├── ChapterContent.tsx   # Main editor area
│   │           ├── ContextPanel.tsx     # Right sidebar (AI feedback, scene info)
│   │           ├── scene/               # Scene card / editor / add-button components
│   │           └── tree/                # Left nav (chapter/scene tree)
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   ├── page.tsx                # Home — redirects to first chapter
│   └── globals.css             # Global styles + TipTap editor overrides
├── .claude/commands/           # Claude CLI slash-command helpers (commit, pr)
├── .github/
│   ├── commit_message_template.md   # Conventional Commits format (Korean)
│   └── pull_request_template.md     # PR template (Korean)
├── .husky/pre-commit           # Runs Biome on staged files before every commit
├── biome.json                  # Biome formatter + linter config
├── next.config.ts              # Next.js config (React Compiler enabled)
├── tsconfig.json               # TypeScript config (strict, @/* alias)
└── package.json
```

---

## Data Models

Defined in `app/(shared)/db/index.ts`. Database name: `NovelBunkerDB`.

### Chapter
```typescript
{ id?: number; title: string; order: number; createdAt: Date; updatedAt: Date }
```

### Scene
```typescript
{
  id?: number;
  chapterId: number;       // FK → Chapter
  title: string;
  content: string;         // HTML string from TipTap
  order: number;
  characters: string[];    // Character names linked to this scene
  aiFeedback?: string;     // Stored AI feedback text
  createdAt: Date;
  updatedAt: Date;
}
```

### Character
```typescript
{ id?: number; name: string; description: string; tags: string[] }
```

### Setting (key-value store)
```typescript
{ key: string; value: string }
// Known keys: "novelTitle", "synopsis"
```

**All DB access must go through `app/(shared)/db/operations.ts`.** Never import the Dexie instance directly in components or the store.

---

## State Management

`app/(shared)/stores/editorStore.ts` — single Zustand store.

Key state slices:
- `chapters`, `scenes`, `characters` — loaded from IndexedDB
- `novelTitle`, `synopsis` — loaded from Settings table
- `selectedSceneId` — currently active scene
- `isLoadingAI` — AI request in progress flag

**Convention:** Components read state from the store; mutations call operations from `db/operations.ts` and then update the store.

---

## API Routes

### `POST /api/ai/feedback`
- Body: `{ sceneContent: string, synopsis: string, characters: Character[] }`
- Response: `{ feedback: string }`
- Calls Gemini 2.0 Flash; returns Korean-language feedback.

### `POST /api/ai/grammar`
- Body: `{ content: string }`
- Response: `{ suggestions: string }`
- Checks Korean grammar via Gemini.

**Required environment variable:** `GEMINI_API_KEY` in `.env.local`.

---

## Development Workflow

### Setup
```bash
pnpm install
cp .env.local.example .env.local   # (no example file yet — create manually)
# Add GEMINI_API_KEY=<your-key> to .env.local
pnpm dev                            # http://localhost:3000
```

### Common Scripts
```bash
pnpm dev        # Start development server
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # Biome check (no auto-fix)
pnpm format     # Biome format with --write
```

### Git Hooks
Husky runs `biome check --write --staged` on every `git commit`. Commits will be blocked if Biome cannot auto-fix the staged files. Fix lint/format issues before committing.

---

## Code Conventions

### TypeScript
- Strict mode is enabled — no implicit `any`, no unchecked nulls.
- Use the `@/*` path alias (maps to project root) for all internal imports.
- Prefer explicit return types on functions exposed across module boundaries.

### Formatting (Biome)
- **Indentation:** 4 spaces
- **Quotes:** double quotes for JavaScript/TypeScript
- **Import order:** Biome auto-organizes; do not manually reorder.
- Run `pnpm format` before committing if the pre-commit hook fails.

### Components
- All page-level components live under `app/chapter/[id]/components/`.
- Shared non-UI code lives in `app/(shared)/`.
- Prefer small, single-responsibility components.
- TipTap editor content is stored as **HTML strings**.

### Styling
- Use **Tailwind CSS 4** utility classes.
- Global overrides and TipTap editor styles live in `app/globals.css`.
- Support dark mode with `dark:` prefixed classes.

### Commit Messages
Follow the Conventional Commits format defined in `.github/commit_message_template.md`:
```
<type>: <subject (max 50 chars, Korean ok)>

- bullet point detail
- another detail
```
Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`

Use the `/commit` Claude CLI command for auto-generated commit messages.

### Pull Requests
Use the `/pr` Claude CLI command or follow `.github/pull_request_template.md`.

---

## Key Architectural Decisions

1. **Local-first / No backend DB.** All persistent data lives in the browser's IndexedDB via Dexie. There is no server-side database, no user accounts, and no cloud sync.

2. **Operations layer as single DB gateway.** All reads/writes go through `app/(shared)/db/operations.ts`. Components and the Zustand store must never instantiate or import the Dexie table directly.

3. **AI is server-side only.** Gemini API calls are made from Next.js API routes (`/api/ai/*`), not from the client, so the API key is never exposed.

4. **React Compiler enabled.** `next.config.ts` opts in to the experimental React Compiler (Babel plugin). Avoid manual `useMemo`/`useCallback` optimizations unless profiling shows a genuine need.

5. **No test suite (yet).** There are no test files or test framework configured. When adding tests, prefer Vitest + React Testing Library to align with the existing TypeScript/modern-React stack.

6. **Auto-save with debouncing.** Scene titles debounce at 500 ms; scene content debounces at 1000 ms. Respect these timings when modifying save logic.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes (AI features) | Google Gemini API key |

Create `.env.local` at the project root. This file is git-ignored.

---

## What Does Not Exist Yet

- No `.env.example` file — create one if adding new env vars
- No test suite — no Jest/Vitest configured
- No CI/CD pipeline — no `.github/workflows/`
- No server-side database
- No authentication
