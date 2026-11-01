'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  Menu,
  Search,
  Moon,
  Sun,
  Bell,
  Wifi,
  WifiOff,
  LogOut,
  ShieldCheck,
  Stethoscope,
  Command,
  Database,
  RotateCcw
} from 'lucide-react';
import { logOutGoogle } from '@/lib/firebase';
import { IntegrationStatusIndicator } from './IntegrationStatusIndicator';

export const Header: React.FC = () => {
  const {
    currentUser,
    users,
    setUserProfile,
    theme,
    toggleTheme,
    isOnline,
    simulateOfflineToggle,
    setCommandPaletteOpen,
    toggleMobileSidebar,
    notifications,
    markNotificationRead,
    setActiveTab,
    clients,
    isUsingMockData,
    loadDemoData,
    clearAllMockData
  } = useManagementStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await logOutGoogle();
    useManagementStore.setState({ isAuthenticated: false });
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Left: Mobile menu toggle + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          onClick={() => setActiveTab('command-center')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 group-hover:bg-teal-500/30 transition-colors">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              Breakthrough OS
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">
                NDIS 2026
              </span>
            </span>
            <p className="text-[10px] text-slate-400 hidden sm:block">Allied Health & PBS Operations</p>
          </div>
        </div>
      </div>

      {/* Middle: Command Palette Search Bar */}
      <div className="flex-1 max-w-md mx-2 hidden sm:block">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 border border-slate-700/60 transition-colors text-xs"
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span>Search participants, notes, claims, or modules...</span>
          </span>
          <kbd className="flex items-center gap-0.5 text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>
      </div>

      {/* Right: Dataset Switcher, Connectivity status, Theme, Notifications, User */}
      <div className="flex items-center gap-2">
        {/* Sample Dataset Quick Switcher */}
        {clients.length === 0 ? (
          <button
            onClick={loadDemoData}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 transition-colors cursor-pointer"
            title="Load realistic sample NDIS clinical dataset"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Load Sample Data</span>
          </button>
        ) : isUsingMockData ? (
          <button
            onClick={() => clearAllMockData()}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors cursor-pointer"
            title="Clear sample dataset and return to empty live state"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Clear Sample Data</span>
          </button>
        ) : null}

        {/* Centralized Google Workspace Integration Status Indicator */}
        <IntegrationStatusIndicator />

        {/* Offline / Online indicator */}
        <button
          onClick={simulateOfflineToggle}
          title={isOnline ? 'Online (Click to toggle offline mode)' : 'Offline (Click to reconnect)'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors ${
            isOnline
              ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
          }`}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{isOnline ? 'Cloud Synced' : 'Offline'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Switch color theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="text-xs font-bold text-white font-mono tabular-nums">
                  Notifications ({unreadCount})
                </span>
                <span className="text-[10px] text-teal-400 font-semibold">NDIS Alerts</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2 text-center">No alerts at this time</p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id);
                        if (notif.linkTab) setActiveTab(notif.linkTab as any);
                        setShowNotifications(false);
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer transition-colors text-left border ${
                        notif.read
                          ? 'bg-slate-900/50 border-slate-800/40 text-slate-400'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                      }`}
                    >
                      <p className="text-xs font-bold text-white truncate">{notif.title}</p>
                      <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile / Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 pl-2 pr-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
          >
            <div className="w-7 h-7 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
              {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-bold text-white leading-none truncate max-w-[120px]">
                {currentUser?.name}
              </p>
              <span className="text-[10px] text-teal-400 font-semibold leading-tight">
                {currentUser?.role}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 space-y-3">
              <div className="pb-2 border-b border-slate-800">
                <p className="text-xs font-bold text-white">{currentUser?.name}</p>
                <p className="text-[11px] text-slate-400">{currentUser?.email}</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-teal-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Screening: {currentUser?.workerScreeningStatus || 'Valid'}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Switch Practitioner Role
                </p>
                <div className="space-y-1">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setUserProfile(u);
                        setShowUserMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        u.id === currentUser?.id
                          ? 'bg-teal-500/20 text-teal-300 font-bold'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="truncate">{u.name}</span>
                      <span className="text-[10px] text-slate-400">{u.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1">
                {clients.length === 0 ? (
                  <button
                    onClick={() => {
                      loadDemoData();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Database className="w-4 h-4" />
                    Load Sample NDIS Dataset
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      clearAllMockData();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset to Empty Live State
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
