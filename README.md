# Performance & Talent

A shared people + KPI data spine, with Mr Price's own "Connect 2.0" KPI tracker built on top of
it.

## What this is

Two things in one app:

1. **The spine** — `perf_people` (with `associate_no`/`division` added in migration 002) and
   `perf_trackers`/`perf_objectives`/`perf_objective_progress`. A persistent people registry and
   per-person, per-FY KPI tracker that other tools can build on.
2. **KPI Tracker** — a digitised version of Mr Price's real Connect 2.0 spreadsheet template, not
   an invented model. One tracker per person per financial year, holding weighted objectives split
   into two sections — **KPI Delivery** and **Leadership Effectiveness** — each weighted to its
   own 100% independently. Progress is tracked per objective per quarter (Not Started / In
   Progress / Completed / On Hold), with a Final Rating (Exceeded/Full/Partial/None Achievement)
   agreed at FY close, and two-way Associate/Line-Manager comments throughout.

   **This replaced an earlier placeholder** (4 Kaplan & Norton perspectives, numeric target/actual,
   monthly periods) built before the real Mr Price template was available — see migration 002 in
   `supabase/schema.sql` for why and what changed. If you're extending the tracker further, always
   check `docs/METHODOLOGY_LIBRARY.md`-style source-of-truth first: **Mr Price's own Connect 2.0
   spreadsheet defines this model, not this codebase** — don't invent structure that diverges from
   it.

This sits alongside `leadership-excellence-assessment` (WLEA) as part of the same "Performance &
Talent" module for an internal Mr Price Group Logistics deployment. A **9-box talent matrix** is
next, reusing `perf_people` as-is (Potential axis from a WLEA assessment score, Performance axis
from KPI achievement) — not built yet. The full annual cadence this module is built against
(WLEA in April, quarterly tracker check-ins, 9-box in July, Connect Conversation in September, FY
close in March) is documented in memory as `mrpg-people-annual-cadence`, not duplicated here.

## Before real employee data goes in

This currently points at the same shared Supabase project as the public DC Upside tools
(`.env.local`), which is fine for development/test data. **Before any real Mr Price employee
names, emails, or KPI data are entered, provision a dedicated Supabase project for the mrpg
deployment and repoint the env vars.** Real internal HR/performance data should not live in the
same database as a public commercial product's user data.

Confirmed 2026-07-24: this also leaks visibly today, not just as a data-hygiene risk — the
sign-in magic-link/code email is sent by Supabase Auth itself (Custom SMTP via Resend), whose
sender identity is a **project-level** setting shared by every tool on this project. Right now
it sends as "DC Upside" even on this mrpg-branded app. Not fixable in app code; only fixed by
provisioning the separate Supabase project above and configuring its own Auth SMTP sender as
Mr Price. Tolerated for now since no real employee data is in yet — but this is the same task
as the paragraph above, not a separate one.

## Access model

`perf_people`, `perf_trackers`, `perf_objectives`, and `perf_objective_progress` have RLS enabled
with **no client policies** — the browser never queries them directly. Every read and write goes
through `app/actions.ts` Server Actions, which check for a signed-in session (`auth.getUser()`)
and then use the service-role client. This matches the precedent WLEA uses for its own sensitive
tables (`wlea_assessments`), rather than inventing a new "any authenticated user" RLS policy.

There is currently no team/org boundary or per-role permission model — any signed-in user can
read and write everything. That's a deliberate v1 simplification for an internal MVP, not an
oversight; revisit if this ever needs to distinguish who can edit vs. only view.

## Scope

Built: people roster (with associate no. / division), per-person per-FY KPI tracker (weighted
objectives, two sections, quarterly status, final rating, two-way comments), real logo/brand
(dcupside/mrpg).

Deliberately not built yet: 9-box matrix, WLEA→Potential wiring, team/RBAC hierarchy, trend
charts, CSV import/export, cross-org benchmarking, the cadence/nudge engine, public
DC-Upside-facing exposure (this app has no gateway rewrite from dcupside.com and is not linked
from it).

`docs/DATA_STRATEGY.md`'s four-question benchmark check (segmentation, anonymisation, minimum
population thresholds) doesn't apply here as-is — this is an internal single-company tool, not a
public multi-tenant benchmark product.

## Commands

```bash
npm install
npm run dev          # localhost:3000, basePath /performance
npm run build
npm run lint
npm run type-check
```

Run `supabase/schema.sql` in the Supabase SQL editor before first use. If you already ran an
earlier version of this file, only the "MIGRATION 002" block at the bottom needs (re-)running —
it's written to be safe to run once on top of the original tables.
