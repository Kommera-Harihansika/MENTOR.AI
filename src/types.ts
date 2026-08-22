export interface User {
  id: string;
  email: string;
  name: string;
  targetRole?: string;
  experienceLevel?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

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
}

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
}

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
}

export interface InterviewQuestion {
  id: string;
  role: string;
  category: 'System Design' | 'Technical Architecture' | 'Behavioral Leadership' | 'Coding Patterns';
  difficulty: 'Senior' | 'Staff' | 'Lead';
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
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
