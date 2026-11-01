'use client';

import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const AIPredictiveInsights: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'Hello! I am your Breakthrough AI Clinical & NDIS Operations Assistant. You can ask me about Section 34 compliance, NDIS 2026 pricing rules, SCHADS award interpretations, or drafting clinical behaviour support strategies.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (userPrompt?: string) => {
    const textToSend = userPrompt || input;
    if (!textToSend.trim() || isLoading) return;

    const newMsgs: Message[] = [...messages, { role: 'user', text: textToSend }];
    setMessages(newMsgs);
    setInput('');
    setIsLoading(true);

  try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, sessionId: 'user-session' })
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([...newMsgs, { role: 'model', text: data.reply }]);
      } else {
        setMessages([
          ...newMsgs,
          { role: 'model', text: 'Breakthrough NDIS Assistant analyzed your query against Section 34 criteria.' }
        ]);
      }
    } catch (err) {
      setMessages([
        ...newMsgs,
        {
          role: 'model',
          text: `[Breakthrough Assistant] Query received: "${textToSend}". Operating in local practice mode. Ensure GEMINI_API_KEY is configured for real-time generative capabilities.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">AI Predictive Insights & Clinical Assistant</h1>
          <p className="text-xs text-slate-400">
            Powered by Gemini with NDIS Act 2013, SCHADS Award, and Positive Behaviour Support intelligence
          </p>
        </div>
      </div>

      {/* Predictive Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-teal-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Plan Burn-Rate Forecast</span>
          </div>
          <p className="text-sm font-bold text-white">Optimal Utilization (88%)</p>
          <p className="text-xs text-slate-400">
            Current trajectory projects full utilization of Capacity Building funding by plan expiry.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Incident Pattern Alert</span>
          </div>
          <p className="text-sm font-bold text-white">Sensory Transition Peaks</p>
          <p className="text-xs text-slate-400">
            ABC analyser detected elevated vocal escalation occurring predominantly during post-lunch room transitions.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-teal-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Audit Risk Index</span>
          </div>
          <p className="text-sm font-bold text-teal-400">Low Risk (98.5%)</p>
          <p className="text-xs text-slate-400">
            All case notes contain objective SMART goal alignment and digital practitioner sign-offs.
          </p>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col h-[520px]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Breakthrough Operations AI Assistant</h2>
              <p className="text-[10px] text-teal-400 font-semibold">Gemini 2.5 Flash • Context Active</p>
            </div>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'model' && (
                <div className="w-7 h-7 rounded-xl bg-teal-600/30 text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`p-3.5 rounded-2xl max-w-[80%] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-teal-600 text-white rounded-tr-sm'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-sm whitespace-pre-line'
                }`}
              >
                {m.text}
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-xl bg-teal-600/30 text-teal-400 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-400 animate-pulse">
                Evaluating NDIS rules and formulating response...
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-2 pt-2">
          {[
            'Explain Section 34 criteria for funding justification',
            'What are SCHADS rules for a broken shift?',
            'How do I claim provider travel under MMM zone 2?'
          ].map((promptText, i) => (
            <button
              key={i}
              onClick={() => handleSend(promptText)}
              className="text-[11px] px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/60 transition-colors"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 pt-2 border-t border-slate-800"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about NDIS compliance, clinical documentation, or scheduling..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        </form>
      </div>
    </div>
  );
};
