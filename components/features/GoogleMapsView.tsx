'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  MapPin,
  Navigation,
  Car,
  DollarSign,
  ExternalLink,
  Route,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';

const getAddressString = (addr: any) => {
  if (!addr) return 'Richmond, VIC 3121';
  if (typeof addr === 'string') return addr;
  return [addr.street, addr.suburb, addr.state, addr.postcode].filter(Boolean).join(', ') || 'Richmond, VIC 3121';
};

export const GoogleMapsView: React.FC = () => {
  const { clients, addBillingClaim, addNotification, setActiveTab } = useManagementStore();
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || 'cli-001');
  const [startAddress, setStartAddress] = useState('Breakthrough Clinic, 120 Collins St, Melbourne VIC');
  const [selectedClientAddress, setSelectedClientAddress] = useState(
    getAddressString(clients[0]?.address) || '42 Brighton Rd, Elwood VIC 3184'
  );
  const [travelMinutes, setTravelMinutes] = useState(24);
  const [distanceKm, setDistanceKm] = useState(14.5);
  const [mmZone, setMmZone] = useState('MMM 1-3 (Metro - max 30 min claim)');
  const [claimLoggedBanner, setClaimLoggedBanner] = useState<string | null>(null);

  const hourlyRate = 193.99; // Standard 2026 Allied Health Therapy rate
  const kmRate = 0.99; // Non-labour vehicle allowance per km
  const timeClaimAmount = (travelMinutes / 60) * hourlyRate;
  const kmAllowanceAmount = distanceKm * kmRate;
  const totalBillableTravel = (timeClaimAmount + kmAllowanceAmount).toFixed(2);

  const handleLogTravelClaim = () => {
    const client = clients.find((c) => c.id === selectedClientId) || clients[0];
    const clientName = client?.name || 'Participant';
    const hours = Number((travelMinutes / 60).toFixed(2));
    const totalAmount = Number(totalBillableTravel);

    addBillingClaim({
      clientId: client?.id || 'cli-001',
      clientName,
      dateOfService: new Date().toISOString().split('T')[0],
      supportItemNumber: '15_799_0128_1_3',
      supportItemName: `Provider Travel (${travelMinutes}m + ${distanceKm}km @ $0.99/km — ${mmZone.split(' ')[0]} ${
        mmZone.split(' ')[1] || ''
      })`,
      hours,
      rate: hourlyRate,
      unitPrice: hourlyRate,
      totalAmount,
      status: 'Pending',
      isPaceCompliant: true,
      claimReference: `TRV-${Date.now().toString().slice(-6)}`
    });

    const msg = `Logged $${totalBillableTravel} Provider Travel claim (15_799_0128_1_3) for ${clientName} to PRODA Billing queue.`;
    setClaimLoggedBanner(msg);
    addNotification({
      title: 'Provider Travel Claim Queued',
      message: msg,
      type: 'billing',
      severity: 'low',
      linkTab: 'billing'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Field Route &amp; NDIS Provider Travel</h1>
          <p className="text-xs text-slate-400">
            Compliant travel time and kilometre calculation under NDIS Pricing Arrangements (MMM zones 1-7)
          </p>
        </div>
      </div>

      {claimLoggedBanner && (
        <div className="p-3.5 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{claimLoggedBanner}</span>
          </div>
          <button
            onClick={() => setActiveTab('billing')}
            className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            View in PRODA Billing <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Route Calculator Configuration */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-teal-400" /> Travel Claim Builder
          </h2>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Origin (Practice / Base)</label>
              <input
                type="text"
                value={startAddress}
                onChange={(e) => setStartAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Destination Participant</label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  const client = clients.find((c) => c.id === e.target.value);
                  if (client?.address) setSelectedClientAddress(getAddressString(client.address));
                }}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white cursor-pointer"
              >
                {clients.length === 0 ? (
                  <option value="cli-001">Community Visit — Elwood VIC 3184</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {getAddressString(c.address)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Participant Address</label>
              <input
                type="text"
                value={selectedClientAddress}
                onChange={(e) => setSelectedClientAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Estimated Time (mins)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={travelMinutes}
                  onChange={(e) => setTravelMinutes(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Distance (km)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Modified Monash Model (MMM)</label>
              <select
                value={mmZone}
                onChange={(e) => setMmZone(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white cursor-pointer"
              >
                <option>MMM 1-3 (Metro - max 30 min claim)</option>
                <option>MMM 4-5 (Regional - max 60 min claim)</option>
                <option>MMM 6-7 (Remote - negotiated claim)</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs text-teal-300 font-bold">
              <span>Total NDIS Travel Claim</span>
              <span className="text-lg font-extrabold text-white font-mono tabular-nums">
                ${totalBillableTravel}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-0.5 font-mono tabular-nums">
              <p>Labour ({travelMinutes} mins @ $193.99/h): ${timeClaimAmount.toFixed(2)}</p>
              <p>Non-Labour ({distanceKm} km @ $0.99/km): ${kmAllowanceAmount.toFixed(2)}</p>
              <p className="text-teal-400/90 pt-0.5">Line item: 15_799_0128_1_3</p>
            </div>

            <button
              onClick={handleLogTravelClaim}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" /> Log Billable Travel to PRODA
            </button>
          </div>
        </div>

        {/* Right 2 Columns: Route Visualization & Field Dispatch Overview */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-400" /> Live Field Route Dispatch
              </h2>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Car className="w-3.5 h-3.5" /> Optimal traffic routing
              </span>
            </div>

            {/* Visual Route Representation */}
            <div className="h-64 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="relative z-10 flex items-center justify-center gap-6">
                <div className="p-3 rounded-2xl bg-slate-900 border border-teal-500/40 text-teal-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-0.5 bg-teal-500/40 dashed" />
                  <Route className="w-5 h-5 text-teal-400 animate-pulse" />
                  <div className="w-12 h-0.5 bg-teal-500/40" />
                </div>
                <div className="p-3 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-500/30">
                  <MapPin className="w-6 h-6" />
                </div>
              </div>

              <div className="relative z-10">
                <p className="text-xs font-bold text-white">
                  {startAddress.split(',')[0]} ➔ {selectedClientAddress}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
                  {distanceKm} km • Approx. {travelMinutes} minutes drive
                </p>
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                  startAddress
                )}&destination=${encodeURIComponent(selectedClientAddress)}`}
                target="_blank"
                rel="noreferrer"
                className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Open Turn-by-Turn in Google Maps <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[10px] uppercase font-bold text-slate-400">Schedule Status</span>
              <p className="text-xs font-semibold text-white mt-1">Confirmed Outreach Visit</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[10px] uppercase font-bold text-slate-400">Vehicle Allowance</span>
              <p className="text-xs font-semibold text-white mt-1 font-mono tabular-nums">
                $0.99 / km eligible
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[10px] uppercase font-bold text-slate-400">Safety Check-in</span>
              <p className="text-xs font-semibold text-teal-400 mt-1">Lone Worker Protocol Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
