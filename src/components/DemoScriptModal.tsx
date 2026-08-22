import React from 'react';
import { NavRoute } from '../types';
import { X, Zap, Clock } from 'lucide-react';

interface DemoScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: NavRoute) => void;
}

const SCRIPT_STEPS = [
  {
    time: '0:00 – 0:10',
    title: 'Landing Page — AI Agent Overview',
    text: 'Show the four AI agents (Resume, Job Match, Career Strategy, Interview Coach) and the platform\'s Agentic AI + RAG architecture pitch.',
    actionRoute: 'landing' as NavRoute,
    actionLabel: 'Go to Landing',
    emoji: '🏠',
  },
  {
    time: '0:10 – 0:25',
    title: 'Resume Intelligence Agent',
    text: 'Load the Senior Tech Resume preset → Run AI Analysis. Watch polling complete and reveal ATS score, skill analysis, before/after suggestions, and the AI Explainability panel.',
    actionRoute: 'resume' as NavRoute,
    actionLabel: 'Open Resume Agent',
    emoji: '📄',
  },
  {
    time: '0:25 – 0:40',
    title: 'Job Matching Agent',
    text: 'Load the Staff JD preset → Analyze Job Match. Show compatibility %, ranked skill gaps, and matched skills. Point to the "How AI reached this conclusion" explainer.',
    actionRoute: 'job-match' as NavRoute,
    actionLabel: 'Open Job Match Agent',
    emoji: '🎯',
  },
  {
    time: '0:40 – 0:55',
    title: 'Interview Coach Agent',
    text: 'Load sample Staff answer → Submit. Watch SSE streaming evaluation arrive in real time with score, verdict, strengths, growth areas, and model answer.',
    actionRoute: 'interview' as NavRoute,
    actionLabel: 'Open Interview Agent',
    emoji: '🎤',
  },
  {
    time: '0:55 – 1:10',
    title: 'Career Strategy Agent',
    text: 'Type "Staff Distributed Systems Engineer" → Generate Roadmap. Watch 3-phase streaming roadmap with milestones, skills, and deliverables render live.',
    actionRoute: 'roadmap' as NavRoute,
    actionLabel: 'Open Career Agent',
    emoji: '🗺️',
  },
  {
    time: '1:10 – 1:25',
    title: 'Career Dashboard',
    text: 'Show the Career Readiness Score (78%), skill breakdown bars, missing skills panel, and recommended actions. Point out multi-agent analytics at a glance.',
    actionRoute: 'dashboard' as NavRoute,
    actionLabel: 'View Dashboard',
    emoji: '📊',
  },
  {
    time: '1:25 – 1:40',
    title: 'Architecture & Enterprise Pages',
    text: 'Quickly show the Technical Architecture page (agent layers, RAG pipeline) and Enterprise page (Universities, Companies, Training Institutes use cases).',
    actionRoute: 'architecture' as NavRoute,
    actionLabel: 'View Architecture',
    emoji: '⚙️',
  },
];

export const DemoScriptModal: React.FC<DemoScriptModalProps> = ({ isOpen, onClose, onNavigate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Demo Walkthrough Guide</h3>
              <p className="text-xs text-gray-500">AI Career Intelligence Platform · ~90 seconds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Steps */}
        <div className="p-5 space-y-3 max-h-[68vh] overflow-y-auto">
          {SCRIPT_STEPS.map((step, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 transition-colors space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{step.emoji}</span>
                  <span className="text-xs font-extrabold text-gray-900">{step.title}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded shrink-0">
                  <Clock size={9} />
                  {step.time}
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{step.text}</p>
              <button
                type="button"
                onClick={() => { onNavigate(step.actionRoute); onClose(); }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                {step.actionLabel} →
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            Tip: Load Demo Account first for best experience
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
