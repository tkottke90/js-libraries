#!/usr/bin/env node
/**
 * verify.mjs — dependency-hygiene verification gate + baseline diff.
 *
 * Usage:
 *   node scripts/dependency-hygiene/verify.mjs [--baseline <path>]
 *     (default baseline: scripts/dependency-hygiene/baseline.json)
 *
 * Runs the gate in fixed order — build, then test, then lint. The root gate
 * steps run at the repo root; per-package results are captured by addressing
 * packages with SCOPED workspace names only (e.g. @tkottke90/logger — bare
 * directory names fail under npm --workspace). The scoped names are
 * discovered from the npm workspaces' package.json files at run time, never
 * hardcoded.
 *
 * Every command's output is redirected to a temp file and its real exit code
 * read from spawn — never through pipes, codifying the "never read $? after
 * a pipe" gotcha. Per-package test/lint counts come from machine-readable
 * reporter output — vitest --reporter=json, eslint -f json — never from
 * prose. npm may print its run banner on STDOUT (observed), so reporter JSON
 * is extracted by locating the payload's opening byte, not by assuming a
 * clean stream.
 *
 * Baseline: scripts/dependency-hygiene/baseline.json records known
 * pre-existing debt (form-field: 43 failing tests of 211, 10 lint errors).
 * It is changed only when the debt itself changes, via a normal commit.
 *
 * Output (stable JSON shape, stdout): root gate exit codes, per-package
 * test/lint counts, a verdict of matches-baseline | new-failures |
 * tooling-error, the list of new failures, and improvement notes.
 *
 * Exit codes: 0 = matches baseline; 1 = new failures (agent triages);
 * 2 = could not determine (tooling broke).
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const DEFAULT_BASELINE = path.join(SCRIPT_DIR, 'baseline.json');

function fail(msg) {
  process.stderr.write(`verify.mjs: ${msg}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { baseline: DEFAULT_BASELINE };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--baseline') {
      args.baseline = argv[++i] ?? null;
      if (!args.baseline) fail('--baseline requires a path');
    } else {
      fail(`unknown argument: ${a} (usage: verify.mjs [--baseline <path>])`);
    }
  }
  return args;
}

function readJsonFile(p, what) {
  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (e) {
    fail(`cannot read ${what} at ${p}: ${e.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`${what} at ${p} is not valid JSON: ${e.message}`);
  }
}

/**
 * Extracts a JSON payload from captured stdout. npm's run banner may be
 * printed on stdout before the reporter output (observed for `npm run lint`),
 * so never assume the stream starts with JSON: find the payload's opening
 * byte ('{' or '[') and parse from there to the end.
 */
function extractTrailingJson(stdout, openByte) {
  const idx = stdout.indexOf(openByte);
  if (idx === -1) return { ok: false, reason: `no ${JSON.stringify(openByte)} found in captured output` };
  try {
    return { ok: true, value: JSON.parse(stdout.slice(idx)) };
  } catch (e) {
    return { ok: false, reason: `output from offset ${idx} is not valid JSON: ${e.message}` };
  }
}

function parseVitest(stdout) {
  const extracted = extractTrailingJson(stdout, '{');
  if (!extracted.ok) return extracted;
  const v = extracted.value;
  const shapeOk =
    typeof v.numTotalTests === 'number' &&
    typeof v.numPassedTests === 'number' &&
    typeof v.numFailedTests === 'number';
  if (!shapeOk) return { ok: false, reason: 'vitest JSON lacks numTotalTests/numPassedTests/numFailedTests' };
  return { ok: true, total: v.numTotalTests, passed: v.numPassedTests, failed: v.numFailedTests };
}

function parseEslint(stdout) {
  const extracted = extractTrailingJson(stdout, '[');
  if (!extracted.ok) return extracted;
  const files = extracted.value;
  if (!Array.isArray(files)) return { ok: false, reason: 'eslint JSON is not an array of file results' };
  const errorCount = files.reduce((acc, f) => acc + (typeof f?.errorCount === 'number' ? f.errorCount : 0), 0);
  return { ok: true, errorCount };
}

