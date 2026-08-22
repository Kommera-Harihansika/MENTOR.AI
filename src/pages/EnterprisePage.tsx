import React from 'react';
import { NavRoute } from '../types';
import {
  Building2,
  GraduationCap,
  Briefcase,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Users,
  BarChart3,
  ArrowRight,
  Zap,
  Target,
  Shield,
} from 'lucide-react';

interface EnterprisePageProps {
  onNavigate: (route: NavRoute) => void;
  darkMode?: boolean;
}

const SEGMENTS = [
  {
    icon: <GraduationCap size={24} />,
    title: 'Universities & Colleges',
    subtitle: 'Placement Preparation',
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
    problem: 'Students lack structured preparation for technical interviews and resume optimization, leading to poor placement rates.',
    solution: 'AI Career Intelligence Platform provides each student with personalized resume coaching, job matching, and mock interview practice — at scale.',
    impact: [
      '40% improvement in placement rate (projected)',
      'Automated skill gap analysis for entire cohorts',
      'Track student readiness with real-time dashboards',
      "Personalized roadmaps for each student's target role",
    ],
    roi: 'Higher placement rates directly increase alumni satisfaction and institutional rankings.',
    targetMetric: '3x faster career preparation cycle',
  },
  {
    icon: <Briefcase size={24} />,
    title: 'Enterprises & Startups',
    subtitle: 'Candidate Screening & Development',
    color: 'from-purple-500 to-purple-600',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-700',
    problem: 'Recruiting teams spend weeks manually screening resumes and conducting initial technical assessments, increasing cost-per-hire.',
    solution: 'Deploy our AI agents to automate resume scoring, skill gap identification, and candidate-role compatibility matching before human review.',
    impact: [
      '60% reduction in initial screening time',
      'Objective ATS + AI compatibility scoring',
      'Automated skill gap reports per candidate',
      'Interview readiness assessment before calls',
    ],
    roi: 'Reducing cost-per-hire by 30-40% while improving quality of shortlisted candidates.',
    targetMetric: '5x faster initial screening pipeline',
  },
  {
    icon: <BookOpen size={24} />,
    title: 'Training Institutes',
    subtitle: 'Personalized Learning Paths',
    color: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    problem: 'One-size-fits-all curriculum fails learners with different skill levels and career goals, reducing course completion and job outcomes.',
    solution: 'The Career Strategy Agent analyzes each learner\'s current skills and generates a personalized curriculum roadmap aligned to their target role.',
    impact: [
      'Personalized learning paths for each student',
      'Skills gap identification per cohort',
      'Progress tracking with career readiness scores',
      'Interview prep integrated into curriculum',
    ],
    roi: 'Higher course completion rates and better job outcomes increase referrals and revenue.',
    targetMetric: '2x improvement in student job placement',
  },
];

const PLATFORM_CAPABILITIES = [
  {
    icon: <BarChart3 size={16} />,
    title: 'Analytics Dashboard',
    description: 'Real-time cohort skill analysis, readiness scores, and progress tracking',
  },
  {
    icon: <Users size={16} />,
    title: 'Multi-tenant Architecture',
    description: 'Isolated data per organization with enterprise SSO integration',
  },
  {
    icon: <Shield size={16} />,
    title: 'Enterprise Security',
    description: 'SOC 2 ready architecture, data encryption, and role-based access control',
  },
  {
    icon: <Zap size={16} />,
    title: 'API Integration',
    description: 'REST APIs to integrate with existing LMS, ATS, and HR platforms',
  },
  {
    icon: <Target size={16} />,
    title: 'Custom AI Personas',
    description: 'White-label the AI agents with your organization\'s branding and knowledge base',
  },
  {
    icon: <TrendingUp size={16} />,
    title: 'ROI Reporting',
    description: 'Automated reports showing placement rates, skill improvement, and hiring efficiency',
  },
];

