'use client';

import React from 'react';
import { useManagementStore, TabType } from '@/stores/useManagementStore';
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  AlertOctagon,
  Shield,
  Activity,
  FileCheck,
  Wrench,
  Layers,
  StickyNote,
  GraduationCap,
  MapPin,
  FileSpreadsheet,
  CheckSquare,
  DollarSign,
  Briefcase,
  History,
  Lock,
  Boxes,
  UserCheck,
  Sparkles,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const {
    currentUser,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
    incidents,
    restrictivePractices,
    claims
  } = useManagementStore();

  const reportableIncidents = incidents.filter((i) => i.severity?.includes('Critical') && i.status !== 'Closed').length;
  const pendingRP = restrictivePractices.filter((r) => r.monthlyReportStatus === 'Due').length;
  const pendingClaims = claims.filter((c) => c.status === 'Pending').length;

  const sections: NavSection[] = [
    {
      title: 'Practice Operations',
      items: [
        { id: 'command-center', label: 'Command Center', icon: LayoutDashboard },
        { id: 'clients', label: 'Participants', icon: Users },
        { id: 'ndis-goals', label: 'Goal Tracking', icon: Target },
        { id: 'google-maps', label: 'Field Route & Travel', icon: MapPin },
      ]
    },
    {
      title: 'Clinical & PBS',
      items: [
        { id: 'case-notes', label: 'Case Notes', icon: FileText },
        {
          id: 'incidents',
          label: 'Incidents & Governance',
          icon: AlertOctagon,
          badge: reportableIncidents > 0 ? `${reportableIncidents} alert` : undefined
        },
        {
          id: 'restrictive-practices',
          label: 'Restrictive Practices',
          icon: Shield,
          badge: pendingRP > 0 ? `${pendingRP} due` : undefined
        },
        { id: 'abc-analyser', label: 'ABC Behaviour Log', icon: Activity },
        { id: 'bsp-plans', label: 'Behaviour Plans (BSP)', icon: FileCheck },
        { id: 'practice-tools', label: 'Clinical Assessment Tools', icon: Wrench },
        { id: 'ai-predictive-insights', label: 'AI Predictive Insights', icon: Sparkles }
      ]
    },
    {
      title: 'Google Cloud Ecosystem',
      items: [
        { id: 'google-workspace', label: 'Workspace Hub', icon: Layers },
        { id: 'google-keep', label: 'Keep Clinical Sync', icon: StickyNote },
        { id: 'google-classroom', label: 'Training & Induction', icon: GraduationCap }
      ]
    },
    {
      title: 'Finance & Compliance',
      items: [
        {
          id: 'billing',
          label: 'NDIS Billing & PACE',
          icon: DollarSign,
          badge: pendingClaims > 0 ? `${pendingClaims}` : undefined
        },
        { id: 'audit', label: 'NDIS Audit & Quality', icon: CheckSquare },
        { id: 'crm', label: 'Intake & 17hats CRM', icon: Briefcase },
        { id: 'hr-roster', label: 'SCHADS Roster & HR', icon: FileSpreadsheet, adminOnly: true },
        { id: 'audit-logs', label: 'Audit Trail Ledger', icon: History, adminOnly: true },
        { id: 'security-audit', label: 'Security & Access Audit', icon: Lock, adminOnly: true },
        { id: 'integrations', label: 'API Integrations Hub', icon: Boxes, adminOnly: true }
      ]
    },
    {
      title: 'Portals',
      items: [
        { id: 'participant-portal', label: 'Participant / Nominee', icon: UserCheck }
      ]
    }
  ];

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  const content = (
    <div className="flex flex-col h-full bg-slate-900/95 border-r border-slate-800 select-none overflow-hidden">
      <div className="p-4 flex items-center justify-between md:hidden border-b border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation</span>
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((sec, idx) => {
          const visibleItems = sec.items.filter(
            (item) => !item.adminOnly || currentUser?.role === 'ADMIN'
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <h3 className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                {sec.title}
              </h3>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 h-[calc(100vh-4rem)]">
        {content}
      </aside>

      {/* Mobile drawer overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-50">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
