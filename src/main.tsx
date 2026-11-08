import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
    // Dismiss splash screen in case error happened during mount
    if (typeof (window as any).hidePreReactSplash === 'function') {
      (window as any).hidePreReactSplash();
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Application Notice</h2>
            <p className="text-sm text-slate-400 mb-6">
              A temporary issue occurred while rendering. Click below to reload or reset the view.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/25"
              >
                Reload App
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition-colors border border-slate-700"
              >
                Reset Data
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );

  // Trigger splash dismissal as soon as render is dispatched
  if (typeof (window as any).hidePreReactSplash === 'function') {
    (window as any).hidePreReactSplash();
  }
}

