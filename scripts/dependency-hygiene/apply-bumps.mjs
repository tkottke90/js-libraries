#!/usr/bin/env node
/**
 * apply-bumps.mjs — apply an agent-approved bump set.
 *
 * Usage:
 *   node scripts/dependency-hygiene/apply-bumps.mjs --bumps <path.json> [--dry-run]
 *
 * Input JSON (composed by the agent — the script never decides what to bump):
 *   { "updates": [ { "name": "<dep>", "version": "<semver>",
 *                    "manifest": "root" | "<scoped-workspace-name>" } ] }
 *
 * Behavior:
 *   manifest "root"   -> `npm install <name>@<version>` at the repo root
 *                        (how consumership-owned zod/express/@types/express
 *                        bumps edit the root manifests per the ownership map)
 *   manifest "<name>" -> `npm install <name>@<version> --workspace=<scoped-name>`
 *                        (scoped workspace name — bare dirnames fail)
 *
 * After all installs, verifies that at least one manifest (package.json) and
 * package-lock.json actually changed (git status / diff); reports each bump
 * as applied or failed. --dry-run prints the exact commands and touches
 * nothing (used by smoke tests; real bumps never pass --dry-run).
 *
 * Exit codes: 0 = all applied; 1 = one or more failed — the agent reports,
 * it does not hand-craft fallback commands.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..', '..');

function fail(msg) {
  process.stderr.write(`apply-bumps.mjs: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { bumps: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--bumps') {
      args.bumps = argv[++i] ?? null;
      if (!args.bumps) fail('--bumps requires a path');
    } else if (a === '--dry-run') {
      args.dryRun = true;
    } else {
      fail(`unknown argument: ${a} (usage: apply-bumps.mjs --bumps <path.json> [--dry-run])`);
    }
  }
  if (!args.bumps) fail('missing required --bumps <path.json>');
  return args;
}

function loadBumps(p) {
  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (e) {
    fail(`cannot read bumps file ${p}: ${e.message}`);
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    fail(`bumps file ${p} is not valid JSON: ${e.message}`);
  }
  if (!Array.isArray(doc?.updates)) fail('bumps file must be { "updates": [ ... ] }');
  const updates = doc.updates.map((u, i) => {
    if (!u || typeof u !== 'object') fail(`updates[${i}] is not an object`);
    for (const field of ['name', 'version', 'manifest']) {
      if (typeof u[field] !== 'string' || u[field].length === 0) {
        fail(`updates[${i}].${field} must be a non-empty string`);
      }
    }
    if (!/^v?\d+\.\d+\.\d+(-[\w.]+)?$/.test(u.version)) {
      fail(`updates[${i}].version "${u.version}" does not look like a concrete semver version`);
    }
    return { name: u.name, version: u.version.replace(/^v/, ''), manifest: u.manifest };
  });
  return updates;
}

/** Resolves a manifest reference against the root package.json's workspaces. */
function validateManifest(manifest) {
  if (manifest === 'root') return;
  if (manifest.startsWith('@')) {
    // Accept only scoped names that actually exist in a workspace package.json.
    const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const patterns = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : ['packages/*'];
    for (const pattern of patterns) {
      if (!pattern.endsWith('/*')) continue;
      const base = path.join(ROOT, pattern.slice(0, -2));
      for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(base, entry.name, 'package.json'), 'utf8'));
          if (pkg?.name === manifest) return;
        } catch {
          /* unreadable candidate — keep scanning */
        }
      }
  }
  }
  fail(`unknown manifest "${manifest}": must be "root" or a scoped workspace name that exists`);
}

/** Repo-root-relative git status output, for change verification. */
function gitStatus() {
  const res = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  if (res.error || res.status !== 0) {
    fail(`git status failed: ${res.error ? res.error.message : res.stderr}`);
  }
  return (res.stdout ?? '').split('\n').filter(Boolean);
}

/** The `npm install` command this bump will run (identical in dry-run and real runs). */
function bumpCommand(update) {
  if (update.manifest === 'root') {
    return ['npm', 'install', `${update.name}@${update.version}`];
  }
  return ['npm', 'install', `${update.name}@${update.version}`, `--workspace=${update.manifest}`];
}

// --- main -----------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
const updates = loadBumps(args.bumps);
if (updates.length === 0) fail('bumps file contains no updates');
for (const u of updates) validateManifest(u.manifest);

if (args.dryRun) {
  process.stdout.write('DRY-RUN — no files touched. Commands that would run:\n');
  for (const u of updates) {
    process.stdout.write(`  ${bumpCommand(u).join(' ')}\n`);
  }
  process.stdout.write(`${updates.length} update(s) validated.\n`);
  process.exit(0);
}

const before = gitStatus();
const results = [];
for (const u of updates) {
  const cmd = bumpCommand(u);
  const res = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const ok = res.status === 0;
  results.push({
    name: u.name,
    version: u.version,
    manifest: u.manifest,
    applied: ok,
    exitCode: res.status,
    stderrTail: ok ? undefined : (res.stderr ?? '').slice(-500),
  });
  if (!ok) {
    process.stderr.write(`apply-bumps.mjs: FAILED: ${cmd.join(' ')} (exit ${res.status})\n`);
  }
}

// Change verification: at least one manifest (package.json) and the lockfile
// must actually have changed, otherwise npm failed to persist the bumps.
const after = gitStatus();
const changed = after.filter((l) => !before.includes(l));
const manifestChanged = changed.some((l) => l.includes('package.json'));
const lockfileChanged = changed.some((l) => l.includes('package-lock.json'));
if (!manifestChanged || !lockfileChanged) {
  fail(
    `npm reported success but the manifests/lockfile did not change as expected ` +
      `(manifestChanged=${manifestChanged}, lockfileChanged=${lockfileChanged}). ` +
      `Changed paths: ${changed.join('; ') || '(none)'}`,
  );
}

const failed = results.filter((r) => !r.applied);
const report = {
  applied: results.filter((r) => r.applied).map((r) => `${r.name}@${r.version} (${r.manifest})`),
  failed: failed.map((r) => `${r.name}@${r.version} (${r.manifest})`),
  changedPaths: changed,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(failed.length > 0 ? 1 : 0);
