# Micro-Frontend Platform

A shell application that composes independently deployed micro-frontends at runtime using Webpack Module Federation. Each MFE is a separate deployable with its own CI pipeline — the shell never rebuilds when an MFE updates.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Shell  (port 3000)                    │
│        Module Federation host · React 18 · React Router  │
│        Owns: routing, auth context, health indicator     │
└───────────────┬─────────────────────────────────────────┘
                │  reads remoteEntry.json on every navigation
                ▼
┌───────────────┬───────────────┬─────────────────────────┐
│  Checkout MFE │ Analytics MFE │      Account MFE         │
│  port 3001    │  port 3002    │      port 3003           │
│  React 18     │  Vue 3        │      React 17            │
│  singleton    │  sep. runtime │      isolated bundle     │
└───────────────┴───────────────┴─────────────────────────┘
                         │
          shell/public/remoteEntry.json
          { name, version, url, scope }
```

**Key principle:** Shell reads `remoteEntry.json` on every navigation. Deploying a new MFE = patching one field in the manifest. No shell rebuild. No downtime.

---

## MFE Ownership

| MFE | Team | Framework | Version strategy | Port |
|---|---|---|---|---|
| Checkout | Commerce | React 18 | Shared singleton with shell | 3001 |
| Analytics | Data | Vue 3 | Separate runtime — zero MF sharing | 3002 |
| Account | Platform | React 17 | Isolated bundle — incompatible range | 3003 |

---

## Run Locally

```bash
# Start all MFEs first, then shell
cd mfe-checkout  && npm start &
cd mfe-analytics && npm start &
cd mfe-account   && npm start &
cd shell         && npm start &

# Open
open http://localhost:3000
```

**Kill all:**
```bash
lsof -ti:3000,3001,3002,3003 | xargs kill -9
```

---

## Manifest — Simulate Deploy + Rollback

```bash
# Simulate deploying a new version of checkout
node scripts/patch-manifest.js checkout http://localhost:3001/remoteEntry.js abc1234

# Rollback instantly — shell picks up on next navigation, no redeploy
node scripts/rollback-manifest.js checkout
```

---

## Local Dev — MFE URL Override

Override any MFE's URL without editing the manifest or restarting the shell.
Open DevTools console on `localhost:3000` and run:

```js
// Point checkout to a local branch build
localStorage.setItem('mfe-override-checkout', 'http://localhost:3001/remoteEntry.js');

// Clear override
localStorage.removeItem('mfe-override-checkout');
```

Shell reads overrides on the next route navigation and logs `[MFE:checkout] URL overridden →` to confirm.

---

## CI / CD

Each MFE has an independent GitHub Actions pipeline triggered only when its directory changes:

```
.github/workflows/
├── shell.yml          # triggers on: paths: shell/**
├── mfe-checkout.yml   # triggers on: paths: mfe-checkout/**
├── mfe-analytics.yml  # triggers on: paths: mfe-analytics/**
└── mfe-account.yml    # triggers on: paths: mfe-account/**
```

Pipeline: `install → build → deploy to Netlify → patch manifest`

**Secrets needed** (add to GitHub repo settings):

| Secret | Description |
|---|---|
| `NETLIFY_AUTH_TOKEN` | Netlify personal access token |
| `SHELL_NETLIFY_SITE_ID` | Netlify site ID for shell |
| `CHECKOUT_NETLIFY_SITE_ID` | Netlify site ID for mfe-checkout |
| `ANALYTICS_NETLIFY_SITE_ID` | Netlify site ID for mfe-analytics |
| `ACCOUNT_NETLIFY_SITE_ID` | Netlify site ID for mfe-account |

---

## Architecture Decision Records

| ADR | Decision |
|---|---|
| [ADR-001](shell/docs/ADR-001-module-federation-over-single-spa.md) | Module Federation over single-spa or iframes |
| [ADR-002](shell/docs/ADR-002-manifest-as-deployment-contract.md) | Manifest as the deployment contract |

---

## What I'd Add to Make This Production-Ready

These are the honest gaps between this portfolio build and a production platform:

1. **Manifest service API** — the current manifest is a static JSON file. Under concurrent deploys it has no write locking. A versioned HTTP API (`PATCH /manifest/:env/:name`) with optimistic locking and an append-only history log is the correct replacement. The `patch-manifest.js` script shape maps directly to this API.

2. **Shell health dashboard** — the nav dots show per-MFE status per session. A real dashboard would show error rates, load times, and current live version per environment, aggregated from Sentry or a logging sink. No existing MFE framework ships this.

3. **CI dependency audit** — if mfe-account bumps React 17 → 18 without updating its `singleton: false` config, it silently breaks. A GitHub Actions step that compares each MFE's `shared` config against the shell's accepted semver ranges on every PR would catch this before runtime. Nobody automates this today.

4. **Canary rollout** — manifest patching is all-or-nothing. A real platform would support `{ "checkout": { "stable": "3.7.2", "canary": "3.7.3", "canaryWeight": 10 } }` and split traffic at the manifest level. Shell reads canary URL for ~10% of sessions.

5. **`create-mfe` CLI** — onboarding a new MFE currently requires copying a webpack config, wiring up GitHub Actions, and manually registering with the manifest. A `npm create mfe@latest` that scaffolds + registers + opens a PR against the manifest would make the platform actually usable by other teams.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Module loader | Webpack 5 Module Federation | Native — no plugin needed, proven singleton sharing |
| Shell framework | React 18 + React Router v6 | Shell owns routing; MFEs are framework-agnostic |
| CSS isolation | CSS Modules (default) | Build-time hashing, zero runtime overhead |
| State isolation | Per-MFE stores, event bus for cross-MFE | No direct store access between MFEs |
| Error isolation | React Error Boundary per mount point | Crash in one MFE doesn't touch shell or others |
| CI | GitHub Actions with path filters | One pipeline per MFE, independent trigger |
| Deploy | Netlify (one site per MFE) | Separate origins prove true cross-origin loading |
# triggered
