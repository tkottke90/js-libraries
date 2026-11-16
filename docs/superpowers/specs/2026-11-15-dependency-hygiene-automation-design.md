# Dependency Hygiene & CVE Automation — Design Spec

- **Date:** 2026-11-15
- **Status:** Approved design; implementation pending
- **First scheduled fire:** Saturday 2026-11-21, 20:00 America/Chicago

## 1. Purpose

A weekly, unattended automation for this repository that maintains dependencies
and monitors for security vulnerabilities (CVEs, via the GitHub Advisory
Database surfaced through `npm audit`). Each week it:

1. Detects security findings and in-range version drift for every dependency,
   with each dependency assigned to exactly one owning task.
2. Opens remediation PRs from `chore/hashbrown-<pkg>-*` branches that update
   dependencies and pass the full verification gate.
3. Skips any target that already has an open PR from a previous week — the
   signal that the user has not yet reviewed the previous one.
4. Commits a plain-text + markdown-table report to `main` for downstream
   extraction into reporting.

The automation runs as workspace **Tasks** (not n8n, not GitHub Actions):
one weekly orchestrator task that fans out eight sequential worker tasks.

## 2. Trigger & topology

- **Orchestrator:** cron `0 20 * * 6`, timezone `America/Chicago`
  (Saturdays 20:00 Central). Weekly, indefinitely.
