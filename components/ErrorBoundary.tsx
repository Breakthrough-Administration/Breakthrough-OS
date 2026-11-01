'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isChunkError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const msg = error?.message || '';
    const isChunk =
      msg.includes('Loading chunk') ||
      msg.includes('Unexpected token') ||
      error.name === 'ChunkLoadError';
    return { hasError: true, error, isChunkError: isChunk };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);

    // Auto-reload once if an outdated webpack chunk was requested after dev rebuild
    const msg = error?.message || '';
    const isChunk =
      msg.includes('Loading chunk') ||
      msg.includes('Unexpected token') ||
      error.name === 'ChunkLoadError';

    if (isChunk && typeof window !== 'undefined') {
      const reloadKey = 'aistudio_chunk_reload_ts';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      // Allow one auto-reload every 10 seconds max to prevent infinite loops
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(reloadKey, now.toString());
        console.warn('Auto-reloading page to fetch latest deployed bundle chunks...');
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, isChunkError: false });
  };

  private handleHardReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-4">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-lg font-bold">
              {this.props.fallbackName || 'Component'} Encountered an Issue
            </h2>
          </div>
          <p className="text-sm text-slate-300">
            {this.state.isChunkError
              ? 'An updated application version was deployed. Reloading the page will load the fresh scripts.'
              : this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Module</span>
            </button>
            {this.state.isChunkError && (
              <button
                onClick={this.handleHardReload}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
