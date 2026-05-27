import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// React 17 must own its own render — shell uses React 18's createRoot which
// is incompatible. Shell gives us a DOM node; we call ReactDOM.render into it.
export function mount(el) {
  ReactDOM.render(<App />, el);
}

export function unmount(el) {
  ReactDOM.unmountComponentAtNode(el);
}
