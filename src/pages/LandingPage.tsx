import React from 'react';
import { NavRoute } from '../types';
import {
  Brain,
  FileText,
  Target,
  Map,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Zap,
  Shield,
  Layers,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (route: NavRoute) => void;
  onQuickDemo: () => void;
  darkMode?: boolean;
}

const AGENTS = [
  {
    icon: <FileText size={20} />,
    name: 'Resume Intelligence',
    description: 'ATS scoring, skill extraction, and improvement suggestions powered by RAG',
    route: 'resume' as NavRoute,
    color: 'from-blue-500 to-blue-600',
    badge: 'Agent 01',
  },
  {
    icon: <Target size={20} />,
    name: 'Job Matching',
    description: 'Semantic compatibility scoring between your profile and any job description',
    route: 'job-match' as NavRoute,
    color: 'from-emerald-500 to-emerald-600',
    badge: 'Agent 02',
  },
  {
    icon: <Map size={20} />,
    name: 'Career Strategy',
    description: 'Personalized multi-phase roadmaps with skills, actions, and timelines',
    route: 'roadmap' as NavRoute,
    color: 'from-purple-500 to-purple-600',
    badge: 'Agent 03',
  },
  {
    icon: <MessageSquare size={20} />,
    name: 'Interview Coach',
    description: 'Mock technical & HR interviews with AI Bar Raiser feedback',
    route: 'interview' as NavRoute,
    color: 'from-orange-500 to-orange-600',
    badge: 'Agent 04',
  },
];

const FEATURES = [
  {
    icon: <Layers size={18} />,
    title: 'Multi-Agent Orchestration',
    description: 'Agents communicate and share context to generate coherent, cross-validated career insights.',
  },
  {
    icon: <Brain size={18} />,
    title: 'RAG Knowledge System',
    description: 'All responses grounded in a curated vector knowledge base — not just raw LLM output.',
  },
  {
    icon: <Shield size={18} />,
    title: 'Explainable AI',
    description: 'Every output includes a transparent breakdown of how the AI reached each conclusion.',
  },
  {
    icon: <Zap size={18} />,
    title: 'Real-time Streaming',
    description: 'Roadmaps, interviews and analysis stream live via SSE — no waiting for full responses.',
  },
];

const DEMO_STEPS = [
  'Upload your resume',
  'AI agents analyze skills & gaps',
  'Match against target job role',
  'Generate personalized roadmap',
  'Mock interview with feedback',
  'Dashboard shows career score',
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onQuickDemo, darkMode }) => {
  const bg = darkMode ? 'bg-gray-950' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const cardBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const featureBg = darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-100';

  return (
    <div className={`w-full ${bg} min-h-screen`}>
      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-8 pt-16 pb-20 text-center">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Agentic AI · RAG · Generative AI · SaaS Platform
        </div>

        <h1 className={`text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight ${textPrimary} leading-[1.1] mb-6`}>
          AI Career Intelligence
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
            Platform
          </span>
        </h1>

        <p className={`text-lg sm:text-xl ${textMuted} leading-relaxed max-w-2xl mx-auto mb-10`}>
          Four specialized AI agents — Resume, Job Match, Career Strategy, and Interview Coach — 
          orchestrated together to accelerate your tech career.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <button
            onClick={() => onNavigate('resume')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
          >
            <Zap size={16} />
            Start AI Analysis
          </button>
          <button
            onClick={onQuickDemo}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold rounded-xl text-sm transition-all border ${
              darkMode
                ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Load Demo Account
            <ArrowRight size={14} />
          </button>
        </div>

        <p className={`text-xs ${textMuted}`}>
          No credit card required · Works with Gemini API · Cloud-ready deployment
        </p>
      </section>

      {/* ── Agent Cards Grid ──────────────────────────────────── */}
      <section className={`w-full border-y ${darkMode ? 'border-gray-800 bg-gray-900/40' : 'border-gray-100 bg-gray-50/60'} py-16`}>
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <p className={`text-xs font-bold uppercase tracking-widest ${textMuted} mb-2`}>
              AI Agents
            </p>
            <h2 className={`text-2xl sm:text-3xl font-extrabold ${textPrimary} tracking-tight`}>
              Four Specialized Agents, One Platform
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AGENTS.map((agent) => (
              <button
                key={agent.route}
                onClick={() => onNavigate(agent.route)}
                className={`group text-left p-5 rounded-2xl border ${cardBg} hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-white shadow-md`}>
                    {agent.icon}
                  </div>
                  <span className={`text-[10px] font-bold ${textMuted} uppercase tracking-wider`}>
                    {agent.badge}
                  </span>
                </div>
                <h3 className={`text-sm font-bold ${textPrimary} mb-1.5`}>{agent.name}</h3>
                <p className={`text-xs ${textMuted} leading-relaxed`}>{agent.description}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:gap-2 transition-all">
                  Open Agent <ChevronRight size={12} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo Flow ─────────────────────────────────────────── */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest text-blue-600 mb-3`}>
              Demo Flow
            </p>
            <h2 className={`text-2xl sm:text-3xl font-extrabold ${textPrimary} tracking-tight mb-4`}>
              End-to-end career
              <br />intelligence in minutes
            </h2>
            <p className={`text-sm ${textMuted} leading-relaxed mb-8`}>
              The platform orchestrates all agents in sequence, building context at each step — 
              from resume upload to interview readiness.
            </p>
            <button
              onClick={onQuickDemo}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all"
            >
              <Zap size={14} />
              Try Demo Flow
            </button>
          </div>

          <div className="space-y-2.5">
            {DEMO_STEPS.map((step, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3.5 rounded-xl border ${featureBg}`}
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                  {idx + 1}
                </div>
                <span className={`text-sm font-semibold ${textPrimary}`}>{step}</span>
                <CheckCircle size={14} className="ml-auto text-blue-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Features ─────────────────────────────────── */}
      <section className={`w-full border-t ${darkMode ? 'border-gray-800 bg-gray-900/40' : 'border-gray-100 bg-gray-50/60'} py-16`}>
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <h2 className={`text-2xl sm:text-3xl font-extrabold ${textPrimary} tracking-tight`}>
              Production-grade AI architecture
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feat, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border ${featureBg}`}>
                <div className={`w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-3`}>
                  {feat.icon}
                </div>
                <h3 className={`text-sm font-bold ${textPrimary} mb-1`}>{feat.title}</h3>
                <p className={`text-xs ${textMuted} leading-relaxed`}>{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Strip ─────────────────────────────────────────── */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-16 text-center">
        <h2 className={`text-2xl sm:text-3xl font-extrabold ${textPrimary} tracking-tight mb-4`}>
          Ready to accelerate your career?
        </h2>
        <p className={`text-sm ${textMuted} mb-8 max-w-md mx-auto`}>
          Upload your resume and let the AI agent network analyze, strategize, and coach you to your next role.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('resume')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all"
          >
            Analyze My Resume
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className={`inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-xl text-sm transition-all border ${
              darkMode
                ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={14} />
            View Dashboard
          </button>
        </div>
      </section>
    </div>
  );
};
