import React, { useState, useEffect } from 'react';
import { NavRoute, User, CareerReadinessReport } from '../types';
import {
  BarChart3,
  TrendingUp,
  Target,
  CheckCircle,
  AlertCircle,
  Zap,
  FileText,
  Map,
  MessageSquare,
  ArrowRight,
  Brain,
  Award,
} from 'lucide-react';

interface DashboardPageProps {
  user: User | null;
  token: string | null;
  onNavigate: (route: NavRoute) => void;
  darkMode?: boolean;
}

const DEMO_REPORT: CareerReadinessReport = {
  overallScore: 78,
  lastUpdated: 'Aug 22, 2026',
  skillBreakdown: [
    { skill: 'Python', score: 90, category: 'Programming' },
    { skill: 'Machine Learning', score: 75, category: 'AI/ML' },
    { skill: 'System Design', score: 82, category: 'Architecture' },
    { skill: 'React / Frontend', score: 88, category: 'Frontend' },
    { skill: 'Cloud (AWS)', score: 50, category: 'Infrastructure' },
    { skill: 'Generative AI', score: 60, category: 'AI/ML' },
    { skill: 'LangChain / RAG', score: 45, category: 'AI/ML' },
    { skill: 'Docker / Kubernetes', score: 65, category: 'DevOps' },
  ],
  missingSkills: ['AWS Certifications', 'LangChain', 'Docker Advanced', 'OpenTelemetry', 'Terraform IaC'],
  recommendedActions: [
    { priority: 1, action: 'Complete a RAG/LangChain project', impact: 'High — aligns with Generative AI roles' },
    { priority: 2, action: 'Earn AWS Solutions Architect Associate', impact: 'High — required for Staff+ cloud roles' },
    { priority: 3, action: 'Practice 5 Staff-level system design questions', impact: 'Medium — closes interview gap' },
    { priority: 4, action: 'Build a Docker + Kubernetes portfolio project', impact: 'Medium — boosts DevOps score' },
  ],
  resumeScore: 84,
  jobMatchScore: 71,
  interviewScore: 66,
};

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const ScoreRing: React.FC<ScoreRingProps> = ({ score, size = 80, strokeWidth = 8, color = '#2563eb' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  );
};

