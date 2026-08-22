import React, { useState, useRef } from 'react';
import { FeaturePage } from '../components/FeaturePage';
import { ResumeAnalysisResult, User } from '../types';

interface ResumePageProps {
  user: User | null;
  token: string | null;
  onAnalysisDone?: (result: ResumeAnalysisResult) => void;
}

const SAMPLE_SENIOR_RESUME = `Alex Chen - Senior Full-Stack Engineer
alex.chen@techmentor.dev | San Francisco, CA | linkedin.com/in/alexchen

SUMMARY
Senior Software Engineer with 6+ years designing high-throughput distributed microservices, React web applications, and resilient cloud architectures.

EXPERIENCE
Horizon Cloud — Senior Software Engineer (2021 – Present)
• Re-architected core messaging pipelines serving 4.5M DAU, slashing p99 API latency by 38%.
• Led a team of 6 engineers to build React 18 real-time monitoring dashboard with optimistic UI updates.
• Optimized Redis cluster caching strategies and batched PostgreSQL queries, saving $140k/yr in AWS costs.
• Authored comprehensive RFC on cross-service idempotency and event streaming reliability.

NextGen Systems — Software Engineer (2018 – 2021)
• Built scalable Node.js and Go microservices processing 120M events/day via Apache Kafka.
• Implemented automated CI/CD pipelines with Docker and Kubernetes, reducing release cycles from weekly to daily.
• Mentored 3 junior developers and conducted 40+ technical interviews.

SKILLS
TypeScript, React, Node.js, Go, Python, Distributed Systems, Kubernetes, Docker, AWS, Redis, PostgreSQL, Kafka.`;

