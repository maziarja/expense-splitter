# Expense Splitter

A group expense-splitting app with multi-currency support, flexible split types, and clear settlement tracking.

**Challenge:** [Expense Splitter on Frontend Mentor](https://www.frontendmentor.io/challenges/expense-splitter)

**Live URL:** [https://expense-splitter.mazdev.dev](https://expense-splitter.mazdev.dev)

**Guest experience (submit this one):** [https://expense-splitter.mazdev.dev/groups](https://expense-splitter.mazdev.dev/groups)

---

## Overview

Expense Splitter is a full-stack group expense tracker: create a group, log expenses in any of 4 split types (equal, exact, percentage, shares), and see who owes whom with pairwise settlement suggestions. It supports mixed-currency groups with live exchange rates, custom categories, filtering, and two differentiators — interactive spending charts and AI-powered receipt scanning.

The whole app is explorable without an account: guest mode seeds 5 realistic groups (43 expenses, mixed currencies, every split type, a mix of settled and outstanding debts) into `sessionStorage` so a visitor sees the product working within seconds. Signing up gets the identical UI backed by a real Postgres database instead.

### Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), TypeScript |
| Database | Neon (serverless Postgres) |
| ORM | Prisma 7 (`@prisma/adapter-pg` driver adapter) |
| Authentication | Better Auth (email/password), Resend for verification/reset email |
| Hosting | Vercel |
| Styling | Tailwind v4 + shadcn/ui (Radix primitives, restyled against custom tokens) |
| Fonts | Manrope (UI) + IBM Plex Mono (figures), via `next/font/google` |
| State | Zustand (guest-mode store, small UI state) |
| Forms/validation | React Hook Form + Zod (schemas shared client/server) |
| Currency API | ExchangeRate-API, DB-backed hourly cache with stale-fallback |
| Charts (differentiator) | Recharts |
| AI receipt scanning (differentiator) | Vercel AI SDK (`ai` + `@ai-sdk/openai`), OpenAI vision, Vercel Blob for image storage |
| Testing | Vitest (263 tests — pure calculation/hook/data-layer logic; no e2e suite, by design — see [Known limitations](#known-limitations)) |
| Package manager | Bun |

---

## Design decisions

These are the product and design choices I made where the spec left room for interpretation.

### Expense entry UX

**The problem I was solving:** Expense entry is the most frequent action in the app, but the data model is genuinely complex — amount, description, payer, split type, participants, category, currency. `guidance/patterns.md` also drew a real tension I had to resolve directly: it names "modals for routine actions like adding a simple expense" as an anti-pattern, while separately endorsing a full-screen modal for *mobile* expense entry specifically.

**My approach:** I split the two platforms rather than picking one pattern for both. Mobile gets a slide-up `Sheet`. Desktop gets an inline form that expands within the expense list itself (above the rows) when "Add expense" is clicked — no `Dialog` anywhere in the desktop path. Both wrap the same underlying form. Every split type shares one unified per-member row layout (a toggle chip plus a conditional input — nothing for equal, a dollar amount for exact, a percentage for percentage, a share count for shares) rather than four different layouts behind a tab switch, so the mental model stays constant as you switch types. "Paid by" and the split participants are both avatar chip rows, not dropdowns, per `patterns.md`'s explicit guidance. The live per-member preview computes inline as you type, and exact/percentage splits show a specific mismatch message ("Splits are $0.01 under the total") rather than a generic error.

**Why I chose this approach:** The fast path (one payer, split equally, defaults pre-filled) needs zero extra taps beyond amount + description. The unified row layout means learning one split type teaches you all four. Keeping validation specific (exact cents/percentage remaining) rather than a blanket "splits don't add up" respects that the user is mid-calculation, not just wrong.

**What I'd do differently:** The per-expense currency field (a spec requirement even before Phase 7's live-rate infrastructure existed) initially defaulted to a hardcoded rate of 1 with no live data behind it — correct sequencing for the phased build, but if I were starting over I'd stub the live-rate call earlier so the field never has a "not really live yet" state visible to a tester.

### Group dashboard design

**The problem I was solving:** The dashboard has to answer several questions at once — "how much have we spent," "who owes whom," "what happened recently," "what do I need to do" — without becoming visual overload, especially on mobile.

**My approach:** A fixed information hierarchy, stacked top to bottom: your personal balance (with a "Settle up" CTA on every owed/owing row, not just a summary number) → members → group summary (total spent, per-member balances) → recent expenses (capped at 5, "Load more" pagination) → spending breakdown (3 collapsible charts, closed by default) → settlement history → group-wide settlement suggestions. Filters (category / paid-by / includes-member / date range) sit as an always-visible inline row above the expense list rather than behind a toggle. Everything is a single scrolling column — no tabs — since the checklist above already gives it a natural top-to-bottom priority order that a tabbed layout would just fragment.

**Why I chose this approach:** Personal balance leads because "do I owe money right now" is the single most-asked question when someone opens a shared-expense app. The three chart cards default to collapsed specifically because a first Lighthouse/user pass showed 3 stacked charts reading as "too busy" before any data had even been requested — collapsing by default keeps the page glanceable while keeping the detail one tap away.

**What I'd do differently:** The chart cards' collapse state doesn't persist between visits (resets to closed every load). For a user who lives in the charts, that's a minor repeated tap — a small localStorage-backed "last open state" would be a cheap follow-up.

### Settlement flow design

**The problem I was solving:** Settlement is the payoff moment — the whole reason to track expenses in the first place. Raw numbers ("pay Alex $45") are functional but not designed; the challenge is making a conceptually simple pairwise transaction feel trustworthy and satisfying to resolve.

**My approach:** Settlement suggestions appear in two places with two different framings: the personal balance card uses first-person language ("You owe Alex $45.00" / "Jordan owes you $22.50"), while the group-wide settlement-suggestions card is neutral ("Sam owes Taylor $100.60") since it covers debts that may not involve the viewer at all. Every suggestion row has its own "Settle up" button that opens a small dialog pre-filled with the suggested amount but fully editable, supporting partial settlements. A confirmed settlement shows a toast and the balance updates immediately. Reaching zero balance triggers a distinct celebratory state (confetti + "All settled up!") rather than a bare "$0.00."

**Why I chose this approach:** Putting the CTA on *both* directions of a debt (you can record a payment whether you owe or are owed) matches how these payments actually happen in real life — either party might be the one logging it. The personal-vs-neutral framing split means the same underlying data reads correctly regardless of whose screen it's on.

**What I'd do differently:** This is the one area with a real, documented algorithmic gap rather than a stylistic trade-off — see [Known limitations](#known-limitations) below on debt-cycle simplification and overpayment validation. Both were found while writing Phase 12's test coverage and deliberately left unfixed at the user's direction (scope discipline for a "testing consolidation" phase), but they're the first things I'd address with more time.

### Other design choices

- **Landing page** is a static Server Component (no `"use client"`) for fast time-to-interactive, with a live-data "group balance" mockup card rather than a generic hero illustration.
- **Dark mode** is a manual toggle (persisted, overrides OS preference) rather than OS-only — placed in the app shell headers where users spend their time, deliberately left off the landing/auth pages.
- **Guest mode** is entirely client-side (Zustand + `sessionStorage`, no server counterpart) so the demo experience needs zero backend state and resets cleanly between visitors.
- **Navigation** is a persistent sidebar (shadcn `Sidebar`) with per-group balance indicators, collapsing to an off-canvas sheet on mobile — no separate bottom-nav pattern was needed since the primitive already covers both cases.

---

## Development journey

### Initial approach vs. final

The build followed the phased plan almost exactly as sequenced: split-math engine first (framework-free, fully unit-tested before any UI existed), then a guest-mode UI built against that engine and sample data, then swapping in real persistence/auth behind the *same* data-access interface, then currency/filtering/accessibility polish, then the two differentiators, then a performance and testing pass. The biggest structural decision — building a shared `DataAccess` interface with parallel guest (Zustand) and authenticated (Prisma) implementations from the start — paid off exactly as intended: the entire UI layer (dialogs, forms, cards) was written once and works identically against both backends.

### Decisions reconsidered

- **Email verification.** Initially built as mandatory, then reversed — optional verification was the actual product decision, made after the mandatory version was fully built and tested.
- **Authenticated dashboard, twice.** The full-CRUD-parity authenticated dashboard was built once as a shortcut (read-only, its own bespoke UI), then deliberately rolled back and rebuilt from scratch to genuinely share components with guest mode after direct feedback that the two modes should look and behave identically, not just similarly.
- **Category creation UI**: started as a `Popover` to sidestep a suspected dialog-nesting bug inside the mobile Sheet, then swapped to a `Dialog` once testing showed the popover's anchored position looked wrong — the nesting bug turned out to be about a different interaction (closing an ancestor sheet) than initially assumed.
- **Server Actions error handling**: Next.js sanitizes thrown-error messages from Server Actions in production. This meant the codebase needed a `ActionResult<T>` return-value convention (rather than throw/catch) specifically to preserve business-rule-specific error messages (like "this debt no longer exists") that the guest-mode dialogs already depended on.

### What surprised me

- **Recharts' bundle splitting was non-obvious.** Three separate `next/dynamic()` imports (one per chart card) seemed like the obvious lazy-loading fix, but Turbopack didn't dedupe the shared `recharts` dependency across the three chunks — total page weight went *up*. One shared dynamically-imported wrapper fixed it.
- **A stale ref in a StrictMode double-mount silently broke the receipt-extraction spinner.** A `mountedRef` guard set to `false` on the synthetic first unmount never got reset to `true` on the synthetic remount — the exact class of bug the app's "no silent failures" testing convention exists to catch, and it did.
- **`calculateBalances` doesn't net down debt cycles.** Running a constructed A-owes-B-owes-C-owes-A cycle (all equal amounts) through the pairwise settlement engine confirmed every member's *net* balance correctly comes back to zero, but the suggestion engine still emits three separate non-zero payments instead of recognizing the cycle cancels out — a real, documented gap (see below), found only because a test was written specifically to construct that case.

### Session breakdown

23 working days across roughly 4.5 weeks (Jul 16 – Aug 16), ~90 commits total.

| Session | Focus | What I Accomplished |
|---------|-------|-------------------|
| 1 (Jul 16–19) | Foundation & split engine | Next.js scaffold, design tokens, shadcn init, Zod schemas, all 4 split calculators + pairwise balance engine, Prisma schema, shared `DataAccess` interface (guest + Prisma) |
| 2 (Jul 22–23) | Landing & guest dashboard | Landing page, sidebar nav, group dashboard layout, skeleton loading states, sign-up prompt |
| 3 (Jul 24–26) | Group & expense CRUD | Create/edit/delete group, add/remove members, full add/edit/delete-expense flow with live split preview |
| 4 (Jul 27) | Settlement flow + auth foundation | Settle-up CTAs, settlement history/suggestions, Better Auth + Resend wired, sign-up/sign-in/password-reset UI |
| 5 (Jul 28–31) | Full CRUD parity + currency | Session-scoped ownership, Server Actions, authenticated `/dashboard` sharing guest components, ExchangeRate-API client + cache + fallback |
| 6 (Aug 1–2) | Currency polish + categories | Live-rate prefill, manual-override flagging, custom per-group categories |
| 7 (Aug 4–6) | Filtering, theming, accessibility | Category/date/member filters, category breakdown, dark-mode toggle, full WCAG contrast/keyboard/screen-reader audit |
| 8 (Aug 6–7) | Data visualization | Spending-over-time, category donut, member-contribution stacked bar charts; export-as-image |
| 9 (Aug 9–10) | AI receipt scanning | Blob upload, OpenAI vision extraction, form pre-fill, confidence flags, fallback UI |
| 10 (Aug 14) | Performance pass | Lighthouse fixes, expense-list pagination, optimistic expense creation, skeleton parity |
| 11 (Aug 16) | Testing & deployment | Vitest gap-filling (199 → 240 tests), production deploy, this README |

---



### How I used AI

I worked with Claude across every phase of this build, from the initial architecture (the shared guest/authenticated `DataAccess` interface) through implementation, verification, and this README. The collaboration followed a consistent shape: for spec-defined features, implement directly against the requirements; for the 3 design-it-yourself screens, stop and discuss trade-offs before writing code (the desktop-modal-vs-inline decision for expense entry, the personal-vs-neutral settlement framing, the dashboard's collapsed-by-default charts). I made the calls; Claude surfaced the trade-offs and the spec/guidance conflicts I'd have had to dig for myself (like `patterns.md`'s modal guidance directly contradicting itself between mobile and desktop expense entry).

### What worked well

Verifying real changes against a live running app — rather than trusting that code compiled — caught bugs that would otherwise have shipped: the Recharts bundle-splitting regression, the StrictMode `mountedRef` bug, the `ExchangeRateCache` timestamp bug that silently defeated its own caching, the WCAG contrast failures in dark mode. None of those were visible from reading the diff alone. Insisting on a live-Neon or live-dev-server check as part of "done," not an optional extra, was the single highest-leverage habit across the whole build.

### What I learned

Phased, dependency-ordered planning (math engine → guest UI → real persistence behind the same interface → polish → differentiators) meant almost nothing had to be rebuilt from scratch later — the one real exception (the authenticated dashboard, built once as a shortcut and then intentionally rolled back) was itself a useful lesson: cutting a corner on "share the exact same components" cost more than building it right the first time would have.

### Where I pushed back

A few moments stand out where I redirected the approach rather than accepting the first pass: keeping the guest/authenticated dashboards pixel-identical rather than "close enough," insisting settlement math and split calculations be proven against the documented rounding edge cases before any UI got built on top of them, and drawing a hard line at Phase 12 that "fill test gaps" should surface bugs, not silently start fixing product logic mid-phase — which is exactly why the debt-cycle and overpayment gaps below are documented rather than patched.

---

## Differentiators

### Chosen differentiator(s)

**1. Interactive data visualization**

**Why I chose this:** Turning a ledger into insight is a high-impact, hard-to-fake design skill, and this app already had exactly the aggregated data (per-category, per-member, per-time-bucket totals) a good chart needs.

**How it enhances the product:** Three charts — spending over time (auto-picked day/week/month granularity based on the group's actual date span), category breakdown (a donut that doubles its own legend), and member contribution (a stacked bar, one segment per category) — all collapsed by default so they add insight without adding clutter to the default view. All three respect the dashboard's active filters and support one-click PNG export.

**Implementation highlights:** A shared `convertedMinorUnits` accumulation pattern across every breakdown function guarantees the charts and the plain-text summary cards can never silently drift apart in what they report. Touch/keyboard support (tooltip-on-touch, arrow-key data navigation) came from Recharts 3's `accessibilityLayer` default rather than needing to be hand-built. Export-as-image required manually re-resolving CSS custom-property colors into literal values before cloning the SVG, since `var(--color-*)` only resolves inside the page's own cascade.

**What I learned:** Naive per-chart code-splitting can make bundle size *worse*, not better, if a shared dependency isn't deduplicated across the split chunks — measure, don't assume.

**2. Receipt scanning with AI**

**Why I chose this:** AI-powered structured extraction from an image is one of the most practical, immediately-useful applications of generative AI in a product like this, and it directly speeds up the app's single most frequent action.

**How it enhances the product:** Upload or camera-capture a receipt photo; the amount, merchant, date, and currency pre-fill automatically, with per-field low-confidence flags so uncertain extractions get a visible nudge to double-check rather than being silently trusted. Extraction failures leave the form fully usable for manual entry, with a one-tap retry that doesn't require re-uploading the photo.

**Implementation highlights:** Every extracted field is nullable with its own `confidence: "high" | "low"` flag in the response schema, so "couldn't read this field" and "photo isn't a receipt at all" are both valid, non-error outcomes rather than failures. HEIC photos (the default format on iPhone) are converted client-side to JPEG before upload, since no browser — including Safari — can actually decode/display HEIC, and OpenAI's vision API only accepts a handful of standard formats. The system prompt needed explicit criteria for what separates "high" from "low" confidence; without it, the model defaulted to hedging on every field, including ones printed perfectly clearly.

**What I learned:** A model with no clear confidence rubric will hedge indiscriminately — calibration needs to be prompted for explicitly, not assumed to fall out of "just ask for a confidence score."

---

## Self-assessment


| Category | Rating | Notes |
|----------|--------|-------|
| **Works for real users**: deployed, functional end-to-end | 5/5 | Live at expense-splitter.mazdev.dev, guest and authenticated paths both verified end-to-end |
| **Financial accuracy**: balances are correct, rounding is handled, currencies format properly | 5/5 | Zero-sum balance invariant tested across all sample groups; currency-aware rounding for all 10 supported currencies including JPY's zero-decimal case |
| **Multi-currency handling**: API integration, rate caching, conversion display, formatting | 5/5 | Live rates, hourly cache with stale-fallback, manual-override flagging, correct formatting across all 10 currencies |
| **Design-it-yourself features**: quality and thoughtfulness of expense entry, dashboard, and settlement flow | 4/5 | All 3 screens have documented reasoning against real spec tensions; settlement flow has two known algorithmic gaps (below) |
| **Design quality**: typography, spacing, visual hierarchy, polish | 4/5 | Consistent token-based system throughout; several rounds of user-reported visual polish (hover states, spacing, mobile layout) |
| **Responsive design**: fully functional and well-designed across devices | 5/5 | Audited for fixed-pixel violations (zero found); mobile-first breakpoints throughout |
| **Performance**: fast load, smooth interactions, efficient calculations | 4/5 | Production Lighthouse Performance 97 (landing) / 93 (dashboard); optimistic expense creation for perceived <1s entry |
| **Accessibility**: keyboard nav, screen reader support, contrast, currency announcements | 4/5 | Full WCAG contrast/keyboard/screen-reader/color-blind audit with real fixes; several items intentionally deferred and documented rather than silently skipped |
| **Edge case handling**: empty states, errors, rounding, mixed currencies, split validation | 4/5 | Extensive sample-data edge cases covered; settlement overpayment and debt-cycle netting are documented, unfixed gaps |
| **Code quality**: clean, maintainable, well-structured | 4/5 | Shared `DataAccess` interface kept guest/authenticated logic from diverging; 263 Vitest tests over pure logic |
| **Landing page**: compelling, communicates value, visually polished | 5/5 | Production Lighthouse 97/100/100/100 |
| **Guest experience**: immediately impressive, realistic data, full features | 5/5 | 5 groups, 43 expenses, every split type, mixed currencies, a mix of settled/outstanding debts |

### Lighthouse scores

Measured against the deployed production URL (mobile form factor, simulated throttling), not local dev.

**Landing page** (`/`)

| Category | Score |
|----------|-------|
| Performance | 97 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

**Guest dashboard** (`/groups/grp_japan_2024`)

| Category | Score |
|----------|-------|
| Performance | 93 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

### Strengths

The split/balance calculation engine — built first, framework-free, and tested against real rounding edge cases (3-way, 4-way, 5-way remainders, JPY zero-decimal splits) before any UI existed — meant every layer built on top of it inherited correctness rather than fighting it later. The shared `DataAccess` interface kept guest and authenticated mode from diverging into two products. The accessibility work went well beyond a surface pass: real WCAG contrast failures in dark mode and several screen-reader gaps were found and fixed, not just checked off.

### Areas for improvement

The two settlement-engine gaps below are the most concrete next step. A handful of accessibility items (`prefers-reduced-motion` coverage, `aria-describedby` wiring from inputs to their errors, loading-state screen-reader announcements) were deliberately scoped out of Phase 9 as too large for that pass rather than fixed. And the member-selection chips and avatar-color swatch pickers remain below the 44×44 AAA touch-target size by explicit design choice (they still clear the WCAG AA 24×24 floor).

---

## Known limitations

- **Settlement overpayment isn't blocked.** `createSettlement` validates debt *direction* (you can't record a payment in the wrong direction) but never validates that the settlement amount doesn't exceed what's actually owed — a user could record an overpayment and silently flip the balance the wrong way. Found while writing Phase 12's settlement test coverage; documented rather than fixed, per an explicit decision that a testing-consolidation phase shouldn't quietly expand into new validation logic.
- **Settlement suggestions don't net down debt cycles.** If A owes B, B owes C, and C owes A the same amount, every member's *net* balance correctly resolves to zero — but the pairwise suggestion engine still emits all 3 individual payments instead of recognizing the cycle cancels out. Confirmed by constructing exactly this case in `balance.test.ts`. (The optional "debt simplification algorithm" differentiator, not chosen for this build, would have addressed this directly.)
- **No accessible data-table fallback for charts.** The 3 chart cards have keyboard/touch tooltip support (Recharts' built-in `accessibilityLayer`), but there's no tabular alternative for a screen-reader user to get the same data non-visually.
- **A few accessibility items are deliberately deferred**, not silently skipped: system-wide `prefers-reduced-motion` handling (only 2 of many animated components respect it), `aria-describedby` wiring from form inputs to their error messages, and screen-reader announcements for in-page loading/pending states (e.g. "Saving…" button text). Each needs a real design decision across many call sites rather than a one-line fix.
- **Member-selection chips and avatar-color swatch pickers** are ≈26–28px, below the WCAG AAA 44×44 touch-target guideline (they clear the AA 24×24 floor). A deliberate trade-off to preserve the reviewed chip-based selection design rather than visually redesign it for an AAA-level stretch goal.
- **Guest-mode dynamic page titles.** The browser tab title stays a static "Expense Splitter" when switching between guest groups (the authenticated route updates it per-group correctly) — an extra client-side effect was judged not worth its cost for a tab-title nicety.

---

## Running locally

```bash
# Clone the repo
git clone https://github.com/maziarja/expense-splitter.git
cd expense-splitter

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Fill in your database, auth, and currency API credentials

# Run the development server
bun run dev
```

### Environment variables

| Variable | Description |
|----------|------------|
| `CURRENCY_API_KEY` | ExchangeRate-API key (free tier) |
| `CURRENCY_API_BASE_URL` | ExchangeRate-API base URL |
| `DATABASE_URL` | Neon (or other Postgres) connection string |
| `BETTER_AUTH_SECRET` | Random secret for Better Auth session signing |
| `BETTER_AUTH_URL` | App base URL (`http://localhost:3000` in dev) |
| `RESEND_API_KEY` | Resend API key, for verification/password-reset email |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store token, for receipt image upload |
| `OPENAI_API_KEY` | OpenAI API key, for AI receipt extraction (vision model) |

---

## Acknowledgments

Built as a [Frontend Mentor Product Challenge](https://www.frontendmentor.io).
