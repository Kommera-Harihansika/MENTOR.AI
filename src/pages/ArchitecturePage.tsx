import React, { useState } from 'react';
import {
  Cpu,
  Database,
  Cloud,
  Globe,
  Brain,
  Layers,
  ArrowDown,
  ArrowRight,
  FileText,
  Target,
  Map,
  MessageSquare,
  Server,
  Shield,
  Zap,
} from 'lucide-react';

interface ArchitecturePageProps {
  darkMode?: boolean;
}

const ARCH_LAYERS = [
  {
    id: 'frontend',
    label: 'Frontend Layer',
    color: 'from-blue-500 to-blue-600',
    icon: <Globe size={18} />,
    components: [
      { name: 'React 19', detail: 'Component Framework' },
      { name: 'Tailwind CSS 4', detail: 'UI Styling' },
      { name: 'Motion', detail: 'Animations' },
      { name: 'Lucide Icons', detail: 'Icon System' },
    ],
    description: 'SPA with SSE streaming for real-time AI output. Mobile-first responsive design.',
  },
  {
    id: 'api',
    label: 'API Gateway Layer',
    color: 'from-purple-500 to-purple-600',
    icon: <Server size={18} />,
    components: [
      { name: 'Express.js', detail: 'REST API Server' },
      { name: 'JWT Auth', detail: 'Authentication' },
      { name: 'Multer', detail: 'File Upload' },
      { name: 'SSE Streaming', detail: 'Real-time Output' },
    ],
    description: 'RESTful API with JWT authentication, background task queue, and SSE streaming.',
  },
  {
    id: 'agents',
    label: 'AI Agent Orchestration Layer',
    color: 'from-orange-500 to-orange-600',
    icon: <Brain size={18} />,
    components: [
      { name: 'Resume Agent', detail: 'ATS & Skill Analysis' },
      { name: 'Job Match Agent', detail: 'Compatibility Scoring' },
      { name: 'Career Strategy Agent', detail: 'Roadmap Generation' },
      { name: 'Interview Coach Agent', detail: 'Mock Interviews & Feedback' },
    ],
    description: 'Multi-agent orchestrator shares context across agents for coherent, cross-validated responses.',
    highlight: true,
  },
  {
    id: 'rag',
    label: 'RAG Knowledge Layer',
    color: 'from-emerald-500 to-emerald-600',
    icon: <Database size={18} />,
    components: [
      { name: 'Document Upload', detail: 'Resume, JD, Projects' },
      { name: 'Text Chunking', detail: 'Semantic Splitting' },
      { name: 'Embedding Generation', detail: 'Vector Representations' },
      { name: 'FAISS / Vector DB', detail: 'Semantic Search' },
    ],
    description: 'All AI responses grounded in retrieved knowledge — reducing hallucinations and improving accuracy.',
  },
  {
    id: 'ai',
    label: 'Generative AI Layer',
    color: 'from-rose-500 to-rose-600',
    icon: <Zap size={18} />,
    components: [
      { name: 'Gemini 2.5 Flash', detail: 'Primary Model' },
      { name: 'Model Fallback Chain', detail: 'Reliability' },
      { name: 'Circuit Breaker', detail: 'Quota Protection' },
      { name: 'JSON Mode', detail: 'Structured Outputs' },
    ],
    description: 'Google Gemini API with multi-model fallback, quota circuit breaker, and structured JSON responses.',
  },
  {
    id: 'cloud',
    label: 'Cloud Infrastructure',
    color: 'from-sky-500 to-sky-600',
    icon: <Cloud size={18} />,
    components: [
      { name: 'AWS / GCP', detail: 'Cloud Provider' },
      { name: 'Docker', detail: 'Containerization' },
      { name: 'Environment Vars', detail: 'Secret Management' },
      { name: 'In-Memory Store', detail: 'Session & Tasks' },
    ],
    description: 'Cloud-ready with Docker containerization, environment-based config, and horizontal scalability.',
  },
];

