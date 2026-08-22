import React, { useState, useRef } from 'react';
import { FeaturePage } from '../components/FeaturePage';
import { AgentExplainer } from '../components/AgentExplainer';
import { ResumeAnalysisResult, User } from '../types';
import { Upload, FileText } from 'lucide-react';

interface ResumePageProps {
  user: User | null;
  token: string | null;
  onAnalysisDone?: (result: ResumeAnalysisResult) => void;
  darkMode?: boolean;
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

export const ResumePage: React.FC<ResumePageProps> = ({ user, token, onAnalysisDone, darkMode }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardBg = darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200';
  const innerCardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = darkMode ? 'bg-gray-800 border-gray-700 text-white focus:bg-gray-700' : 'bg-gray-50 border-gray-200 focus:bg-white';

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
    setStatusMessage('Resume Intelligence Agent — uploading resume...');
    setResult(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('resume', file);
      } else {
        formData.append('resumeText', pastedText);
      }

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const uploadRes = await fetch('/api/resume/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to initiate resume analysis');

      const taskId = uploadData.taskId;
      setStatusMessage('Resume Intelligence Agent — extracting competencies & ATS tokens...');

      let attempts = 0;
      const maxAttempts = 30;

      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const taskRes = await fetch(`/api/tasks/${taskId}`);
          const taskData = await taskRes.json();

          if (taskData.status === 'processing') {
            setStatusMessage(`Resume Intelligence Agent — scoring against Staff+ rubric (${taskData.progress || 50}%)...`);
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

  const gradeColor =
    result?.grade === 'Excellent'
      ? 'bg-emerald-600'
      : result?.grade === 'Competitive'
      ? 'bg-blue-600'
      : result?.grade === 'Needs Optimization'
      ? 'bg-amber-500'
      : 'bg-red-600';

  return (
    <FeaturePage
      id="resume-analysis-page"
      headline="Resume Intelligence Agent"
      description="Upload your resume for deep ATS analysis, skill extraction, and AI-powered optimization using RAG-grounded evaluation."
      agentName="Resume Intelligence Agent"
      agentDescription="Analyzes ATS compatibility, detects skills, and generates improvements"
      actionButton={{
        label: '🤖 Run AI Analysis',
        loadingLabel: statusMessage || 'Analyzing Resume...',
        onClick: handleAnalyze,
        loading,
        disabled: !file && !pastedText.trim(),
      }}
      secondaryAction={
        !file && !pastedText.trim()
          ? { label: 'Load Senior Tech Resume Preset', onClick: handleLoadSample }
          : undefined
      }
      hasOutput={!!result}
      darkMode={darkMode}
      output={
        result && (
          <div className="space-y-6">
            {/* ATS Score Header */}
            <div className={`rounded-2xl p-6 sm:p-7 border ${cardBg}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className={`text-[11px] uppercase tracking-widest font-bold ${textMuted}`}>
                    ATS Readiness Score
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-3">
                    <span className={`text-5xl font-extrabold tracking-tight ${textPrimary}`}>
                      {result.atsScore}
                    </span>
                    <span className={`text-base font-semibold ${textMuted}`}>/ 100</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${gradeColor}`}>
                      {result.grade}
                    </span>
                  </div>
                </div>
                {result.careerReadinessScore && (
                  <div className={`px-4 py-3 rounded-xl border ${innerCardBg} text-center`}>
                    <p className={`text-[11px] font-bold ${textMuted} uppercase tracking-wider`}>Career Readiness</p>
                    <p className={`text-2xl font-extrabold ${textPrimary}`}>{result.careerReadinessScore}%</p>
                  </div>
                )}
              </div>
              <p className={`mt-4 text-sm ${textMuted} leading-relaxed border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-4`}>
                {result.summary}
              </p>
            </div>

            {/* AI Explainability */}
            {result.agentExplanation && (
              <AgentExplainer explanation={result.agentExplanation} darkMode={darkMode} />
            )}

            {/* Skill Scores (if available) */}
            {result.skillScores && result.skillScores.length > 0 && (
              <div className={`p-5 rounded-2xl border ${cardBg}`}>
                <h3 className={`text-sm font-bold ${textPrimary} mb-4`}>Skill Proficiency Analysis</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.skillScores.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between">
                        <span className={`text-xs font-semibold ${textPrimary}`}>{item.skill}</span>
                        <span className={`text-xs font-bold ${textMuted}`}>{item.score}%</span>
                      </div>
                      <div className={`h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} overflow-hidden`}>
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            item.score >= 80 ? 'bg-emerald-500' : item.score >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top 3 Suggestions */}
            <div>
              <h2 className={`text-base font-bold ${textPrimary} mb-3`}>
                Top 3 High-Impact Optimizations
              </h2>
              <div className="space-y-3">
                {result.topSuggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    className={`p-5 rounded-xl border ${innerCardBg} space-y-3 hover:border-blue-300 transition-colors`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-sm font-bold ${textPrimary}`}>
                        {idx + 1}. {sug.title}
                      </h3>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        sug.impact === 'Essential' ? 'bg-red-100 text-red-700' :
                        sug.impact === 'High' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {sug.impact} Priority
                      </span>
                    </div>
                    <p className={`text-xs sm:text-sm ${textMuted} leading-relaxed`}>{sug.detail}</p>
                    {sug.beforeAfterExample && (
                      <div className="space-y-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'} text-xs">
                        <div className="p-3 bg-red-50/80 border border-red-100 rounded-xl text-red-900">
                          <span className="font-bold block mb-0.5 text-[10px] text-red-600 uppercase tracking-wider">Before:</span>
                          "{sug.beforeAfterExample.before}"
                        </div>
                        <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-xl text-emerald-900">
                          <span className="font-bold block mb-0.5 text-[10px] text-emerald-700 uppercase tracking-wider">After:</span>
                          "{sug.beforeAfterExample.after}"
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-5 rounded-xl border ${innerCardBg}`}>
                <h3 className={`text-xs font-bold ${textPrimary} uppercase tracking-wider mb-3`}>
                  Detected Competencies
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.detectedSkills.map((sk, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-semibold">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
              <div className={`p-5 rounded-xl border ${innerCardBg}`}>
                <h3 className={`text-xs font-bold ${textPrimary} uppercase tracking-wider mb-3`}>
                  Missing Keywords
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.missingKeywords.map((kw, i) => (
                    <span key={i} className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
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
      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full p-10 sm:p-14 text-center rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/50'
            : file || pastedText
            ? 'border-blue-400/60 bg-blue-50/20'
            : `${darkMode ? 'bg-gray-900 border-gray-700 hover:border-blue-500' : 'bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-blue-50/20'}`
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
          {file ? (
            <>
              <FileText size={28} className="text-blue-500" />
              <div className={`text-sm font-bold ${textPrimary}`}>{file.name}</div>
              <p className={`text-xs ${textMuted}`}>{(file.size / 1024).toFixed(1)} KB · Click to replace</p>
            </>
          ) : pastedText ? (
            <>
              <FileText size={28} className="text-blue-500" />
              <div className={`text-sm font-bold ${textPrimary}`}>Senior Tech Resume Preset Loaded</div>
              <p className={`text-xs ${textMuted}`}>{pastedText.split('\n').length} lines of structured resume text</p>
            </>
          ) : (
            <>
              <Upload size={28} className={textMuted} />
              <div className={`text-sm font-bold ${textPrimary}`}>Drop your resume here or click to browse</div>
              <p className={`text-xs ${textMuted}`}>Supports PDF, DOCX, TXT, MD · Max 10MB</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 text-xs bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-3 text-red-900">
          <div>
            <span className="font-bold block mb-0.5">Analysis Notice:</span>
            <p className="text-red-700 leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleAnalyze}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shrink-0 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </FeaturePage>
  );
};
