# ADR-002: Manifest as the Deployment Contract

## Status
Accepted

## Context

Webpack Module Federation requires the shell to know the URL of each remote's `remoteEntry.js`.
There are three ways to provide this:

1. **Hardcode URLs in `webpack.config.js`** — URLs are baked into the shell bundle at build time
2. **Build-time composition** — shell CI pulls each MFE's latest build artefact before building
3. **Runtime manifest** — shell fetches a JSON file at runtime that maps MFE names to deployed URLs

The core requirement: a new MFE version must go live without rebuilding or redeploying the shell.

## Decision

Use a **runtime manifest** (`remoteEntry.json`) as the single source of truth for what version
of each MFE is deployed and where.

The shell fetches the manifest on every navigation (short TTL, stale-while-revalidate).
Deploying a new MFE version means patching one field in the manifest — the shell never needs
to know in advance.

## Consequences

**Easier:**
- MFE teams deploy fully independently — no coordination with the shell team required
- Rollback is instant: revert one manifest field, shell picks it up on the next route change
- The manifest becomes an audit log: version + URL per MFE visible in one place
- Manifest shape is stable — `{ name, version, url, scope }` — making it straightforward to
  wrap in an HTTP API later (Phase 5) without changing the shell's consumption code
- Multiple environments (staging, prod) can each have their own manifest with no shell changes

**Harder:**
- The manifest is a new runtime dependency — if the manifest fetch fails, no MFEs load.
  Mitigated by: stale-while-revalidate caching, fallback to last known good manifest in localStorage.
- Manifest and MFE bundle can get out of sync during a deploy window (manifest updated before
  bundle is live, or vice versa). Mitigated by: always upload bundle first, patch manifest second.
- Developers must remember to patch the manifest after each deploy — automated in CI (Phase 3)
  so this is not a manual step in practice.

**Limitations accepted:**
- The manifest is currently a static JSON file. Under high write concurrency (many teams deploying
  simultaneously) this could cause race conditions. Accepted for now; Phase 5 replaces it with
  a versioned API with optimistic locking.

## Alternatives considered

**Hardcoded URLs in webpack.config.js:**
Simple but breaks independent deployability. Every MFE URL change requires a shell rebuild and
redeploy. This couples MFE release cadence to the shell release cadence — exactly what MFEs
are supposed to avoid. Rejected.

**Build-time composition:**
Shell CI fetches each MFE's latest build before compiling. Closer to the monolith model.
Any MFE build failure blocks the shell deploy. Requires the shell pipeline to be aware of
every MFE — tight coupling via CI instead of webpack config, but still coupling. Rejected.

## The deploy flow this enables

```
1. Push to mfe-checkout/main
2. Only the mfe-checkout CI pipeline runs (path filter)
3. Bundle uploads to CDN
4. CI patches manifest: "checkout" → new URL + version
5. Shell reads new manifest on next navigation
   No shell rebuild. No downtime. Other MFEs unaffected.

Rollback:
   node scripts/rollback-manifest.js checkout
   → reverts manifest entry
   → shell picks up on next navigation
   → takes < 5 seconds end to end
```
