-- ============================================================
-- Performance & Talent — shared people/KPI spine + Balanced Scorecard
-- Run in the Supabase SQL Editor on the shared VSCE project.
-- The `profiles` table already exists (see labour-productivity-calculator's
-- schema.sql) — do not re-run it.
--
-- Scope note: this is an INTERNAL SINGLE-COMPANY tool (Mr Price Group
-- Logistics), not a public multi-tenant benchmark product. The four-question
-- benchmark check in docs/DATA_STRATEGY.md (segmentation, anonymisation,
-- benchmark population thresholds) does not apply as-is — there is no
-- cross-company aggregation happening here. Don't force that machinery onto
-- this schema.
--
-- Future 9-box matrix (not built yet) will reuse perf_people as-is:
-- Potential axis from a WLEA assessment score, Performance axis from KPI
-- achievement computed via lib/kpi.ts. Nothing here should need to change
-- for that to work.
-- ============================================================

-- ── People ─────────────────────────────────────────────────────
-- No org/tenant table exists anywhere in this codebase yet, and this app is
-- deployed as a single internal instance for one company, so there is
-- deliberately no organisation_id here — every row belongs to this one
-- deployment. team is free text (no enum exists for departments anywhere in
-- the codebase); role_level is optionally one of WLEA's role-level keys, for
-- future cross-reference with a leadership assessment, but is not a foreign
-- key to anything (WLEA is a separate deployment with its own database rows).
create table public.perf_people (
  id           uuid default gen_random_uuid() primary key,
  name         text not null,
  email        text,
  role_title   text,
  role_level   text check (role_level in ('jpm', 'pm', 'dcm', 'exec', 'fm')),
  team         text,
  manager_id   uuid references public.perf_people(id) on delete set null,
  status       text not null default 'active' check (status in ('active', 'archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index perf_people_status_idx on public.perf_people(status);
create index perf_people_manager_id_idx on public.perf_people(manager_id);

-- SECURITY: RLS is ENABLED with NO policies, matching the precedent set by
-- wlea_assessments/wlea_benchmark_data. This table holds real employee names
-- and (via the tables below) their KPI performance — the browser must never
-- query it directly with the anon key. All reads/writes go through
-- app/actions.ts Server Actions using the service-role client, which checks
-- auth.getUser() itself before touching the data.
alter table public.perf_people enable row level security;


-- ── KPI definitions ───────────────────────────────────────────
-- perspective is the 4 standard Kaplan & Norton Balanced Scorecard
-- perspectives — a practical, well-established framework, not invented here.
create table public.perf_kpi_definitions (
  id           uuid default gen_random_uuid() primary key,
  name         text not null,
  perspective  text not null check (
                 perspective in ('financial', 'customer', 'internal_process', 'learning_growth')
               ),
  unit         text,
  direction    text not null check (direction in ('higher_is_better', 'lower_is_better')),
  target       numeric not null,
  owner_id     uuid references public.perf_people(id) on delete set null,
  team         text,
  status       text not null default 'active' check (status in ('active', 'archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index perf_kpi_definitions_status_idx on public.perf_kpi_definitions(status);

alter table public.perf_kpi_definitions enable row level security;


-- ── KPI actuals ───────────────────────────────────────────────
-- One row per KPI per month. period is always the first of the month by
-- convention (enforced below); re-submitting the same period upserts via the
-- unique constraint rather than creating a duplicate row.
create table public.perf_kpi_actuals (
  id           uuid default gen_random_uuid() primary key,
  kpi_id       uuid not null references public.perf_kpi_definitions(id) on delete cascade,
  period       date not null check (extract(day from period) = 1),
  actual       numeric not null,
  note         text,
  created_at   timestamptz not null default now(),
  unique (kpi_id, period)
);

create index perf_kpi_actuals_kpi_period_idx on public.perf_kpi_actuals(kpi_id, period desc);

alter table public.perf_kpi_actuals enable row level security;


-- ============================================================
-- MIGRATION 002 — Connect 2.0 reshape (2026-07-29). Run this once on any
-- deployment that already ran the create-table block above.
--
-- The 4-perspective/numeric-target model above was a placeholder built before
-- the real Mr Price KPI template ("Connect 2.0") was available. It doesn't
-- match how Mr Price actually tracks performance, so it's replaced here, not
-- extended. Only test data existed in perf_kpi_definitions/perf_kpi_actuals
-- (a couple of test people/KPIs) — safe to drop.
--
-- Connect 2.0's real shape: one tracker per person per financial year
-- (FY runs April-March, see the mrpg-people-annual-cadence memory), holding
-- weighted objectives split into two sections — KPI Delivery and Leadership
-- Effectiveness — each section weighted to its own 100% independently (not
-- one shared pool; confirmed from Mr Price's own "Use Guide" tab). Progress
-- is tracked per objective per quarter using the 4-state set Mr Price's own
-- guide marks as preferred (Not Started / In Progress / Completed / On
-- Hold), with a Final Rating (Exceeded/Full/Partial/None Achievement) agreed
-- at FY close alongside two-way Associate/Line-Manager comments throughout.
-- ============================================================

alter table public.perf_people
  add column if not exists associate_no text,
  add column if not exists division text;

drop table if exists public.perf_kpi_actuals;
drop table if exists public.perf_kpi_definitions;

-- One row per person per FY. fy_start_year is the calendar year the FY
-- begins in (April) — matches Connect 2.0's own convention where a tracker
-- headed "YEAR: 2026" is labelled "FY27" (FY27 = Apr 2026-Mar 2027).
create table public.perf_trackers (
  id                uuid default gen_random_uuid() primary key,
  person_id         uuid not null references public.perf_people(id) on delete cascade,
  fy_start_year     integer not null,
  associate_comment text,
  manager_comment   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (person_id, fy_start_year)
);

create index perf_trackers_person_idx on public.perf_trackers(person_id);

-- Same RLS posture as every other perf_* table: enabled, no client policies,
-- all access via app/actions.ts using the service-role client.
alter table public.perf_trackers enable row level security;


-- One row per objective (Division Sub-Objective -> Objective -> Measures of
-- Success), belonging to a tracker. Weighting is NOT constrained to sum to
-- 1 at the database level (would need a cross-row trigger for something
-- that's really a soft, user-facing "does this add up to 100%?" check) —
-- validated/surfaced in the UI instead, matching "keep the spine thin."
create table public.perf_objectives (
  id                     uuid default gen_random_uuid() primary key,
  tracker_id             uuid not null references public.perf_trackers(id) on delete cascade,
  section                text not null check (section in ('kpi_delivery', 'leadership_effectiveness')),
  division_sub_objective text,
  objective              text not null,
  due_date               date,
  weighting              numeric not null check (weighting >= 0 and weighting <= 1),
  measures_of_success    text,
  final_rating           text check (final_rating in ('exceeded', 'full', 'partial', 'none')),
  associate_comment      text,
  manager_comment        text,
  sort_order             integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index perf_objectives_tracker_idx on public.perf_objectives(tracker_id);

alter table public.perf_objectives enable row level security;


-- One row per objective per quarter. Status set is Mr Price's own "V1
-- (preferred)" set from the Connect 2.0 Legend tab, not the 7-state
-- alternative they flagged as possibly too many options.
create table public.perf_objective_progress (
  id           uuid default gen_random_uuid() primary key,
  objective_id uuid not null references public.perf_objectives(id) on delete cascade,
  quarter      text not null check (quarter in ('Q1', 'Q2', 'Q3', 'Q4')),
  status       text not null check (status in ('not_started', 'in_progress', 'completed', 'on_hold')),
  updated_at   timestamptz not null default now(),
  unique (objective_id, quarter)
);

create index perf_objective_progress_objective_idx on public.perf_objective_progress(objective_id);

alter table public.perf_objective_progress enable row level security;


-- ============================================================
-- MIGRATION 003 — 9-box positions (2026-07-31).
--
-- One row per person per FY, same "dated snapshot per cycle, never
-- overwritten across FYs" pattern as perf_trackers — a new FY gets a new
-- row, so history is preserved by construction, not by a separate log.
-- Within one FY the row IS updated in place (recomputed as new WLEA/KPI
-- data lands, or manually overridden), matching how the real July
-- positioning session works: a live conversation, not a one-shot write.
--
-- Both axes read from data that already exists elsewhere and are NEVER
-- the source of truth themselves:
--   Potential   <- wlea_assessments.overall_manager (latest completed
--                  assessment for this person, matched by name — cross-
--                  database join since WLEA and Performance & Talent don't
--                  share a person table, same name-matching approach the
--                  Connect 2.0 importer already uses for managers).
--   Performance <- perf_objectives + perf_objective_progress for the
--                  person's tracker in this FY (see lib/ninebox.ts).
-- *_computed columns cache that derived value at last positioning time
-- (so the grid doesn't recompute on every read); *_override columns let a
-- manager deliberately disagree with the arithmetic in the actual talent
-- conversation — the override, when set, wins.
-- ============================================================
create table public.perf_ninebox_positions (
  id                    uuid default gen_random_uuid() primary key,
  person_id             uuid not null references public.perf_people(id) on delete cascade,
  fy_start_year         integer not null,
  potential_computed    numeric,
  performance_computed  numeric,
  potential_override    numeric,
  performance_override  numeric,
  notes                 text,
  positioned_at         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (person_id, fy_start_year)
);

create index perf_ninebox_positions_person_idx on public.perf_ninebox_positions(person_id);

alter table public.perf_ninebox_positions enable row level security;


-- ============================================================
-- MIGRATION 004 — Balanced Scorecard perspective tags (2026-07-31).
--
-- "Division scorecard over Connect 2.0" design, agreed with the user after
-- they pushed back on a standalone-KPI scorecard (that model was already
-- killed once for causing double-entry — see migration 002). This is NOT a
-- second data-entry system: it's a perspective TAG on objectives that
-- already exist, so the scorecard is a lens over live tracker data, nothing
-- more. Nullable, so nothing breaks for untagged objectives — they just
-- don't count toward any perspective's rollup until tagged.
--
-- Backfill below: of 51 real objectives imported from the Connect 2.0
-- workbook, only 11 distinct texts exist (KPI Delivery objectives repeat
-- almost verbatim across all six people; all four Leadership Effectiveness
-- items are identical for everyone) — confirmed by querying the live data,
-- not assumed. That makes a one-time text-match backfill safe and complete
-- for something like 49 of 51 rows, rather than tagging 51 rows by hand
-- under a 10-day deadline.
--
-- The perspective assignment itself is a JUDGEMENT CALL, not a fact read
-- off the workbook — Mr Price's template doesn't tag objectives by
-- perspective. Reasoning, so it can be corrected if wrong:
--   Financial          <- budget/cost objectives (COE overhead, CPT/CPU)
--   Customer            <- DC capacity to serve/deliver growth to other
--                          divisions (they are Logistics' internal customers)
--   Internal Process   <- inventory accuracy, risk management, waving/
--                          fulfilment optimisation (operational execution)
--   Learning & Growth   <- all four Leadership Effectiveness items (equity,
--                          Connect Conversation, engagement, values & DNA)
-- Any objective not matched below (non-standard text, or created after this
-- migration runs) stays untagged — visible in the UI, not silently dropped.
-- ============================================================

alter table public.perf_objectives
  add column if not exists perspective text
    check (perspective in ('financial', 'customer', 'internal_process', 'learning_growth'));

update public.perf_objectives set perspective = 'internal_process'
  where perspective is null and objective like 'Maintain current inventory accuracy%';

update public.perf_objectives set perspective = 'internal_process'
  where perspective is null and objective = 'Reduce Distribution and Logistics risk';

update public.perf_objectives set perspective = 'customer'
  where perspective is null and objective like 'Enable full functionality of all%DC''s%';

update public.perf_objectives set perspective = 'internal_process'
  where perspective is null and objective like 'Enable logistics enhancements to operations%';

update public.perf_objectives set perspective = 'financial'
  where perspective is null and objective like '%COE overhead budgets are not exceeded%';

update public.perf_objectives set perspective = 'learning_growth'
  where perspective is null and section = 'leadership_effectiveness';


-- ============================================================
-- MIGRATION 005 — Individual Development Plans (2026-07-31).
--
-- The distinction that drives this design (user's own framing): the
-- ASSESSMENT identifies the development areas; the IDP is the tasks and
-- actions that are measurable and monitored at intervals, where the
-- interval depends on the time required for that area. So a plan here is
-- NOT a static copy of the assessment's recommendation text — it's a live
-- record with per-action status and dated review checkpoints.
--
-- Seeded from WLEA's persisted result_summary (its recommendation engine is
-- the single source of truth for WHAT to develop and the 70/20/10 content;
-- this app owns tracking WHETHER it happened). Once seeded, the plan is
-- independent — editing an action here never reaches back into the
-- assessment, because the assessment is a dated snapshot of a judgement and
-- must not mutate after the fact.
-- ============================================================

-- One plan per person per development area (competency) per assessment.
create table public.perf_development_plans (
  id                    uuid default gen_random_uuid() primary key,
  person_id             uuid not null references public.perf_people(id) on delete cascade,
  -- The WLEA assessment this was generated from. No FK: wlea_assessments is
  -- another app's table (same database, separate ownership) — referencing it
  -- would couple their migration order to ours.
  source_assessment_id  uuid,
  competency_key        text not null,
  competency_name       text not null,
  current_score         numeric,
  target_score          numeric,
  expected_change       text,
  success_measure       text,
  evidence_required     jsonb not null default '[]',
  time_to_competency    text,
  status                text not null default 'active'
                          check (status in ('active', 'achieved', 'paused', 'abandoned')),
  started_on            date not null default current_date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (person_id, source_assessment_id, competency_key)
);

create index perf_development_plans_person_idx on public.perf_development_plans(person_id);

alter table public.perf_development_plans enable row level security;


-- The 70/20/10 actions. category carries the split so the UI can show it
-- without re-deriving: workplace 70%, coaching 20%, formal learning 10%.
create table public.perf_development_actions (
  id           uuid default gen_random_uuid() primary key,
  plan_id      uuid not null references public.perf_development_plans(id) on delete cascade,
  category     text not null check (category in ('workplace', 'coaching', 'formal_learning')),
  description  text not null,
  status       text not null default 'not_started'
                 check (status in ('not_started', 'in_progress', 'completed', 'blocked')),
  due_date     date,
  completed_at timestamptz,
  notes        text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index perf_development_actions_plan_idx on public.perf_development_actions(plan_id);

alter table public.perf_development_actions enable row level security;


-- Dated review checkpoints — the "monitored at intervals" half. day_offset
-- is days from the plan's started_on (30/60/90/...); scheduled_date is the
-- resolved calendar date so it can be queried and, later, drive the cadence
-- engine's nudges. Which offsets exist per plan depends on that plan's
-- horizon (see lib/idp.ts) — a 1-3 month gap doesn't get a 365-day review.
create table public.perf_development_reviews (
  id             uuid default gen_random_uuid() primary key,
  plan_id        uuid not null references public.perf_development_plans(id) on delete cascade,
  day_offset     integer not null,
  scheduled_date date not null,
  completed_at   timestamptz,
  outcome        text check (outcome in ('on_track', 'at_risk', 'behind', 'achieved')),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (plan_id, day_offset)
);

create index perf_development_reviews_plan_idx on public.perf_development_reviews(plan_id);
create index perf_development_reviews_scheduled_idx on public.perf_development_reviews(scheduled_date);

alter table public.perf_development_reviews enable row level security;


-- ============================================================
-- MIGRATION 006 — agreed vs suggested actions (2026-08-01).
--
-- The 70/20/10 actions seeded from WLEA are deliberately generic prompts
-- ("take on a task outside the comfort zone"). The actions a manager and
-- employee actually AGREE in the development conversation are specific
-- ("lead the GFPDC Phase 1 readiness review"). Both belong on the plan, but
-- conflating them loses the thing that matters for succession evidence:
-- what was suggested vs. what was actually committed to and done.
-- ============================================================

alter table public.perf_development_actions
  add column if not exists source text not null default 'agreed'
    check (source in ('suggested', 'agreed'));

-- Everything that exists today came from the WLEA seeder, so it's suggested.
-- (The default above is 'agreed' because everything created from here on is
-- typed in by a person; this one-off backfill corrects the existing rows.)
update public.perf_development_actions set source = 'suggested'
  where created_at < now();


-- ============================================================
-- MIGRATION 007 — Succession Planning (2026-08-25).
--
-- Core relationship: Critical Role -> Current Incumbent -> Potential
-- Successor(s) -> Readiness -> Evidence -> Development Gaps -> Development
-- Plan -> Succession Risk.
--
-- perf_roles is the first-class Role/Position entity this app has never
-- had. perf_people.role_title/role_level stay exactly as they are (a
-- person's own HR attribute) — this is additive, not a replacement. A role
-- must be able to exist VACANT (incumbent_id null) and carry criticality
-- metadata independent of whoever currently holds it, which perf_people
-- structurally cannot do (it has no notion of a position outliving its
-- holder). role_level here is an optional convenience attribute for
-- display/comparison against candidates, NOT a repurposing of
-- perf_people.role_level and NOT a foreign key to it.
--
-- risk_computed/risk_override/risk_note follow the exact perf_ninebox_
-- positions pattern (migration 003): a rule-based computed value, cached,
-- with an optional manual override; effective value = override ?? computed.
-- Unlike 9-box, risk is recomputed on WRITE (whenever a candidate is
-- added/changed/removed, or a person is archived — see
-- app/succession/actions.ts recomputeRoleRisk), not on every read — its
-- only inputs (this table's own candidate rows) are owned entirely by this
-- feature's own write path, unlike 9-box's inputs which change out from
-- under it via WLEA/Connect 2.0. Recomputing on read would be pure
-- redundant work here.
--
-- Readiness (perf_succession_candidates.readiness) is a direct manager/HR
-- judgement call, not derived from any evidence source — there is no
-- computed counterpart to override, unlike potential/performance/risk.
--
-- No FK to wlea_assessments, matching the deliberate non-FK convention
-- already established by perf_development_plans.source_assessment_id
-- (migration 005) — cross-app-owned table, referencing it would couple
-- migration order across apps.
-- ============================================================

create table public.perf_roles (
  id                  uuid default gen_random_uuid() primary key,
  title               text not null,
  role_level          text check (role_level in ('jpm', 'pm', 'dcm', 'exec', 'fm')),
  division            text,
  team                text,
  incumbent_id        uuid references public.perf_people(id) on delete set null,
  is_critical         boolean not null default false,
  criticality_reason  text,
  risk_computed       text check (risk_computed in ('high', 'medium', 'low')),
  risk_override       text check (risk_override in ('high', 'medium', 'low')),
  risk_note           text,
  notes               text,
  status              text not null default 'active' check (status in ('active', 'archived')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index perf_roles_incumbent_idx on public.perf_roles(incumbent_id);
create index perf_roles_status_idx on public.perf_roles(status);
create index perf_roles_critical_idx on public.perf_roles(is_critical) where is_critical;

-- Same RLS posture as every other perf_* table: enabled, no client
-- policies, all access via app/succession/actions.ts's service-role client.
alter table public.perf_roles enable row level security;


-- One row per (role, candidate) pair — the many-to-many: one role can have
-- several successors, one person can be a successor for several roles.
-- added_at is deliberately kept (not just created_at) because "date added"
-- is a named field in the successor profile spec, distinct from row
-- creation bookkeeping if this row is ever re-created after removal.
create table public.perf_succession_candidates (
  id                       uuid default gen_random_uuid() primary key,
  role_id                  uuid not null references public.perf_roles(id) on delete cascade,
  person_id                uuid not null references public.perf_people(id) on delete cascade,
  readiness                text not null default 'not_ready' check (
                              readiness in ('ready_now', 'ready_12mo', 'ready_1_2yr', 'ready_2_3yr', 'not_ready')
                            ),
  priority_rank            integer not null default 1,
  expected_readiness_date  date,
  commentary               text,
  added_at                 timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (role_id, person_id)
);

create index perf_succession_candidates_role_idx on public.perf_succession_candidates(role_id);
create index perf_succession_candidates_person_idx on public.perf_succession_candidates(person_id);

alter table public.perf_succession_candidates enable row level security;


-- ============================================================
-- MIGRATION 008 — Facilities & Maintenance role level (2026-10-19). Run
-- this once on any deployment that already created perf_people/perf_roles
-- from an earlier version of this file. Safe to re-run.
--
-- Adds 'fm' (Facilities & Maintenance Manager) alongside WLEA's four
-- existing role levels — a genuine fifth tier with its own competency
-- anchors in leadership-excellence-assessment (same rank/seniority as
-- 'dcm', a parallel function rather than a rung above it), not a reuse
-- of an existing tier's bar.
--
-- Looks up each check constraint's real name via pg_constraint rather than
-- assuming Postgres's default naming (<table>_<column>_check) — guessing
-- wrong would silently leave the old, more restrictive constraint active
-- alongside a dead new one, since Postgres enforces every check constraint
-- on a column, not just the most recent.
-- ============================================================
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.perf_people'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%role_level%';
  if cname is not null then
    execute format('alter table public.perf_people drop constraint %I', cname);
  end if;
  alter table public.perf_people
    add constraint perf_people_role_level_check
    check (role_level in ('jpm', 'pm', 'dcm', 'exec', 'fm'));

  select conname into cname
  from pg_constraint
  where conrelid = 'public.perf_roles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%role_level%';
  if cname is not null then
    execute format('alter table public.perf_roles drop constraint %I', cname);
  end if;
  alter table public.perf_roles
    add constraint perf_roles_role_level_check
    check (role_level in ('jpm', 'pm', 'dcm', 'exec', 'fm'));
end $$;
