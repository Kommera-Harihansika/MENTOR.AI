// ============================================================
// AI Career Intelligence Platform — Type Definitions
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  targetRole?: string;
  experienceLevel?: string;
  createdAt: string;
  resumeFileName?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ── Agent Types ──────────────────────────────────────────────

export type AgentName =
  | 'ResumeIntelligenceAgent'
  | 'CareerStrategyAgent'
  | 'JobMatchingAgent'
  | 'InterviewCoachAgent'
  | 'OrchestratorAgent';

export interface AgentThought {
  agent: AgentName;
  step: string;
  reasoning: string;
  confidence: number; // 0-100
}

export interface AgentExplanation {
  agents: AgentThought[];
  orchestratorSummary: string;
}

// ── Resume Intelligence Agent ────────────────────────────────

export interface ResumeAnalysisResult {
  atsScore: number;
  grade: 'Excellent' | 'Competitive' | 'Needs Optimization' | 'Critical Issues';
  summary: string;
  topSuggestions: {
    title: string;
    impact: 'High' | 'Medium' | 'Essential';
    detail: string;
    beforeAfterExample?: {
      before: string;
      after: string;
    };
  }[];
  strengths: string[];
  detectedSkills: string[];
  missingKeywords: string[];
  formattedDate: string;
  // AI Explainability
  agentExplanation?: AgentExplanation;
  // Career Readiness Scores
  skillScores?: { skill: string; score: number }[];
  careerReadinessScore?: number;
}

// ── Job Matching Agent ───────────────────────────────────────

export interface JobMatchResult {
  compatibilityScore: number;
  matchTier: 'Strong Match' | 'Moderate Match' | 'Growth Opportunity';
  matchedSkills: string[];
  rankedGaps: {
    skill: string;
    urgency: 'Critical' | 'High' | 'Nice to have';
    recommendation: string;
  }[];
  resumeAdjustmentAdvice: string;
  agentExplanation?: AgentExplanation;
}

// ── Career Strategy Agent ────────────────────────────────────

export interface RoadmapStep {
  phase: string;
  duration: string;
  milestoneTitle: string;
  description: string;
  keyActions: string[];
  criticalSkillsToLearn: string[];
}

export interface RoadmapResult {
  targetRole: string;
  estimatedTimeline: string;
  summary: string;
  steps: RoadmapStep[];
  agentExplanation?: AgentExplanation;
}

// ── Interview Coach Agent ────────────────────────────────────

export interface InterviewQuestion {
  id: string;
  role: string;
  category: 'System Design' | 'Technical Architecture' | 'Behavioral Leadership' | 'Coding Patterns' | 'HR & Culture';
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Staff' | 'Lead';
  question: string;
  contextHint?: string;
}

export interface InterviewFeedback {
  score: number;
  verdict: 'Strong Hire' | 'Hire' | 'Leaning Hire' | 'Needs Improvement';
  strengths: string[];
  growthAreas: string[];
  improvedAnswerModel: string;
  keyFollowUpTip: string;
  agentExplanation?: AgentExplanation;
}

// ── Chat ─────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

// ── Dashboard ────────────────────────────────────────────────

export interface CareerReadinessReport {
  overallScore: number;
  lastUpdated: string;
  skillBreakdown: { skill: string; score: number; category: string }[];
  missingSkills: string[];
  recommendedActions: { priority: number; action: string; impact: string }[];
  resumeScore?: number;
  jobMatchScore?: number;
  interviewScore?: number;
}

// ── Routes ───────────────────────────────────────────────────

export type NavRoute =
  | 'landing'
  | 'resume'
  | 'job-match'
  | 'roadmap'
  | 'interview'
  | 'chat'
  | 'dashboard'
  | 'architecture'
  | 'enterprise'
  | 'auth';