export const ResumePage: React.FC<ResumePageProps> = ({ user, token, onAnalysisDone }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPastedText('');
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setPastedText('');
      setError(null);
    }
  };

  const handleLoadSample = () => {
    setPastedText(SAMPLE_SENIOR_RESUME);
    setFile(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file && !pastedText.trim()) {
      setError('Please select a resume file or paste your resume content.');
      return;
    }

    setError(null);
    setLoading(true);
    setStatusMessage('Uploading resume...');
    setResult(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('resume', file);
      } else {
        formData.append('resumeText', pastedText);
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 1. Kick off background analysis task
      const uploadRes = await fetch('/api/resume/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to initiate resume analysis');
      }

      const taskId = uploadData.taskId;
      setStatusMessage('Extracting competencies & parsing ATS tokens...');

      // 2. Poll for background task completion
      let attempts = 0;
      const maxAttempts = 30;

      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const taskRes = await fetch(`/api/tasks/${taskId}`);
          const taskData = await taskRes.json();

          if (taskData.status === 'processing') {
            setStatusMessage(`Scoring against Staff+ engineering rubric (${taskData.progress || 50}%)...`);
          } else if (taskData.status === 'completed') {
            clearInterval(pollInterval);
            setResult(taskData.result);
            setLoading(false);
            setStatusMessage('');
            if (onAnalysisDone) onAnalysisDone(taskData.result);
          } else if (taskData.status === 'failed') {
            clearInterval(pollInterval);
            throw new Error(taskData.error || 'Resume analysis failed.');
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            throw new Error('Analysis timed out. Please try again.');
          }
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          setError(pollErr.message || 'Error checking analysis status.');
          setLoading(false);
        }
      }, 700);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <FeaturePage
      id="resume-analysis-page"
      headline="Resume Analysis & Feedback"
      description="Upload your resume to get AI-powered feedback and optimization suggestions."
      actionButton={{
        label: 'Run AI Analysis',
        loadingLabel: statusMessage || 'Analyzing...',
        onClick: handleAnalyze,
        loading,
        disabled: !file && !pastedText.trim(),
      }}
      secondaryAction={
        !file && !pastedText.trim()
          ? {
              label: 'Load Senior Tech Resume Preset',
              onClick: handleLoadSample,
            }
          : undefined
      }
      hasOutput={!!result}
      output={
        result && (
          <div className="space-y-8">
            {/* ATS Score Header */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-gray-400">
                    ATS Readiness Score
                  </span>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
                      {result.atsScore}
                    </span>
                    <span className="text-base font-semibold text-gray-400">/ 100</span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#0066FF] text-white shadow-xs">
                      {result.grade}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-gray-400 block font-medium">Evaluated</span>
                  <span className="text-xs font-semibold text-gray-800">{result.formattedDate}</span>
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-700 leading-relaxed border-t border-gray-200/80 pt-4">
                {result.summary}
              </p>
            </div>

            {/* Top 3 High-Impact Suggestions */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">
                Top 3 High-Impact Optimizations
              </h2>
              <div className="space-y-4">
                {result.topSuggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-gray-200 bg-white space-y-3 shadow-xs hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-gray-900">
                        {idx + 1}. {sug.title}
                      </h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0066FF]">
                        {sug.impact} Priority
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {sug.detail}
                    </p>

                    {sug.beforeAfterExample && (
                      <div className="mt-3 space-y-2 pt-3 border-t border-gray-100 text-xs">
                        <div className="p-3 bg-red-50/70 border border-red-100 rounded-lg text-red-950">
                          <span className="font-bold block mb-1 text-[11px] text-red-700 uppercase tracking-wider">Weak Phrasing:</span>
                          "{sug.beforeAfterExample.before}"
                        </div>
                        <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg text-emerald-950">
                          <span className="font-bold block mb-1 text-[11px] text-emerald-800 uppercase tracking-wider">Optimized Metric Phrasing:</span>
                          "{sug.beforeAfterExample.after}"
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Keyword Density & Skills Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-xs">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Detected Competencies
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.detectedSkills.map((sk, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 bg-blue-50 text-[#0066FF] rounded-lg font-medium"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-xs">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Missing Staff-Level Keywords
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.missingKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg font-medium"
                    >
                      + {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      }
    >
      {/* 1. Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full p-12 sm:p-16 text-center rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          isDragOver
            ? 'border-[#0066FF] bg-blue-50/50'
            : file || pastedText
            ? 'border-[#0066FF]/60 bg-blue-50/20'
            : 'bg-gray-50 border-gray-200 hover:border-[#0066FF] hover:bg-blue-50/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          {file ? (
            <>
              <div className="text-base font-semibold text-gray-900">
                Selected: {file.name}
              </div>
              <p className="text-xs font-medium text-gray-400">
                {(file.size / 1024).toFixed(1)} KB • Click or drop to replace
              </p>
            </>
          ) : pastedText ? (
            <>
              <div className="text-base font-semibold text-gray-900">
                Senior Tech Resume Preset Loaded
              </div>
              <p className="text-xs font-medium text-gray-400">
                {pastedText.split('\n').length} lines of structured resume text
              </p>
            </>
          ) : (
            <>
              <div className="text-gray-800 font-semibold text-base sm:text-lg">
                Drop your resume here or click to browse
              </div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1 font-medium">
                Supports PDF and DOCX (Max 5MB)
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-[11px] font-bold text-gray-300 uppercase tracking-widest mt-2">
        <div className="h-px w-8 bg-gray-200"></div>
        SECURE UPLOAD
        <div className="h-px w-8 bg-gray-200"></div>
      </div>

      {error && (
        <div className="mt-4 p-4 text-xs bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-900">
          <div>
            <span className="font-bold block mb-0.5">Analysis Notice:</span>
            <p className="text-red-700 leading-relaxed">
              {error.includes('503') || error.includes('UNAVAILABLE') || error.includes('high demand')
                ? 'The AI model is experiencing high demand. Automatic retry will process or click retry below.'
                : error.replace(/^[{"'\s]+error["':\s]+/i, '').replace(/[}"'\s]+$/i, '')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAnalyze}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            Retry Analysis
          </button>
        </div>
      )}
    </FeaturePage>
  );
};
