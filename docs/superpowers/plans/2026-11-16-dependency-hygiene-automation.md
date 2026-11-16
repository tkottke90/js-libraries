# Implementation Plan — Dependency Hygiene & CVE Automation

- **Date:** 2026-11-16 (rev 2 — adds shared worker scripts per approved review; rev 1 had all mechanics agent-composed)
- **Implements:** `docs/superpowers/specs/2026-11-15-dependency-hygiene-automation-design.md` (approved; see especially §2 trigger & topology, §3 ownership map, §4 detection & classification, §5 runbook, §6 baseline policy, §7 reporting, §8 operational notes, §10 first-run expectations)
- **Evidence base:** `docs/specs/research/2026-11-15-task-fanout-spike.md` — proves a task run can fan out child tasks via `create_tasks` with `asCohort: true` and that the orchestrator's next fire holds until the cohort finishes. **Execution model validated; no speculative task semantics remain.**
- **Execution:** once this plan is approved, it will be carried out **as workspace Tasks** (one task per section below, executed in order — see §7). This document itself must be complete and unambiguous before any task starts, because task runs have no access to this conversation.

## 0. Conventions (apply to every section)

- **Branch discipline:** repo work happens on `main` with direct commits (consistent with how the migration and consolidation work was done); weekly worker *PRs* use `chore/hashbrown-<pkg>-*` branches at runtime. This plan's own commits are direct to `main`.
- **Scripts discipline:** all repeatable worker mechanics live as committed scripts in `scripts/dependency-hygiene/` (§3). Worker tasks **run these scripts**; they never re-derive the underlying commands ad hoc. Node scripts use Node stdlib only — **no new npm dependencies**; bash scripts use `set -euo pipefail` and nothing beyond `git`/`gh`. Script contracts are defined in §3 and referenced by the spec §12 runbooks; full usage docs live in each script's header comment, so workers never need this plan at runtime.
- **Division of labor:** scripts = repeatable mechanics; agent = judgment. Classification (severity rules, owner assignment, transitive tracing), gate triage, PR/report prose, and surprise handling are **never** scripted.
- **Gotchas honored** (from spec §8, sourced from `docs/verification-2026-11-15.md`):
  - address packages by scoped name only: `--workspace=@tkottke90/logger` (bare dirnames fail);
  - never read `$?` after a pipe — redirect to a file or use `${PIPESTATUS[0]}`;
  - `npm audit` / `npm outdated` exit non-zero when they have findings — that is data, not failure.

  §3's scripts codify all three so worker runs cannot forget them.
- **Verification gate** (whenever repo state could affect builds): `npm run build`, `npm run test`, `npm run lint` at root, compared against the known baseline (form-field: 43 failing tests of 211, 10 lint errors — pre-existing debt, must remain unchanged). Once §3 lands, the gate is exercised via `verify.mjs`.

## 1. Prep — dates, branches, raw material

- [ ] Confirm current UTC date; derive:
  - the **first orchestrator fire**: next Saturday **≥ 3 days out** at 20:00 America/Chicago, as an ISO instant (`fireAt`);
  - the **date suffix** for branch/report examples (`YYYY-MM-DD` of that Saturday).
  - (Rationale: no earlier than 3 days so the description can say "tonight/tomorrow/this Saturday" unambiguously at creation time.)
- [ ] Capture `npm outdated --json` and `npm audit --json` output; extract for the ownership file: current installed + wanted/latest versions, and any GHSA ids/severities (expect the known `zod` 4.3.6→4.6.7 high finding, GHSA-mrhx-c7xc-m3w5).
- [ ] Sanity-check `git status` clean, on `main`, up to date with origin.
- [ ] Keep the raw captured JSON — §3's smoke tests replay it instead of re-capturing.

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

The ownership file is the **single machine-readable input** the §3 scripts consume (`detect.mjs` and `apply-bumps.mjs` parse it); no dependency list is hardcoded in any script.

- [ ] Write the file; validate it parses; cross-check every name in root `package.json` appears in exactly one owner's list (total-ownership check).
- [ ] Commit: `docs: add dependency ownership map for hygiene automation`.

## 3. Write shared scripts (`scripts/dependency-hygiene/`) — NEW in rev 2

New directory, committed to `main` and versioned by git like the ownership file (no separate version scheme). Contracts below are authoritative; each script's header comment restates its own usage so runtime workers are self-sufficient. Rationale (from the approved review): detect and verify run 8×/week — ad hoc `jq`/pipe one-liners re-derived eight times weekly invite exactly the drift the gotchas list exists to prevent; scripts get one review instead, and are testable before the first fire. This also shrinks what each weekly worker must improvise.

### `detect.mjs` — audit + outdated, filtered to one owner

