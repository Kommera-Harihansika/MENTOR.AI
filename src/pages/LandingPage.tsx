import React from 'react';
import { NavRoute } from '../components/Navigation';

interface LandingPageProps {
  onNavigate: (route: NavRoute) => void;
  onQuickDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onQuickDemo }) => {
  return (
    <div className="w-full max-w-[640px] mx-auto px-4 py-16 sm:py-24 text-center">
      {/* 1. Single Primary Headline */}
      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
        Clarity for your tech career.
      </h1>

      {/* 2. One-line Value Proposition */}
      <p className="mt-4 sm:mt-6 text-base sm:text-lg text-gray-600 leading-relaxed max-w-[520px] mx-auto">
        Dedicated, distraction-free AI guidance for tech resumes, target job alignment, interview practice, and promotion roadmaps.
      </p>

      {/* 3. Single Primary CTA */}
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          id="landing-cta-btn"
          onClick={() => onNavigate('resume')}
          className="w-full sm:w-auto px-8 py-3.5 text-base font-bold text-white bg-[#0066FF] hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 rounded-xl shadow-lg shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:ring-offset-2 cursor-pointer"
        >
          Analyze Your Resume
        </button>

        <button
          id="landing-demo-btn"
          onClick={onQuickDemo}
          className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-150 rounded-xl cursor-pointer"
        >
          Load Instant Tech Demo
        </button>
      </div>

      {/* Quiet Footnote */}
      <p className="mt-16 text-xs text-gray-400">
        Each capability runs on its own dedicated, single-purpose page — no cluttered dashboards.
      </p>
    </div>
  );
};
