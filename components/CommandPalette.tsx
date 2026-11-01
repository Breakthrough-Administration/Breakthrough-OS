'use client';

import React, { useState, useEffect } from 'react';
import { useManagementStore, TabType } from '@/stores/useManagementStore';
import {
  Search,
  Users,
  FileText,
  DollarSign,
  AlertOctagon,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  UserCheck,
  StickyNote,
  X
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    clients,
    caseNotes,
    claims,
    setActiveTab,
    setSelectedClientId
  } = useManagementStore();

  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.ndisNumber.includes(search)
  ).slice(0, 5);

  const filteredNotes = caseNotes.filter(
    (n) =>
      n.clientName.toLowerCase().includes(search.toLowerCase()) ||
      n.subjective?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 3);

  const allQuickNav: { label: string; tab: TabType; icon: any }[] = [
    { label: 'NDIS Billing & PACE Invoicing', tab: 'billing', icon: DollarSign },
    { label: 'Clinical Case Notes', tab: 'case-notes', icon: FileText },
    { label: 'Incident Reports & Governance', tab: 'incidents', icon: AlertOctagon },
    { label: 'Restrictive Practice Dashboard', tab: 'restrictive-practices', icon: Shield },
    { label: 'Google Workspace Gateway', tab: 'google-workspace', icon: Layers },
    { label: 'Google Keep Clinical Sync', tab: 'google-keep', icon: StickyNote },
    { label: 'Participant / Nominee Portal & Document Scanner', tab: 'participant-portal', icon: UserCheck },
    { label: 'AI Predictive Insights', tab: 'ai-predictive-insights', icon: Sparkles },
  ];
  const quickNav = allQuickNav.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()));

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    setCommandPaletteOpen(false);
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setActiveTab('clients');
    setCommandPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div
        className="fixed inset-0"
        onClick={() => setCommandPaletteOpen(false)}
      />
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Input Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-teal-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a participant name, NDIS number, clinical note or module..."
            className="w-full bg-transparent border-none text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Quick Navigation */}
          {quickNav.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Quick Navigation
              </p>
              <div className="space-y-1">
                {quickNav.map((nav, idx) => {
                  const Icon = nav.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectTab(nav.tab)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-teal-400" />
                        <span>{nav.label}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Participants */}
          {filteredClients.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Participants
              </p>
              <div className="space-y-1">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleSelectClient(client.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-teal-400" />
                      <div>
                        <span className="font-semibold text-white">{client.name}</span>
                        <span className="text-[10px] text-slate-400 ml-2 font-mono">
                          NDIS: {client.ndisNumber}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-teal-400 px-2 py-0.5 rounded-full bg-teal-500/10">
                      {client.primaryDisability?.split('(')[0] || 'Active'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Notes */}
          {filteredNotes.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Clinical Progress Notes
              </p>
              <div className="space-y-1">
                {filteredNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleSelectTab('case-notes')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-white">{note.clientName}</span>
                        <p className="text-[11px] text-slate-400 truncate">{note.subjective}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">{note.date}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredClients.length === 0 && quickNav.length === 0 && filteredNotes.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No matching records found.</p>
          )}
        </div>
      </div>
    </div>
  );
};
