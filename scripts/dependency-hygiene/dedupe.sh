#!/usr/bin/env bash
# dedupe.sh — dependency-hygiene open-PR / branch scan for one owner label.
#
# Usage:
#   scripts/dependency-hygiene/dedupe.sh <label>
#
# <label> is the owner id minus the "@tkottke90/" scope (e.g. "logger"), or
# "root-tooling". Scans:
#   - local branches matching chore/hashbrown-<label>-*  (git branch --list)
#   - open PRs from head branches matching that prefix, non-merged only
#     (gh pr list --json headRefName,state filtered locally)
#
# Prints "open" plus the matching names, or "none". Exit 0 either way —
# deciding skip-vs-proceed belongs to the agent, not this script. A non-zero
# exit means the scan itself failed (e.g. gh unavailable) — that is a
# surprise for the agent, NOT a "none".
#
# Uses set -euo pipefail and nothing beyond git/gh.

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: dedupe.sh <label>   (label = scoped name minus @tkottke90/, e.g. logger; or root-tooling)" >&2
  exit 1
fi
label="$1"
prefix="chore/hashbrown-${label}-"

# Local branches matching the prefix (strip the current-branch marker).
branch_matches="$(git branch --list "${prefix}*" | sed 's/^[*+] //; s/^ *//; /^$/d')"

# Open PRs from head branches matching the prefix. gh exits 0 with "[]" when
# nothing matches; a non-zero gh exit (caught by set -e) means the scan
# itself failed — the surprise case this script must surface, not swallow.
pr_matches="$(
  DEDUPE_PREFIX="$prefix" gh pr list --json headRefName,state --limit 200 |
    node -e 'let s="";process.stdin.on("data",(d)=>{s+=d});process.stdin.on("end",()=>{
      const prefix=process.env.DEDUPE_PREFIX;
      const rows=JSON.parse(s);
      for(const r of rows){
        if(r.state==="OPEN" && typeof r.headRefName==="string" && r.headRefName.startsWith(prefix)){
          console.log(r.headRefName);
        }
      }
    })'
)"

matches="$(printf '%s\n%s\n' "$branch_matches" "$pr_matches" | sed '/^$/d')"
if [ -n "$matches" ]; then
  echo "open"
  echo "$matches"
  exit 0
fi
echo "none"
