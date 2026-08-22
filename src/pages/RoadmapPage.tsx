import React, { useState } from 'react';
import { FeaturePage } from '../components/FeaturePage';
import { AgentExplainer } from '../components/AgentExplainer';
import { RoadmapResult, User } from '../types';

interface RoadmapPageProps {
  user: User | null;
  token: string | null;
  darkMode?: boolean;
}

export const RoadmapPage: React.FC<RoadmapPageProps> = ({ user, token, darkMode }) => {
  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Staff Software Engineer');
  const [currentLevel, setCurrentLevel] = useState(user?.experienceLevel || 'Senior Full-Stack Engineer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [result, setResult] = useState<RoadmapResult | null>(null);

  const cardBg = darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200';
  const innerCardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = darkMode
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:bg-gray-700'
    : 'bg-gray-50 border-gray-200 focus:bg-white';

  const handleGenerate = async () => {
    if (!targetRole.trim()) {
      setError('Please enter your target role.');
      return;
    }

    setError(null);
    setLoading(true);
    setStreamBuffer('');
    setResult(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/roadmap/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetRole, currentLevel }),
      });

      if (!response.ok || !response.body) throw new Error('Failed to start roadmap generation.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        buffer += textChunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.replace(/^data:\s*/, '');
            try {
              const data = JSON.parse(dataStr);
              if (data.text) setStreamBuffer((prev) => prev + data.text);
              if (data.steps && Array.isArray(data.steps)) setResult(data);
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating roadmap.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeaturePage
      id="career-roadmap-page"
      headline="Career Strategy Agent"
      description="Define your target role and let the Career Strategy Agent generate a personalized multi-phase roadmap with milestones, skills, and actions."
      agentName="Career Strategy Agent"
      agentDescription="Generates personalized career roadmaps with phase-by-phase milestones"
      actionButton={{
        label: '🗺️ Generate Career Roadmap',
        loadingLabel: 'Career Strategy Agent streaming...',
        onClick: handleGenerate,
        loading,
        disabled: !targetRole.trim(),
      }}
      hasOutput={!!result || !!streamBuffer}
      darkMode={darkMode}
      output={
        result ? (
          <div className="space-y-6">
            {/* Header */}
            <div className={`rounded-2xl p-6 sm:p-7 border ${cardBg}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <span className={`text-[11px] uppercase tracking-widest font-bold ${textMuted}`}>
                  Career Trajectory
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-600 text-white w-fit">
                  Est. {result.estimatedTimeline}
                </span>
              </div>
              <h2 className={`text-xl font-extrabold ${textPrimary} tracking-tight mb-2`}>{result.targetRole}</h2>
              <p className={`text-sm ${textMuted} leading-relaxed`}>{result.summary}</p>
            </div>

            {/* AI Explainability */}
            {result.agentExplanation && (
              <AgentExplainer explanation={result.agentExplanation} darkMode={darkMode} />
            )}

            {/* Phase Timeline */}
            <div>
              <h3 className={`text-base font-bold ${textPrimary} mb-4`}>Milestone Phases</h3>
              <div className={`relative pl-6 sm:pl-8 border-l-2 ${darkMode ? 'border-blue-800' : 'border-blue-100'} space-y-8`}>
                {result.steps.map((step, idx) => (
                  <div key={idx} className="relative">
                    {/* Node */}
                    <div className={`absolute -left-[27px] sm:-left-[35px] top-1.5 w-4 h-4 rounded-full border-2 border-blue-500 ${darkMode ? 'bg-gray-900' : 'bg-white'} ring-4 ${darkMode ? 'ring-gray-900' : 'ring-blue-50'}`} />

                    <div className={`p-5 rounded-2xl border ${innerCardBg} space-y-3`}>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{step.phase}</span>
                        <span className={`text-xs ${textMuted}`}>· {step.duration}</span>
                      </div>
                      <h4 className={`text-base font-extrabold ${textPrimary}`}>{step.milestoneTitle}</h4>
                      <p className={`text-xs sm:text-sm ${textMuted} leading-relaxed`}>{step.description}</p>

                      <div>
                        <span className={`text-xs font-bold ${textPrimary} block mb-2`}>Core Deliverables:</span>
                        <ul className="space-y-1.5">
                          {step.keyActions.map((act, i) => (
                            <li key={i} className={`flex items-start gap-2 text-xs sm:text-sm ${textMuted}`}>
                              <span className="text-blue-500 font-bold mt-0.5">—</span>
                              {act}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {step.criticalSkillsToLearn?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {step.criticalSkillsToLearn.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : streamBuffer ? (
          <div className={`p-6 rounded-2xl border ${cardBg}`}>
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-blue-600">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Career Strategy Agent — streaming personalized roadmap...
            </div>
            <pre className={`text-xs font-mono ${textMuted} whitespace-pre-wrap leading-relaxed`}>
              {streamBuffer}
            </pre>
          </div>
        ) : null
      }
    >
      <div className="space-y-3">
        <div>
          <label className={`block text-xs font-semibold ${textMuted} mb-1.5`}>
            Target role or seniority level
          </label>
          <input
            id="roadmap-target-role-input"
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Staff Software Engineer, ML Engineer, Principal Architect"
            className={`w-full px-4 py-3.5 text-sm border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${inputBg}`}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-xs ${textMuted}`}>
            Current level: <strong className={textPrimary}>{currentLevel}</strong>
          </span>
          <button
            type="button"
            onClick={() => setTargetRole('Staff Distributed Systems Engineer')}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Example: Staff Engineer
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}
    </FeaturePage>
  );
};
