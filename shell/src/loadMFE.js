// Dynamically loads a remote MFE from a URL resolved via the manifest.
// This avoids hardcoding remote URLs in webpack.config.js — the manifest
// is the single source of truth for what version of each MFE is live.
export async function loadMFE(scope, module) {
  const url = window.__MFE_URLS__?.[scope];
  if (!url) throw new Error(`No URL found in manifest for scope: ${scope}`);

  // Inject the remote script if not already loaded.
  if (!document.querySelector(`script[data-mfe="${scope}"]`)) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.dataset.mfe = scope;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load MFE script: ${url}`));
      document.head.appendChild(script);
    });
  }

  const container = window[scope];
  await container.init(__webpack_share_scopes__.default);
  const factory = await container.get(module);
  return factory();
}
