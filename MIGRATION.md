# Migration Guide

How to migrate the 6 independent pi package repos into this pnpm workspace monorepo using `git subtree` to preserve full commit history.

## 1. Initialize the monorepo

```bash
cd pi-packages
git init
git add .
git commit -m "chore: initial monorepo scaffold"
```

## 2. Import each package with `git subtree add`

Each command fetches the full history of a repo and replays every commit prefixed under `packages/<name>/`.
The original commit metadata (author, date, message) is preserved.
A merge commit ties each import into the monorepo.

```bash
git subtree add --prefix=packages/pi-anthropic-auth \
  https://github.com/gotgenes/pi-anthropic-auth.git main

git subtree add --prefix=packages/pi-autoformat \
  https://github.com/gotgenes/pi-autoformat.git main

git subtree add --prefix=packages/pi-coding-agent-catppuccin \
  https://github.com/otahontas/pi-coding-agent-catppuccin.git main

git subtree add --prefix=packages/pi-github-tools \
  https://github.com/gotgenes/pi-github-tools.git main

git subtree add --prefix=packages/pi-permission-system \
  https://github.com/gotgenes/pi-permission-system main

git subtree add --prefix=packages/pi-subagents \
  https://github.com/gotgenes/pi-subagents.git main
```

> **Note on interweaved history:** After import, `git log` shows commits from all packages mixed together chronologically.
> Use `git log packages/pi-foo/` to see only one package's history.
> This is cosmetic — there are no functional issues.
>
> **Note on catppuccin:** pi-coding-agent-catppuccin is a fork from `otahontas`.
> If you want to import from your own fork instead, change the URL.
> The `main` ref may need to be `chore/catppuccin-text-cohesion` or whatever branch you want as the starting point.

## 3. Clean up per-package files replaced by root

After all subtrees are imported, remove the files that are now handled at the monorepo root:

```bash
for pkg in packages/*/; do
  # Files fully replaced by root equivalents
  rm -f "$pkg/release-please-config.json"
  rm -f "$pkg/.release-please-manifest.json"
  rm -f "$pkg/pnpm-workspace.yaml"
  rm -f "$pkg/pnpm-lock.yaml"
  rm -f "$pkg/prek.toml"

  # CI workflows replaced by monorepo workflow
  rm -rf "$pkg/.github"

  # markdownlint — root config covers most packages
  # (pi-subagents keeps its own since it also ignores README.md)
  if [ "$(basename "$pkg")" != "pi-subagents" ]; then
    rm -f "$pkg/.markdownlint-cli2.yaml"
  fi

  # .gitignore — root covers common patterns
  # Review each to see if package-specific entries are needed
  rm -f "$pkg/.gitignore"
done
```

## 4. Update each package's tsconfig.json

Extend the shared base.
Example for `packages/pi-autoformat/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "test", "vitest.config.ts"]
}
```

Each package only needs to specify what differs from `tsconfig.base.json`.

## 5. Update biome configs

Most packages can delete their `biome.json` entirely — the root config applies.

Packages that need overrides (e.g. pi-subagents disables the formatter) keep a thin config:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.14/schema.json",
  "extends": ["../../biome.json"],
  "formatter": {
    "enabled": false
  },
  "files": {
    "includes": ["src/**/*.ts", "test/**/*.ts"]
  }
}
```

## 6. Standardize package.json scripts

Use these standardized scripts in each TypeScript package:

```json
{
  "scripts": {
    "build": "tsc",
    "check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint:md": "markdownlint-cli2 '*.md' 'docs/**/*.md'"
  }
}
```

Biome linting is handled at the workspace root — packages don't need their own `lint` script for JS/TS/JSON.
Only `lint:md` stays per-package since markdown file paths vary.

Remove `packageManager` from each package's `package.json` — it's set at the workspace root.

## 7. Use pnpm catalog versions (optional)

`pnpm-workspace.yaml` defines a `catalog` for common devDependency versions.
In each package's `package.json`, you can use:

```json
{
  "devDependencies": {
    "vitest": "catalog:",
    "typescript": "catalog:",
    "@types/node": "catalog:",
    "markdownlint-cli2": "catalog:"
  }
}
```

This ensures all packages use the same version.
Update once in the workspace file, all packages follow.

## 8. Install and verify

```bash
pnpm install
pnpm run build
pnpm run lint
pnpm run test
```

## 9. Commit the cleanup

```bash
git add .
git commit -m "chore: consolidate configs into monorepo root"
```

## 10. Push and configure GitHub

1. Create the `pi-packages` repo on GitHub.
2. Push: `git remote add origin <url> && git push -u origin main`
3. Add `NPM_TOKEN` to the repo's Actions secrets.

## 11. Migrate GitHub Issues

`gh issue transfer` moves issues between repos owned by the same user.
It preserves title, body, comments, author, and creation date.
The original URL redirects to the new location.
Labels and milestones are **not** transferred.

A migration script handles this:

```bash
# Preview what will be transferred
./scripts/migrate-issues.sh

# Transfer open issues only
./scripts/migrate-issues.sh --open-only --execute

