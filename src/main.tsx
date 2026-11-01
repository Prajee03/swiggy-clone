import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  private handleReset = () => {
    try {
      window.localStorage.removeItem('swiggy_real_cart_v1');
      window.localStorage.removeItem('swiggy_real_coupon_v1');
      window.localStorage.removeItem('swiggy_static_store_v1');
    } catch {
      // ignore storage restrictions
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-6 text-on-surface">
          <div className="max-w-sm w-full rounded-2xl bg-surface-container-lowest p-6 shadow-lg text-center space-y-4">
            <h1 className="font-display font-bold text-lg">Refreshing App State</h1>
            <p className="text-xs text-on-surface-variant">
              Saved browser data needed a quick reset to load the menu cleanly.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 rounded-xl bg-primary-container text-on-primary font-bold text-sm"
            >
              Reload Swiggy
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