- **Usage:** `node scripts/dependency-hygiene/detect.mjs --owner <ownerId> [--out <path>]`
- **Input:** `docs/dependency-ownership.json` — reads the owner's `ownedDependencies`; nothing is hardcoded.
- **Behavior:** runs `npm audit --json` and `npm outdated --json` at the repo root, treating their non-zero "findings" exits as **data** (codifies gotcha 3); filters both to owned dependencies — audit records mentioning an owned dep directly **or anywhere in their `via` chain** are kept (raw material for the agent's transitive tracing; the tracing itself stays agent-side), as are outdated rows for owned deps.
- **Output (stable JSON shape):** `{ generatedAt, owner, exitCodes: { audit, outdated }, audit: [...], outdated: {...} }` — to `--out` when given, else stdout.
- **Exit codes:** 0 whenever it produced output (findings included); non-zero only on real failure (npm missing, unparseable output, unknown owner).

### `verify.mjs` — verify gate + baseline diff

- **Usage:** `node scripts/dependency-hygiene/verify.mjs [--baseline scripts/dependency-hygiene/baseline.json]`
- **Behavior:** runs the root gate in fixed order — `npm run build`, `npm run test`, `npm run lint` — each with output redirected to a temp file (no pipes; codifies the `$?` gotcha), and captures **per-package** results using scoped workspace names only (gotcha 1). Per-package test/lint counts are parsed from machine-readable reporter output (vitest `--reporter=json`, eslint `-f json`), never scraped from prose.
- **Baseline:** `scripts/dependency-hygiene/baseline.json` — the current debt in machine-readable form: form-field 43 failing tests of 211, 10 lint errors. Seeded in this section from the known baseline; changed only when the debt itself changes (e.g. form-field cleanup), via a normal commit.
- **Output (stable JSON shape):** root + per-package pass/fail counts, a `verdict` of `matches-baseline` | `new-failures` | `tooling-error`, and the list of new failures.
- **Exit codes:** 0 = matches baseline; 1 = new failures (agent triages); 2 = could not determine (tooling broke).

### `dedupe.sh` — open-PR / branch scan

- **Usage:** `scripts/dependency-hygiene/dedupe.sh <label>` (label = scoped name minus `@tkottke90/`, e.g. `logger`; or `root-tooling`).
- **Behavior:** scans local branches (`git branch --list 'chore/hashbrown-<label>-*'`) and open PRs (`gh pr list --json headRefName,state` filtered to the prefix, non-merged only).
- **Output:** `open` with the matching branch/PR names, or `none`. Exit 0 either way — the agent decides skip vs proceed. Non-zero means the scan itself failed (e.g. `gh` unavailable): that is a surprise for the agent, not a "none".

### `apply-bumps.mjs` — apply an agent-approved bump set

- **Usage:** `node scripts/dependency-hygiene/apply-bumps.mjs --bumps <path.json> [--dry-run]`
- **Input JSON:** `{ updates: [{ name, version, manifest: "root" | "<scoped-workspace-name>" }] }` — composed by the agent from its classification; the script never decides what to bump.
- **Behavior:** `manifest: "root"` → install runs at the repo root (this is how consumership-owned `zod`/`express`/`@types/express` bumps edit root manifests per the ownership map); workspace manifest → `npm install <name>@<version> --workspace=<scoped-name>` (scoped name, gotcha 1). Verifies manifests + lockfile actually changed; reports applied vs failed bumps. **`--dry-run`** prints the exact commands and touches nothing (smoke tests use it; real bumps never do).
- **Exit codes:** 0 = all applied; 1 = one or more failed — the agent reports, it does not hand-craft fallback commands.

### `ship.sh` — branch / commit / push / cleanup mechanics

- **Usage:** `scripts/dependency-hygiene/ship.sh create <label> <YYYY-MM-DD>` | `commit "<message>"` | `push` | `cleanup [failed]`
- **Behavior:** `create` makes + switches to `chore/hashbrown-<label>-<date>` off current `main`; `commit` makes a single commit of the working tree with the given message; `push` runs `git push -u origin <branch>`; `cleanup` (also after a failure) returns to `main`, pulls, deletes the local branch — **the repo is left on `main` even when the run failed**. PR creation stays agent-side (`gh pr create` with composed prose).

### Smoke-test before first fire (uses §1's captured raw material)

- [ ] `detect.mjs --owner root-monitor` and one package owner, run live (read-only), emit valid JSON in the stable shape.
- [ ] `verify.mjs` runs the full gate and reports `matches-baseline` against current repo state (the tree sits at the known baseline) — this also proves the new scripts dir doesn't break root lint.
- [ ] `dedupe.sh logger` returns `none` (no PRs/branches exist yet).
- [ ] `apply-bumps.mjs --dry-run` with a sample bumps JSON prints the expected commands and touches nothing.
- [ ] `ship.sh create/commit/cleanup` exercised on a throwaway branch (scratch-file commit, then cleanup; repo back on `main`, tree clean). **`push` is deliberately not exercised** — nothing in this plan may push to origin.
- [ ] Commit: `feat(scripts): add dependency-hygiene worker scripts (detect, verify, dedupe, apply-bumps, ship)`.

## 4. Write worker runbooks (append to spec as §12)

Add a **§12 "Worker runbooks"** section to the spec — the exact instructions each worker task's plan will reference. §12 names each §3 script by path with a one-line contract; full usage lives in the script headers. Content (from spec §5–§7, made procedural):

- [ ] **Root monitor runbook:** preflight (§5.1) → `detect.mjs --owner root-monitor` → classify findings (agent, spec §4) → write its report section (**no file edits, no branches, no PRs**) → commit the report to `main`.
- [ ] **Package worker runbook** (one template, parameterized by `<pkg>` = scoped package name, e.g. `@tkottke90/logger`, and `<label>` = same minus the `@tkottke90/` prefix):
  preflight → `dedupe.sh <label>` (open ⇒ skip, record, report) → `detect.mjs --owner <id>` (non-zero exits are data) → nothing-to-do ⇒ record + report → agent composes the bumps JSON → `ship.sh create <label> <date>`, then `apply-bumps.mjs --bumps …` (root-manifest edits allowed per ownership map) → `verify.mjs`; verdict `new-failures` ⇒ agent triage — fix mechanical regressions, or revert + report → `ship.sh commit "chore(<pkg>): weekly dependency updates"`, `ship.sh push` → `gh pr create` with agent-composed changes table, audit before/after, and the form-field baseline-standing-note → `ship.sh cleanup` → append report section + commit.
- [ ] **form-field variant:** identical through detect; the remediate→ship stages are replaced by "report-only while baseline red"; include the re-check condition (if a future run finds the baseline green, upgrade to full worker behavior).
- [ ] **Root tooling runbook:** the package worker template with owner/label `root-tooling`, owned list = root devDependencies minus package-consumed (`zod`, `express`, `@types/express`), branch prefix `chore/hashbrown-root-tooling-*`.
- [ ] Standing rule in §12: a script failing is a **surprise for the agent to investigate**, never a license to reimplement the step ad hoc.
- [ ] Commit: `docs: add worker runbooks to hygiene spec (§12)`.

## 5. Create the orchestrator task

Follow the spike-validated pattern (`docs/specs/research/2026-11-15-task-fanout-spike.md`). One `create_tasks` call, a single task:

- **title:** "DH orchestrator — weekly dependency hygiene"
- **trigger:** `cron_repeat`, expression `0 20 * * 6`, timezone `America/Chicago`
- **description (self-contained — the run has no conversation memory):** states that this run must (1) verify preconditions: on `main`, clean tree, `git pull`, `docs/dependency-ownership.json` **and `scripts/dependency-hygiene/`** present; (2) call `create_tasks` exactly once with `asCohort: true` and eight child tasks in spec-§2 order — `DH root monitor`, `DH config-manager`, `DH express-client`, `DH form-field`, `DH js-date-utils`, `DH js-errors`, `DH logger`, `DH root tooling` — each no-trigger, sequential by batch order, each referencing spec §12's runbook for its role, the ownership file for its list, and the §3 scripts for its mechanics; (3) append one line per child (id + title) to `docs/reports/dependency-hygiene/orchestrator-log.md` and commit it. Explicitly: do not perform any worker's job itself; do not edit package manifests.
- **plan:** the three steps above as checkboxes.
- **no `asCohort` on this call** (creating from a chat turn, not from a running task — the two-call pattern from the spike).

- [ ] Create it; confirm the response shows the cron schedule and a sane `nextFireAt` (note: spike research shows `nextFireAt` display can be misleading — verify the first fire by the orchestrator log, not by the display).

## 6. Final state check

- [ ] `docs/dependency-ownership.json` committed (§2).
- [ ] Scripts in `scripts/dependency-hygiene/` committed **and smoke-tested** (§3); repo still lints/builds/tests at baseline.
- [ ] Spec §12 runbooks committed (§4).
- [ ] Orchestrator task exists with schedule + self-contained description (§5).
- [ ] Working tree clean; commits made on `main`.
- [ ] **Not** in this plan (deliberately): creating the eight workers now — they are created by the orchestrator's own runs, cohort-per-week, per the validated pattern; pushing to origin (user's call); fixing form-field's baseline debt or the `create-release` script (out of scope, spec §9).

## 7. Carrying out this plan via Tasks

When execution starts, create one task per section (§1–§6), in order, each depending on the previous section's task. Each task's description must be self-contained (task runs have no conversation memory): point it at this plan file by path and at the spec by path, and restate the section's concrete steps inline. Do not begin §5 before §2, §3, and §4 are committed — the orchestrator's description references all three.
