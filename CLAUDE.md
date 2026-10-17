# Easyfix (home-solutions)

Home-services marketplace: clients book providers for jobs, with chat, payments,
subscriptions, reviews, KYC, and an admin portal. pnpm monorepo, one app per
directory under `apps/`.

## Layout

| App | Stack | Deploys to |
|-----|-------|-----------|
| `apps/api` | NestJS 10 + Prisma 5 (Postgres), JWT auth via passport | Render — `https://home-solutions-ds5b.onrender.com/api/v1` |
| `apps/web` | Next.js 14 (app router) + Tailwind; marketing site, client/provider pages, `/admin` portal | Vercel |
| `apps/mobile` | Expo SDK 57, expo-router, React Native 0.86 | EAS → Google Play (internal track) |

- API modules live in `apps/api/src/modules/`; schema is `apps/api/prisma/schema.prisma`.
- Mobile and web call the API through `apps/mobile/lib/api.ts` and `apps/web/src/lib/api.ts`.
  Base URL comes from `EXPO_PUBLIC_API_URL` / `NEXT_PUBLIC_API_URL`, falling back to the Render URL.
- Railway is dead. `apps/api/railway.json` and `nixpacks.toml` are leftovers; don't target them.
- Before writing mobile code, read `apps/mobile/AGENTS.md` (Expo APIs have changed; use the versioned docs).

## Commands

Run from the repo root unless noted. Cloud sessions run `pnpm install` and
`prisma generate` automatically (`.claude/hooks/session-start.sh`).

- Install: `pnpm install`
- API dev: `pnpm api` · build: `cd apps/api && pnpm build` · schema change: `cd apps/api && pnpm db:push`
- Web dev: `pnpm web` · build: `pnpm web:build`
- Mobile: `cd apps/mobile && pnpm start` (`pnpm web` for the browser build)
- Typecheck: `npx tsc --noEmit -p apps/api`, and `npx tsc --noEmit` inside `apps/web` and `apps/mobile`
- Lint (web only): `cd apps/web && npx next lint`
- There is no automated test suite. Verify with typecheck, lint, and `/qa` against the running app.

## Conventions

- Secrets: a gitleaks pre-commit hook (`.githooks/`) and CI scan block committed secrets.
  Never commit `.env*`, keys, or demo credentials. False positives go in `.gitleaks.toml`.
- Never show fabricated data to real users (fake listings, hardcoded badges, mock
  subscription state). On API failure, show an error or empty state.
- Authorization: every API endpoint needs the JWT guard and must scope data to the caller.
- Commit messages: imperative, describe the user-visible effect ("Fix X showing Y on Z").

## Workflow

- **Bug** → `/investigate` (root cause before any fix) → fix → typecheck → `/review` → `/qa` → `/ship`
- **Feature** → `/office-hours` or `/autoplan` first, then implement → `/review` → `/qa` → `/ship`
- **Store or compliance work** (Google Play, privacy, account deletion) → `/plan-eng-review` before coding, touching api + mobile + web together
- **UI polish** → `/design-review`
- **End of session** → `/context-save`; **start of the next one** → `/context-restore`
  (cloud containers are discarded, so unsaved context is lost)

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Most of these are gstack skills. gstack is installed per machine (`~/.claude/skills/gstack`),
not in this repo, so cloud sessions may not have it. If a routed skill isn't available,
say so and follow the same approach manually instead of skipping it silently.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