export const EnterprisePage: React.FC<EnterprisePageProps> = ({ onNavigate, darkMode }) => {
  const bg = darkMode ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const featureBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100';

  return (
    <div className={`w-full min-h-screen ${bg}`}>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-8 pt-14 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold mb-8">
          <Building2 size={12} />
          Enterprise Solutions
        </div>
        <h1 className={`text-3xl sm:text-4xl font-extrabold ${textPrimary} tracking-tight mb-4`}>
          AI Career Intelligence
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            for Organizations
          </span>
        </h1>
        <p className={`text-base sm:text-lg ${textMuted} max-w-2xl mx-auto mb-8`}>
          Deploy our multi-agent AI platform to transform career preparation, candidate screening, 
          and talent development at scale.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('resume')}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all"
          >
            Try Free Demo
            <ArrowRight size={14} />
          </button>
          <button
            onClick={() => onNavigate('architecture')}
            className={`inline-flex items-center gap-2 px-6 py-3.5 font-semibold rounded-xl text-sm transition-all border ${
              darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            View Architecture
          </button>
        </div>
      </section>

      {/* ── Segments ─────────────────────────────────────── */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-8 pb-16 space-y-6">
        {SEGMENTS.map((seg, idx) => (
          <div key={idx} className={`p-6 sm:p-8 rounded-2xl border ${cardBg}`}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Header */}
              <div className="lg:col-span-1">
                <div className={`inline-flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br ${seg.color} text-white mb-4`}>
                  {seg.icon}
                </div>
                <h2 className={`text-xl font-extrabold ${textPrimary} mb-1`}>{seg.title}</h2>
                <p className={`text-xs font-bold ${textMuted} uppercase tracking-wider mb-3`}>{seg.subtitle}</p>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                  darkMode ? 'bg-gray-800 text-gray-300' : `${seg.bgLight} ${seg.textColor}`
                }`}>
                  <TrendingUp size={11} />
                  {seg.targetMetric}
                </div>
              </div>

              {/* Problem / Solution */}
              <div className="lg:col-span-2 space-y-4">
                <div className={`p-4 rounded-xl border ${featureBg}`}>
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${textMuted} mb-1`}>Problem</p>
                  <p className={`text-sm ${textPrimary} leading-relaxed`}>{seg.problem}</p>
                </div>

                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-blue-400' : 'text-blue-700'} mb-1`}>Our Solution</p>
                  <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-900'} leading-relaxed`}>{seg.solution}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {seg.impact.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span className={`text-xs ${textMuted} leading-relaxed`}>{item}</span>
                    </div>
                  ))}
                </div>

                <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>Business Impact: </span>
                  <span className={`text-xs ${textPrimary}`}>{seg.roi}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Platform Capabilities ───────────────────────── */}
      <section className={`w-full border-t ${darkMode ? 'border-gray-800 bg-gray-900/40' : 'border-gray-100 bg-gray-50/80'} py-16`}>
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <h2 className={`text-2xl font-extrabold ${textPrimary} tracking-tight`}>
              Enterprise Platform Capabilities
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORM_CAPABILITIES.map((cap, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border ${cardBg}`}>
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  {cap.icon}
                </div>
                <h3 className={`text-sm font-bold ${textPrimary} mb-1`}>{cap.title}</h3>
                <p className={`text-xs ${textMuted} leading-relaxed`}>{cap.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-16 text-center">
        <h2 className={`text-2xl font-extrabold ${textPrimary} mb-4`}>
          Ready to deploy AI Career Intelligence?
        </h2>
        <p className={`text-sm ${textMuted} mb-8 max-w-lg mx-auto`}>
          Start with the demo to see the platform in action, then explore the architecture for technical evaluation.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('resume')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all"
          >
            <Zap size={14} />
            Try Platform Demo
          </button>
          <button
            onClick={() => onNavigate('architecture')}
            className={`inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-xl text-sm transition-all border ${
              darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Technical Architecture
            <ArrowRight size={14} />
          </button>
        </div>
      </section>
    </div>
  );
};
