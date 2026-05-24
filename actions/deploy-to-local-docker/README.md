# deploy-to-local-docker

A composite GitHub Action that authenticates to the homelab Zot container registry at
`docker.artifacts.tdkottke.com` and pushes a tagged Docker image.

---

## Prerequisites

- The image must already be **built and tagged** before calling this action
- The full image reference pushed to the registry will be:
  ```
  docker.artifacts.tdkottke.com/<image>
  ```
  so your `image` input should not include the registry hostname — e.g. `my-app:latest` or `my-org/my-app:1.2.3`

---

## Repo Setup

### 1. Generate a Zot API Key

1. Log into `https://docker.artifacts.tdkottke.com` via Authentik SSO
2. Go to **User Settings → API Keys → Generate**
3. Copy the key — it is shown **only once**

### 2. Add Secrets to Your GitHub Repo

In your repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `REGISTRY_USERNAME` | Your Authentik username |
| `REGISTRY_API_KEY` | The API key generated above |

---

## Usage

Reference this action from the `homelab-resources` repo using the `@main` ref (or pin to a SHA for stability).

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t my-app:${{ github.sha }} .
          docker tag my-app:${{ github.sha }} docker.artifacts.tdkottke.com/my-app:${{ github.sha }}
          docker tag my-app:${{ github.sha }} docker.artifacts.tdkottke.com/my-app:latest

      - name: Push to homelab registry
        uses: tkottke90/homelab-resources/actions/deploy-to-local-docker@main
        with:
          username: ${{ secrets.REGISTRY_USERNAME }}
          api-key: ${{ secrets.REGISTRY_API_KEY }}
          image: my-app:${{ github.sha }}

      - name: Push latest tag
        uses: tkottke90/homelab-resources/actions/deploy-to-local-docker@main
        with:
          username: ${{ secrets.REGISTRY_USERNAME }}
          api-key: ${{ secrets.REGISTRY_API_KEY }}
          image: my-app:latest
```

> **Tip:** Call the action once per tag you want to push. Build and tag all variants first,
> then push each with a separate action call.

---

## Inputs

| Input | Required | Description |
|---|---|---|
| `username` | ✅ | Zot/Authentik username |
| `api-key` | ✅ | Zot API key (from User Settings → API Keys) |
| `image` | ✅ | Image name and tag to push — **without** the registry hostname |

---

## Notes

- The action always runs `docker logout` on completion (even on failure) to prevent credential leakage between jobs
- The registry URL (`docker.artifacts.tdkottke.com`) is hardcoded in the action — no input needed
- API keys are scoped to the user who generated them; each team member should generate their own
- For org/team images, prefix the image name with a namespace: `my-org/my-app:latest`
