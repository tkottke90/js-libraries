# Implementation Plan — Dependency Hygiene & CVE Automation

- **Date:** 2026-11-16
- **Implements:** `docs/superpowers/specs/2026-11-15-dependency-hygiene-automation-design.md` (approved; see especially §2 trigger & topology, §3 ownership map, §4 detection & classification, §5 runbook, §6 baseline policy, §7 reporting, §8 operational notes, §10 first-run expectations)
- **Evidence base:** `docs/specs/research/2026-11-15-task-fanout-spike.md` — proves a task run can fan out child tasks via `create_tasks` with `asCohort: true` and that the orchestrator's next fire holds until the cohort finishes. **Execution model validated; no speculative task semantics remain.**
- **Execution:** once this plan is approved, it will be carried out **as workspace Tasks** (one task per section below, executed in order — see §6). This document itself must be complete and unambiguous before any task starts, because task runs have no access to this conversation.

## 0. Conventions (apply to every section)

- **Branch discipline:** repo work happens on `main` with direct commits (consistent with how the migration and consolidation work was done); weekly worker *PRs* use `chore/hashbrown-<pkg>-*` branches at runtime. This plan's own commits are direct to `main`.
- **Gotchas honored** (from spec §8, sourced from `docs/verification-2026-11-15.md`):
  - address packages by scoped name only: `--workspace=@tkottke90/logger` (bare dirnames fail);
  - never read `$?` after a pipe — redirect to a file or use `${PIPESTATUS[0]}`;
  - `npm audit` / `npm outdated` exit non-zero when they have findings — that is data, not failure.
- **Verification gate** (whenever repo state could affect builds): `npm run build`, `npm run test`, `npm run lint` at root, compared against the known baseline (form-field: 43 failing tests of 211, 10 lint errors — pre-existing debt, must remain unchanged).

## 1. Prep — dates, branches, raw material

- [ ] Confirm current UTC date; derive:
  - the **first orchestrator fire**: next Saturday **≥ 3 days out** at 20:00 America/Chicago, as an ISO instant (`fireAt`);
  - the **date suffix** for branch/report examples (`YYYY-MM-DD` of that Saturday).
  - (Rationale: no earlier than 3 days so the description can say "tonight/tomorrow/this Saturday" unambiguously at creation time.)
- [ ] Capture `npm outdated --json` and `npm audit --json` output; extract for the ownership file: current installed + wanted/latest versions, and any GHSA ids/severities (expect the known `zod` 4.3.6→4.6.7 high finding, GHSA-mrhx-c7xc-m3w5).
- [ ] Sanity-check `git status` clean, on `main`, up to date with origin.

## 2. Write `docs/dependency-ownership.json`

**Content rules** (structure: top-level `version` + `targets` array; each entry: `id`, `role`, `ownedDependencies[]`, `reportOnly` boolean, plus a `notes` field for special rules). Values from the actual root `package.json` (read fresh, not from memory):

- `root-monitor`: role `monitor`; ownedDependencies: the six root runtime `dependencies` — `@preact/signals`, `lodash`, `preact`, `winston`, `winston-loki`, `yaml`; reportOnly: true.
- `config-manager`: `zod`, `lodash`, `yaml` — note: zod is declared in root **devDependencies** but consumed by this package; ownership is by consumership (spec §3), so config-manager's task edits the root manifest for it.
- `logger`: `winston`, `winston-loki`.
- `form-field`: `preact`, `@preact/signals` — note: reportOnly stays **true until its baseline debt is cleared** (spec §6); include the condition for future runs to re-check.
- `express-client`: `express`, `@types/express` — same devDependencies-declared-but-consumed note as zod.
- `js-date-utils`, `js-errors`: empty lists — note: workspace-internal links (`@tkottke90/*`) are excluded from registry updates (spec §3).
- `root-tooling`: every root `devDependency` **except** those assigned above (`zod`, `express`, `@types/express`): `@eslint/js`, `@swc-node/register`, `@swc/core`, `@swc/helpers`, `@testing-library/preact`, `@types/lodash`, `@types/node`, `@vitest/coverage-v8`, `esbuild`, `eslint`, `eslint-config-prettier`, `jsdom`, `jsonc-eslint-parser`, `prettier`, `tslib`, `typescript`, `typescript-eslint`, `vite`, `vitest` (the definitive list is whatever root package.json holds at write time; the plan step is "list all, subtract the three, verify none left unassigned").
- Add a top-level `unassignedPolicy` note: findings whose top-level puller cannot be traced to an owned dep are reported as "unowned" for user triage — never fixed by any task.

