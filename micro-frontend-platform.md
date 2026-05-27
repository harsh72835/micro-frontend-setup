# Micro-Frontend Platform — Complete Reference

> Everything from the design session: architecture, runtime isolation, version conflict handling, independent deployability, existing solutions comparison, portfolio vs product tradeoffs, and the phased roadmap.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Runtime Isolation](#2-runtime-isolation)
3. [Version Conflict Handling](#3-version-conflict-handling)
4. [Independent Deployability](#4-independent-deployability)
5. [Existing Solutions](#5-existing-solutions)
6. [Portfolio vs Real Product](#6-portfolio-vs-real-product)
7. [Where You Can Differentiate](#7-where-you-can-differentiate)
8. [Phased Roadmap](#8-phased-roadmap)

---

## 1. Architecture Overview

### Core Topology

```
┌─────────────────────────────────────────────────────────┐
│                    Shell Application                     │
│        Module Federation host · owns routing,            │
│              auth, global state · v2.1.0                 │
└───────────────┬─────────────────────────────────────────┘
                │  dynamic import() + manifest lookup
                ▼
┌───────────────┬───────────────┬─────────────────────────┐
│  Checkout MFE │ Analytics MFE │      Account MFE         │
│  Team:Commerce│  Team: Data   │   Team: Platform         │
│  React 18     │  Vue 3        │   React 17               │
│  v3.7.2 · Live│  v1.2.0 · Live│   v4.0.1 · Canary        │
└───────────────┴───────────────┴─────────────────────────┘
        │                   │                   │
┌───────────────────────────────────────────────────────┐
│  Manifest CDN  │  Shared event bus  │  CI / Registry   │
│ remoteEntry.json│ CustomEvent/BC    │ Independent pipes │
└───────────────────────────────────────────────────────┘
```

### Key Principles

- Each MFE is a **separate deployable** with its own CI pipeline.
- The shell uses **Webpack Module Federation** to lazy-load MFEs at runtime via `remoteEntry.js` — no rebuild of the host required.
- No MFE has direct import dependencies on another MFE.
- Cross-MFE communication flows only through a **shared event bus** (`CustomEvent` or `BroadcastChannel`).
- Auth tokens, user context, and feature flags pass through a typed `AppContext` prop — never via `window.*` globals.

### `remoteEntry.json` — Manifest Shape

```json
{
  "checkout":  { "version": "3.7.2", "url": "https://cdn.co/checkout/3.7.2/remoteEntry.js",  "scope": "checkout"  },
  "analytics": { "version": "1.2.0", "url": "https://cdn.co/analytics/1.2.0/remoteEntry.js", "scope": "analytics" },
  "account":   { "version": "4.0.1", "url": "https://cdn.co/account/4.0.1/remoteEntry.js",   "scope": "account"   }
}
```

The shell never hardcodes remote URLs. It reads the manifest on every navigation — a freshly deployed MFE is live immediately with no shell restart.

---

## 2. Runtime Isolation

### JS Scope Isolation

- Module Federation wraps each remote in its own `__webpack_require__` registry.
- No globals leak between MFEs unless explicitly listed in the `shared` config.
- Multiple MFEs can load simultaneously without module graph collisions.

### CSS Isolation

| Strategy | How | When to use |
|---|---|---|
| **CSS Modules** | Build-time hashed classnames (`.btn_3xK9a`) | Default — zero runtime overhead |
| **Shadow DOM** | MFE wrapped as a Web Component | Strongest boundary; some DX cost |
| **Scoped prefix** | BEM prefix per MFE (`checkout-btn`) | Simple fallback for legacy MFEs |

### State Isolation

- Each MFE owns its own Redux / Zustand / Pinia store.
- Cross-MFE state flows **only** via the shared event bus — no direct store access.
- The shell passes a typed `AppContext` (auth, flags, user) as a prop to each MFE mount.

### Error Isolation

- Every MFE mount point is wrapped in a **React Error Boundary** (or equivalent).
- A crash in Checkout does not unmount the shell or Analytics.
- Load failures show an isolated skeleton with exponential-backoff retries.
- The shell logs failures to monitoring without propagating the error upward.

### Scope Snapshot

```
Shell scope          Checkout MFE scope    Analytics MFE scope
─────────────────    ──────────────────    ───────────────────
authToken  <shared>  cartState    local    chartData  local
featureFlags <shared> paymentMethod local  filters    local
cartState  → ✗       authState    → ✗     cartState  → ✗
```

---

## 3. Version Conflict Handling

### Dependency Matrix

| Dependency | Version | Strategy | Notes |
|---|---|---|---|
| React | 18.2 | **Singleton** — shared | Shell + Checkout share one instance |
| React | 17.0 | **Isolated bundle** | Account MFE — incompatible range, safe coexistence |
| Vue | 3.4 | **Separate runtime** | Analytics MFE — zero conflict with React |
| lodash | 4.x | **Non-singleton** shared | All MFEs, tree-shaken independently |

### Resolution Strategies

**1. Singleton sharing with version range**

```js
// webpack.config.js (shell and each MFE)
shared: {
  react: { singleton: true, requiredVersion: '^18', eager: true },
  'react-dom': { singleton: true, requiredVersion: '^18', eager: true },
}
```

Module Federation picks the highest compatible version at runtime. All consumers share one instance.

**2. Isolated bundle fallback**

When versions are truly incompatible (React 17 vs 18), each MFE bundles its own copy. The `__webpack_require__` registries don't overlap — no prototype chain collision.

**3. Import map override for local dev**

Use the `import-map-overrides` browser extension to point any MFE's remote URL to `localhost:3001` without modifying the shell. Zero-config local iteration across teams.

**4. CI dependency audit**

A shared pipeline step compares each MFE's `shared` manifest against the shell's expected ranges on every PR. Incompatible bumps block the merge before they reach runtime.

---

## 4. Independent Deployability

### Deploy Flow (Checkout example)

```
1. Code push       →  checkout/main
2. CI pipeline     →  lint → test → build  (other pipelines untouched)
3. Bundle upload   →  remoteEntry.js + chunks/*.js → CDN
4. Manifest patch  →  remoteEntry.json: "checkout" → "3.7.3"
5. Live            →  shell reads new manifest on next navigation
                      No shell rebuild. No downtime.
```

### Why the Manifest Is the Contract

- The shell re-fetches the manifest on every navigation (short TTL + stale-while-revalidate).
- Deploying a new MFE version = patching one field in the manifest.
- Rolling back = reverting that patch. Instant. No redeploy.
- Other MFEs keep running their cached versions uninterrupted.

### Rollback in Practice

```bash
# Deploy new version
curl -X PATCH /manifest/prod/checkout \
  -d '{ "version": "3.7.3", "url": "https://cdn.co/checkout/3.7.3/remoteEntry.js" }'

# Rollback
curl -X POST /manifest/prod/checkout/rollback
# → reverts to 3.7.2 instantly
```

---

## 5. Existing Solutions

### Landscape

| Solution | Stars | Integration type | Framework | Key gap |
|---|---|---|---|---|
| **single-spa** | 13.8k | Runtime, SystemJS | Agnostic | No manifest/registry service |
| **Module Federation** | Built-in | Runtime, Webpack 5 | Agnostic | Bundler feature only — no platform |
| **Piral** | ~1.7k | Runtime | React only | Pilet model, smaller community |
| **OpenComponents** | ~1.5k | API-driven registry | Agnostic | Older architecture, slower momentum |
| **Luigi (SAP)** | ~1.2k | iframe-based | Agnostic | iframe perf/UX overhead |
| **qiankun** | ~15k | single-spa wrapper | Agnostic | Primarily Chinese ecosystem, slowing |

### Feature Gap Matrix

| Feature | single-spa | Module Fed. | Piral | Your product |
|---|---|---|---|---|
| Framework agnostic | ✓ | ✓ | ✗ (React) | ✓ |
| Manifest / registry | ✗ | ✗ | partial | ✓ versioned API |
| Onboarding CLI | partial | ✗ | partial | ✓ scaffold + register |
| Runtime isolation | partial | ✓ | ✓ | ✓ scope + Shadow DOM |
| Independent deploy | ✓ | ✓ | ✓ | ✓ + instant rollback |
| Shell health UI | ✗ | ✗ | ✗ | ✓ (to build) |
| CI dep audit | ✗ | ✗ | ✗ | ✓ (to build) |
| Shared design tokens | ✗ | ✗ | partial | ✓ npm package |
| Vite support | partial | partial | ✗ | ✓ first-class |
| Breaking change policy | manual | manual | manual | ✓ CI gate |

### Strategic Takeaway

None of the existing tools give you a manifest service, a shell health dashboard, a dependency audit CI step, or one-command onboarding. Those gaps are all unsolved and all genuinely painful in real multi-team setups.

The smartest position: treat **single-spa + Module Federation as primitives** and build the operational layer they don't have on top. Your product isn't competing with single-spa — it's completing it.

---

## 6. Portfolio vs Real Product

### Side-by-Side

| Dimension | Portfolio / Resume | Real Product |
|---|---|---|
| **Goal** | Demonstrate architectural thinking | Give other teams a platform they can depend on |
| **Audience** | Interviewers, senior engineers on GitHub | Frontend teams at your company or open-source users |
| **Scope** | 3 demo MFEs, fake data is fine | Shell + manifest service + onboarding CLI + real routing |
| **Auth / infra** | None required. Vercel/Netlify free tier. | JWT propagation, env-aware manifests, CDN invalidation |
| **Version conflicts** | One concrete example + README section | Automated CI check, semver policy, deprecation warnings |
| **Error isolation** | Error boundary + crash button + GIF | Error boundaries + Sentry per MFE + shell health dashboard |
| **CI / CD** | One GitHub Actions workflow per repo | Shared pipeline template, canary rollout, instant rollback |
| **Documentation** | README + decisions log + "what I'd add next" | Onboarding guide, MFE contract spec, migration guide, changelog |
| **Time** | 2–4 weeks part-time | 3–6 months for a trustworthy v1 |
| **What makes it strong** | The decisions log | The onboarding experience — new team ships in under a day |

### Key Differences in the Operational Layer

| Concern | Portfolio | Product |
|---|---|---|
| Manifest service | JSON file on CDN | Versioned API + cache busting |
| Onboarding a new MFE | Edit config manually | CLI scaffolds + registers |
| Rollback strategy | Redeploy last build | Manifest patch, instant |
| Shared design system | CSS variables, minimal | Published npm package, versioned |
| Monitoring | Console logs, screenshots | Sentry + shell health UI |
| Breaking change policy | README note | CI gate + deprecation cycle |

### Which to Choose

**Build as portfolio if:**
- You're job hunting or targeting a senior/architect role
- You want something completable in a few weeks
- No real team is depending on it being live
- The value is in the reasoning, not the uptime

**Build as product if:**
- Your company has 2+ frontend teams shipping independently
- You want open-source traction (needs a real CLI + docs)
- You're willing to own the maintenance and breaking-change comms
- The hard part is the platform UX, not the architecture

---

## 7. Where You Can Differentiate

### 1. Manifest-as-a-service

Every existing solution leaves manifest management to you — typically a JSON file on S3. A lightweight versioned API with staging/prod environments, instant rollback, and a UI to see what's deployed where fills a genuine gap across all existing tools.

### 2. Vite-first Module Federation

single-spa and Piral are Webpack-era. The `@originjs/vite-plugin-federation` plugin exists but has no platform wrapper. A Vite-native MFE platform with zero Webpack config would be genuinely new ground.

### 3. Shell observability layer

No existing tool ships a health dashboard showing which MFEs are live, degraded, or failed per environment. A shell-level status UI with per-MFE error rates would be a strong differentiator.

### 4. CI dependency audit

The version conflict problem is real but nobody automates the guard. A CI action that blocks a PR when an MFE bumps a singleton dep past the shell's accepted range is missing from every framework — and publishable independently to GitHub Marketplace.

### 5. One-command onboarding

`create-single-spa` scaffolds a project but doesn't register it with a shell or generate the manifest entry. A `create-mfe` CLI that scaffolds + registers + opens a PR against the shell manifest would be genuinely useful.

### What Not to Rebuild

Lifecycle hooks, routing, and scope isolation are solved well by single-spa + Module Federation. Build on top — don't rewrite them. Your platform is the operational layer they don't have.

---

## 8. Phased Roadmap

### Phase 1 — Repo structure + shell · Week 1–2

**Goal:** Shell running, one remote loading at runtime, manifest-driven.

**Tasks:**
- [ ] Init 4 repos: `shell`, `mfe-checkout`, `mfe-analytics`, `mfe-account` (separate repos = separate pipelines)
- [ ] Webpack 5 + Module Federation config in shell — expose nothing, consume two remotes
- [ ] React Router v6 in shell — route `/checkout` lazy-loads the Checkout MFE
- [ ] Static `remoteEntry.json` manifest — shell reads this on boot, not hardcoded URLs
- [ ] Deploy shell to Netlify site A, Checkout MFE to Netlify site B. Verify cross-origin load.

**Deliverables:** Shell running · 1 remote loading · Manifest JSON

> **Product seed:** Structure the manifest JSON with `name`, `version`, `url`, `scope` fields now. This exact shape becomes your manifest API response later — no rewrite needed.

---

### Phase 2 — Runtime isolation + version conflicts · Week 3–4

**Goal:** One concrete isolation demo and one concrete version conflict, both documented and demonstrable.

**Tasks:**
- [ ] Checkout MFE: React 18, shared singleton via `shared: { react: { singleton: true, requiredVersion: '^18' } }`
- [ ] Analytics MFE: Vue 3 — completely separate runtime, zero Module Federation sharing with React
- [ ] Account MFE: React 17, `requiredVersion: '^17'` — intentional mismatch, loads own copy. Verify two React instances coexist without prototype chain collision.
- [ ] CSS isolation: CSS Modules on all MFEs. Add one intentional class name collision to prove isolation.
- [ ] Error boundaries on every MFE mount point. Add a "crash this MFE" button. GIF it for the README.
- [ ] Write **ADR #1**: why Module Federation over single-spa or iframes.

**Deliverables:** React 17 + 18 coexisting · Vue 3 MFE · ADR written

> **Product seed:** Extract the shared webpack config into a `mfe-shared-config` package. In the product, this becomes the versioned shared dependency policy that teams pull from npm.

---

### Phase 3 — CI pipelines + independent deploy · Week 5–6

**Goal:** Prove each MFE deploys independently. Push to `mfe-checkout` → only that pipeline runs → manifest updates → shell picks it up with zero rebuild.

**Tasks:**
- [ ] GitHub Actions: one workflow per MFE repo — lint → test → build → deploy to Netlify
- [ ] Shell re-fetches manifest on every route change (short TTL) to pick up new versions without rebuild
- [ ] Post-deploy step patches `remoteEntry.json` and pushes to CDN. Simulate rollback by reverting that patch.
- [ ] Write **ADR #2**: independent deployability model — why the manifest is the contract, not the shell config.
- [ ] Record a 2-min screen capture: push a commit → pipeline runs → live site updates. This is your demo clip.

**Deliverables:** 3 independent pipelines · Demo recording · Instant rollback demonstrated

> **Product seed:** The post-deploy manifest patch step becomes your manifest service API. Write it as a standalone script now — in the product you wrap it in an HTTP handler.

---

### Phase 4 — Polish + portfolio docs · Week 7

**Goal:** Make the project legible to someone who has 5 minutes with your GitHub.

**Tasks:**
- [ ] README: architecture diagram, what each MFE owns, how to run locally, deploy instructions
- [ ] Decisions log: ADR #1 + ADR #2 + "what I'd add to make this production-ready" (at least 5 honest items)
- [ ] Add `import-map-overrides` browser extension support for local dev. One-line setup in README.
- [ ] Add a basic shell health indicator: green dot when all remotes load, red dot when any 404
- [ ] Pin versions everywhere. Tag a `v1.0.0` release. This is your resume link.

**Deliverables:** Resume-ready · ADR log · Health indicator · v1.0.0 tagged

> The decisions log is what actually impresses senior engineers. An honest ADR explaining tradeoffs signals the kind of thinking that senior roles require — and it's genuinely uncommon in portfolio projects.

---

### Phase 5 — Manifest service · Month 2–3

**Goal:** Wrap the manifest patch script from Phase 3 into a real versioned API.

**Tasks:**
- [ ] HTTP API: `GET /manifest/:env` returns current manifest, `PATCH /manifest/:env/:name` updates one MFE entry
- [ ] Version history: every patch appends to an append-only log. Rollback = `POST /manifest/:env/:name/rollback`
- [ ] Multi-env support: `staging` and `prod` manifests are separate. Promote staging → prod via API call.
- [ ] Shell reads from manifest service instead of static CDN file (short TTL + stale-while-revalidate)

**Deliverables:** Manifest API · Rollback endpoint · Staging → prod promotion

---

### Phase 6 — CLI + onboarding · Month 3–4

**Goal:** A new team runs one command and has a working MFE registered against the shell.

**Tasks:**
- [ ] `npm create mfe@latest` — scaffolds MFE repo with webpack config, Module Federation setup, CI workflow pre-wired
- [ ] CLI prompts: MFE name, framework (React/Vue/Svelte), target shell URL, environment (staging/prod)
- [ ] On first deploy, CLI auto-registers the MFE against the manifest service — no manual config needed
- [ ] Publish to npm. Write a "getting started in 10 min" doc. That doc is your open-source landing page.

**Deliverables:** npm package published · One-command scaffold · Auto-registration

---

### Phase 7 — CI dep audit + shell observability · Month 4–5

**Goal:** Build the two features that don't exist in any current tool.

**Tasks:**
- [ ] GitHub Action: on every MFE PR, compare the MFE's `shared` config against the shell's accepted semver ranges. Fail with a clear message if incompatible.
- [ ] Shell health dashboard: per-MFE status (loaded / degraded / failed), version live, last deploy time
- [ ] Error reporting: shell catches MFE load failures and boundary errors, groups by MFE name
- [ ] Publish the CI action to GitHub Marketplace (discoverable independently of the rest of the platform)

**Deliverables:** GitHub Action published · Health dashboard · Error grouping by MFE

---

### Phase 8 — First real user + feedback loop · Month 5–6

**Goal:** Don't build further until someone else is using it.

**Tasks:**
- [ ] Identify one team (internal or external) with 2+ frontend teams who would genuinely benefit
- [ ] Sit with them during onboarding. Note every question, every stumble, every workaround needed.
- [ ] Fix the top 3 friction points. Then ask them to onboard a second MFE without your help.
- [ ] Write a public case study or blog post about what they built. This is your first marketing asset.

**Deliverables:** Real user onboarded · Friction list · Case study published

---

## ADR Template

Use this for ADR #1, #2, and any future decisions.

```markdown
# ADR-001: [Decision title]

## Status
Accepted / Superseded / Deprecated

## Context
What is the problem? What forces are at play?

## Decision
What did you decide to do?

## Consequences
What becomes easier? What becomes harder?
What are the known limitations you're accepting?

## Alternatives considered
What else did you evaluate and why did you reject it?
```

---

## Webpack Module Federation — Quick Reference

### Shell config (`webpack.config.js`)

```js
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    checkout:  'checkout@[manifest.checkout.url]',
    analytics: 'analytics@[manifest.analytics.url]',
    account:   'account@[manifest.account.url]',
  },
  shared: {
    react:     { singleton: true, requiredVersion: '^18', eager: true },
    'react-dom': { singleton: true, requiredVersion: '^18', eager: true },
  },
})
```

### MFE config (e.g. `mfe-checkout/webpack.config.js`)

```js
new ModuleFederationPlugin({
  name: 'checkout',
  filename: 'remoteEntry.js',
  exposes: {
    './App': './src/App',
  },
  shared: {
    react:     { singleton: true, requiredVersion: '^18' },
    'react-dom': { singleton: true, requiredVersion: '^18' },
  },
})
```

### Dynamic manifest loading in shell

```js
async function loadManifest() {
  const res = await fetch('/remoteEntry.json', { cache: 'no-store' });
  return res.json();
}

async function loadMFE(name, manifest) {
  const { url, scope } = manifest[name];
  await loadScript(url);
  const container = window[scope];
  await container.init(__webpack_share_scopes__.default);
  const factory = await container.get('./App');
  return factory();
}
```

---

## Glossary

| Term | Definition |
|---|---|
| **Shell** | The host application. Owns routing, auth, global state. Loads MFEs at runtime. |
| **MFE (Micro-Frontend)** | An independently deployed frontend application that the shell composes into the page. |
| **Module Federation** | Webpack 5 plugin that enables runtime code sharing between separate builds. |
| **remoteEntry.js** | The entry point exposed by each MFE. The shell loads this to access the MFE's exposed modules. |
| **Manifest** | A JSON document mapping MFE names to their current deployed URL and version. |
| **Singleton** | A shared dependency where all MFEs must use the same instance (e.g. React). Enforced via Module Federation `shared` config. |
| **Error boundary** | A React component that catches JavaScript errors in its subtree and renders a fallback UI. |
| **ADR** | Architecture Decision Record — a short doc capturing a significant decision, its context, and its consequences. |
| **Import map overrides** | A browser dev tool allowing developers to redirect any MFE's remote URL to localhost without modifying the shell. |
| **Canary** | A version being tested in production with a subset of traffic before full rollout. |