const SkillBar: React.FC<{ skill: string; score: number; darkMode?: boolean }> = ({ skill, score, darkMode }) => {
  const color =
    score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : 'bg-amber-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{skill}</span>
        <span className={`text-xs font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{score}%</span>
      </div>
      <div className={`h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} overflow-hidden`}>
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, token, onNavigate, darkMode }) => {
  const [report, setReport] = useState<CareerReadinessReport>(DEMO_REPORT);
  const [loading, setLoading] = useState(false);

  const bg = darkMode ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const borderColor = darkMode ? 'border-gray-800' : 'border-gray-200';

  const agentScores = [
    {
      label: 'Resume Agent',
      score: report.resumeScore ?? 0,
      icon: <FileText size={16} />,
      route: 'resume' as NavRoute,
      color: '#2563eb',
    },
    {
      label: 'Job Match Agent',
      score: report.jobMatchScore ?? 0,
      icon: <Target size={16} />,
      route: 'job-match' as NavRoute,
      color: '#059669',
    },
    {
      label: 'Interview Agent',
      score: report.interviewScore ?? 0,
      icon: <MessageSquare size={16} />,
      route: 'interview' as NavRoute,
      color: '#ea580c',
    },
  ];

  return (
    <div className={`w-full min-h-screen ${bg} px-4 sm:px-6 py-8`}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain size={18} className="text-blue-600" />
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Career Intelligence Dashboard
              </span>
            </div>
            <h1 className={`text-2xl font-extrabold ${textPrimary} tracking-tight`}>
              {user ? `${user.name.split(' ')[0]}'s Career Readiness` : 'Career Readiness Report'}
            </h1>
            <p className={`text-xs ${textMuted} mt-0.5`}>
              Last updated {report.lastUpdated} · Powered by AI Agent Network
            </p>
          </div>
          <button
            onClick={() => onNavigate('resume')}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            <Zap size={13} />
            Re-analyze
          </button>
        </div>

        {/* ── Top KPI Row ────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Score */}
          <div className={`col-span-1 sm:col-span-2 lg:col-span-1 p-6 rounded-2xl border ${cardBg} flex items-center gap-5`}>
            <div className="relative flex items-center justify-center">
              <ScoreRing score={report.overallScore} size={80} strokeWidth={8} color="#2563eb" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-extrabold ${textPrimary}`}>{report.overallScore}</span>
                <span className={`text-[9px] font-bold ${textMuted} uppercase tracking-wider`}>Score</span>
              </div>
            </div>
            <div>
              <p className={`text-xs font-bold ${textMuted} uppercase tracking-wider`}>Overall Readiness</p>
              <p className={`text-lg font-extrabold ${textPrimary} mt-0.5`}>
                {report.overallScore >= 85 ? 'Excellent' : report.overallScore >= 70 ? 'Good' : 'Improving'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp size={12} className="text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600">+8 pts this month</span>
              </div>
            </div>
          </div>

          {/* Agent Score Cards */}
          {agentScores.map((ag) => (
            <button
              key={ag.route}
              onClick={() => onNavigate(ag.route)}
              className={`p-5 rounded-2xl border ${cardBg} text-left group hover:border-blue-300 transition-all`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">{ag.icon}</div>
                <ArrowRight size={14} className={`${textMuted} group-hover:text-blue-600 transition-colors`} />
              </div>
              <p className={`text-xs font-semibold ${textMuted}`}>{ag.label}</p>
              <p className={`text-2xl font-extrabold ${textPrimary} mt-0.5`}>{ag.score}<span className={`text-sm font-medium ${textMuted}`}>/100</span></p>
              <div className={`mt-2 h-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} overflow-hidden`}>
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-700"
                  style={{ width: `${ag.score}%` }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* ── Middle Row: Skill Analysis + Missing Skills ────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Skill Analysis */}
          <div className={`lg:col-span-2 p-6 rounded-2xl border ${cardBg} space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-sm font-bold ${textPrimary}`}>Skill Analysis</h2>
              <span className={`text-xs ${textMuted}`}>{report.skillBreakdown.length} skills tracked</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.skillBreakdown.map((item) => (
                <SkillBar key={item.skill} skill={item.skill} score={item.score} darkMode={darkMode} />
              ))}
            </div>
          </div>

          {/* Missing Skills */}
          <div className={`p-6 rounded-2xl border ${cardBg} space-y-4`}>
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-500" />
              <h2 className={`text-sm font-bold ${textPrimary}`}>Missing Skills</h2>
            </div>
            <div className="space-y-2">
              {report.missingSkills.map((skill, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className={`text-xs font-semibold ${textPrimary}`}>{skill}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('roadmap')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              Generate Learning Roadmap
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ── Recommended Actions ────────────────────────────── */}
        <div className={`p-6 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center gap-2 mb-5">
            <Award size={16} className="text-blue-600" />
            <h2 className={`text-sm font-bold ${textPrimary}`}>Recommended Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.recommendedActions.map((action, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}
              >
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {action.priority}
                </div>
                <div>
                  <p className={`text-xs font-bold ${textPrimary}`}>{action.action}</p>
                  <p className={`text-[11px] ${textMuted} mt-0.5`}>{action.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick Navigation to Agents ─────────────────────── */}
        <div className={`p-6 rounded-2xl border ${cardBg}`}>
          <h2 className={`text-sm font-bold ${textPrimary} mb-4`}>Continue with AI Agents</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { route: 'resume' as NavRoute, label: 'Resume Agent', icon: <FileText size={16} />, color: 'bg-blue-50 text-blue-600' },
              { route: 'job-match' as NavRoute, label: 'Job Match', icon: <Target size={16} />, color: 'bg-emerald-50 text-emerald-600' },
              { route: 'roadmap' as NavRoute, label: 'Career Map', icon: <Map size={16} />, color: 'bg-purple-50 text-purple-600' },
              { route: 'interview' as NavRoute, label: 'Interview', icon: <MessageSquare size={16} />, color: 'bg-orange-50 text-orange-600' },
            ].map((item) => (
              <button
                key={item.route}
                onClick={() => onNavigate(item.route)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${borderColor} ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-all`}
              >
                <div className={`p-2.5 rounded-xl ${item.color}`}>{item.icon}</div>
                <span className={`text-xs font-semibold ${textPrimary}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
