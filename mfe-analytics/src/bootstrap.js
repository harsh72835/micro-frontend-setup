import { createApp } from 'vue';
import App from './App.vue';

// Shell calls mount(el) — framework-agnostic contract.
// Returns the Vue app instance so shell can unmount on route change.
export function mount(el, { onError } = {}) {
  const app = createApp(App);
  if (onError) app.config.errorHandler = (err) => onError(err);
  app.mount(el);
  return app;
}

export function unmount(app) {
  if (app) app.unmount();
}
