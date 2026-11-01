'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { Lead } from '@/types';
import { Briefcase, Plus, UserCheck, Phone, Mail, ArrowRight, X } from 'lucide-react';

export const CRMModule: React.FC = () => {
  const { leads, addLead, updateLead, addClient, setActiveTab } = useManagementStore();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<Lead>>({
    prospectName: '',
    name: '',
    contactName: '',
    contactEmail: '',
    email: '',
    contactPhone: '',
    phone: '',
    stage: 'New Intake',
    status: 'New Inquiry',
    source: 'Support Coordinator Referral',
    supportNeeds: 'Allied Health PBS & Capacity Building',
    fundingType: 'NDIS Plan-Managed',
    estimatedPlanValue: 25000,
    notes: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = formData.prospectName || formData.name;
    if (!displayName) return;
    const newLead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> = {
      prospectName: displayName,
      name: displayName,
      contactName: formData.contactName || displayName,
      contactEmail: formData.contactEmail || formData.email || '',
      email: formData.email || formData.contactEmail || '',
      contactPhone: formData.contactPhone || formData.phone || '',
      phone: formData.phone || formData.contactPhone || '',
      stage: formData.stage || 'New Intake',
      status: formData.status || 'New Inquiry',
      source: formData.source || 'Support Coordinator Referral',
      estimatedPlanValue: formData.estimatedPlanValue || 25000,
      supportNeeds: formData.supportNeeds || '',
      fundingType: formData.fundingType || '',
      notes: formData.notes || ''
    };
    addLead(newLead);
    setIsAddOpen(false);
  };

  const convertToParticipant = (lead: Lead) => {
    const leadName = lead.prospectName || lead.name || 'New Participant';
    const leadPhone = lead.contactPhone || lead.phone || '0400 000 000';
    const leadEmail = lead.contactEmail || lead.email || '';
    addClient({
      id: `cli-${Date.now().toString().slice(-4)}`,
      name: leadName,
      ndisNumber: lead.ndisNumber || `${Math.floor(400000000 + Math.random() * 90000000)}`,
      dateOfBirth: '1995-01-01',
      status: 'Active',
      primaryDisability: lead.supportNeeds || 'General Capacity Building',
      phone: leadPhone,
      email: leadEmail,
      goals: [],
      planStartDate: new Date().toISOString().split('T')[0],
      planEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalBudget: lead.estimatedPlanValue || 35000,
      allocatedBudget: lead.estimatedPlanValue || 35000,
      spentBudget: 0,
      primaryPractitionerId: 'prac-201',
      primaryPractitionerName: 'Dr. Sarah Jenkins',
      riskLevel: 'Low',
      emergencyContact: {
        name: lead.contactName || 'Primary Contact',
        relationship: 'Nominee',
        phone: leadPhone
      },
      restrictivePracticesActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    updateLead(lead.id, { stage: 'Converted to Client', status: 'Converted to Participant' });
    setActiveTab('clients');
  };

  const stages = ['New Inquiry', 'Intake Assessment', 'Service Agreement Sent', 'Onboarded'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Intake & 17hats CRM Pipeline</h1>
          <p className="text-xs text-slate-400">
            Participant onboarding, support coordinator referrals, and service agreement workflow
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Referral / Lead
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{lead.name || lead.prospectName}</h3>
                  <p className="text-xs text-slate-400">{lead.source}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-semibold border border-teal-500/20">
                  {lead.status || lead.stage}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  <span>{lead.phone || lead.contactPhone || 'Phone on file'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-teal-400" />
                  <span className="truncate">{lead.email || lead.contactEmail || 'Email on file'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Requested Support
                </span>
                <p>{lead.supportNeeds}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">{lead.fundingType}</span>
              {lead.status !== 'Converted to Participant' && (
                <button
                  onClick={() => convertToParticipant(lead)}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Convert to Active
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Lead Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create Intake Referral</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Participant Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Referral Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option>Support Coordinator Referral</option>
                  <option>17hats Inbound Web Inquiry</option>
                  <option>Hospital / Allied Health Discharge</option>
                  <option>Direct Family Contact</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Support Needs</label>
                <textarea
                  rows={2}
                  value={formData.supportNeeds}
                  onChange={(e) => setFormData({ ...formData, supportNeeds: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-white"
                >
                  Create Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
