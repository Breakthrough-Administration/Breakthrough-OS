'use client';

import React, { useState, useEffect } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  Briefcase,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Loader2,
  Calendar,
  Layers
} from 'lucide-react';

interface SeventeenHatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SeventeenHatsModal: React.FC<SeventeenHatsModalProps> = ({ isOpen, onClose }) => {
  const { addLead, addNotification } = useManagementStore();

  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [syncedLeads, setSyncedLeads] = useState<any[]>([]);

  useEffect(() => {
    // Check current connection status on load
    fetch('/api/integrations/17hats/sync')
      .then((res) => res.json())
      .then((data) => {
        if (data.configured) {
          setStatus('success');
          setResultMessage(data.message);
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const handleSync17Hats = async () => {
    try {
      setIsTesting(true);
      setStatus('idle');
      setResultMessage(null);

      const res = await fetch('/api/integrations/17hats/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-17hats-api-key': apiKey.trim()
        },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to sync with 17hats');
      }

      setStatus('success');
      setResultMessage(data.message);

      if (data.syncedLeads && data.syncedLeads.length > 0) {
        setSyncedLeads(data.syncedLeads);
        data.syncedLeads.forEach((l: any) => addLead(l));
        addNotification({
          title: '17hats Synchronization Complete',
          message: `Synchronized ${data.syncedLeads.length} client leads from 17hats CRM into Breakthrough OS.`,
          type: 'crm',
          severity: 'low'
        });
      } else {
        addNotification({
          title: '17hats Connected',
          message: '17hats API credentials verified. Synchronization bridge is active.',
          type: 'crm',
          severity: 'low'
        });
      }
    } catch (err: any) {
      console.error('17hats sync error:', err);
      setStatus('error');
      setResultMessage(err?.message || 'Error communicating with 17hats API');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>17hats CRM & Practice Management Integration</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  Direct API Key
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sync contacts, client onboarding questionnaires, leads, and workflow projects with 17hats.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {status === 'success' && resultMessage && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{resultMessage}</span>
          </div>
        )}

        {status === 'error' && resultMessage && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{resultMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>17hats API Key</span>
              </span>
              <a
                href="https://app.17hats.com/integrations"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Find key in 17hats Account Settings</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="password"
              placeholder="Paste your 17hats API token..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Your API key is sent directly to the secure server endpoint and stored securely for automated synchronization.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Available Sync Workflows</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Automatic mapping of 17hats Contacts to Breakthrough Participants & CRM Leads.</li>
              <li>Ingestion of Lead Capture Forms, service agreements, and client intake dates.</li>
              <li>Real-time financial reconciliation with Xero and NDIS PRODA PACE claiming.</li>
            </ul>
          </div>

          {syncedLeads.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Recently Ingested Leads ({syncedLeads.length})
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {syncedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-200">{lead.name}</div>
                      <div className="text-slate-500 text-[11px]">{lead.email || lead.phone || 'No contact'}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                      17hats
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-300 transition-colors"
            >
              Close
            </button>

            <button
              type="button"
              disabled={isTesting}
              onClick={handleSync17Hats}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-amber-500/20"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synchronizing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Verify & Synchronize 17hats</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