# Transfer all issues (open + closed)
./scripts/migrate-issues.sh --execute
```

The script:

1. Creates `pkg:pi-foo` labels in the monorepo.
2. Transfers each issue via `gh issue transfer`.
3. Applies the package label to each transferred issue.

> **Note:** Issues from `otahontas/pi-coding-agent-catppuccin` can only be transferred if you have admin access to that repo, or if the issue author transfers them.
> You may need to re-create those manually.

## 12. Archive original repos

After migration, archive the original repos to prevent new issues from being filed there:

```bash
for repo in pi-anthropic-auth pi-autoformat pi-github-tools pi-permission-system pi-subagents; do
  gh repo edit "gotgenes/$repo" --description "Moved to gotgenes/pi-packages"
  gh repo archive "gotgenes/$repo" --yes
done
```

Archived repos remain readable (git history, old issues) but disallow new issues, PRs, and pushes.

## 13. Consolidate .pi/settings.json with self-providing pattern

Each package currently has its own `.pi/settings.json` that references `npm:@gotgenes/pi-github-tools` and other packages.
In the monorepo, a single root `.pi/settings.json` replaces all of them.

Use the **self-providing pattern** to load local extensions while suppressing global npm duplicates.
Pi deduplicates by identity — npm package name and local absolute path are different identities, so without this both would load.

```json
{
  "packages": [
    "./packages/pi-github-tools",
    "./packages/pi-autoformat",
    "./packages/pi-permission-system",
    "./packages/pi-anthropic-auth",
    "./packages/pi-subagents",
    "~/development/pi/pi-coding-agent-catppuccin",

    { "source": "npm:@gotgenes/pi-github-tools", "extensions": [] },
    { "source": "npm:@gotgenes/pi-autoformat", "extensions": [] },
    { "source": "npm:@gotgenes/pi-permission-system", "extensions": [] },
    { "source": "npm:@gotgenes/pi-anthropic-auth", "extensions": [] },
    { "source": "npm:@gotgenes/pi-subagents", "extensions": [] },

    "npm:pi-prompt-template-model",
    "npm:pi-web-access",
    "npm:@eko24ive/pi-ask"
  ]
}
```

- **Local paths** (`./packages/...`) load live extensions — edits are immediately available, no publish cycle.
- **npm entries with `"extensions": []`** claim the npm identity so global installs are suppressed (project entry wins dedup).
- **Third-party packages** (`pi-prompt-template-model`, etc.) have no local counterpart, so they load normally.

After setting up the root `.pi/settings.json`, delete the per-package `.pi/settings.json` files (or trim them to package-specific overrides only).

## 14. Extract common AGENTS.md, skills, and prompt templates

After the subtree imports, diff the AGENTS.md files and `.pi/` directories across packages to identify shared content.

**AGENTS.md:** Extract common instructions (coding standards, commit conventions, PR workflow, etc.) into a root `AGENTS.md`.
Each package keeps a thin `AGENTS.md` with package-specific context only.
Pi concatenates both (root + package) when working in a package directory.

**Skills:** Move shared skills to `pi-packages/.pi/skills/`.
Pi's ancestor walk discovers them automatically from any `packages/<name>/` CWD.
Keep package-specific skills in `packages/<name>/.pi/skills/`.

**Prompt templates:** Same pattern — shared templates go to `pi-packages/.pi/prompts/`, package-specific ones stay in the package.

This step is best done in a new session inside the monorepo, with all package files present to compare.

## What each package loses (moved to root)

| File | Where it went |
| ---- | ------------- |
| `release-please-config.json` | Root `release-please-config.json` (monorepo mode) |
| `.release-please-manifest.json` | Root `.release-please-manifest.json` |
| `pnpm-workspace.yaml` | Root `pnpm-workspace.yaml` |
| `pnpm-lock.yaml` | Root `pnpm-lock.yaml` (single lockfile) |
| `prek.toml` | Root `prek.toml` |
| `.markdownlint-cli2.yaml` | Root `.markdownlint-cli2.yaml` |
| `.github/workflows/ci.yml` | Root `.github/workflows/ci.yml` |
| `.gitignore` | Root `.gitignore` |

## What each package keeps

- `package.json` (simplified — no `packageManager`, can use `catalog:`)
- `tsconfig.json` (extending `../../tsconfig.base.json`)
- `biome.json` (only if overriding root — pi-subagents)
- `README.md`, `CHANGELOG.md`, `LICENSE`
- `AGENTS.md`
- `src/`, `test/`, `docs/`
- `.pi/` (package-specific skills, prompts, extensions)

## Release tag format change

Single-repo tags were `v1.2.3`.
Monorepo tags include the component name: `pi-autoformat-v4.0.6`.
Release-please uses `.release-please-manifest.json` to track current versions, so existing tags from the old repos don't need to exist in the monorepo.

## Pi skill discovery

Pi walks ancestor directories looking for `.pi/skills/`.
Skills placed in `pi-packages/.pi/skills/` are automatically discovered when working in any package directory.
Package-specific skills stay in `packages/<name>/.pi/skills/`.
