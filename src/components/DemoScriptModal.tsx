import React from 'react';
import { NavRoute } from './Navigation';

interface DemoScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: NavRoute) => void;
}

export const DemoScriptModal: React.FC<DemoScriptModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const scriptSteps = [
    {
      time: '0:00 - 0:10',
      title: '1. The Anti-Dashboard Philosophy',
      text: 'Notice the clean, distraction-free headline. No metric cards, no noisy widgets. Every tool lives on its own dedicated single-purpose screen.',
      actionRoute: 'landing' as NavRoute,
      actionLabel: 'Go to Landing',
    },
    {
      time: '0:10 - 0:25',
      title: '2. Resume Analysis & Instant Score',
      text: 'Click "AI Analysis" (or load the Senior Tech Preset). Watch the background queue poll smoothly and reveal an ATS score, grade, and 3 high-impact before/after suggestions below the fold.',
      actionRoute: 'resume' as NavRoute,
      actionLabel: 'Open Resume Analyzer',
    },
    {
      time: '0:25 - 0:40',
      title: '3. Real-Time Mock Interview',
      text: 'Answer one question at a time. Click "Submit Answer" or dictate via voice. Streamed Principal Bar Raiser scoring and model answers appear progressively.',
      actionRoute: 'interview' as NavRoute,
      actionLabel: 'Start Mock Interview',
    },
    {
      time: '0:40 - 0:50',
      title: '4. Targeted Job Matcher',
      text: 'Compare your profile against any Staff/Senior JD to get a single compatibility percentage and an urgent skill-gap roadmap.',
      actionRoute: 'job-match' as NavRoute,
      actionLabel: 'Try Job Matcher',
    },
    {
      time: '0:50 - 1:00',
      title: '5. Career Progression Roadmap',
      text: 'Type a target role like "Staff Infrastructure Engineer" to generate a step-by-step milestone timeline with deliverables.',
      actionRoute: 'roadmap' as NavRoute,
      actionLabel: 'Generate Roadmap',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 font-serif-heading">
              60-Second Demo Walkthrough Script
            </h3>
            <p className="text-xs text-neutral-500">
              Pitch: Speed, calm clarity, and single-purpose dedicated workflows.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Script Steps */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {scriptSteps.map((step, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900">
                  {step.title}
                </span>
                <span className="text-[11px] font-mono text-neutral-500 px-2 py-0.5 bg-white border border-neutral-200 rounded">
                  {step.time}
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {step.text}
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(step.actionRoute);
                    onClose();
                  }}
                  className="text-xs font-semibold text-neutral-900 hover:underline"
                >
                  {step.actionLabel} →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-100/60 border-t border-neutral-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
