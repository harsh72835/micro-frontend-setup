# Micro-Frontend Platform — Progress Log

> Session started: 2026-05-11

---

## What This Project Is

Portfolio project targeting senior/architect roles. Demonstrates micro-frontend architecture using Webpack Module Federation — shell app composing independently deployed MFEs at runtime via a manifest JSON.

Reference doc: `micro-frontend-platform.md` (full architecture, roadmap, ADR template, glossary)

---

## Project Structure

```
resume-projects/
└── micro-frontend-setup/
    ├── shell/              # Host app — React 18, owns routing + auth + manifest loading
    ├── mfe-checkout/       # MFE — React 18, shared singleton
    ├── mfe-analytics/      # MFE — Vue 3, separate runtime
    ├── mfe-account/        # MFE — React 17, isolated bundle
    ├── micro-frontend-platform.md
    └── PROGRESS.md         # This file
```

Each folder is an independent deployable with its own `package.json`, `webpack.config.js`, and CI pipeline (Phase 3).

---

## Dev Ports

| App | Port |
|---|---|
| shell | 3000 |
| mfe-checkout | 3001 |
| mfe-analytics | 3002 |
| mfe-account | 3003 |

**To start all servers:**
```bash
cd micro-frontend-setup/mfe-checkout && npm start &
cd micro-frontend-setup/mfe-analytics && npm start &
cd micro-frontend-setup/mfe-account && npm start &
cd micro-frontend-setup/shell && npm start &
```

**To kill all:**
```bash
lsof -ti:3000,3001,3002,3003 | xargs kill -9
```

---

## Phase 1 — Repo Structure + Shell ✅

> Completed: 2026-05-11

### What was built

- 4 separate repos scaffolded (`shell`, `mfe-checkout`, `mfe-analytics`, `mfe-account`)
- Webpack 5 + Module Federation configured in shell as host
- React Router v6 in shell — `/checkout` lazy-loads Checkout MFE
- Static `remoteEntry.json` manifest in `shell/public/` — shell reads on every navigation
- Shell deployed locally on port 3000, Checkout on port 3001

### Key files

| File | Purpose |
|---|---|
| `shell/public/remoteEntry.json` | Manifest — maps MFE names to deployed URLs + versions |
| `shell/src/manifest.js` | Fetches manifest, invalidates cache on each navigation |
| `shell/src/loadMFE.js` | Injects remote script tag at runtime, calls Module Federation init |
| `shell/src/MFELoader.jsx` | React component — handles load/error/crash lifecycle per MFE |
| `shell/src/App.jsx` | Shell app — owns nav, routing, layout |
| `mfe-checkout/webpack.config.js` | Exposes `./App` via Module Federation on port 3001 |

### Why manifest over hardcoded URLs

Shell never hardcodes remote URLs in `webpack.config.js`. It reads `remoteEntry.json` on every navigation. Changing one field in the manifest = new MFE version live instantly. No shell rebuild. No downtime. This shape becomes the manifest API in Phase 5.

### Bugs fixed

**`process is not defined`** — `manifest.js` used `process.env.MANIFEST_URL` which doesn't exist in browser without `DefinePlugin`. Fixed by hardcoding `/remoteEntry.json` (env var support added in Phase 5 when manifest becomes an API).

**Cross-origin overlay error** — mfe-checkout's webpack-dev-server overlay script injected into shell page. Browser's same-origin policy masked error as `"Script error."`. Fixed by setting `client: { overlay: false }` in mfe-checkout's devServer config.

---

## Phase 2 — Runtime Isolation + Version Conflicts ✅

> Completed: 2026-05-11

### What was built

