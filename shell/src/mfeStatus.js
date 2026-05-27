// Lightweight pub/sub store for MFE load status.
// MFELoader writes here; HealthIndicator reads here.
// No React context needed — avoids re-rendering the entire tree on status change.

const status = {};
const subscribers = new Set();

export function setStatus(name, state) {
  status[name] = state; // 'loading' | 'loaded' | 'error'
  subscribers.forEach(fn => fn({ ...status }));
}

export function subscribe(fn) {
  subscribers.add(fn);
  fn({ ...status }); // emit current state immediately on subscribe
  return () => subscribers.delete(fn);
}
