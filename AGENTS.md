# AGENTS.md

## Project Purpose

Pi extension that registers deterministic GitHub CI, release, and issue tools via `pi.registerTool()`.
Replaces ad-hoc `gh` CLI polling with structured tools that have exponential backoff, progress streaming, and structured success/timeout returns.

## Architecture

Portable business logic in `src/lib/` — no Pi SDK imports.
Thin Pi wrappers in `src/tools/` register each tool and map `onProgress` to Pi's `onUpdate`.
`src/extension.ts` is the Pi extension entry point.

```text
src/
├── extension.ts          # default export: registers all tools
├── tools/                # Pi tool wrappers (one per tool)
├── lib/                  # portable business logic
│   ├── ci.ts             # findRun, watchRun, listRuns
│   ├── ci-helpers.ts     # CIJob, findRetryDelay, formatProgress
│   ├── release.ts        # findReleasePR, mergeReleasePR, watchRelease
│   ├── issue.ts          # closeIssue
│   ├── github.ts         # gh(), ghJson(), detectRepo()
│   └── process.ts        # runCommand(), sleep()
└── progress.ts           # maps onProgress → Pi onUpdate
```

## Code Style

- Use TypeScript. This project uses **pnpm** exclusively — never `npm` or `npx`.
- The tsconfig target is ES2023 (`noEmit: true`).
- Avoid `any` unless absolutely necessary.
- Keep modules focused and composable (one concern per file).
- `src/lib/` must not import from `@earendil-works/pi-coding-agent` — only `src/tools/` and `src/progress.ts` touch Pi types.
- The `gh` CLI is the sole external binary dependency.

## Testing

- Mock `runCommand` in `lib/` tests to avoid real `gh` calls.
- Test backoff timing, progress formatting, timeout handling, structured output.
- `tools/` wrappers are thin and tested lightly.
- Run a single file: `pnpm vitest run <test-path>`
- Run the full suite: `pnpm vitest run`

## Commits

Use Conventional Commits.
Commit at meaningful checkpoints without waiting for an explicit reminder.
Prefer small, reviewable commits that leave the repository in a valid state.
