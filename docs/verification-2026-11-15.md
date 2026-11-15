# Monorepo Verification Report — 2026-11-15

Comprehensive end-to-end verification after the Nx → native npm workspaces migration and the
dependency-consolidation effort (removal of per-package vitest / zod / lodash / yaml / winston /
winston-loki entries). All commands run from the repository root.

## Environment

- Lockfile regenerated via `npm install` at root: **consistent, unchanged** (it was already correct
  after the consolidation commits).
- Zero `nx` entries in `package-lock.json`; no package-local `node_modules` directories exist.
- All 6 packages registered as workspace packages (`packages/*` glob intact), linked as workspace
  entries in the lockfile (no registry-resolved duplicates).

## Per-package results

| Package | Version | Build | Test | Lint |
|---|---|---|---|---|
| @tkottke90/config-manager | 1.1.1 | ✅ pass (8.0kb) | ✅ 72/72 passed | ✅ clean |
| @tkottke/express-client | 0.0.1 | ✅ pass (1.3kb) | ✅ 27/27 passed | ✅ clean |
| @tkottke90/form-field | 0.1.0-alpha | ✅ pass (3.3kb) | ⚠️ 43 failed / 168 passed (211) | ❌ 10 errors |
| @tkottke90/js-date-utils | 1.0.0 | ✅ pass (esm + cjs) | ✅ 29/29 passed | ✅ clean |
| @tkottke90/js-errors | 1.0.2 | ✅ pass (2.2kb) | ✅ 40/40 passed | ✅ clean |
| @tkottke90/logger | 2.4.0 | ✅ pass (6.2kb) | ✅ 130/130 passed | ✅ clean |

Aggregate commands:

- `npm run build` → exit 0 (all 6 packages)
- `npm run test` → exit 1 (form-field only; see Baseline debt below)
- `npm run lint` → exit 1 (form-field only; see Baseline debt below)

## Baseline debt (pre-existing, NOT caused by consolidation)

Both form-field failures exactly match the baseline recorded in commit `4721c7d`
("build(form-field): remove vitest from dependencies"), whose message states:
"Test (43 pre-existing failures / 168 passing, unchanged from baseline) and lint
(10 pre-existing errors, unchanged)".

- **Tests:** 43 failed / 168 passed out of 211. The consolidation commits touched only
  `package.json` files and `package-lock.json` — no source files under `packages/form-field/src`
  changed since commit `df1d21b`. Accepted as baseline debt.
- **Lint:** 10 errors (9× `@typescript-eslint/no-explicit-any`, 1× `no-unused-vars`), all in
  `src/lib/form-field.tsx` and `src/lib/form-field.spec.tsx`. Same commit records these 10 errors
  as pre-existing and unchanged. Accepted as baseline debt.

All other packages: 0 test failures, 0 lint findings.

## Gotchas for future runs

- `npm --workspace=<dirname>` (bare or relative) fails; scoped names
  (`@tkottke90/<pkg>`) are required. The reliable pattern is the root scripts' form:
  `npm run <script> --workspaces --if-present`.
- Never read `$?` after a pipe (`npm run lint | tail` reports `tail`'s exit code).
  Redirect to a file, or use `${PIPESTATUS[0]}`.
- form-field's lint failures mean the root aggregate `lint`/`test` scripts will exit 1 until the
  baseline debt is fixed — this is expected.

## Consolidation confirmation

- Root `dependencies` now solely carry the runtime libs shared by packages: `@preact/signals`,
  `lodash`, `preact`, `winston`, `winston-loki`, `yaml`.
- Dev tooling (typescript, vitest, eslint, esbuild, zod, …) is declared only in root
  `devDependencies`.
- `packages/config-manager`, `js-date-utils`, `js-errors`: no local deps at all.
- `packages/express-client`: only a workspace peerDependency on `@tkottke90/js-errors`.
- `packages/logger`: runtime dep on workspace `@tkottke90/js-errors` only.
- `packages/form-field`: retains local `preact` / `@preact/signals` wildcards, which resolve via
  the hoisted root versions (form-field was not part of the consolidation commits).

**Verdict:** migration + consolidation verified. 6/6 build, 5/6 test and 5/6 lint green;
the only failures are form-field's documented pre-existing baseline (see `4721c7d`).
