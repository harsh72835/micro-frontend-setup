import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Only mounts when run standalone (not when loaded by the shell).
// Shell imports ./App directly — this entry is for isolated dev/testing.
const el = document.getElementById('root');
if (el) createRoot(el).render(<App />);
