import React, { useEffect, useState, useRef } from 'react';
import { loadManifest, invalidateManifest } from './manifest';
import { loadMFE } from './loadMFE';
import { setStatus } from './mfeStatus';

class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(`[MFE:${this.props.mfeName}] crashed`, error);
    setStatus(this.props.mfeName.toLowerCase(), 'error');
  }

  render() {
    if (this.state.error) {
      return (
        <div style={styles.error}>
          <strong>{this.props.mfeName}</strong> crashed.
          <br />
          <code>{this.state.error.message}</code>
          <br />
          <button onClick={() => this.setState({ error: null })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function FrameworkAgnosticWrapper({ mod, mfeName }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const instance = mod.mount(el);
    // Vue returns an app instance; React 17 returns nothing (unmount via el).
    return () => mod.unmount(instance ?? el);
  }, [mod]);

  return <div ref={containerRef} />;
}

export default function MFELoader({ scope, module: modulePath, mfeName }) {
  const [mod, setMod] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStatus(scope, 'loading');
    invalidateManifest();
    let cancelled = false;

    async function load() {
      try {
        const manifest = await loadManifest();
        const entry = manifest[scope];
        if (!entry) throw new Error(`"${scope}" not found in manifest`);

        // Check localStorage for dev overrides (import-map-overrides equivalent).
        // Set via: localStorage.setItem('mfe-override-checkout', 'http://localhost:3001/remoteEntry.js')
        const override = localStorage.getItem(`mfe-override-${scope}`);
        window.__MFE_URLS__ = window.__MFE_URLS__ || {};
        window.__MFE_URLS__[scope] = override || entry.url;
        if (override) console.info(`[MFE:${scope}] URL overridden → ${override}`);

        const loaded = await loadMFE(scope, modulePath);
        if (!cancelled) {
          setMod(loaded);
          setStatus(scope, 'loaded');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setStatus(scope, 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [scope, modulePath]);

  if (loading) return <div style={styles.skeleton}>Loading {mfeName}…</div>;
  if (error) return (
    <div style={styles.error}>
      <strong>{mfeName}</strong> failed to load: <code>{error.message}</code>
    </div>
  );

  const isFrameworkAgnostic = typeof mod.mount === 'function';

  return (
    <ErrorBoundary mfeName={mfeName}>
      {isFrameworkAgnostic
        ? <FrameworkAgnosticWrapper mod={mod} mfeName={mfeName} />
        : React.createElement(mod.default ?? mod)
      }
    </ErrorBoundary>
  );
}

const styles = {
  skeleton: { padding: '2rem', color: '#888', fontStyle: 'italic' },
  error: {
    padding: '2rem',
    background: '#fff0f0',
    border: '1px solid #ffcccc',
    borderRadius: '6px',
    color: '#c00',
    lineHeight: 1.8,
  },
};
