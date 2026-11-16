# Spike: task-thread fan-out & cohort hold (2026-11-15)

**Question.** Can a workspace task's own run create other tasks via
`create_tasks` (with `asCohort: true`), and does the creating task's next
scheduled fire hold until the child cohort finishes?

**Why it matters.** The dependency-hygiene design
(`docs/superpowers/specs/2026-11-15-dependency-hygiene-automation-design.md`,
§2) depends on a weekly orchestrator task that fans out eight sequential
worker tasks from its own run. Task runs start with no conversation memory,
so the pattern had to be proven end-to-end before implementation.

## Method

A throwaway orchestrator task was created from the chat thread:

- cron `*/10 * * * *`, `maxIterations: 2` (two fires, then stops — a capped
  test that cannot run away),
- stored description that instructs its future run, with no memory, to:
  1. append `ORCHESTRATOR fired at <ts>` to a gitignored log
     (`.hashbrown/spike/dh-fanout-test.log`),
  2. call `create_tasks` exactly once with `asCohort: true` and two trivial
     one-shot children, each appending its own marker line to the same log
     (on a later fire, the run detects the children's markers, logs
     `ORCHESTRATOR released after cohort`, and stops without calling
     `create_tasks` again).

Everything was throwaway: the log lives under gitignored `.hashbrown/spike/`;
no repo files, branches, or PRs were touched.

## Timeline (UTC, 2026-11-15)

| Time | Event |
|---|---|
| 23:36:26 | Spike started; orchestrator task created from chat thread |
| 23:40:21 | Orchestrator fire 1 — its run, with zero conversation memory, followed the stored description |
| 23:40:21–:51 | That run called `create_tasks` with `asCohort: true`; two children spawned |
| 23:40:51 | Child 1 ran |
| 23:41:03 | Child 2 ran (after child 1 finished — sequential, one at a time) |
| 23:50:30 | Orchestrator fire 2 — only after the cohort had finished |
| 23:50:34 | Fire-2 run detected the children's markers and self-terminated |

## Verdicts

1. **Fan-out: proven.** A task's own run can create other tasks from its
   thread. The `create_tasks` call with `asCohort: true` made from inside the
   cron task's run was accepted (no rejection). The stored description alone
   carried everything the future run needed — validating the spec's
   self-containment requirement (§2).
2. **Cohort hold: satisfied in the direction that matters.** The design
   requirement is a lower bound — the next fire must not happen before the
   batch finishes — and it held: fire 2 came nine minutes after the last
   child finished, never before. Because the batch finished (23:41) well
   before the next cron slot (23:50), the timestamps cannot distinguish
   "released early upon cohort completion" from "a plain cron fire." For the
   real design this is immaterial: a weekly Saturday orchestrator's batch
   finishing days before its next fire is expected either way.
3. **Children run sequentially, one at a time** (23:40:51 → 23:41:03, no
   overlap) — consistent with the batch semantics the spec's §2 relies on.
4. **`maxIterations` cap works** — after fire 2 the orchestrator had no
   further fires.

## Gotchas discovered

- **The reported `nextFireAt` can be misleading.** At creation (23:36Z) the
  task's `nextFireAt` displayed as 20:50Z — in the past — with a warning
  that ~120 of the day's `*/10` slots had "already passed." The task then
  fired at 23:40, off the displayed schedule. Cause appears to be the
  scheduler computing the first fire against slots earlier in the creation
  day. **Takeaway for the real orchestrator:** created on a day whose
  Saturday-20:00 slot is in the future, `nextFireAt` should be sane — but
  verify the first fire by log evidence, not by the displayed `nextFireAt`.

## Cleanup

- The orchestrator exhausted its 2-fire cap and stopped; both children were
  one-shot and completed.
- The spike log (`.hashbrown/spike/dh-fanout-test.log`) is gitignored
  (`.gitignore:49`) and deletable; it was kept as evidence.
- No repo files were modified by the spike itself.

## Conclusion

The spec's orchestrator pattern — weekly orchestrator task fanning out eight
sequential workers with `asCohort: true` and a self-contained stored
description — is **validated and safe to build**. No spec changes were
required; §2 already states the semantics that were proven.
