import React, { useState } from 'react';
import { FeaturePage } from '../components/FeaturePage';
import { RoadmapResult, User } from '../types';

interface RoadmapPageProps {
  user: User | null;
  token: string | null;
}

export const RoadmapPage: React.FC<RoadmapPageProps> = ({ user, token }) => {
  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Staff Software Engineer');
  const [currentLevel, setCurrentLevel] = useState(user?.experienceLevel || 'Senior Full-Stack Engineer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [result, setResult] = useState<RoadmapResult | null>(null);

  const handleGenerate = async () => {
    if (!targetRole.trim()) {
      setError('Please enter your target role or level.');
      return;
    }

    setError(null);
    setLoading(true);
    setStreamBuffer('');
    setResult(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/roadmap/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetRole, currentLevel }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start roadmap generation.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        buffer += textChunk;

        // Parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data:')) {
            const dataStr = line.replace(/^data:\s*/, '');
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                setStreamBuffer((prev) => prev + data.text);
              }
              if (data.steps && Array.isArray(data.steps)) {
                setResult(data);
              }
            } catch (e) {
              // Ignore non-json or partial lines
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while streaming roadmap.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeaturePage
      id="career-roadmap-page"
      headline="Career Progression Roadmap"
      description="Define your next target milestone to map out a clear progression path."
      actionButton={{
        label: 'Generate Roadmap',
        loadingLabel: 'Streaming Roadmap...',
        onClick: handleGenerate,
        loading,
        disabled: !targetRole.trim(),
      }}
      hasOutput={!!result || !!streamBuffer}
      output={
        result ? (
          <div className="space-y-8">
            {/* Header Summary */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-gray-400">
                  Target Trajectory
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#0066FF] text-white shadow-xs w-fit">
                  Est. {result.estimatedTimeline}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-2 tracking-tight">
                {result.targetRole}
              </h2>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                {result.summary}
              </p>
            </div>

            {/* Simple Vertical Step List */}
            <div className="space-y-6">
              <h3 className="text-base font-bold text-gray-900 tracking-tight">
                Milestone Phases
              </h3>

              <div className="relative pl-6 sm:pl-8 border-l-2 border-blue-100 space-y-8">
                {result.steps.map((step, idx) => (
                  <div key={idx} className="relative group">
                    {/* Timeline Node dot */}
                    <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 border-[#0066FF] bg-white ring-4 ring-blue-50" />

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0066FF]">
                          {step.phase}
                        </span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs font-semibold text-gray-600">
                          {step.duration}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-gray-900">
                        {step.milestoneTitle}
                      </h4>

                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        {step.description}
                      </p>

                      {/* Key Actions */}
                      <div className="pt-2">
                        <span className="text-xs font-bold text-gray-800 block mb-2">
                          Core Deliverables & Actions:
                        </span>
                        <ul className="space-y-1.5 text-xs sm:text-sm text-gray-700">
                          {step.keyActions.map((act, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-[#0066FF] font-bold select-none">―</span>
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Skills */}
                      {step.criticalSkillsToLearn && step.criticalSkillsToLearn.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {step.criticalSkillsToLearn.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0066FF]"
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
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[#0066FF]">
              <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-pulse" />
              Streaming personalized trajectory...
            </div>
            <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
              {streamBuffer}
            </pre>
          </div>
        ) : null
      }
    >
      {/* 1. Chat-style single input surface */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            What role or seniority level are you targeting?
          </label>
          <input
            id="roadmap-target-role-input"
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Frontend to Staff Engineer, or Backend to AI Infrastructure"
            className="w-full px-4 py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] transition-colors"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Current level: <strong className="text-gray-700">{currentLevel}</strong></span>
          <button
            type="button"
            onClick={() => setTargetRole('Staff Distributed Systems Engineer')}
            className="text-xs text-[#0066FF] hover:underline font-medium"
          >
            Example: Staff Engineer
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}
    </FeaturePage>
  );
};
