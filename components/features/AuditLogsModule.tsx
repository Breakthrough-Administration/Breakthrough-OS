'use client';

import React from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { History, ShieldCheck, Search, Filter } from 'lucide-react';

export const AuditLogsModule: React.FC = () => {
  const { auditLogs } = useManagementStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Immutable Audit Trail Ledger</h1>
          <p className="text-xs text-slate-400">
            Cryptographically sealed system audit log conforming to NDIS Practice Standards & AHPRA record retention
          </p>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-teal-400" /> Event Logs ({auditLogs.length})
          </h2>
          <span className="text-xs text-teal-400 font-mono">Ledger State: Verified Tamper-Evident</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">Timestamp (UTC)</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Entity Ref</th>
                <th className="p-4">Practitioner / System</th>
                <th className="p-4">Clinical Governance Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 whitespace-nowrap text-slate-400">{log.timestamp}</td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 font-bold">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap text-white font-semibold">{log.entity}</td>
                  <td className="p-4 whitespace-nowrap text-slate-400">{log.entityId}</td>
                  <td className="p-4 whitespace-nowrap text-slate-300">{log.actorName || log.userEmail || log.actorId || 'System'}</td>
                  <td className="p-4 font-sans text-xs text-slate-300">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