- **Analytics MFE (Vue 3)** — completely separate runtime from React, zero Module Federation sharing
- **Account MFE (React 17)** — intentional version mismatch with shell's React 18, isolated bundle
- **CSS isolation** — `.container` class exists in both Checkout and Account; CSS Modules hashes to different identifiers per build (verify in DevTools)
- **Error boundaries** — every MFE mount point wrapped; crash in one MFE doesn't affect shell or others
- **Crash buttons** — on all 3 MFEs for demo/interview purposes
- **ADR #1** written — `shell/docs/ADR-001-module-federation-over-single-spa.md`

### Framework-agnostic mount/unmount pattern

Vue 3 and React 17 cannot be rendered by shell's React 18 renderer. Both use a `mount(el) / unmount(instance)` contract instead:

```js
// mfe-analytics/src/bootstrap.js
export function mount(el) {
  const app = createApp(App);
  app.mount(el);
  return app;          // return instance for unmount
}
export function unmount(app) { app.unmount(); }

// mfe-account/src/mount.jsx (React 17)
export function mount(el) { ReactDOM.render(<App />, el); }
export function unmount(el) { ReactDOM.unmountComponentAtNode(el); }
```

Shell's `MFELoader` detects this pattern via `typeof mod.mount === 'function'` and uses a `ref`'d div as the mount target — React 18 never touches the internals.

### Version conflict matrix

| MFE | Framework | Strategy | Notes |
|---|---|---|---|
| Checkout | React 18 | Singleton shared | Shell + Checkout share one React instance |
| Analytics | Vue 3 | Separate runtime | Zero overlap with React |
| Account | React 17 | Isolated bundle | `singleton: false` — bundles own React 17 copy |

### Bug fixed: React 17 hooks crash

**Error:** `Invalid hook call. You might have more than one copy of React in the same app.`

**Root cause:** Shell rendered Account's component with React 18's renderer (`createRoot`). Account's `useState` resolved to React 17 (its own bundle). Two renderers, same component = invalid hook call.

**Fix:** Account MFE exposes `mount(el)/unmount(el)` (same as Vue pattern). Shell provides a DOM node; Account mounts itself with React 17's `ReactDOM.render`. Each React version owns its own render cycle — no renderer conflict.

**Why this matters:** This is the core insight behind version isolation. React 17 and 18 can coexist on the same page only if each owns its render tree. Module Federation's `__webpack_require__` registries prevent module graph collision, but the renderer boundary must be explicit.

### ADR #1 summary

Chose Module Federation over:
- **single-spa** — good lifecycle orchestration but not a module loader; needs MF underneath anyway. Adopted its `mount/unmount` conventions without pulling in the full framework.
- **iframes** — strongest isolation but `postMessage` comms, layout complexity, and full browsing context per MFE killed the tradeoff.

Full ADR: `shell/docs/ADR-001-module-federation-over-single-spa.md`

---

## Phase 3 — CI Pipelines + Independent Deploy ✅

> Completed: 2026-05-13

### What was built

- **GitHub Actions workflows** — one per MFE + shell, path-filtered so only changed MFE's pipeline runs
- **`scripts/patch-manifest.js`** — post-deploy script that updates one MFE entry in `remoteEntry.json`, saves history
- **`scripts/rollback-manifest.js`** — reverts manifest entry to previous version; shell picks up on next navigation
- **`shell/public/manifest-history.json`** — append-only log of previous manifest states (last 10 per MFE)
- **ADR #2** — `shell/docs/ADR-002-manifest-as-deployment-contract.md`

### CI pipeline per MFE

```
.github/workflows/
├── shell.yml          # triggers on: paths: shell/**
├── mfe-checkout.yml   # triggers on: paths: mfe-checkout/**
├── mfe-analytics.yml  # triggers on: paths: mfe-analytics/**
└── mfe-account.yml    # triggers on: paths: mfe-account/**
```

Each workflow: `checkout → install → build → deploy to Netlify → patch manifest`

Path filters ensure pushing to `mfe-checkout/` only runs the checkout pipeline — other MFEs keep running their cached versions uninterrupted.

### Manifest patch + rollback (local simulation)

