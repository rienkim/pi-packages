# pi-github-tools

Pi extension providing deterministic GitHub CI, release, and issue tools.

Replaces ad-hoc `gh` CLI polling with structured tools that have exponential backoff, progress streaming, and structured success/timeout returns.

## Installation

Add to your Pi settings:

```json
{
  "packages": ["@gotgenes/pi-github-tools"]
}
```

## Prerequisites

- [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated
- Node.js ≥ 20

## Tools

| Tool | Purpose |
| --- | --- |
| `ci_find` | Wait for a CI run matching a pushed SHA |
| `ci_watch` | Poll a CI run until it completes |
| `ci_list` | List recent CI runs for a workflow |
| `release_pr_find` | Find the release-please PR after a push to `main` |
| `release_pr_merge` | Merge a release-please PR after confirming it's clean |
| `release_watch` | Wait for a release tag after merging release-please |
| `issue_close` | Close a GitHub issue with an optional comment |

## License

MIT