const AGENTS = [
  {
    name: 'Resume Intelligence Agent',
    icon: <FileText size={14} />,
    responsibilities: ['Parse & extract skills', 'ATS compatibility scoring', 'Before/after suggestions', 'Keyword gap detection'],
    color: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    name: 'Job Matching Agent',
    icon: <Target size={14} />,
    responsibilities: ['Analyze job descriptions', 'Compare with resume', 'Calculate compatibility %', 'Rank skill gaps by urgency'],
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    name: 'Career Strategy Agent',
    icon: <Map size={14} />,
    responsibilities: ['Understand career goals', 'Analyze current skills', 'Create phased roadmap', 'Recommend technologies'],
    color: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  {
    name: 'Interview Coach Agent',
    icon: <MessageSquare size={14} />,
    responsibilities: ['Generate tech & HR questions', 'Conduct mock interviews', 'Score with Bar Raiser rubric', 'Provide improvement feedback'],
    color: 'border-orange-200 bg-orange-50 text-orange-700',
  },
];

const RAG_PIPELINE = [
  { step: 'Document Upload', desc: 'Resume, JDs, Project Docs' },
  { step: 'Text Extraction', desc: 'Parse raw content' },
  { step: 'Semantic Chunking', desc: 'Split into meaningful units' },
  { step: 'Embedding Generation', desc: 'Convert to vector space' },
  { step: 'Vector Storage', desc: 'FAISS in-memory index' },
  { step: 'Semantic Retrieval', desc: 'Top-k similarity search' },
  { step: 'Gemini Response', desc: 'Grounded generation' },
];

export const ArchitecturePage: React.FC<ArchitecturePageProps> = ({ darkMode }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'rag'>('overview');

  const bg = darkMode ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const tabActive = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900 shadow-sm';
  const tabInactive = darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700';
  const borderColor = darkMode ? 'border-gray-800' : 'border-gray-200';

  return (
    <div className={`w-full min-h-screen ${bg} px-4 sm:px-6 py-8`}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={16} className="text-blue-600" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Technical Architecture</span>
          </div>
          <h1 className={`text-2xl font-extrabold ${textPrimary} tracking-tight`}>
            System Architecture Overview
          </h1>
          <p className={`text-sm ${textMuted} mt-1`}>
            Production-grade Agentic AI SaaS architecture with RAG, multi-agent orchestration, and cloud-ready deployment
          </p>
        </div>

        {/* Tabs */}
        <div className={`flex items-center gap-1 p-1 rounded-xl ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} w-fit`}>
          {(['overview', 'agents', 'rag'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all capitalize ${
                activeTab === tab ? tabActive : tabInactive
              }`}
            >
              {tab === 'rag' ? 'RAG Pipeline' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ─────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {ARCH_LAYERS.map((layer, idx) => (
              <div key={layer.id}>
                <div
                  className={`p-5 rounded-2xl border ${cardBg} ${
                    layer.highlight ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Label */}
                    <div className="flex items-center gap-3 sm:w-52 shrink-0">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${layer.color} flex items-center justify-center text-white shadow-md shrink-0`}>
                        {layer.icon}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${textPrimary}`}>{layer.label}</p>
                        {layer.highlight && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Core</span>
                        )}
                      </div>
                    </div>

                    {/* Components */}
                    <div className="flex flex-wrap gap-2 flex-1">
                      {layer.components.map((comp) => (
                        <div
                          key={comp.name}
                          className={`flex flex-col px-3 py-2 rounded-xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'} border`}
                        >
                          <span className={`text-xs font-bold ${textPrimary}`}>{comp.name}</span>
                          <span className={`text-[10px] ${textMuted}`}>{comp.detail}</span>
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    <p className={`text-xs ${textMuted} leading-relaxed sm:max-w-[200px] shrink-0`}>
                      {layer.description}
                    </p>
                  </div>
                </div>

                {idx < ARCH_LAYERS.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown size={16} className="text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Agents Tab ────────────────────────────────────── */}
        {activeTab === 'agents' && (
          <div className="space-y-5">
            {/* Orchestrator */}
            <div className={`p-5 rounded-2xl border-2 border-blue-300 ${cardBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white">
                  <Brain size={18} />
                </div>
                <div>
                  <p className={`text-sm font-extrabold ${textPrimary}`}>Orchestrator Agent</p>
                  <p className={`text-xs ${textMuted}`}>Coordinates all specialized agents and maintains shared context</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Context Management', 'Agent Communication', 'Response Synthesis', 'Cross-validation'].map((cap) => (
                  <div key={cap} className={`text-xs font-semibold px-3 py-2 rounded-lg text-center ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-blue-50 text-blue-700'}`}>
                    {cap}
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowDown size={20} className="text-blue-300" />
            </div>

            {/* Four Agents Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {AGENTS.map((agent) => (
                <div key={agent.name} className={`p-5 rounded-2xl border ${cardBg}`}>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold mb-3 ${agent.color}`}>
                    {agent.icon}
                    {agent.name}
                  </div>
                  <ul className="space-y-1.5">
                    {agent.responsibilities.map((r, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span className={`text-xs ${textMuted}`}>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Communication note */}
            <div className={`p-4 rounded-xl border ${darkMode ? 'border-blue-800 bg-blue-900/20' : 'border-blue-100 bg-blue-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Shield size={14} className="text-blue-600" />
                <span className={`text-xs font-bold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Agent Communication Pattern</span>
              </div>
              <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'} leading-relaxed`}>
                The Orchestrator maintains a shared context object containing resume data, skills, career goals, and prior agent outputs. 
                Each agent receives this context before generating responses, enabling coherent, non-redundant insights across the pipeline.
              </p>
            </div>
          </div>
        )}

        {/* ── RAG Pipeline Tab ─────────────────────────────── */}
        {activeTab === 'rag' && (
          <div className="space-y-5">
            {/* Pipeline Visual */}
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <h2 className={`text-sm font-bold ${textPrimary} mb-5`}>RAG Pipeline: Document → Response</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
                {RAG_PIPELINE.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <div className={`flex flex-col items-center p-3 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} min-w-[100px] text-center`}>
                      <span className={`text-xs font-bold ${textPrimary}`}>{item.step}</span>
                      <span className={`text-[10px] ${textMuted} mt-0.5`}>{item.desc}</span>
                    </div>
                    {idx < RAG_PIPELINE.length - 1 && (
                      <ArrowRight size={14} className="text-gray-300 shrink-0 hidden sm:block" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Knowledge Base */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border ${cardBg}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Database size={16} className="text-emerald-600" />
                  <h3 className={`text-sm font-bold ${textPrimary}`}>Knowledge Base Topics</h3>
                </div>
                <div className="space-y-2">
                  {[
                    'ATS Optimization Heuristics',
                    'Staff vs Senior Engineering Gap',
                    'Interview STAR-T Framework',
                    'Cloud Architecture Patterns',
                    'System Design Best Practices',
                    'Compensation & Negotiation',
                  ].map((topic, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <CheckIcon />
                      {topic}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`p-5 rounded-2xl border ${cardBg}`}>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={16} className="text-blue-600" />
                  <h3 className={`text-sm font-bold ${textPrimary}`}>Supported Document Types</h3>
                </div>
                <div className="space-y-2.5">
                  {[
                    { type: 'Resumes', formats: 'PDF, DOCX, TXT', icon: '📄' },
                    { type: 'Job Descriptions', formats: 'Paste or upload', icon: '🎯' },
                    { type: 'Project Documents', formats: 'PDF, MD, TXT', icon: '📁' },
                    { type: 'Learning Resources', formats: 'PDF, DOCX', icon: '📚' },
                  ].map((doc, i) => (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <span className="text-lg">{doc.icon}</span>
                      <div>
                        <p className={`text-xs font-bold ${textPrimary}`}>{doc.type}</p>
                        <p className={`text-[10px] ${textMuted}`}>{doc.formats}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tech Stack */}
            <div className={`p-5 rounded-2xl border ${darkMode ? 'border-blue-800 bg-blue-900/20' : 'border-blue-100 bg-blue-50'}`}>
              <h3 className={`text-sm font-bold ${darkMode ? 'text-blue-200' : 'text-blue-800'} mb-3`}>RAG Technology Stack</h3>
              <div className="flex flex-wrap gap-2">
                {['Google Gemini API', 'FAISS Vector DB', 'LangChain (Architecture)', 'Text Embeddings', 'Semantic Chunking', 'Keyword Matching'].map((tech) => (
                  <span
                    key={tech}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full ${darkMode ? 'bg-blue-800/50 text-blue-200' : 'bg-blue-100 text-blue-700'}`}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-emerald-500">
    <circle cx="6" cy="6" r="6" fill="currentColor" fillOpacity="0.15" />
    <path d="M3.5 6L5 7.5L8.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