```bash
# Simulate a deploy
node scripts/patch-manifest.js checkout http://localhost:3001/remoteEntry.js abc1234

# Rollback instantly
node scripts/rollback-manifest.js checkout
# Shell picks up on next navigation. No redeploy.
```

### Secrets required for Netlify deploy

| Secret | Scope |
|---|---|
| `NETLIFY_AUTH_TOKEN` | repo-level |
| `SHELL_NETLIFY_SITE_ID` | repo-level |
| `CHECKOUT_NETLIFY_SITE_ID` | repo-level |
| `ANALYTICS_NETLIFY_SITE_ID` | repo-level |
| `ACCOUNT_NETLIFY_SITE_ID` | repo-level |

Add when deploying to Netlify (deferred — see Phase 1 notes).

### ADR #2 summary

Manifest over hardcoded URLs because:
- Hardcoded URLs in webpack.config.js require shell rebuild on every MFE URL change
- Build-time composition couples shell CI to every MFE pipeline
- Runtime manifest = full independence — patch one field, live in seconds

Key invariant: always upload bundle to CDN **before** patching manifest. Never the reverse — avoids 404 window.

Full ADR: `shell/docs/ADR-002-manifest-as-deployment-contract.md`

---

## Pending Phases

### Phase 3 — Demo recording
- Record 2-min screen capture: push commit → pipeline runs → manifest patches → shell picks up

### Phase 4 — Polish + Portfolio Docs

## Phase 4 — Polish + Portfolio Docs ✅

> Completed: 2026-05-13

### What was built

- **`README.md`** — architecture diagram, MFE ownership table, run locally, deploy instructions, "what I'd add next" (5 honest production gaps), tech stack table
- **`shell/src/HealthIndicator.jsx`** — dots in nav bar showing per-MFE status (amber=not visited, green=loaded, red=failed)
- **`shell/src/mfeStatus.js`** — lightweight pub/sub store MFELoader writes to, HealthIndicator reads from
- **MFE URL override via localStorage** — dev can override any MFE URL without touching manifest or restarting shell. Set `localStorage.setItem('mfe-override-checkout', 'http://...')` in DevTools console.

### "What I'd add next" (production gaps — from README)

1. Manifest service API — versioned HTTP API with write locking, replaces static JSON
2. Shell health dashboard — per-MFE error rates + live version per environment, aggregated from Sentry
3. CI dependency audit — GitHub Action that blocks PR if MFE bumps singleton dep past shell's accepted range
4. Canary rollout — manifest supports `stable`/`canary` URLs + traffic split weight
5. `create-mfe` CLI — scaffolds + registers + opens PR against manifest in one command

These 5 are genuinely unsolved by any existing MFE framework (single-spa, Piral, qiankun).

### Pending

- Tag `v1.0.0` once pushed to GitHub
- Record 2-min demo video (push commit → CI → manifest patch → shell picks up)

### Phase 5–8 — Product (Month 2–6)
- Manifest service API
- `create-mfe` CLI
- CI dependency audit GitHub Action
- Shell health dashboard
- First real user

---

## Key Architecture Decisions Made So Far

1. **Webpack over Vite** — Module Federation is native Webpack 5. Vite plugin exists (`@originjs/vite-plugin-federation`) but is community-maintained with edge cases. Vite-first support is a Phase 5 differentiator, not Phase 1 foundation.

2. **Manifest over hardcoded remotes** — No MFE URL in webpack config. Manifest fetched at runtime = instant deploy without shell rebuild.

3. **mount/unmount contract for non-React 18 MFEs** — Vue and React 17 both use the same framework-agnostic interface. Shell doesn't need to know which framework a MFE uses.

4. **Separate repos, not monorepo** — Separate repos = separate CI pipelines = true independent deployability. Monorepo would fake it.

5. **CSS Modules as default isolation** — Build-time hashed classnames, zero runtime overhead. Shadow DOM available for stronger boundary when needed.
