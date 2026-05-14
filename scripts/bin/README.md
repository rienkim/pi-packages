# scripts/bin

Project shims injected ahead of system PATH via `mise.toml`.

## npm

Intercepts `npm` and redirects to `pnpm`.
This project uses pnpm exclusively.
See the shim source for pass-through exceptions.
