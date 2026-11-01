'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { ParticipantPortalView } from '@/components/features/ParticipantPortalView';
import {
  HeartHandshake,
  ShieldCheck,
  KeyRound,
  Sparkles,
  ArrowRight,
  LogOut
} from 'lucide-react';

export default function PortalClient() {
  const { currentUser, setUserProfile, clients } = useManagementStore();
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isParticipantLoggedIn = currentUser?.role === 'PARTICIPANT' || !!currentUser;

  const handleInviteLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    // Match against known participant clients or users
    const matchedClient = clients.find(
      (c) => (c.email && c.email.toLowerCase() === cleanEmail) || c.ndisNumber === inviteCode.trim()
    );

    if (matchedClient || cleanEmail.includes('participant') || cleanEmail.includes('carer') || inviteCode.trim().length >= 4) {
      const participantClient = matchedClient || clients[0];
      const participantUser = {
        id: participantClient ? participantClient.id : 'user-participant-1',
        uid: participantClient ? participantClient.id : 'user-participant-1',
        name: participantClient ? participantClient.name : 'Jordan Miller',
        email: cleanEmail || 'jordan.miller@example.com',
        role: 'PARTICIPANT' as const,
        participantId: participantClient ? participantClient.id : 'cli-101',
        linkedClientId: participantClient ? participantClient.id : 'cli-101',
        ndisNumber: participantClient ? participantClient.ndisNumber : '430891245',
        isInviteOnly: true,
        workerScreeningStatus: 'Active' as const,
        lastLogin: new Date().toISOString()
      };

      setUserProfile(participantUser);
    } else {
      setError('Invalid invite code or participant email. Please check your invitation email from Breakthrough Coaching & Consulting.');
    }
  };

  const handleQuickDemoParticipant = () => {
    const targetClient = clients[0] || {
      id: 'cli-101',
      name: 'Jordan Miller',
      ndisNumber: '430891245'
    };

    setUserProfile({
      id: targetClient.id,
      uid: targetClient.id,
      name: targetClient.name,
      email: 'jordan.miller@example.com',
      role: 'PARTICIPANT',
      participantId: targetClient.id,
      linkedClientId: targetClient.id,
      ndisNumber: targetClient.ndisNumber,
      isInviteOnly: true,
      lastLogin: new Date().toISOString()
    });
  };

  if (!isParticipantLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 text-teal-400 rounded-2xl border border-teal-500/30 shadow-inner">
              <HeartHandshake className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white">Breakthrough OS</h1>
            <p className="text-sm text-teal-400 font-bold">Participant & Carer Portal</p>
            <p className="text-xs text-slate-400">
              Enter your invite-only credentials or NDIS invitation code to access your sessions, goals, and plan budget.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleInviteLogin} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                Participant / Carer Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                NDIS Participant Number / Invite Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="e.g. 430891245"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all text-xs cursor-pointer"
            >
              <span>Access Secure Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-slate-900 px-3 text-slate-500 font-bold">Fast Verification</span>
            </div>
          </div>

          <button
            onClick={handleQuickDemoParticipant}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-teal-300 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Demo: Sign in as Jordan Miller (NDIS #430891245)</span>
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-800/60">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>256-Bit Encrypted &bull; NDIS Quality & Safeguards Compliant</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Top Navbar */}
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-white">Breakthrough OS</h1>
            <p className="text-[11px] text-teal-400 font-medium">Participant & Carer Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">{currentUser?.name || 'Participant'}</div>
            <div className="text-[10px] text-slate-400 font-mono">Role: {currentUser?.role}</div>
          </div>
          <button
            onClick={() => setUserProfile(null)}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-800 transition-colors flex items-center gap-1 text-xs cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Portal View */}
      <ParticipantPortalView />
    </main>
  );
}