/**
 * Workspace package names from the root package.json's workspaces globs,
 * via each candidate directory's package.json `name` field (scoped names
 * only — what npm --workspace requires).
 */
function scopedWorkspaceNames() {
  const rootPkg = readJsonFile(path.join(ROOT, 'package.json'), 'root package.json');
  const patterns = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : [];
  if (patterns.length === 0) fail('root package.json declares no workspaces');
  const names = [];
  for (const pattern of patterns) {
    if (pattern.endsWith('/*')) {
      const base = path.join(ROOT, pattern.slice(0, -2));
      let entries = [];
      try {
        entries = fs.readdirSync(base, { withFileTypes: true });
      } catch {
        continue; // pattern base absent — nothing to gather
      }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pkg = readJsonFile(path.join(base, entry.name, 'package.json'), `${pattern}/${entry.name} package.json`);
        if (!pkg?.name) fail(`${pattern}/${entry.name}/package.json has no name field`);
        names.push(pkg.name);
      }
    } else if (!pattern.includes('*')) {
      const pkg = readJsonFile(path.join(ROOT, pattern, 'package.json'), `${pattern} package.json`);
      if (pkg?.name) names.push(pkg.name);
    } else {
      fail(`unsupported workspaces pattern: ${pattern}`);
    }
  }
  if (names.length === 0) fail('no workspace package names discovered');
  return names.sort();
}

/**
 * Runs one command with stdout and stderr redirected to separate temp files
 * (no pipes), returning its real exit code plus both captured streams.
 */
function runToFile(command, cwd, label) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dh-verify-'));
  const outPath = path.join(tmpDir, 'stdout.txt');
  const errPath = path.join(tmpDir, 'stderr.txt');
  const outFd = fs.openSync(outPath, 'w');
  const errFd = fs.openSync(errPath, 'w');
  let res;
  try {
    // Separate files, still no pipes: npm appends its error report to stderr
    // when a workspace script exits non-zero, and that stderr text must not
    // land after the reporter JSON. A failing package's reporter output has
    // to stay parseable even though its exit code is not 0 (known-debt
    // packages exit non-zero by design).
    res = spawnSync(command[0], command.slice(1), { cwd, stdio: ['ignore', outFd, errFd] });
  } finally {
    fs.closeSync(outFd);
    fs.closeSync(errFd);
  }
  const stdout = fs.readFileSync(outPath, 'utf8');
  const stderr = fs.readFileSync(errPath, 'utf8');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (res.error) fail(`${label}: could not run ${command.join(' ')}: ${res.error.message}`);
  if (res.status === null) fail(`${label}: ${command.join(' ')} was killed by signal ${res.signal}`);
  return { code: res.status, stdout, stderr };
}

// --- main -----------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
const baseline = readJsonFile(args.baseline, 'baseline file');
const baselinePackages = baseline?.packages ?? {};
const expectCleanWhenAbsent = baseline?.packagesNotInBaselineAreExpectedClean !== false;
const workspaces = scopedWorkspaceNames();

const report = {
  generatedAt: new Date().toISOString(),
  baseline: args.baseline,
  gate: {},
  packages: {},
  notes: [],
  newFailures: [],
  verdict: null,
};
let toolingError = false;

// Root gate, fixed order: build -> test -> lint.
// build is strict: a non-zero exit is a tooling error that stops the gate.
// test/lint are NOT strict: the known debt in baseline.json (form-field's
// failing tests / lint errors) makes their root exits non-zero by design —
// those exit codes are recorded as data (same principle as gotcha 3), and
// the per-package counts below decide the verdict.
const rootSteps = [
  { step: 'build', strict: true },
  { step: 'test', strict: false },
  { step: 'lint', strict: false },
];
for (const { step, strict } of rootSteps) {
  const run = runToFile(['npm', 'run', step], ROOT, `root gate ${step}`);
  report.gate[step] = { exitCode: run.code };
  if (run.code !== 0 && strict) {
    toolingError = true;
    report.newFailures.push(`root gate step "${step}" exited ${run.code}`);
    // Attach the tail so the triaging agent sees the failure without the
    // temp files having to survive. stderr goes first (compiler/runner
    // errors land there), stdout after; the slice keeps whichever is last.
    report.gate[step].outputTail = (run.stderr + '\n' + run.stdout).slice(-2000);
    break; // fixed order: a broken build invalidates later steps
  }
  if (run.code !== 0) report.gate[step].findingsExit = true;
}

