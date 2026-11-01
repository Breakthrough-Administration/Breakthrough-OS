'use client';

import React, { useState } from 'react';
import { Client } from '@/types';
import {
  ParticipantFeedbackDoc,
  saveParticipantFeedback
} from '@/lib/firestoreService';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  Star,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  X,
  Send,
  Heart,
  ThumbsUp,
  AlertCircle,
  PhoneCall,
  User,
  Clock,
  Calendar,
  History,
  ShieldCheck
} from 'lucide-react';

interface ParticipantFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Client;
  onFeedbackSubmitted?: (feedback: ParticipantFeedbackDoc) => void;
}

export const ParticipantFeedbackModal: React.FC<ParticipantFeedbackModalProps> = ({
  isOpen,
  onClose,
  participant,
  onFeedbackSubmitted
}) => {
  const { addNotification } = useManagementStore();

  const practitionerName =
    participant.primaryPractitionerName || participant.allocatedPractitionerName || 'Dr. Sarah Jenkins';
  const practitionerId =
    participant.primaryPractitionerId || participant.allocatedPractitionerId || 'prac-201';

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [sentiment, setSentiment] = useState<'Delighted' | 'Good' | 'Neutral' | 'Needs Attention'>('Delighted');
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([
    'Listened patiently',
    'Clear progress on goals'
  ]);
  const [notes, setNotes] = useState<string>('');
  const [requestFollowUp, setRequestFollowUp] = useState<boolean>(false);
  const [submittedBy, setSubmittedBy] = useState<'Participant' | 'Nominee / Carer'>('Participant');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);
  const [viewHistory, setViewHistory] = useState<boolean>(false);

  const [feedbackHistory, setFeedbackHistory] = useState<ParticipantFeedbackDoc[]>([
    {
      id: 'fb-sample-1',
      participantId: participant.id,
      participantName: participant.name,
      practitionerId,
      practitionerName,
      sessionDate: '2026-10-02',
      sessionType: 'Sensory Profile Review & PBS Check-in',
      overallRating: 5,
      sentiment: 'Delighted',
      highlights: ['Calm sensory environment', 'Clear progress on goals'],
      notesToPractitioner:
        'Liam felt very calm after using the deep pressure vest during the walk. Thank you for showing us the transition cards.',
      requestFollowUp: false,
      submittedBy: 'Nominee / Carer',
      status: 'Reviewed',
      createdAt: '2026-10-02T12:30:00Z',
      practitionerResponseNote:
        'So thrilled to hear this! We will continue building on the visual schedule next week. — Dr. Sarah'
    }
  ]);

  if (!isOpen) return null;

  const quickTagOptions = [
    'Listened patiently',
    'Clear progress on goals',
    'Calm sensory environment',
    'Good coping exercises',
    'Punctual & respectful',
    'Explained things simply',
    'Challenging but rewarding',
    'Felt safe and understood'
  ];

  const ratingDescriptions: Record<number, string> = {
    1: 'Needs Attention — Session did not meet expectations',
    2: 'Fair — Some helpful parts, but had difficulties',
    3: 'Good — Standard session, goals progressed',
    4: 'Very Good — Great engagement and positive outcome',
    5: 'Outstanding — Highly empowering and supportive'
  };

  const handleToggleHighlight = (tag: string) => {
    setSelectedHighlights((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const now = new Date();
      const feedbackDoc: ParticipantFeedbackDoc = {
        id: `fb-${Date.now()}`,
        participantId: participant.id,
        participantName: participant.name,
        practitionerId,
        practitionerName,
        sessionDate: now.toISOString().split('T')[0],
        sessionType: 'Community Capacity Building & Support Session',
        overallRating: rating,
        sentiment,
        highlights: selectedHighlights,
        notesToPractitioner: notes.trim() || 'No additional written notes provided.',
        requestFollowUp,
        submittedBy,
        status: 'Submitted',
        createdAt: now.toISOString()
      };

      await saveParticipantFeedback(feedbackDoc).catch((err) => {
        console.warn('Feedback local fallback:', err);
      });

      setFeedbackHistory((prev) => [feedbackDoc, ...prev]);

      addNotification({
        title: `Participant Feedback Received (${rating}★)`,
        message: `${participant.name} (${submittedBy}) provided notes for ${practitionerName}: "${
          notes.trim().slice(0, 80) || 'Rated ' + rating + ' stars'
        }"`,
        type: 'client',
        severity: rating <= 2 ? 'high' : 'low'
      });

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(feedbackDoc);
      }

      setIsSubmittedSuccess(true);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSubmittedSuccess(false);
    setNotes('');
    setRating(5);
    setSentiment('Delighted');
    setRequestFollowUp(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {viewHistory ? 'Feedback History' : 'Rate Last Support Session'}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-bold border border-teal-500/20">
                  Direct Clinician Link
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Share feedback directly with{' '}
                <strong className="text-slate-200">{practitionerName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setViewHistory(!viewHistory);
                setIsSubmittedSuccess(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-teal-400" />
              <span>{viewHistory ? 'Give Feedback' : `History (${feedbackHistory.length})`}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {viewHistory ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>Feedback submitted for {participant.name}</span>
                <span>{feedbackHistory.length} record(s)</span>
              </div>

              {feedbackHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{item.sessionType}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-semibold">
                          {item.submittedBy}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-500" /> {item.sessionDate} • Clinician: {item.practitionerName}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-700">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= item.overallRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {item.highlights && item.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.highlights.map((h) => (
                        <span
                          key={h}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-700/40 text-teal-300 font-medium"
                        >
                          ✓ {h}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200">
                    <p className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                      Participant Notes:
                    </p>
                    <p className="leading-relaxed">&ldquo;{item.notesToPractitioner}&rdquo;</p>
                  </div>

                  {item.practitionerResponseNote && (
                    <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-800/40 text-xs text-teal-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-teal-400 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Clinician Response
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        {item.practitionerResponseNote}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                    <span>Status: <strong className="text-emerald-400">{item.status}</strong></span>
                    {item.requestFollowUp && (
                      <span className="text-amber-300 flex items-center gap-1">
                        <PhoneCall className="w-3 h-3" /> Follow-up requested
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : isSubmittedSuccess ? (
            <div className="p-8 rounded-3xl bg-teal-950/30 border border-teal-500/30 text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto border border-teal-500/40 shadow-lg shadow-teal-950/60">
                <Sparkles className="w-8 h-8 text-teal-300" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Thank You for Your Feedback!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Your feedback and notes have been securely delivered directly to{' '}
                  <strong className="text-teal-300">{practitionerName}</strong>. This helps tailor
                  upcoming NDIS therapy sessions to your goals and sensory preferences.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 max-w-sm mx-auto space-y-1">
                <div className="flex justify-between">
                  <span>Rating:</span>
                  <span className="font-bold text-amber-400">{rating} of 5 Stars</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivered to:</span>
                  <span className="text-slate-200">{practitionerName}</span>
                </div>
                {requestFollowUp && (
                  <div className="flex justify-between text-teal-300">
                    <span>Follow-up:</span>
                    <span>Phone call scheduled</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Submit Another
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-teal-950/40 cursor-pointer"
                >
                  Return to Portal
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Community Capacity Building & Support Session
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                      Completed
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <span>Clinician: <strong className="text-teal-300">{practitionerName}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" /> Recent Session
                    </span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Participant:</span>
                  <span className="text-xs font-bold text-slate-200">{participant.name}</span>
                </div>
              </div>

              {/* Star Rating Section */}
              <div className="space-y-2.5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>How would you rate your last session overall?</span>
                  <span className="text-xs font-extrabold text-amber-400 font-mono">
                    {hoverRating || rating} / 5 Stars
                  </span>
                </label>

                <div className="flex items-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const active = starIndex <= (hoverRating || rating);
                    return (
                      <button
                        type="button"
                        key={starIndex}
                        onClick={() => setRating(starIndex)}
                        onMouseEnter={() => setHoverRating(starIndex)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 rounded-xl hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                            active
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                              : 'text-slate-700 hover:text-slate-500'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-teal-400/90 font-medium pt-1">
                  {ratingDescriptions[hoverRating || rating]}
                </p>
              </div>

              {/* Sentiment Badges */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Overall Impression & Mood:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Delighted', 'Good', 'Neutral', 'Needs Attention'] as const).map((s) => {
                    const active = sentiment === s;
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setSentiment(s)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          active
                            ? 'bg-teal-600 text-white border-teal-500 shadow-md'
                            : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {s === 'Delighted' && <Heart className="w-3.5 h-3.5 text-rose-300" />}
                        {s === 'Good' && <ThumbsUp className="w-3.5 h-3.5 text-teal-300" />}
                        {s === 'Neutral' && <User className="w-3.5 h-3.5 text-amber-300" />}
                        {s === 'Needs Attention' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                        <span>{s}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Highlight Tags */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Session Highlights (Select all that apply):
                </label>
                <div className="flex flex-wrap gap-2">
                  {quickTagOptions.map((tag) => {
                    const isSelected = selectedHighlights.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleToggleHighlight(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                            : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes Directly to Practitioner */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                    <span>Notes directly to {practitionerName}:</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Private & Confidential</span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="e.g. Liam felt very engaged today with the sensory tactile schedule! Next session, could we explore calming strategies before the community bus trip?"
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 leading-relaxed"
                />
                <p className="text-[10px] text-slate-400">
                  These notes will be displayed in {practitionerName}&rsquo;s clinical portal prior to your next scheduled session.
                </p>
              </div>

              {/* Submission Options */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-300 font-semibold block">Submitting On Behalf Of:</span>
                    <span className="text-[11px] text-slate-400">Who is providing this feedback?</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setSubmittedBy('Participant')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        submittedBy === 'Participant'
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Participant ({participant.name.split(' ')[0]})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmittedBy('Nominee / Carer')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        submittedBy === 'Nominee / Carer'
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Nominee / Carer
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={requestFollowUp}
                      onChange={(e) => setRequestFollowUp(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-teal-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Request practitioner to call back or follow up on this note</span>
                  </label>
                  {requestFollowUp && (
                    <span className="text-[10px] text-teal-300 font-semibold flex items-center gap-1">
                      <PhoneCall className="w-3 h-3" /> Priority Follow-up
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>NDIS Code of Conduct Protected</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-teal-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send to {practitionerName.split(' ')[0]}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
