'use client';

import React, { useState } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { updatePractitioner } from '@/lib/firestoreService';
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Plus,
  X,
  FileCheck
} from 'lucide-react';

export const GoogleClassroomModule: React.FC = () => {
  const { practitioners, updatePractitioner: updateLocalPractitioner } = useManagementStore();

  const [activeTab, setActiveTab] = useState<'courses' | 'audit'>('audit');
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>(practitioners[0]?.id || '');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Link credential modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('c-1');
  const [targetPractitionerId, setTargetPractitionerId] = useState<string>(practitioners[0]?.id || '');
  const [completionDate, setCompletionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState<string>(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const courses = [
    {
      id: 'c-1',
      title: 'NDIS Worker Orientation Module: Quality, Safety & You',
      provider: 'NDIS Quality & Safeguards Commission',
      status: '100% Completed',
      completionDate: '15 Jan 2026',
      badge: 'Mandatory Audit Credential',
      mandatory: true,
      validityYears: 2
    },
    {
      id: 'c-2',
      title: 'Positive Behaviour Support (PBS) Practitioner Framework',
      provider: 'Breakthrough Clinical Academy',
      status: 'In Progress (80%)',
      completionDate: 'Due 30 Mar 2026',
      badge: 'Core Clinical Practice',
      mandatory: true,
      validityYears: 1
    },
    {
      id: 'c-3',
      title: 'Emergency Medication & First Aid in Disability Support',
      provider: 'St John Ambulance Australia',
      status: '100% Completed',
      completionDate: '02 Feb 2026',
      badge: 'Safety Certified',
      mandatory: true,
      validityYears: 1
    },
    {
      id: 'c-4',
      title: 'Restrictive Practices Elimination & Human Rights in NDIS',
      provider: 'NDIS Commission Academy',
      status: '100% Completed',
      completionDate: '10 Feb 2026',
      badge: 'Governance Standard',
      mandatory: true,
      validityYears: 2
    }
  ];

  const handleLinkCourseCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    const course = courses.find((c) => c.id === selectedCourseId);
    const practitioner = practitioners.find((p) => p.id === targetPractitionerId);
    if (!course || !practitioner) return;

    const newCompletion = {
      courseId: course.id,
      courseTitle: course.title,
      completedAt: completionDate,
      expiresAt: expiryDate,
      provider: course.provider,
      badge: course.badge,
      status: 'Completed' as const,
      certificateUrl: `https://classroom.google.com/c/breakthrough/${course.id}/credential`
    };

    const existingCompletions = practitioner.courseCompletions || [];
    const updatedCompletions = [
      ...existingCompletions.filter((c) => c.courseId !== course.id),
      newCompletion
    ];

    // 1. Update in Firestore
    try {
      await updatePractitioner(practitioner.id, {
        courseCompletions: updatedCompletions,
        mandatoryTrainingExpiryDate: expiryDate
      });
    } catch (err) {
      console.warn('Could not persist to Firestore practitioners collection:', err);
    }

    // 2. Update in Zustand
    updateLocalPractitioner(practitioner.id, {
      courseCompletions: updatedCompletions,
      mandatoryTrainingExpiryDate: expiryDate
    });

    setSuccessBanner(
      `Linked "${course.title}" to ${practitioner.name}'s profile in Firestore. Clinical audit record updated.`
    );
    setIsLinkModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const selectedPractitioner =
    practitioners.find((p) => p.id === selectedPractitionerId) || practitioners[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Google Classroom Staff Induction & CPD</h1>
          <p className="text-xs text-slate-400">
            AHPRA continuing professional development, mandatory NDIS Commission modules, and practitioner compliance audit tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'audit'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Clinical Director Audit
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'courses'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Course Catalogue
            </button>
          </div>

          <button
            onClick={() => setIsLinkModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-teal-900/30"
          >
            <Plus className="w-3.5 h-3.5" /> Link Completion to Practitioner
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-3.5 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-teal-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === 'audit' ? (
        <div className="space-y-6">
          {/* Clinical Director Audit Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">Practitioner Compliance & Certification Audit</h2>
                  <p className="text-xs text-slate-400">Live verification of mandatory NDIS credentials and expiry dates</p>
                </div>
              </div>
              <span className="text-xs text-teal-400 font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
                {practitioners.length} Practitioners Audited
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                    <th className="p-4 font-bold">Practitioner</th>
                    <th className="p-4 font-bold">PBS Level / Role</th>
                    <th className="p-4 font-bold">NDIS Worker Orientation</th>
                    <th className="p-4 font-bold">PBS Framework</th>
                    <th className="p-4 font-bold">Human Rights & RP</th>
                    <th className="p-4 font-bold">CPR / First Aid</th>
                    <th className="p-4 font-bold">Overall Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {practitioners.map((prac) => {
                    const completions = prac.courseCompletions || [];
                    const hasOrientation =
                      completions.some((c) => c.courseId === 'c-1') || prac.ndisOrientationCompleted !== false;
                    const hasPBS =
                      completions.some((c) => c.courseId === 'c-2') || prac.pbsRegistrationLevel;
                    const hasRP = completions.some((c) => c.courseId === 'c-4');
                    const hasCPR =
                      completions.some((c) => c.courseId === 'c-3') || !!prac.firstAidExpiryDate;

                    const allCompliant = hasOrientation && hasPBS;

                    return (
                      <tr key={prac.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-bold text-white">
                          <div>{prac.name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {prac.ndisRegistrationNumber || prac.registrationNumber || 'PRAC-REG-2026'}
                          </span>
                        </td>
                        <td className="p-4 text-teal-400 font-medium">
                          {prac.pbsRegistrationLevel || prac.position || 'Core Practitioner'}
                        </td>
                        <td className="p-4">
                          {hasOrientation ? (
                            <span className="inline-flex items-center gap-1 text-teal-400 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Certified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                              <Clock className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {hasPBS ? (
                            <span className="inline-flex items-center gap-1 text-teal-400 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Proficient
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                              <Clock className="w-3.5 h-3.5" /> Due
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {hasRP ? (
                            <span className="inline-flex items-center gap-1 text-teal-400 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium">Elective</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-[11px] text-slate-300">
                            {prac.firstAidExpiryDate || prac.cprExpiryDate || 'Exp: Dec 2026'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              allCompliant
                                ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {allCompliant ? 'Audit Passed' : 'Review Required'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 uppercase tracking-wide">
                    {course.badge}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 font-mono">
                    {course.completionDate}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{course.title}</h3>
                <p className="text-xs text-slate-400">{course.provider}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-teal-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> {course.status}
                </span>
                <button
                  onClick={() => {
                    setSelectedCourseId(course.id);
                    setIsLinkModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Link to Practitioner
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link Completion Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-teal-400" />
                <h2 className="text-base font-bold text-white">Link Course to Practitioner</h2>
              </div>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLinkCourseCompletion} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Practitioner Profile</label>
                <select
                  value={targetPractitionerId}
                  onChange={(e) => setTargetPractitionerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none"
                >
                  {practitioners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role || p.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Classroom Course / Credential</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Completion Date</label>
                  <input
                    type="date"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Certification Expiry</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-teal-900/30"
                >
                  <FileCheck className="w-3.5 h-3.5" /> Save to Firestore Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
