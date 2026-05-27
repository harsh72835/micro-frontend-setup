import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// React 17 uses ReactDOM.render (not createRoot — that's React 18).
const el = document.getElementById('root');
if (el) ReactDOM.render(<App />, el);
