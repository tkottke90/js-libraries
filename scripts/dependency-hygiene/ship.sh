#!/usr/bin/env bash
# ship.sh — dependency-hygiene branch / commit / push / cleanup mechanics.
#
# Usage:
#   scripts/dependency-hygiene/ship.sh create <label> <YYYY-MM-DD>
#   scripts/dependency-hygiene/ship.sh commit "<message>"
#   scripts/dependency-hygiene/ship.sh push
#   scripts/dependency-hygiene/ship.sh cleanup [failed]
#
# create   makes + switches to chore/hashbrown-<label>-<date> off current main
#          (fails if not on main, so workers never branch off a worker branch)
# commit   makes a single commit of the working tree with the given message
#          (nothing staged is required; untracked files included, so the
#          script stages -A explicitly)
# push     runs git push -u origin <current branch> (must be on the worker
#          branch — refuses to push from main)
# cleanup  switches to main, pulls, deletes the local worker branch; with the
#          optional "failed" argument it also emits a reminder that the PR
#          was never opened. Either way the repo is left on main — the
#          contract is "repo left on main even when the run failed".
#
# PR creation stays agent-side (gh pr create with composed prose) — this
# script deliberately does not create PRs.
#
# Uses set -euo pipefail and nothing beyond git/gh.

set -euo pipefail

die() { echo "ship.sh: $*" >&2; exit 1; }

cmd="${1:-}"; shift || true
case "$cmd" in
  create)
    [ $# -eq 2 ] || die "usage: ship.sh create <label> <YYYY-MM-DD>"
    label="$1"; date="$2"
    current="$(git branch --show-current)"
    [ "$current" = "main" ] || die "refusing to create worker branch from '$current' — switch to main first"
    branch="chore/hashbrown-${label}-${date}"
    if git show-ref --verify --quiet "refs/heads/$branch"; then
      die "branch $branch already exists"
    fi
    git checkout -b "$branch"
    echo "ship.sh: created and switched to $branch"
    ;;
  commit)
    [ $# -ge 1 ] || die 'usage: ship.sh commit "<message>"'
    current="$(git branch --show-current)"
    case "$current" in
      chore/hashbrown-*) ;;
      *) die "refusing to commit on '$current' — ship.sh commit runs only on chore/hashbrown-* branches" ;;
    esac
    git add -A
    git commit -m "$1"
    ;;
  push)
    current="$(git branch --show-current)"
    case "$current" in
      chore/hashbrown-*) ;;
      *) die "refusing to push from '$current' — ship.sh push runs only on chore/hashbrown-* branches" ;;
    esac
    git push -u origin "$current"
    ;;
  cleanup)
    current="$(git branch --show-current)"
    if [ "$current" = "main" ]; then
      echo "ship.sh: already on main (nothing to clean up)"
      [ "${1:-}" != "failed" ] || echo "ship.sh: run marked failed — no PR was opened"
      exit 0
    fi
    git checkout main
    git pull --ff-only origin main
    git branch -D "$current"
    echo "ship.sh: deleted local branch $current"
    if [ "${1:-}" = "failed" ]; then
      echo "ship.sh: run marked failed — no PR was opened for this branch; commit work was discarded from the remote's perspective (local branch deleted)"
    fi
    echo "ship.sh: repo left on main"
    ;;
  *)
    die "usage: ship.sh create <label> <YYYY-MM-DD> | commit \"<message>\" | push | cleanup [failed]"
    ;;
esac
