# setup-node-cicd

A composite GitHub Action that installs Node.js and configures the private npm registry at `npm.artifacts.tdkottke.com`, then runs `npm ci` to install your project's dependencies.

---

## What is a composite action?

A composite action is a reusable chunk of workflow steps packaged into a single `uses:` reference. Instead of copy-pasting the same Node.js setup block into every workflow, you call this action once and it handles everything for you.

---

## Prerequisites

- Your project must have a `package-lock.json` committed (required for `npm ci`)
- You need an auth token for the private npm registry (see Repo Setup below)

---

## Repo Setup

### 1. Generate a Registry Token

1. Log into `https://npm.artifacts.tdkottke.com` via Authentik SSO
2. Go to **User Settings → Auth Tokens → Generate**
3. Copy the token — it is shown **only once**

### 2. Add the Token to Your GitHub Repo

In your repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `NPM_TOKEN` | The auth token generated above |

---

## Usage

Reference this action in any job that needs Node.js and npm dependencies installed.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js and install dependencies
        uses: tkottke90/js-libraries/actions/setup-node-cicd@main
        with:
          npm-token: ${{ secrets.NPM_TOKEN }}

      - name: Build
        run: npm run build
```

> **Tip:** This action runs `npm ci` for you — there is no need to add a separate install step after it.

---

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `npm-token` | ✅ | — | Auth token for the private npm registry |
| `node-version` | ❌ | `24` | Node.js version to install |

---

## Outputs

| Output | Description |
|---|---|
| `npmrc-path` | Absolute path to the configured `.npmrc` file (`/tmp/cicd.npmrc`) |

The `npmrc-path` output is useful when subsequent steps invoke tools that bypass npm (for example, a custom script that calls the registry directly). Pass it via the `NPM_CONFIG_USERCONFIG` environment variable:

```yaml
- name: My custom step
  run: node scripts/publish.mjs
  env:
    NPM_CONFIG_USERCONFIG: ${{ steps.setup.outputs.npmrc-path }}
```

> To use outputs from this action you must set an `id` on the step that calls it (for example, `id: setup`), then reference `steps.setup.outputs.npmrc-path`.

---

## Notes

- The registry URL (`npm.artifacts.tdkottke.com`) is hardcoded in the action — no input needed
- The `.npmrc` file is written to `/tmp/cicd.npmrc` rather than the workspace, so it is never accidentally committed
- npm's dependency cache is enabled automatically via `actions/setup-node`; consecutive runs on the same runner will be faster
