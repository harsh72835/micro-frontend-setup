// Standalone entry — mounts Vue app when run directly (not via shell).
import { mount } from './bootstrap';

const el = document.getElementById('root');
if (el) mount(el);
