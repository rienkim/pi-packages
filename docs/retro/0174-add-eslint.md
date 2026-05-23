---
issue: 174
issue_title: "Add ESLint for type-aware lint rules and import path enforcement"
---

# Retro: #174 — Add ESLint for type-aware lint rules and import path enforcement

## Stage: Planning (2026-05-23T20:00:00Z)

### Session summary

Produced a 6-step build plan for adding ESLint alongside Biome across all six packages.
The plan uses `typescript-eslint` type-aware presets with cherry-picked `strictTypeChecked` rules matching the RepOne cdk config, plus a custom inline ESLint rule for import path enforcement with auto-fix support.

### Observations

- **No third-party import plugins:** Both `eslint-plugin-no-relative-import-paths` and `eslint-plugin-paths` use legacy CommonJS config, deprecated ESLint APIs, and lack flat config support.
  A custom inline rule (~50 lines) is simpler, safer, and supports auto-fix tailored to the monorepo's uniform `#src/*` / `#test/*` convention.
- **Biome overlap avoidance:** Plan specifies using `*TypeCheckedOnly` presets if available in the flat config API, falling back to full presets with overlapping rules disabled.
  This keeps ESLint focused on what Biome can't do.
- **Existing violations are manageable:** 46 relative imports in `src/` + 5 in `test/`, ~27 `any` usages in source (mostly `pi-subagents` SDK boundary code needing `eslint-disable` comments).
- **`pi-subagents` is missing `"type": "module"`** — discovered during investigation, included as step 1.
- **This is a `/build-plan` change** (config/tooling), not a TDD change.
  The custom rule is validated by running ESLint against the codebase itself.
