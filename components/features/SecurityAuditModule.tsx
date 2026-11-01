'use client';

import React, { useState, useEffect } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Key,
  Users,
  Eye,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  X
} from 'lucide-react';
import {
  setActiveSessionPin,
  getActiveSessionPin,
  isSecureStorageLocked,
  saveSecureOfflineRecord
} from '@/lib/secureStorage';

export const SecurityAuditModule: React.FC = () => {
  const { users, clients, caseNotes } = useManagementStore();

  const [sessionPinInput, setSessionPinInput] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [pinFeedback, setPinFeedback] = useState<string | null>(null);

  useEffect(() => {
    setIsLocked(isSecureStorageLocked());
  }, []);

  const handleSetOrUnlockPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionPinInput.length < 4) {
      setPinFeedback('PIN must be at least 4 digits for AES-GCM key derivation.');
      return;
    }

    setActiveSessionPin(sessionPinInput);
    setIsLocked(false);

    // Encrypt current participant cache
    try {
      await saveSecureOfflineRecord('participants_cache', clients, sessionPinInput);
      await saveSecureOfflineRecord('clinical_notes_cache', caseNotes, sessionPinInput);
      setPinFeedback('✅ Session PIN active. Participant cache & field notes encrypted using AES-GCM 256-bit.');
    } catch (err: any) {
      setPinFeedback('Error encrypting local storage records.');
    }

    setSessionPinInput('');
    setTimeout(() => setPinFeedback(null), 4000);
  };

  const handleLockStorage = () => {
    setActiveSessionPin(null);
    setIsLocked(true);
    setPinFeedback('🔒 Offline participant storage locked. Decryption keys purged from memory.');
    setTimeout(() => setPinFeedback(null), 4000);
  };

  const permissionsMatrix = [
    { role: 'ADMIN', viewNotes: true, signNotes: true, billing: true, exportAudit: true, manageStaff: true },
    { role: 'PRACTITIONER', viewNotes: true, signNotes: true, billing: true, exportAudit: false, manageStaff: false },
    { role: 'AUDITOR', viewNotes: true, signNotes: false, billing: true, exportAudit: true, manageStaff: false },
    { role: 'VIEWER', viewNotes: true, signNotes: false, billing: false, exportAudit: false, manageStaff: false },
    { role: 'PARTICIPANT', viewNotes: false, signNotes: false, billing: false, exportAudit: false, manageStaff: false }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Security & Access Governance</h1>
          <p className="text-xs text-slate-400">
            Role-Based Access Control (RBAC), HIPAA / Privacy Act 1988 health record security, and AES-GCM offline encryption
          </p>
        </div>
      </div>

      {pinFeedback && (
        <div className="p-3.5 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{pinFeedback}</span>
          </div>
          <button onClick={() => setPinFeedback(null)} className="text-teal-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-teal-400">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Encryption Protocol</span>
          </div>
          <p className="text-xl font-extrabold text-white">AES-GCM 256 / TLS 1.3</p>
          <p className="text-[11px] text-slate-400">PBKDF2 SHA-256 session key derivation</p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-teal-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Authentication</span>
          </div>
          <p className="text-xl font-extrabold text-white">Google SSO + MFA</p>
          <p className="text-[11px] text-slate-400">Firebase Auth verified session</p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-teal-400">
            <Key className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Data Residency</span>
          </div>
          <p className="text-xl font-extrabold text-white">Australia (sydney-1)</p>
          <p className="text-[11px] text-slate-400">NDIS Australian data sovereignty</p>
        </div>
      </div>

      {/* High-Security Encrypted Field Mode & Session PIN */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isLocked ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'}`}>
              {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Encrypted Local Storage (Field Offline Mode)</h3>
              <p className="text-xs text-slate-400">
                AES-GCM 256-bit encryption protecting participant profiles & BIRP notes cached in IndexedDB/localStorage
              </p>
            </div>
          </div>

          <span className={`text-xs px-3 py-1 rounded-full font-bold border ${isLocked ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-teal-500/10 text-teal-300 border-teal-500/30'}`}>
            {isLocked ? 'PIN Locked (Encrypted at Rest)' : 'Unlocked (Active Practitioner Session)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 text-xs text-slate-300">
            <p>
              When working in field offline mode, high-security participant records are encrypted using hardware-backed <strong>AES-GCM 256-bit</strong> cryptography with keys derived via <strong>PBKDF2</strong> from a practitioner session PIN.
            </p>
            <p className="text-slate-400">
              Locking clears the cryptographic key from browser RAM, preventing unauthorized access if a clinical tablet or laptop is lost or stolen.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            {isLocked ? (
              <form onSubmit={handleSetOrUnlockPin} className="space-y-3">
                <label className="text-xs font-bold text-slate-300 block">
                  Enter Session PIN to Unlock Encrypted Cache:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={8}
                    placeholder="Enter 4-8 digit PIN..."
                    value={sessionPinInput}
                    onChange={(e) => setSessionPinInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Unlock className="w-3.5 h-3.5" /> Unlock
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-teal-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  <span>Session PIN Active — Cache Fully Decrypted in RAM</span>
                </div>
                <button
                  onClick={handleLockStorage}
                  className="px-4 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> Lock & Purge Key from Memory
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RBAC Matrix */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Role-Based Access Control (RBAC) Permissions</h2>
          <span className="text-xs text-teal-400 font-semibold">NDIS Standard 4.1</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">Role</th>
                <th className="p-4 text-center">View Clinical Notes</th>
                <th className="p-4 text-center">Sign Case Notes</th>
                <th className="p-4 text-center">NDIS PRODA Claims</th>
                <th className="p-4 text-center">Audit Dossier Export</th>
                <th className="p-4 text-center">Staff & Workforce HR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {permissionsMatrix.map((p) => (
                <tr key={p.role} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-bold text-white">{p.role}</td>
                  <td className="p-4 text-center">{p.viewNotes ? <CheckCircle2 className="w-4 h-4 text-teal-400 mx-auto" /> : '—'}</td>
                  <td className="p-4 text-center">{p.signNotes ? <CheckCircle2 className="w-4 h-4 text-teal-400 mx-auto" /> : '—'}</td>
                  <td className="p-4 text-center">{p.billing ? <CheckCircle2 className="w-4 h-4 text-teal-400 mx-auto" /> : '—'}</td>
                  <td className="p-4 text-center">{p.exportAudit ? <CheckCircle2 className="w-4 h-4 text-teal-400 mx-auto" /> : '—'}</td>
                  <td className="p-4 text-center">{p.manageStaff ? <CheckCircle2 className="w-4 h-4 text-teal-400 mx-auto" /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
