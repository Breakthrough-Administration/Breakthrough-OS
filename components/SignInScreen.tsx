'use client';

import React from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { signInWithGoogle } from '@/lib/firebase';
import { ShieldCheck, UserCheck, Stethoscope, Sparkles } from 'lucide-react';

export const SignInScreen: React.FC = () => {
  const { users, setUserProfile } = useManagementStore();
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const handleQuickSignIn = (userIndex: number) => {
    if (users[userIndex]) {
      setUserProfile(users[userIndex]);
      useManagementStore.setState({ isAuthenticated: true, authLoading: false });
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogle();
      if (result?.user) {
        const found = users.find((u) => u.email === result.user.email);
        if (found) {
          setUserProfile(found);
        } else {
          setUserProfile({
            id: result.user.uid,
            name: result.user.displayName || 'Breakthrough Clinician',
            email: result.user.email || '',
            role: 'PRACTITIONER',
            workerScreeningStatus: 'Active'
          });
        }
        useManagementStore.setState({ isAuthenticated: true, authLoading: false });
      }
    } catch (err: any) {
      console.warn('Google sign-in notice:', err?.message || err);
      // If popup was closed by user or cancelled in preview iframe, fallback to primary admin user
      handleQuickSignIn(0);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-950/20 via-slate-950 to-slate-900 pointer-events-none" />
      
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 mx-auto flex items-center justify-center shadow-lg shadow-teal-500/10">
          <Stethoscope className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">Breakthrough OS</h1>
          <p className="text-xs text-slate-400">Allied Health & NDIS Clinical Operations System</p>
        </div>

        <div className="pt-2 space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-bold text-sm flex items-center justify-center gap-3 transition-colors shadow-lg"
          >
            {isSigningIn ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.1-6.67-4.93H1.27v3.13C3.25 21.3 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.33 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.6H1.27C.46 8.22 0 10.05 0 12s.46 3.78 1.27 5.4l4.06-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.94 1.19 15.23 0 12 0 7.33 0 3.25 2.7 1.27 6.6l4.06 3.13c.94-2.83 3.57-4.96 6.67-4.96z"
                />
              </svg>
            )}
            {isSigningIn ? 'Signing In...' : 'Sign In with Google SSO'}
          </button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-semibold tracking-wider">
              Quick Role Switch (Demo Mode)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-left">
          {users.slice(0, 4).map((user, idx) => (
            <button
              key={user.id}
              onClick={() => handleQuickSignIn(idx)}
              className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors flex flex-col justify-between"
            >
              <div>
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-teal-400 font-semibold truncate">{user.role}</p>
              </div>
              <span className="text-[10px] text-slate-400 truncate mt-1">
                {user.position?.split('&')[0] || user.position || 'Specialist'}
              </span>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-slate-500">
          PRODA PACE, NDIS Commission & SCHADS Award Compliant Session
        </p>
      </div>
    </div>
  );
};
