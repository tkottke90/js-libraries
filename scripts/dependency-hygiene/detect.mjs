#!/usr/bin/env node
/**
 * detect.mjs — dependency-hygiene detection for one owner.
 *
 * Usage:
 *   node scripts/dependency-hygiene/detect.mjs --owner <ownerId> [--out <path>]
 *
 * Reads docs/dependency-ownership.json and resolves <ownerId>'s
 * ownedDependencies (nothing about any dependency is hardcoded here), then
 * runs `npm audit --json` and `npm outdated --json` at the repo root and
 * filters both to that owner:
 *
 *   - audit records are kept when the record's own name OR any entry in its
 *     `via` chain (string names or advisory objects) references an owned
 *     dependency. This deliberately over-matches transitive findings: the
 *     records are raw material for the agent's transitive tracing, and the
 *     tracing itself is never scripted.
 *   - outdated rows are kept verbatim for owned dependencies (npm emits an
 *     object, or an array of rows, per dependency — both pass through).
 *
 * npm audit / npm outdated exit non-zero when they have findings — that is
 * data, not failure. The real exit codes are reported in exitCodes.
 *
 * Output (stable shape):
 *   { generatedAt, owner, exitCodes: { audit, outdated }, audit: [...], outdated: {...} }
 * written to --out <path> when given, else to stdout.
 *
 * Exit codes:
 *   0  output was produced (findings included)
 *   1  real failure: npm missing, unparseable output, unknown owner,
 *      unreadable/invalid ownership file
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OWNERSHIP_PATH = path.join(ROOT, 'docs', 'dependency-ownership.json');

function fail(msg) {
  process.stderr.write(`detect.mjs: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { owner: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--owner') {
      args.owner = argv[++i] ?? null;
      if (!args.owner) fail('--owner requires a value');
    } else if (a === '--out') {
      args.out = argv[++i] ?? null;
      if (!args.out) fail('--out requires a path');
    } else {
      fail(`unknown argument: ${a} (usage: detect.mjs --owner <ownerId> [--out <path>])`);
    }
  }
  if (!args.owner) fail('missing required --owner <ownerId>');
  return args;
}

function loadOwned(ownerId) {
  let raw;
  try {
    raw = fs.readFileSync(OWNERSHIP_PATH, 'utf8');
  } catch (e) {
    fail(`cannot read ${OWNERSHIP_PATH}: ${e.message}`);
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    fail(`ownership file is not valid JSON: ${e.message}`);
  }
  const targets = Array.isArray(doc?.targets) ? doc.targets : null;
  if (!targets) fail('ownership file has no targets array');
  const target = targets.find((t) => t?.id === ownerId);
  if (!target) {
    fail(`unknown owner "${ownerId}" (known owners: ${targets.map((t) => t?.id).join(', ')})`);
  }
  const owned = target.ownedDependencies;
  if (!Array.isArray(owned)) fail(`owner "${ownerId}" has no ownedDependencies array`);
  return owned;
}

/** Runs an npm command that must print JSON on stdout. Findings exits are data. */
function runNpmJson(npmArgs) {
  const res = spawnSync('npm', npmArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (res.error) fail(`failed to spawn npm: ${res.error.message}`);
  if (res.status === null) fail(`npm ${npmArgs.join(' ')} was killed by signal ${res.signal}`);
  let data;
  try {
    data = JSON.parse(res.stdout);
  } catch {
    fail(
      `npm ${npmArgs.join(' ')} did not print parseable JSON on stdout (exit code ${res.status}); ` +
        `this is a tooling failure, not a findings exit. stderr tail: ${(res.stderr || '').slice(-400).replace(/\s+/g, ' ')}`,
    );
  }
  return { code: res.status ?? 0, data };
}

// --- main -----------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
const owned = loadOwned(args.owner); // unknown owner fails before any npm run

const auditRun = runNpmJson(['audit', '--json']);
if (
  !auditRun.data ||
  typeof auditRun.data !== 'object' ||
  Array.isArray(auditRun.data) ||
  !('vulnerabilities' in auditRun.data)
) {
  fail('npm audit --json output has no vulnerabilities object — treating as a tooling failure');
}
const allAuditRecords = Object.values(auditRun.data.vulnerabilities ?? {});

const auditMatchesOwner = (record) => {
  if (owned.includes(record?.name)) return true;
  const via = Array.isArray(record?.via) ? record.via : [];
  return via.some((v) =>
    typeof v === 'string'
      ? owned.includes(v)
      : v && typeof v === 'object' && typeof v.name === 'string' && owned.includes(v.name),
  );
};
const audit = allAuditRecords.filter(auditMatchesOwner);

const outdatedRun = runNpmJson(['outdated', '--json']);
if (!outdatedRun.data || typeof outdatedRun.data !== 'object' || Array.isArray(outdatedRun.data)) {
  fail('npm outdated --json output was not a JSON object — treating as a tooling failure');
}
const outdated = {};
for (const [name, rows] of Object.entries(outdatedRun.data)) {
  if (owned.includes(name)) outdated[name] = rows; // verbatim: object or array of rows
}

const result = {
  generatedAt: new Date().toISOString(),
  owner: args.owner,
  exitCodes: { audit: auditRun.code, outdated: outdatedRun.code },
  audit,
  outdated,
};

if (args.out) {
  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(
    `detect.mjs: wrote ${args.out} (audit records: ${audit.length}, outdated deps: ${Object.keys(outdated).length}; ` +
      `exitCodes audit=${auditRun.code} outdated=${outdatedRun.code})\n`,
  );
} else {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