// Per-package gates in the same step order (all tests, then all lints),
// each addressed by scoped workspace name.
const perPackage = {};
for (const step of ['test', 'lint']) {
  if (toolingError) break; // don't chase per-package detail past a broken gate
  for (const name of workspaces) {
    const command =
      step === 'test'
        ? ['npm', 'run', 'test', `--workspace=${name}`, '--', '--reporter=json']
        : ['npm', 'run', 'lint', `--workspace=${name}`, '--', '-f', 'json'];
    perPackage[name] ??= {};
    perPackage[name][step] = runToFile(command, ROOT, `${name} ${step}`);
  }
}

for (const name of workspaces) {
  const testRun = perPackage[name]?.test;
  const lintRun = perPackage[name]?.lint;
  const tests = testRun ? parseVitest(testRun.stdout) : null;
  const lint = lintRun ? parseEslint(lintRun.stdout) : null;
  report.packages[name] = {
    test: {
      exitCode: testRun?.code ?? null,
      total: tests?.ok ? tests.total : null,
      passed: tests?.ok ? tests.passed : null,
      failed: tests?.ok ? tests.failed : null,
      parseOk: tests?.ok ?? false,
      parseReason: tests?.ok ? null : (tests?.reason ?? 'not run'),
    },
    lint: {
      exitCode: lintRun?.code ?? null,
      errorCount: lint?.ok ? lint.errorCount : null,
      parseOk: lint?.ok ?? false,
      parseReason: lint?.ok ? null : (lint?.reason ?? 'not run'),
    },
  };
  // Parse failure = tooling surprise even when the exit code was 0 (runner
  // crashed silently, reporter absent): the gate could not determine counts.
  if (tests && !tests.ok) {
    toolingError = true;
    report.packages[name].test.stderrTail = testRun.stderr.slice(-800);
    report.newFailures.push(`${name}: vitest reporter output unparseable (${tests.reason})`);
  }
  if (lint && !lint.ok) {
    toolingError = true;
    report.packages[name].lint.stderrTail = lintRun.stderr.slice(-800);
    report.newFailures.push(`${name}: eslint reporter output unparseable (${lint.reason})`);
  }
}

if (!toolingError) {
  let matchesBaseline = true;
  for (const name of workspaces) {
    const r = report.packages[name];
    const failedTests = r.test.failed ?? 0;
    const lintErrors = r.lint.errorCount ?? 0;
    const b = baselinePackages[name];
    if (b) {
      const baselineFailed = b.tests?.failed ?? 0;
      const baselineLint = b.lint?.errors ?? 0;
      if (failedTests > baselineFailed) {
        matchesBaseline = false;
        report.newFailures.push(`${name}: tests failing=${failedTests} > baseline ${baselineFailed}`);
      }
      if (lintErrors > baselineLint) {
        matchesBaseline = false;
        report.newFailures.push(`${name}: lint errors=${lintErrors} > baseline ${baselineLint}`);
      }
      if (failedTests < baselineFailed || lintErrors < baselineLint) {
        report.notes.push(
          `${name}: debt improved vs baseline (failing=${failedTests}/${baselineFailed}, lint=${lintErrors}/${baselineLint}) — reduce baseline.json via a normal commit`,
        );
      }
    } else if (failedTests > 0 || lintErrors > 0) {
      if (expectCleanWhenAbsent) {
        matchesBaseline = false;
        report.newFailures.push(
          `${name}: not in baseline but has failing tests=${failedTests}, lint errors=${lintErrors}`,
        );
      } else {
        report.notes.push(`${name}: not in baseline; failing=${failedTests}, lint=${lintErrors}`);
      }
    }
  }
  report.verdict = matchesBaseline ? 'matches-baseline' : 'new-failures';
} else {
  report.verdict = 'tooling-error';
}

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(toolingError ? 2 : report.verdict === 'matches-baseline' ? 0 : 1);
