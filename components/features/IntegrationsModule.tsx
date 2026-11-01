'use client';

import React from 'react';
import { Boxes, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';

export const IntegrationsModule: React.FC = () => {
  const integrations = [
    {
      name: 'Google Gemini 3.8 Flash',
      category: 'AI Clinical Engine',
      description: 'Powers conversational clinical intelligence, BIRP note summarisation, and SCHADS award compliance checks.',
      status: 'Connected',
      version: 'v1.0'
    },
    {
      name: 'Google Cloud Firebase / Firestore',
      category: 'Database & Auth',
      description: 'Distributed document ledger storing participant records, case notes, and incident reports with offline delta cache.',
      status: 'Connected',
      version: 'Firebase v11'
    },
    {
      name: 'PRODA PACE Gateway',
      category: 'NDIS Statutory API',
      description: 'National Disability Insurance Agency direct API claiming and service booking reconciliation gateway.',
      status: 'Ready / 2026 Spec',
      version: 'PACE 2.4'
    },
    {
      name: 'Xero Cloud Accounting',
      category: 'Financial Ledger',
      description: 'Automated invoice generation, tax reporting, and payroll synchronization for therapy staff.',
      status: 'Connected',
      version: 'OAuth 2.0'
    },
    {
      name: '17hats CRM & Bookings',
      category: 'Participant Intake',
      description: 'Automated lead capture, onboarding agreements, and client intake question sync.',
      status: 'Active',
      version: 'Webhook v2'
    },
    {
      name: 'Google Maps Platform',
      category: 'Field Route & Travel',
      description: 'Distance Matrix & Directions API calculating compliant MMM zone travel allowances.',
      status: 'Active',
      version: 'v3.54'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">System Integrations & API Gateways</h1>
          <p className="text-xs text-slate-400">
            Connected enterprise services powering Breakthrough Allied Health Operations OS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item, idx) => (
          <div
            key={idx}
            className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  {item.category}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-bold">
                  {item.version}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{item.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-teal-400 font-bold">
                <CheckCircle2 className="w-4 h-4" /> {item.status}
              </span>
              <button className="text-slate-400 hover:text-white flex items-center gap-1">
                Configure <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
