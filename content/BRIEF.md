# Social content brief (read by the scheduled content agent)

The content agent runs Monday, Wednesday and Friday. Each run writes ONE file per project:

- `content/easy-fix/YYYY-MM-DD.md`
- `content/finesse-connect/YYYY-MM-DD.md`
- `content/truck-loads/YYYY-MM-DD.md`
- `content/connected-assets/YYYY-MM-DD.md`

and appends a line per project to `content/LOG.md` (date | project | theme | channels) so later runs don't repeat a theme.

**Where to save (owner's instruction, 2026-11-11 — overrides any mention of `content-drafts`):** commit the content to **`main`** and `git push origin main`. Start each run from an up-to-date `main` (`git fetch origin && git checkout main && git pull origin main`). If the push is rejected because main moved, `git pull --no-rebase origin main` and push again — never force-push. Only touch files under `content/`. No pull requests.

Edit this file to change brand facts, tone or rules. The agent follows it.

## Projects

### Easy Fix (this repo — easy-fix.co.za)
- Home services marketplace app: homeowners find plumbers, electricians, handymen etc.; service providers get more jobs.
- Two audiences — never mix them in one post: **homeowners** (trust, speed, fair pricing) and **service providers** (more jobs, easy admin). Alternate audiences across runs.
- Status: launching in **Durban** first; Android app "coming soon" on Google Play. CTA: visit easy-fix.co.za / email hello@easy-fix.co.za to be notified. Don't claim it's live in the store until this brief says so.
- Do NOT advertise warranties, guarantees or paid plans — none exist yet.
- Tone: friendly, consumer, mobile-first.

### Finesse Connect
- ICT delivery for SMEs and commercial clients: digital signage (screens for advertising/information), connectivity and security solutions.
- Audience: SMEs — retail, hospitality, funeral parlours, offices.
- Tone: approachable, results-focused, commercial.
- Facts to confirm (use placeholders until filled in): website `[website]`, WhatsApp `[WhatsApp number]`, service area `[city/province]`.

### Truck Loads
- Uber-style app for booking trucks.
- Two audiences — never mix: **customers** needing transport (businesses, movers, individuals) and **truck owners/drivers** (more loads, less empty running). Alternate across runs.
- Tone: practical, fast, dependable.
- Facts to confirm: launch status `[live/coming soon]`, download link `[link]`, cities `[cities]`.

### Connected Assets (AssetTrack ZA)
- Multi-tenant SaaS for asset tracking/management: equipment, IT and fixed assets.
- Audience: businesses and organisations with assets to track — asset managers, finance managers/CFOs, IT managers, auditors. B2B, so LinkedIn is the main channel.
- Benefits to lead with: fewer lost assets, audit-ready asset registers, time saved on stock-takes/verification. Tie to SA financial year-ends (Feb for many companies, March for government/municipalities) and audit season.
- Funnel goal: demo bookings and free trials.
- Tone: modern SaaS — clear, benefit-led.
- Facts to confirm: website `[website]`, demo/trial link `[demo link]`, pricing `[pricing]`.

## Research step (do this before writing)
The agent has web search and can read public web pages. Each run, spend a short, focused research pass per project, then write `content/research/YYYY-MM-DD.md` with what you found and the source URL + publish date for every point.

Look for:
1. **What's happening now in SA** that the audience cares about — news, weather (e.g. SA Weather Service warnings for Durban), public holidays, school terms, payday/month-end, sector news (retail, logistics, construction, finance/audit).
2. **What people are searching and asking** — trending questions and Google Trends-style signals for the project's topic (e.g. "geyser burst Durban", "digital signage price", "bakkie hire", "fixed asset register audit").
3. **What competitors and similar brands are posting** — read their public websites, blogs and public posts found through search to spot angles, offers and formats that get traction. Use this for ideas only: never copy wording, designs or claims, and never name or knock a competitor in a post.
4. **Effective formats right now** — current guidance on what performs on Facebook, Instagram (Reels/carousels) and LinkedIn for SA SMEs.

Then pick each project's theme from this research (not just the calendar) and say in one line in each post file which finding it is based on.

Research rules:
- Public pages only. Do not log in to, scrape or automate Facebook, Instagram, LinkedIn, TikTok or any site that requires an account or forbids it; use web search results and public pages instead. No personal data about private individuals.
- A stat or fact may go into a post only if it comes from a credible source published in the last 12 months, is recorded in the research file with its URL and date, and is phrased so it stays accurate (attribute it, e.g. "according to …"). Otherwise leave it out. Never invent figures.
- Keep it brief: research serves the posts, it isn't the deliverable.

## Learning what works
`content/RESULTS.md` is where the owner notes how posts performed (reach, likes, comments, shares, leads). Read it every run and lean toward the angles, formats and posting times that did well; drop what didn't. If it's empty, say so in the run summary and suggest the owner add a line or two after posting.

## What each file contains
1. **Theme of the run** (one line), why it's timely and the research finding it is based on (link to the entry in `content/research/YYYY-MM-DD.md`) (SA dates: payday ~25th, month-end, school terms, public holidays, festive season, load-shedding/weather, etc.).
2. **Facebook/Instagram post** — 3 variants with different angles (e.g. price, trust/reliability, convenience). Short, emojis sparingly, CTA, 3–6 hashtags. Include an image/video suggestion.
3. **LinkedIn post** — 1 version (most useful for Connected Assets, Finesse Connect and the Truck Loads business/driver side; for Easy Fix target service providers). Hook first line, short paragraphs, CTA, 3–5 hashtags.
4. **Best posting time** suggestion (SAST).

## Rules
- South African English spelling (optimise, colour), Rand (R), local place names.
- No invented stats, testimonials, reviews, client names, prices or certifications (sourced stats are allowed only as set out in the Research step). Use `[placeholders]` for facts that need filling in.
- Claims must be substantiable (ARB code). No POPIA-unsafe suggestions (no messaging people who haven't opted in).
- Don't repeat a theme used for the same project in the last 4 weeks (check `content/LOG.md`).
