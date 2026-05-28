import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// Catches React 17 render errors and forwards them to the shell via onError.
// Shell's FrameworkAgnosticWrapper rethraws in its own render so React 18's
// Error Boundary can display the fallback UI.
class ErrorCatcher extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (this.props.onError) this.props.onError(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// React 17 must own its own render — shell uses React 18's createRoot which
// is incompatible. Shell gives us a DOM node; we call ReactDOM.render into it.
export function mount(el, { onError } = {}) {
  ReactDOM.render(
    <ErrorCatcher onError={onError}>
      <App />
    </ErrorCatcher>,
    el
  );
}

export function unmount(el) {
  ReactDOM.unmountComponentAtNode(el);
}
