import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div role="alert" className="p-12"><h1>Something went wrong.</h1><p>Your saved data has not been reset.</p><button onClick={() => window.location.reload()}>Reload workspace</button></div> : this.props.children;
  }
}
