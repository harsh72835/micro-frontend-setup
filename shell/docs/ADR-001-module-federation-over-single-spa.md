# ADR-001: Module Federation over single-spa or iframes

## Status
Accepted

## Context

This platform needs to load independently deployed MFEs into a shell at runtime,
with no shell rebuild when an MFE updates. Three approaches were evaluated:

1. **Webpack Module Federation** — Webpack 5 plugin enabling runtime code sharing between separate builds
2. **single-spa** — routing and lifecycle orchestration layer for MFEs
3. **iframes** — hard browser-native isolation via separate browsing contexts

## Decision

Use **Webpack Module Federation** as the primary integration mechanism.

## Consequences

**Easier:**
- Shell lazy-loads any MFE via `import()` from a remote URL — no rebuild required
- Shared singletons (React, react-router-dom) are negotiated at runtime — one instance across compatible MFEs
- Incompatible versions (React 17 vs 18) fall back to isolated bundles automatically — coexistence without prototype chain collision
- The `remoteEntry.js` + manifest pattern gives a clean deployment contract: change one field, new MFE is live
- CSS Modules and scoped Vue styles handle style isolation without runtime overhead

**Harder:**
- Webpack 5 is required — Vite support requires a community plugin (`@originjs/vite-plugin-federation`) with known edge cases
- Singleton misconfigurations (missing `eager: true`, wrong version ranges) cause silent runtime failures that are hard to debug
- The `__webpack_require__` scope isolation is Webpack-specific — non-Webpack remotes need a compatibility shim

**Limitations accepted:**
- Framework-agnostic MFEs (Vue, Svelte) cannot be treated as React components — they require a `mount/unmount` contract and a ref'd DOM container
- Module Federation does not ship a manifest service, health dashboard, or CI dependency audit — these are built on top

## Alternatives considered

**single-spa:**
Considered as the primary integration layer. single-spa is excellent for lifecycle orchestration
(bootstrap, mount, unmount) but it is a framework, not a module loader. It has no built-in
mechanism for runtime code sharing or singleton negotiation — that still requires SystemJS or
Module Federation underneath. Using single-spa alone would mean managing two separate systems.
Decision: use Module Federation as the module loader and adopt single-spa's lifecycle conventions
(mount/unmount exports) for framework-agnostic MFEs without pulling in the full framework.

**iframes:**
Provides the strongest isolation boundary — each MFE runs in a separate browsing context
with its own JS heap, CSS scope, and storage. However:
- Cross-frame communication requires `postMessage` — verbose and untyped
- Shared auth tokens and feature flags cannot be passed as typed props
- Layout integration is awkward — iframe height must be managed manually
- Performance cost: each iframe is a full browsing context
Decision: rejected. Isolation benefit does not outweigh the communication and UX cost
for an integrated shell UI.
