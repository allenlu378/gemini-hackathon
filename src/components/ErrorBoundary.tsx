import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Error handled cleanly by fallback UI
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-2xl border border-slate-200 bg-[#FAFAFB] text-center space-y-3">
            <h1 className="font-display text-lg font-semibold text-slate-950">
              ClipThat Studio encountered an unexpected error
            </h1>
            <p className="text-sm text-slate-600">
              Your stream connection was paused safely. Reload to rejoin the studio room.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-white rounded-xl transition-colors"
            >
              Reload Studio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
