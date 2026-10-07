import { Component } from 'react';
export default class RouteErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="app-loading-screen"><h1>This page could not load.</h1><p>Reload to try again. Your current address will be preserved.</p><button className="btn-primary" type="button" onClick={() => window.location.reload()}>Reload page</button><a href="/">Go to home</a></main>;
    return this.props.children;
  }
}
