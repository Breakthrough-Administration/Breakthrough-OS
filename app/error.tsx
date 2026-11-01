'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error captured:', error);
  }, [error]);

  return (
    <div id="app-error-boundary-view" className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Application Error</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error?.message || 'A transient error occurred while loading this view.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            id="error-reset-button"
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition-colors shadow-lg shadow-teal-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          
          <button
            id="error-home-button"
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-colors border border-slate-700"
          >
            <Home className="w-4 h-4" />
            <span>Reload Hub</span>
          </button>
        </div>
      </div>
    </div>
  );
}
