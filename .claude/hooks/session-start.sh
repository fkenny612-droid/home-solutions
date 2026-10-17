#!/bin/bash
# SessionStart hook for Claude Code cloud sessions.
# Installs workspace dependencies so typecheck, lint, and builds work.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Workspace deps (api, web, mobile). `install` over `--frozen-lockfile` so the
# cached container state is reused between sessions.
pnpm install >&2

# The API won't typecheck until the Prisma client is generated from its schema.
pnpm --filter api exec prisma generate >&2
