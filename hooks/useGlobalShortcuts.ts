'use client';

import { useEffect, useState } from 'react';
import { useManagementStore, TabType } from '@/stores/useManagementStore';

export interface ShortcutToastInfo {
  moduleName: string;
  keyCombo: string;
  icon?: string;
}

export function useGlobalShortcuts(options?: {
  onOpenQuickActions?: () => void;
  onOpenShortcutsModal?: () => void;
}) {
  const {
    currentUser,
    setActiveTab,
    setCommandPaletteOpen,
    isCommandPaletteOpen,
    toggleTheme,
    addNotification
  } = useManagementStore();

  const [activeToast, setActiveToast] = useState<ShortcutToastInfo | null>(null);

  useEffect(() => {
    let toastTimer: NodeJS.Timeout;

    const showToast = (moduleName: string, keyCombo: string) => {
      setActiveToast({ moduleName, keyCombo });
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        setActiveToast(null);
      }, 1800);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputActive =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;

      // 1. Command Palette: Ctrl+K or Cmd+K
      if (isCtrlOrCmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
        return;
      }

      // 2. Help Cheatsheet: '?' or Ctrl+/ (when not typing in an input)
      if ((e.key === '?' && !isInputActive) || (isCtrlOrCmd && e.key === '/')) {
        e.preventDefault();
        if (options?.onOpenShortcutsModal) {
          options.onOpenShortcutsModal();
        } else {
          const btn = document.getElementById('keyboard-shortcuts-modal-trigger');
          btn?.click();
        }
        return;
      }

      // 3. Quick Actions: Ctrl+N or Cmd+N (when not in input, gated for non-viewers)
      if (isCtrlOrCmd && e.key.toLowerCase() === 'n' && !isInputActive) {
        if (currentUser?.role === 'VIEWER') {
          return;
        }
        e.preventDefault();
        if (options?.onOpenQuickActions) {
          options.onOpenQuickActions();
        } else {
          const quickBtn = document.getElementById('floating-quick-actions-trigger');
          quickBtn?.click();
        }
        return;
      }

      // 4. Toggle Theme: Ctrl+Shift+D or Cmd+Shift+D
      if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleTheme();
        showToast('Workspace Theme Toggled', isCtrlOrCmd ? 'Ctrl+Shift+D' : '⌘+Shift+D');
        return;
      }

      // 5. Direct Module Switching: Ctrl+1..9,0 or Alt+1..9,0 (even if Alt or Ctrl is pressed)
      if ((isCtrlOrCmd || isAlt) && !e.shiftKey) {
        let targetTab: TabType | null = null;
        let tabName = '';
        const key = e.key;

        switch (key) {
          case '1':
            targetTab = 'clients';
            tabName = 'Participants & NDIS Profiles';
            break;
          case '2':
            targetTab = 'case-notes';
            tabName = 'Clinical Case Notes';
            break;
          case '3':
            targetTab = 'billing';
            tabName = 'NDIS Billing & PRODA';
            break;
          case '4':
            targetTab = 'incidents';
            tabName = 'Incidents & Governance';
            break;
          case '5':
            targetTab = 'audit';
            tabName = 'Compliance & NDIS Audits';
            break;
          case '6':
            targetTab = 'restrictive-practices';
            tabName = 'Restrictive Practices';
            break;
          case '7':
            targetTab = 'bsp-plans';
            tabName = 'Behaviour Support Plans (BSP)';
            break;
          case '8':
            targetTab = 'google-workspace';
            tabName = 'Google Workspace Hub';
            break;
          case '9':
            targetTab = 'command-center';
            tabName = 'Practice Command Center';
            break;
          case '0':
            targetTab = 'hr-roster';
            tabName = 'HR & Practitioner Roster';
            break;
          default:
            break;
        }

        if (targetTab) {
          e.preventDefault();
          const adminTabs: TabType[] = ['hr-roster', 'audit-logs', 'integrations'];
          if (adminTabs.includes(targetTab) && currentUser?.role !== 'ADMIN') {
            showToast('Admin Role Required', 'Access Denied');
            return;
          }
          setActiveTab(targetTab);
          showToast(tabName, `${isCtrlOrCmd ? 'Ctrl' : 'Alt'}+${key}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(toastTimer);
    };
  }, [
    setActiveTab,
    setCommandPaletteOpen,
    isCommandPaletteOpen,
    toggleTheme,
    options
  ]);

  return { activeToast };
}
