'use client';

import React, { ReactNode } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { UserRole } from '@/types';
import { ShieldAlert } from 'lucide-react';

interface AccessGuardProps {
  children: ReactNode;
  requiredRoles: UserRole[];
  moduleName?: string;
}

export const AccessGuard: React.FC<AccessGuardProps> = ({
  children,
  requiredRoles,
  moduleName = 'This Module'
}) => {
  const { currentUser } = useManagementStore();

  const userRole = currentUser?.role || 'VIEWER';
  const hasAccess = requiredRoles.includes(userRole);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/60 rounded-3xl border border-slate-800 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Access Restricted</h3>
        <p className="text-sm text-slate-400 max-w-md">
          {moduleName} requires elevated organizational privileges ({requiredRoles.join(', ')}). Your current role is <strong className="text-teal-400">{userRole}</strong>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
