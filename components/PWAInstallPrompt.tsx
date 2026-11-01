'use client';

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-sm bg-slate-900 border border-teal-500/30 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3 text-white">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white">Install Breakthrough OS</h4>
          <p className="text-[11px] text-slate-400">Offline clinical access on mobile & desktop</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="text-xs px-3 py-1.5 bg-teal-600 hover:bg-teal-500 rounded-xl font-bold transition-colors"
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-1.5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
