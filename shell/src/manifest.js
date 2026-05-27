const MANIFEST_URL = '/remoteEntry.json';

let cached = null;

export async function loadManifest() {
  if (cached) return cached;
  const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`);
  cached = await res.json();
  return cached;
}

// Invalidate cache on each navigation so a freshly deployed MFE is picked
// up without a shell restart.
export function invalidateManifest() {
  cached = null;
}