- [ ] Write the file; validate it parses; cross-check every name in root `package.json` appears in exactly one owner's list (total-ownership check).
- [ ] Commit: `docs: add dependency ownership map for hygiene automation`.

## 3. Write worker runbooks (append to spec as §12)

Add a **§12 "Worker runbooks"** section to the spec — the exact instructions each worker task's plan will reference. Content (from spec §5–§7, made procedural):

- [ ] **Root monitor runbook:** preflight (§5.1) → `npm audit --json` + `npm outdated --json` → filter to its six runtime deps → write its report section (no file edits, no branches, no PRs) → commit the report to `main`.
- [ ] **Package worker runbook** (one template, parameterized by `<pkg>` = scoped package name, e.g. `@tkottke90/logger`): preflight → dedupe (`gh pr list` + branch scan for `chore/hashbrown-<pkg>-*`; open PR/branch ⇒ skip, record, report) → detect (§4, filtered to owned deps; treat non-zero exits as data) → nothing-to-do ⇒ record + report → remediate (branch `chore/hashbrown-<pkg>-<YYYY-MM-DD>`, bump via `npm install <name>@<version>`; root manifest edits allowed per ownership map) → verify with baseline-diffing (new failures fixed if mechanical, else revert + report) → ship (conventional commit `chore(<pkg>): weekly dependency updates`, push, `gh pr create` with changes table, audit before/after, and the form-field baseline-standing-note) → cleanup (return to `main`, pull, delete local branch — repo left on `main` even on failure) → append report section + commit.
- [ ] **form-field variant:** identical, except the remediate→ship stages are replaced by "report-only while baseline red"; include the re-check condition (if a future run finds the baseline green, upgrade to full worker behavior).
- [ ] **Root tooling runbook:** the package worker template with owned list = root devDependencies minus package-consumed (`zod`, `express`, `@types/express`), package label `root-tooling`, branch prefix `chore/hashbrown-root-tooling-*`.
- [ ] Commit: `docs: add worker runbooks to hygiene spec (§12)`.

## 4. Create the orchestrator task

Follow the spike-validated pattern (`docs/specs/research/2026-11-15-task-fanout-spike.md`). One `create_tasks` call, a single task:

- **title:** "DH orchestrator — weekly dependency hygiene"
- **trigger:** `cron_repeat`, expression `0 20 * * 6`, timezone `America/Chicago`
- **description (self-contained — the run has no conversation memory):** states that this run must (1) verify preconditions: on `main`, clean tree, `git pull`, `docs/dependency-ownership.json` present; (2) call `create_tasks` exactly once with `asCohort: true` and eight child tasks in spec-§2 order — `DH root monitor`, `DH config-manager`, `DH express-client`, `DH form-field`, `DH js-date-utils`, `DH js-errors`, `DH logger`, `DH root tooling` — each no-trigger, sequential by batch order, each referencing spec §12's runbook for its role and the ownership file for its list; (3) append one line per child (id + title) to `docs/reports/dependency-hygiene/orchestrator-log.md` and commit it. Explicitly: do not perform any worker's job itself; do not edit package manifests.
- **plan:** the three steps above as checkboxes.
- **no `asCohort` on this call** (creating from a chat turn, not from a running task — the two-call pattern from the spike).

- [ ] Create it; confirm the response shows the cron schedule and a sane `nextFireAt` (note: spike research shows `nextFireAt` display can be misleading — verify the first fire by the orchestrator log, not by the display).

## 5. Final state check

- [ ] `docs/dependency-ownership.json` committed (§2).
- [ ] Spec §12 runbooks committed (§3).
- [ ] Orchestrator task exists with schedule + self-contained description (§4).
- [ ] Working tree clean; commits made on `main`.
- [ ] **Not** in this plan (deliberately): creating the eight workers now — they are created by the orchestrator's own runs, cohort-per-week, per the validated pattern; pushing to origin (user's call); fixing form-field's baseline debt or the `create-release` script (out of scope, spec §9).

## 6. Carrying out this plan via Tasks

When execution starts, create one task per section (§1–§5), in order, each depending on the previous section's task. Each task's description must be self-contained (task runs have no conversation memory): point it at this plan file by path and at the spec by path, and restate the section's concrete steps inline. Do not begin §4 before §2/§3 are committed — the orchestrator's description references both.
