# npm-user-auth

A composite GitHub Action that sets up Node.js, configures a private npm registry using username/password credentials, and installs dependencies via `npm ci`.

## Overview

This action is useful when your private npm registry requires basic authentication (username + password) rather than a pre-generated token. It generates a base64-encoded `_auth` credential and writes it to `~/.npmrc` alongside the registry URL before running `npm ci`.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `username` | ✅ | — | Username for the private npm registry |
| `password` | ✅ | — | Password for the private npm registry |
| `registry` | ✅ | — | URL of the private npm registry (e.g. `https://registry.example.com`) |
| `node-version` | ❌ | `lts/*` | Node.js version to use |

## Usage

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: ./actions/npm-user-auth
    with:
      username: ${{ secrets.NPM_USERNAME }}
      password: ${{ secrets.NPM_PASSWORD }}
      registry: ${{ vars.PRIVATE_NPM_REGISTRY }}
```

### Specifying a Node.js version

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: ./actions/npm-user-auth
    with:
      username: ${{ secrets.NPM_USERNAME }}
      password: ${{ secrets.NPM_PASSWORD }}
      registry: ${{ vars.PRIVATE_NPM_REGISTRY }}
      node-version: '20'
```

## What this action does

1. **Sets up Node.js** using [`actions/setup-node@v4`](https://github.com/actions/setup-node) with npm caching enabled.
2. **Configures `~/.npmrc`** with the registry URL and a base64-encoded `_auth` entry derived from `username:password`. The derived credential is masked in logs.
3. **Installs dependencies** by running `npm ci`.

## Notes

- Store your registry credentials as [encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) in your repository or organization settings.
- The registry URL should include the protocol (e.g. `https://`). If your registry is path-based (e.g. `https://registry.example.com/npm/`), include the full path.
