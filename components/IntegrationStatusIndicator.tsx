'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  GraduationCap,
  StickyNote,
  Calendar,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  ShieldCheck
} from 'lucide-react';
import { useManagementStore } from '@/stores/useManagementStore';
import { getCachedGoogleAccessToken, signInWithGoogle } from '@/lib/firebase';

export type ServiceStatus = 'connected' | 'warning' | 'disconnected';

interface ServiceIntegration {
  id: 'drive' | 'classroom' | 'keep' | 'calendar';
  name: string;
  scopeLabel: string;
  icon: React.ElementType;
  description: string;
  status: ServiceStatus;
  statusText: string;
  lastChecked?: string;
}

export const IntegrationStatusIndicator: React.FC = () => {
  const { isOnline, setActiveTab, currentUser } = useManagementStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check current connection state
  const checkStatus = () => {
    setIsChecking(true);
    const token = getCachedGoogleAccessToken();
    setHasGoogleToken(!!token);
    setTimeout(() => {
      setIsChecking(false);
    }, 400);
  };

  useEffect(() => {
    checkStatus();
    // Re-check periodically
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [isOnline]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine individual service states based on token and online status
  const services: ServiceIntegration[] = [
    {
      id: 'drive',
      name: 'Google Drive',
      scopeLabel: 'drive.readonly, drive.file',
      icon: HardDrive,
      description: 'Document picker, clinical PDF storage, and client files',
      status: !isOnline ? 'disconnected' : hasGoogleToken ? 'connected' : 'warning',
      statusText: !isOnline ? 'Offline' : hasGoogleToken ? 'Connected' : 'Auth Required',
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      scopeLabel: 'calendar.events',
      icon: Calendar,
      description: 'Therapy appointments, booking sync, and session schedules',
      status: !isOnline ? 'disconnected' : hasGoogleToken ? 'connected' : 'warning',
      statusText: !isOnline ? 'Offline' : hasGoogleToken ? 'Connected' : 'Auth Required',
    },
    {
      id: 'classroom',
      name: 'Google Classroom',
      scopeLabel: 'classroom.courses.readonly',
      icon: GraduationCap,
      description: 'Practitioner training modules and compliance course rosters',
      status: !isOnline ? 'disconnected' : hasGoogleToken ? 'connected' : 'warning',
      statusText: !isOnline ? 'Offline' : hasGoogleToken ? 'Connected' : 'Auth Required',
    },
    {
      id: 'keep',
      name: 'Google Keep',
      scopeLabel: 'keep.notes / field sync',
      icon: StickyNote,
      description: 'Quick clinical field notes and BIRP case note conversion',
      status: !isOnline ? 'disconnected' : hasGoogleToken ? 'connected' : 'warning',
      statusText: !isOnline ? 'Offline' : hasGoogleToken ? 'Connected' : 'Auth Required',
    },
  ];

  // Calculate overall traffic-light state:
  // Green: All connected
  // Yellow: At least one warning, or mixed state
  // Red: All disconnected or offline
  const connectedCount = services.filter((s) => s.status === 'connected').length;
  const overallStatus: ServiceStatus = !isOnline
    ? 'disconnected'
    : connectedCount === services.length
    ? 'connected'
    : connectedCount > 0 || hasGoogleToken
    ? 'warning'
    : 'disconnected';

  const statusColors = {
    connected: {
      dot: 'bg-emerald-400',
      ring: 'ring-emerald-400/30',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      label: 'All Connected',
    },
    warning: {
      dot: 'bg-amber-400 animate-pulse',
      ring: 'ring-amber-400/30',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      label: `${connectedCount}/${services.length} Active`,
    },
    disconnected: {
      dot: 'bg-rose-400',
      ring: 'ring-rose-400/30',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      label: 'Disconnected',
    },
  };

  const currentTheme = statusColors[overallStatus];

  const handleConnectAll = async () => {
    try {
      setIsChecking(true);
      await signInWithGoogle();
      checkStatus();
    } catch (err) {
      console.warn('OAuth sign-in cancelled or failed:', err);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Centralized Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Google Workspace Integration Status"
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-medium ${
          isOpen
            ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
            : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white'
        }`}
      >
        {/* Traffic Light Dot Indicator */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ring-4 ${currentTheme.ring} ${currentTheme.dot}`}
          />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentTheme.dot}`} />
        </span>

        <span className="hidden sm:inline-block font-medium">Integration Status</span>
        <span className={`hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${currentTheme.badge}`}>
          {currentTheme.label}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-200">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">Google Workspace Health</h4>
                <p className="text-[11px] text-slate-400">OAuth 2.0 Real-time Connection State</p>
              </div>
            </div>

            <button
              type="button"
              onClick={checkStatus}
              disabled={isChecking}
              title="Refresh connection status"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          </div>

          {/* Overall Health Summary Banner */}
          <div
            className={`my-3 p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              overallStatus === 'connected'
                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                : overallStatus === 'warning'
                ? 'bg-amber-950/30 border-amber-800/40 text-amber-300'
                : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {overallStatus === 'connected' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : overallStatus === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>
                {overallStatus === 'connected'
                  ? 'All 4 Workspace services active'
                  : overallStatus === 'warning'
                  ? 'OAuth token needs renewal or partial scope'
                  : 'Workspace integration offline'}
              </span>
            </div>

            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">
              {overallStatus}
            </span>
          </div>

          {/* Service List Grid */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-700/50 text-slate-200 shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{service.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          {service.scopeLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator Pill */}
                  <div className="shrink-0 flex items-center gap-1.5 mt-1">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        service.status === 'connected'
                          ? 'bg-emerald-400'
                          : service.status === 'warning'
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-semibold font-mono ${
                        service.status === 'connected'
                          ? 'text-emerald-400'
                          : service.status === 'warning'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {service.statusText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('google-workspace');
                  setIsOpen(false);
                }}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition-colors"
              >
                <span>Workspace Hub</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('security-audit');
                  setIsOpen(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1 transition-colors"
              >
                <span>Audit</span>
              </button>
            </div>

            {!hasGoogleToken ? (
              <button
                type="button"
                onClick={handleConnectAll}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                Connect Workspace
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <Wifi className="w-3 h-3 text-emerald-400" />
                Live Sync Active
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
