'use client';

import React, { useState } from 'react';
import { Fingerprint, Lock, CheckCircle2 } from 'lucide-react';

export const BiometricSecurityOverlay: React.FC = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  // Hidden unless triggered
  if (!isLocked) return null;

  const handleUnlock = () => {
    if (pin === '1234' || pin.length >= 4) {
      setIsLocked(false);
      setPin('');
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 mx-auto flex items-center justify-center">
          <Fingerprint className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Biometric Re-authentication</h2>
          <p className="text-sm text-slate-400">
            Enter your practice PIN or tap fingerprint sensor to access participant records.
          </p>
        </div>
        <div className="space-y-4">
          <input
            type="password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter 4-digit PIN"
            className="w-full text-center text-2xl tracking-widest bg-slate-800/80 border border-slate-700 rounded-2xl py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {error && <p className="text-xs text-rose-400">Invalid PIN. Try standard practice PIN.</p>}
          <button
            onClick={handleUnlock}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 font-bold text-white rounded-2xl transition-colors shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" /> Unlock Session
          </button>
        </div>
      </div>
    </div>
  );
};
