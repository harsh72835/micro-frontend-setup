import { createApp } from 'vue';
import App from './App.vue';

// Shell calls mount(el) — framework-agnostic contract.
// Returns the Vue app instance so shell can unmount on route change.
export function mount(el) {
  const app = createApp(App);
  app.mount(el);
  return app;
}

export function unmount(app) {
  if (app) app.unmount();
}
