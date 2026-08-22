import React, { useState } from 'react';
import { FeaturePage } from '../components/FeaturePage';
import { AgentExplainer } from '../components/AgentExplainer';
import { JobMatchResult, User } from '../types';

interface JobMatchPageProps {
  user: User | null;
  token: string | null;
  darkMode?: boolean;
}

const SAMPLE_JOB_DESCRIPTION = `Staff Software Engineer — Distributed Cloud Infrastructure
Company: ScaleGrid Networks | Remote (US/Canada)

About the Role:
We are looking for a Staff Software Engineer to lead the architecture and reliability of our real-time global edge delivery network. You will collaborate directly with Principal Architects and lead a team of 8 engineers.

Requirements:
- 6+ years building distributed backend systems in Go, TypeScript, or Rust.
- Deep expertise in Kubernetes, Docker, Terraform, and multi-region AWS cloud deployments.
- Proven experience with high-throughput event architectures (Kafka / RabbitMQ) and sub-10ms Redis caching topologies.
- Strong track record authoring technical RFCs, setting SLOs, and mentoring senior engineers.
- Experience with distributed tracing (OpenTelemetry) and incident triage.`;

export const JobMatchPage: React.FC<JobMatchPageProps> = ({ user, token, darkMode }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobMatchResult | null>(null);

  const cardBg = darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200';
  const innerCardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = darkMode
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:bg-gray-700'
    : 'bg-gray-50 border-gray-200 focus:bg-white';

  const handleLoadSampleJD = () => {
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setError(null);
  };

  const handleCompare = async () => {
    if (!jobDescription.trim()) {
      setError('Please paste a target job description to analyze.');
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/job-match', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobDescription }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to compare job description.');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const tierColor =
    result?.matchTier === 'Strong Match'
      ? 'bg-emerald-600'
      : result?.matchTier === 'Moderate Match'
      ? 'bg-blue-600'
      : 'bg-amber-500';

  return (
    <FeaturePage
      id="job-match-page"
      headline="Job Matching Agent"
      description="Paste any job description to get AI-powered compatibility scoring, skill gap analysis, and resume positioning advice."
      agentName="Job Matching Agent"
      agentDescription="Semantic compatibility scoring with RAG-grounded skill analysis"
      actionButton={{
        label: '🎯 Analyze Job Match',
        loadingLabel: 'Job Matching Agent Working...',
        onClick: handleCompare,
        loading,
        disabled: !jobDescription.trim(),
      }}
      secondaryAction={
        !jobDescription.trim()
          ? { label: 'Load Sample Staff JD', onClick: handleLoadSampleJD }
          : undefined
      }
      hasOutput={!!result}
      darkMode={darkMode}
      output={
        result && (
          <div className="space-y-6">
            {/* Compatibility Score Header */}
            <div className={`rounded-2xl p-6 sm:p-7 border ${cardBg}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className={`text-[11px] uppercase tracking-widest font-bold ${textMuted}`}>
                    Role Compatibility Score
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-3">
                    <span className={`text-5xl font-extrabold tracking-tight ${textPrimary}`}>
                      {result.compatibilityScore}%
                    </span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${tierColor}`}>
                      {result.matchTier}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-xs font-bold ${textPrimary} mb-1`}>Resume Positioning Strategy:</p>
                <p className={`text-sm ${textMuted} leading-relaxed`}>{result.resumeAdjustmentAdvice}</p>
              </div>
            </div>

            {/* AI Explainability */}
            {result.agentExplanation && (
              <AgentExplainer explanation={result.agentExplanation} darkMode={darkMode} />
            )}

            {/* Ranked Gaps */}
            <div>
              <h2 className={`text-base font-bold ${textPrimary} mb-3`}>Ranked Skill Gaps</h2>
              <div className="space-y-3">
                {result.rankedGaps.map((gap, idx) => (
                  <div
                    key={idx}
                    className={`p-5 rounded-xl border ${innerCardBg} space-y-2 hover:border-blue-300 transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${textPrimary}`}>
                        {idx + 1}. {gap.skill}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        gap.urgency === 'Critical'
                          ? 'bg-red-100 text-red-700'
                          : gap.urgency === 'High'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {gap.urgency}
                      </span>
                    </div>
                    <p className={`text-xs sm:text-sm ${textMuted} leading-relaxed`}>{gap.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Matched Skills */}
            <div className={`p-5 rounded-xl border ${innerCardBg}`}>
              <h3 className={`text-xs font-bold ${textPrimary} uppercase tracking-wider mb-3`}>
                Matched Core Requirements
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.matchedSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-semibold border border-emerald-100"
                  >
                    ✓ {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-2">
        <textarea
          id="job-description-input"
          rows={7}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here — responsibilities, requirements, and tech stack..."
          className={`w-full p-4 text-sm border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed transition-colors ${inputBg}`}
        />
        {user?.resumeFileName && (
          <p className={`text-xs ${textMuted}`}>
            Comparing against: <span className={`font-semibold ${textPrimary}`}>{user.resumeFileName}</span>
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}
    </FeaturePage>
  );
};
