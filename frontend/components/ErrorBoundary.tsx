'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-lg font-semibold text-warm-gray">
            Something went wrong
          </h2>
          <p className="max-w-md text-sm text-muted-warm">
            An unexpected error occurred. You can try reloading the page or
            starting a new chat.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="rounded-xl bg-teal-primary px-4 py-2 text-sm font-medium text-white
                         transition-all hover:bg-teal-dark hover:shadow-md"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-warm-border px-4 py-2 text-sm font-medium
                         text-warm-gray transition-all hover:bg-cream-bg"
            >
              Reload Page
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-red-50 p-4 text-left text-xs text-error-red">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
