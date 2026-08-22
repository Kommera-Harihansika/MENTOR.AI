import React, { useState } from 'react';
import { AgentExplanation, AgentName } from '../types';
import { Brain, ChevronDown, ChevronUp, Cpu, Target, Map, MessageSquare, FileText } from 'lucide-react';

interface AgentExplainerProps {
  explanation: AgentExplanation;
  darkMode?: boolean;
}

const AGENT_META: Record<AgentName, { label: string; icon: React.ReactNode; color: string }> = {
  ResumeIntelligenceAgent: {
    label: 'Resume Intelligence Agent',
    icon: <FileText size={14} />,
    color: 'text-blue-600 bg-blue-50 border-blue-100',
  },
  CareerStrategyAgent: {
    label: 'Career Strategy Agent',
    icon: <Map size={14} />,
    color: 'text-purple-600 bg-purple-50 border-purple-100',
  },
  JobMatchingAgent: {
    label: 'Job Matching Agent',
    icon: <Target size={14} />,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  InterviewCoachAgent: {
    label: 'Interview Coach Agent',
    icon: <MessageSquare size={14} />,
    color: 'text-orange-600 bg-orange-50 border-orange-100',
  },
  OrchestratorAgent: {
    label: 'Orchestrator Agent',
    icon: <Cpu size={14} />,
    color: 'text-gray-700 bg-gray-100 border-gray-200',
  },
};

export const AgentExplainer: React.FC<AgentExplainerProps> = ({ explanation, darkMode }) => {
  const [expanded, setExpanded] = useState(false);

  const bg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50/60 border-blue-100';
  const textPrimary = darkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const innerBg = darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200';

  return (
    <div className={`rounded-xl border ${bg} overflow-hidden`}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left group"
      >
        <div className="flex items-center gap-2">
          <Brain size={15} className="text-blue-600" />
          <span className={`text-xs font-bold ${textPrimary}`}>
            How AI reached this conclusion
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>
            {explanation.agents.length} agent{explanation.agents.length !== 1 ? 's' : ''} involved
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={14} className={textMuted} />
        ) : (
          <ChevronDown size={14} className={textMuted} />
        )}
      </button>

      {/* Orchestrator Summary */}
      {!expanded && (
        <div className={`px-4 pb-3 text-xs ${textMuted} leading-relaxed border-t ${darkMode ? 'border-gray-700' : 'border-blue-100'} pt-2`}>
          {explanation.orchestratorSummary}
        </div>
      )}

      {/* Expanded Agent Steps */}
      {expanded && (
        <div className={`px-4 pb-4 pt-1 border-t ${darkMode ? 'border-gray-700' : 'border-blue-100'} space-y-3`}>
          <p className={`text-xs ${textMuted} leading-relaxed mb-2`}>
            {explanation.orchestratorSummary}
          </p>

          {explanation.agents.map((thought, idx) => {
            const meta = AGENT_META[thought.agent] || AGENT_META.OrchestratorAgent;
            return (
              <div key={idx} className={`rounded-lg border ${innerBg} p-3 space-y-1.5`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                    {meta.icon}
                    {meta.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${thought.confidence}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-semibold ${textMuted}`}>{thought.confidence}%</span>
                  </div>
                </div>
                <p className={`text-[11px] font-semibold ${textPrimary}`}>{thought.step}</p>
                <p className={`text-[11px] ${textMuted} leading-relaxed`}>{thought.reasoning}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
