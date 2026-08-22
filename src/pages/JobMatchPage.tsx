import React, { useState } from 'react';
import { FeaturePage } from '../components/FeaturePage';
import { JobMatchResult, User } from '../types';

interface JobMatchPageProps {
  user: User | null;
  token: string | null;
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

export const JobMatchPage: React.FC<JobMatchPageProps> = ({ user, token }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobMatchResult | null>(null);

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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/job-match', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobDescription }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to compare job description.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeaturePage
      id="job-match-page"
      headline="Target Role Matcher"
      description="Paste a target job description to measure your alignment and reveal gaps."
      actionButton={{
        label: 'Compare Alignment',
        loadingLabel: 'Comparing Alignment...',
        onClick: handleCompare,
        loading,
        disabled: !jobDescription.trim(),
      }}
      secondaryAction={
        !jobDescription.trim()
          ? {
              label: 'Load Sample Staff JD',
              onClick: handleLoadSampleJD,
            }
          : undefined
      }
      hasOutput={!!result}
      output={
        result && (
          <div className="space-y-8">
            {/* Compatibility Summary Card */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-gray-400">
                    Role Match Compatibility
                  </span>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
                      {result.compatibilityScore}%
                    </span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#0066FF] text-white shadow-xs">
                      {result.matchTier}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-700 leading-relaxed">
                <span className="font-bold text-gray-900 block mb-1">Resume Alignment Strategy:</span>
                {result.resumeAdjustmentAdvice}
              </div>
            </div>

            {/* Ranked Skill Gaps */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">
                Ranked Skill & Experience Gaps
              </h2>
              <div className="space-y-3">
                {result.rankedGaps.map((gap, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-gray-200 bg-white space-y-2 shadow-xs hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">
                        {idx + 1}. {gap.skill}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          gap.urgency === 'Critical'
                            ? 'bg-[#0066FF] text-white'
                            : gap.urgency === 'High'
                            ? 'bg-blue-50 text-[#0066FF]'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {gap.urgency}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {gap.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Matched Strong Competencies */}
            <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                Matched Core Requirements
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.matchedSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-medium border border-emerald-100"
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
      {/* 1. Single Primary Textarea */}
      <div className="space-y-2">
        <textarea
          id="job-description-input"
          rows={6}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste job description (responsibilities, required qualifications, tech stack)..."
          className="w-full p-4 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] resize-y leading-relaxed transition-colors"
        />
        {user?.resumeFileName && (
          <p className="text-xs text-gray-400">
            Comparing against: <span className="font-semibold text-gray-700">{user.resumeFileName}</span>
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}
    </FeaturePage>
  );
};
