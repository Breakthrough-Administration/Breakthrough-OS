'use client';

import React from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const OfflineToast: React.FC = () => {
  const { isOnline, syncStatus, pendingChangesCount, triggerDeltaSync, simulateOfflineToggle } =
    useManagementStore();

  if (isOnline && syncStatus === 'synced' && pendingChangesCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-slate-100 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div
        className={`p-2 rounded-xl flex-shrink-0 ${
          !isOnline ? 'bg-amber-500/20 text-amber-400' : 'bg-teal-500/20 text-teal-400'
        }`}
      >
        {!isOnline ? <WifiOff className="w-5 h-5" /> : <RefreshCw className="w-5 h-5 animate-spin" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {!isOnline ? 'Field Offline Mode' : 'Syncing Cloud Ledger'}
        </p>
        <p className="text-sm text-slate-200 mt-0.5">
          {!isOnline
            ? `${pendingChangesCount} changes queued locally in encrypted delta storage.`
            : `Synchronizing clinical notes and NDIS billing with cloud.`}
        </p>
        <div className="mt-2 flex items-center gap-2">
          {isOnline && pendingChangesCount > 0 && (
            <button
              onClick={() => triggerDeltaSync()}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Sync Now
            </button>
          )}
          <button
            onClick={() => simulateOfflineToggle()}
            className="text-xs text-slate-400 hover:text-white underline underline-offset-2"
          >
            {!isOnline ? 'Simulate Reconnect' : 'Simulate Offline'}
          </button>
        </div>
      </div>
    </div>
  );
};