- The orchestrator's run creates a batch of **8 worker tasks** with
  `asCohort: true`, so the orchestrator's next weekly fire is held until the
  entire batch finishes. Batch tasks run **strictly one at a time, in this
  order**:

  | # | Task | Role |
  |---|------|------|
  | 1 | Root monitor | Detection + reporting only; never edits files or opens PRs |
  | 2 | config-manager | Worker |
  | 3 | express-client | Worker |
  | 4 | form-field | Worker (report-only while baseline red — §6) |
  | 5 | js-date-utils | Worker |
  | 6 | js-errors | Worker |
  | 7 | logger | Worker |
  | 8 | Root tooling | Worker over root `devDependencies` (runs last: its bumps affect every package's gate) |

- **Sequential execution is a correctness requirement,** not a preference: all
  tasks share one working tree and one root `package-lock.json`. Parallel
  workers would corrupt each other's state.
- **The orchestrator's stored description must be fully self-contained** —
  task runs start with no conversation memory. It must name all eight worker
  tasks, their order, the `asCohort: true` requirement, and point its run at
  this spec and `docs/dependency-ownership.json` as the runbook.
- **Validated by spike (2026-11-15):** a throwaway orchestrator run successfully fanned out two children via `create_tasks` with `asCohort: true`, and its next fire occurred only after the cohort finished (lower bound proven). Full timeline and analysis: `docs/specs/research/2026-11-15-task-fanout-spike.md`.

## 3. Ownership map

Persisted at `docs/dependency-ownership.json`, committed to the repo and
versioned with the code, so worker tasks read it directly from the working
tree. **Ownership = consumership:** a task owns every dependency its package
consumes, including when the dependency is declared in the root
`package.json` (post-consolidation). Each dependency has exactly one owner so
two tasks never open PRs for the same dependency.

| Task | Owns |
|------|------|
| config-manager | `zod`, `lodash`, `yaml` (declared at root, consumed here) |
| logger | `winston`, `winston-loki` |
| form-field | `preact`, `@preact/signals` |
| express-client | `express`, `@types/express` |
| js-date-utils | — (no external deps) |
| js-errors | — (no external deps) |
| root tooling | All root `devDependencies` (vitest, vite, typescript, eslint, typescript-eslint, esbuild, @swc/*, prettier, jsdom, @testing-library/preact, @vitest/coverage-v8, @types/*, tslib, …) |
| root monitor | All root runtime `dependencies` — report-only |

Additional rules:

- **Transitive findings** (e.g. a vulnerable `ws` deep in the tree) are
  assigned by pulling the affected package to top level with `npm ls <pkg>`,
  which reveals which owned dependency drags it in; the finding belongs to
  that dependency's owner. If `npm audit fix` (non-force) resolves it, the
  owner applies it as a lockfile-level fix.
- **Untraceable findings** — those no owned dependency pulls in — are
  reported with status **"unowned"** for the user's manual triage. They are
  never silently dropped and no task fixes them.
- **Workspace-internal dependencies** (`@tkottke90/js-errors` consumed by
  logger / peer-depended by express-client) are workspace links, not registry
  packages. They are excluded from registry updates; their "updates" happen
  through their own packages' PRs.
- A worker **may edit the root `package.json` and `package-lock.json`** in
  its PR when its owned dependencies are declared at root. This is the
  approved consolidation-aware model.

## 4. Detection & classification

Every worker runs, from the repo root:

- `npm audit --json` — security findings with severity, GHSA id, and
  `fixAvailable` metadata.
- `npm outdated --json` — version drift.

Both commands **exit non-zero when they have findings**; the task treats
those exit codes as data, not failure.

Classification per finding/update:

| Situation | Action |
|-----------|--------|
| Security, any severity, fix available in-range | Bump (usually subsumed by the in-range drift bump) |
| Security **high/critical**, no in-range fix | **Major bump authorized** |
| Security moderate/low, no in-range fix | Report-only |
| Drift: in-range patch or minor | Bump |
| Drift: major | Never bump, unless CVE-forced (above) |

The strategy is *security remediation + in-range minor/patch maintenance* —
keeping drift small weekly so major upgrades stay rare and deliberate.

## 5. Weekly runbook (every worker task)

1. **Preflight** — confirm on `main` with a clean tree; `git pull`; record
   the pre-change baseline (build/test/lint results).
2. **Dedupe** — `gh pr list` plus local/remote branch scan for
   `chore/hashbrown-<pkg>-*`. An open PR or unmerged branch ⇒ **skip**:
   record "skipped — previous PR awaiting review" and jump to reporting.
3. **Detect** — per §4, filtered to owned dependencies.
4. **Nothing to do?** Record "no changes" and jump to reporting. Detection
   runs every week regardless; every target produces a report section.
5. **Remediate** — create branch `chore/hashbrown-<pkg>-<YYYY-MM-DD>`;
   apply bumps with `npm install <name>@<version>`, updating the root
   `package.json` and lockfile as the ownership map dictates.
6. **Verify** — per §6 (full-monorepo gate with baseline-diffing).
7. **Ship** — conventional commit (`chore(<pkg>): weekly dependency
   updates`), push, open PR with `gh pr create`. PR body includes:
   - a changes table (dependency, from → to, type, severity/GHSA id),
   - audit findings before/after counts,
   - a standing note: a failing CI check caused by form-field's recorded
     baseline debt is expected and documented in
     `docs/verification-2026-11-15.md` — it is not caused by this PR.
8. **Cleanup** — return to `main`, `git pull`, delete the local branch. The
   repository is **always left on `main`**, including on failure paths, so
   other agents can work in the same space.
9. **Report** — append this target's section to the weekly report file and
   commit it to `main`.

## 6. Baseline & verification policy

- **The gate is the full monorepo**, not just the touched package:
  `npm run build`, `npm run test`, `npm run lint` (root aggregates via
  `--workspaces --if-present`).
- **Baseline-diffing:** failures already present in the pre-change baseline
  do not block a PR; only **new** failures do. Current known baseline:
  form-field has 43 failing tests of 211 and 10 lint errors, documented in
  `docs/verification-2026-11-15.md` and matching commit `4721c7d`.
- **New failures** are fixed on the branch when the fix is mechanical
  (versions, configs, lockfile). Otherwise the bump is reverted and the
  blockage is reported.
- **form-field task:** included every week; while its baseline is red for
  reasons unrelated to dependency drift, it opens **no PR** — it reports in
  its own section instead. The task does not fix form-field's pre-existing
  debt; that remains tracked separately.

## 7. Reporting

- **Path:** `docs/reports/dependency-hygiene/YYYY-MM-DD.md`, committed to
  `main`. The root monitor (task 1) creates the file with its own section;
  each subsequent worker appends its section; the tooling task (task 8)
  closes the table.
- **Structure:** (1) a plain-text summary of what was done; (2) one markdown
  table spanning all targets, columns: *Target · Dependency · From → To ·
  Type (security/minor/patch) · Severity + GHSA id · PR link*.
- Skips and unowned findings get table rows, so the file is a complete
  weekly extract. No push notifications (declined by user).

## 8. Operational notes (gotchas codified from repo history)

- Target one package with **scoped workspace names**:
  `npm run test --workspace=@tkottke90/logger`. Bare directory names fail
  under npm workspaces; the reliable aggregate pattern is the root scripts'
  own `--workspaces --if-present`.
- **Never read exit status after a pipe** (`cmd | tail` yields tail's exit
  code). Redirect to a file or use `${PIPESTATUS[0]}`.
- `npm audit` / `npm outdated` non-zero exits are findings-as-data (§4).
- The npm registry is public npm (no `.npmrc` in the repo or user config);
  private-registry secrets exist only for CI's composite action. Task-time
  installs need no auth.

## 9. Out of scope / known loose ends

- form-field's pre-existing debt itself (43 tests / 10 lint errors) —
  tracked separately; this automation reports it but does not fix it.
- `create-release` root script still calls `nx release` — affects release
  tagging only; unrelated to this automation.
- Major-version upgrades not forced by a high/critical CVE.
- Any push/notification integration.

## 10. First-run expectations

The first fire (2026-11-21) has known work queued: `zod` 4.3.6 → 4.6.7
(high, GHSA-mrhx-c7xc-m3w5, owned by config-manager) and transitive `ws`
high findings (owner traced via `npm ls` at run time, likely root tooling).
Treat week one's PRs as the shake-down run and review them closely.

## 11. Implementation notes

- The `create_tasks` orchestrator description must be written exactly per
  §2's self-containment requirement (workers named, ordered, `asCohort: true`,
  spec + ownership-file pointers included).
- Wiki mirror: `repo-js-libraries` domain pages recording the design and the
  weekly runbook for human recall.

## 12. Worker runbooks

The exact instructions each weekly worker task's plan references. One-line
contracts name the §3 scripts by path; full usage lives in each script's
header comment, so a worker never needs the implementation plan at runtime.
Classification (§4), the ownership map (`docs/dependency-ownership.json`),
the verification policy (§6), and the report structure (§7) are
authoritative here and not restated.

**Standing rule — script failures are surprises, not invitations.** A §12
script exiting non-zero outside its documented contract (`detect.mjs` exit
1, `verify.mjs` exit 2, `dedupe.sh` non-zero, `ship.sh` refusing an unsafe
operation) is an anomaly for the agent to investigate and report. It is
never a license to reimplement that step with ad-hoc commands: agents
classify, decide, and compose prose; the scripts execute the mechanics.

### 12.1 Root monitor runbook (task 1 — report-only)

1. **Preflight (§5.1)** — on `main`, clean tree, `git pull`.
2. **Detect** — `node scripts/dependency-hygiene/detect.mjs --owner root-monitor`
   (output to stdout, or `--out <path>` into a gitignored scratch directory
   such as `.hashbrown/dh-prep/`). Contract: filters `npm audit --json` +
   `npm outdated --json` to the owner's `ownedDependencies`, keeping
   via-chain over-matches as raw material for agent-side transitive tracing;
   npm's findings exits are data captured in `exitCodes`; exit 1 = real
   failure (surprise).
3. **Classify (agent, §4)** — apply the severity table; trace transitive
   findings with `npm ls <pkg>`; untraceable findings get status
   **unowned** for user triage (§3) — never fixed, never dropped.
4. **Report** — create this week's `docs/reports/dependency-hygiene/YYYY-MM-DD.md`
   with the monitor's section and the weekly table (§7). Findings belonging
   to other owners are recorded in the report for their owning package, not
   acted on. **No file edits, no branches, no PRs** — this role is
   report-only by design (§2).
5. **Commit the report to `main`** — direct commit (no `ship.sh`; no worker
   branch exists).

### 12.2 Package worker runbook (template — tasks 2, 3, 5, 6, 7; also §12.4)

Parameters: `<pkg>` = scoped workspace name (e.g. `@tkottke90/logger`);
`<label>` = `<pkg>` minus the `@tkottke90/` prefix (e.g. `logger`);
`<ownerId>` = the target's id in `docs/dependency-ownership.json`.
(js-date-utils and js-errors own no external dependencies — their runs
normally end at step 4; the report section is still produced every week.)

1. **Preflight (§5.1)** — on `main`, clean tree, `git pull`.
2. **Dedupe (§5.2)** — `scripts/dependency-hygiene/dedupe.sh <label>`.
   Contract: prints `open` plus matching `chore/hashbrown-<label>-*`
   branches/PRs, or `none`; exit 0 either way — the skip decision is the
   agent's. `open` ⇒ record "skipped — previous PR awaiting review" and
   jump to step 10. Non-zero exit = the scan itself failed (surprise,
   never read as `none`).
3. **Detect (§5.3)** — `node scripts/dependency-hygiene/detect.mjs --owner <ownerId>`.
   npm's findings exits are data (§4); script exit 1 = surprise.
4. **Nothing to do?** Record "no changes" and jump to step 10 (§5.4).
   Detection runs every week regardless; every target produces a report
   section.
5. **Compose the bump set (agent, §4)** — apply the classification table to
   the detection output and write the bumps JSON to a gitignored scratch
   path (e.g. `.hashbrown/dh-prep/`):
   `{"updates":[{"name":"<dep>","version":"<semver>","manifest":"root" | "<pkg>"}]}`.
   Use `manifest: "root"` when the owned dependency is declared in the root
   `package.json` (consumership-owned: config-manager's `zod`/`lodash`/`yaml`,
   express-client's `express`/`@types/express`).
6. **Branch + apply (§5.5)** — `scripts/dependency-hygiene/ship.sh create <label> <YYYY-MM-DD>`
   (makes + switches to `chore/hashbrown-<label>-<date>` off `main`;
   refuses when not on `main`), then
   `node scripts/dependency-hygiene/apply-bumps.mjs --bumps <path.json>`.
   Contract: runs `npm install <name>@<version>` at root or
   `--workspace=<pkg>` (scoped names only — bare directory names fail, §8);
   verifies manifests + lockfile actually changed. Exit 1 = a bump failed —
   report it; no hand-crafted fallback commands.
7. **Verify (§5.6)** — `node scripts/dependency-hygiene/verify.mjs`.
   Contract: full-monorepo gate in fixed order build → test → lint, scoped
   workspace names, per-package counts from JSON reporters, diffed against
   `scripts/dependency-hygiene/baseline.json`; verdict
   `matches-baseline` | `new-failures` | `tooling-error` (exit 0/1/2).
   `new-failures` ⇒ agent triage (§6): fix mechanical regressions
   (versions, configs, lockfile) on the branch and re-run verify, else
   revert the bump and report. `tooling-error` = surprise.
8. **Ship (§5.7)** — `scripts/dependency-hygiene/ship.sh commit "chore(<pkg>): weekly dependency updates"`,
   then `scripts/dependency-hygiene/ship.sh push`, then open the PR
   agent-side (`gh pr create`, title `chore(<pkg>): weekly dependency updates`)
   with: a changes table (dependency, from → to, type, severity/GHSA id),
   audit before/after counts, and the standing form-field baseline note
   (§5.7). PR prose is never scripted.
9. **Cleanup (§5.8)** — `scripts/dependency-hygiene/ship.sh cleanup`
   (back to `main`, pull, delete the local branch); on any failure path
   after step 6, `ship.sh cleanup failed`. The repository is always left on
   `main`, including on failure paths.
10. **Report (§5.9)** — append the package's section and table rows to the
    weekly report; commit to `main`.

### 12.3 form-field variant (task 4 — report-only while baseline red)

Identical to §12.2 through step 3 (detect). While
`scripts/dependency-hygiene/baseline.json` records form-field's debt
(43 failing tests of 211, 10 lint errors — §6), steps 5–9 (remediate
through cleanup) are replaced by **report-only**: findings go into
form-field's report section; no branch, no PR. The task never fixes
form-field's pre-existing debt (§9 — tracked separately).

**Re-check condition:** if a future run finds the baseline green — the debt
is fixed and `baseline.json` updated by a normal commit — the form-field
worker upgrades to the full §12.2 template from that run onward.

### 12.4 Root tooling runbook (task 8 — runs last)

The §12.2 template with: `<label>` = `root-tooling`, `<ownerId>` =
`root-tooling`; branch prefix `chore/hashbrown-root-tooling-*`; owned list
= root `devDependencies` **minus** `zod`, `express`, `@types/express`
(those belong to config-manager / express-client by consumership, §3).
Runs last in the cohort because its bumps affect every package's gate (§2).
