import React, { useState, useEffect, useRef } from 'react';
import { FeaturePage } from '../components/FeaturePage';
import { AgentExplainer } from '../components/AgentExplainer';
import { InterviewFeedback, InterviewQuestion, User } from '../types';
import { Mic, MicOff } from 'lucide-react';

interface InterviewPageProps {
  user: User | null;
  token: string | null;
  darkMode?: boolean;
}

const DEFAULT_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'q_sys_1',
    role: 'Staff / Senior Software Engineer',
    category: 'System Design',
    difficulty: 'Staff',
    question: 'Design a globally distributed rate limiter that handles 500,000 requests per second across 3 continents with under 5ms latency overhead and strict token-bucket consistency.',
    contextHint: 'Address local edge evaluation vs centralized coordinator sync, split-brain tolerance, and clock skew.',
  },
  {
    id: 'q_lead_1',
    role: 'Engineering Lead / Staff',
    category: 'Behavioral Leadership',
    difficulty: 'Staff',
    question: 'Describe a situation where the product team pushed for a high-priority feature release with known critical architectural debt. How did you handle the conflict, align stakeholders, and protect system reliability?',
    contextHint: 'Structure with STAR-T. Focus on empathy, quantifiable blast-radius analysis, and pragmatic compromise.',
  },
  {
    id: 'q_sys_2',
    role: 'Senior Full-Stack Engineer',
    category: 'Technical Architecture',
    difficulty: 'Senior',
    question: 'How would you architect a real-time collaborative document editor supporting 50 concurrent typists without server merge bottlenecks and maintaining offline resiliency?',
    contextHint: 'Contrast CRDTs with Operational Transformation (OT), WebSocket backpressure, and conflict resolution.',
  },
  {
    id: 'q_hr_1',
    role: 'All Levels',
    category: 'HR & Culture',
    difficulty: 'Mid',
    question: 'Tell me about a time you disagreed with a technical decision made by your team lead. How did you handle it, and what was the outcome?',
    contextHint: 'Focus on professional communication, data-driven arguments, and willingness to commit once a decision is made.',
  },
];

export const InterviewPage: React.FC<InterviewPageProps> = ({ user, token, darkMode }) => {
  const [questions, setQuestions] = useState<InterviewQuestion[]>(DEFAULT_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [streamBuffer, setStreamBuffer] = useState('');
  const recognitionRef = useRef<any>(null);

  const cardBg = darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200';
  const innerCardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = darkMode
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:bg-gray-700'
    : 'bg-gray-50 border-gray-200 focus:bg-white';

  const currentQuestion = questions[currentIndex] || DEFAULT_QUESTIONS[0];

  useEffect(() => {
    fetch('/api/interview/questions')
      .then((r) => r.json())
      .then((data) => {
        if (data.questions?.length > 0) setQuestions(data.questions);
      })
      .catch(() => {});
  }, []);

  const toggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Voice recognition not supported. Please type your answer.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) setUserAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
        setError(null);
      } catch {
        setError('Could not access microphone.');
        setIsRecording(false);
      }
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      setError('Please enter or dictate your answer before submitting.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    setError(null);
    setLoading(true);
    setFeedback(null);
    setStreamBuffer('');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/interview/feedback-stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          questionId: currentQuestion.id,
          questionText: currentQuestion.question,
          userAnswer,
          targetRole: user?.targetRole || 'Staff Software Engineer',
        }),
      });

      if (!response.ok || !response.body) throw new Error('Failed to evaluate answer.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullJsonBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.replace(/^event:\s*/, '').trim();
          } else if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            try {
              const data = JSON.parse(jsonStr);
              if (currentEvent === 'chunk' && data.text) {
                fullJsonBuffer += data.text;
                setStreamBuffer((prev) => prev + data.text);
              } else if (currentEvent === 'complete') {
                if (typeof data.score === 'number') {
                  setFeedback(data);
                  setStreamBuffer('');
                } else if (data.raw) {
                  try {
                    const parsed = JSON.parse(fullJsonBuffer);
                    if (typeof parsed.score === 'number') { setFeedback(parsed); setStreamBuffer(''); }
                  } catch {}
                }
              } else if (currentEvent === 'error') {
                setError(data.message || 'Evaluation failed.');
              } else if (typeof data.score === 'number') {
                // Fallback: complete object without event prefix
                setFeedback(data);
                setStreamBuffer('');
              } else if (data.text) {
                fullJsonBuffer += data.text;
                setStreamBuffer((prev) => prev + data.text);
              }
            } catch {}
            currentEvent = '';
          }
        }
      }

      // Final attempt: parse accumulated buffer
      if (!feedback && fullJsonBuffer) {
        try {
          const parsed = JSON.parse(fullJsonBuffer);
          if (typeof parsed.score === 'number') { setFeedback(parsed); setStreamBuffer(''); }
        } catch {}
      }
    } catch (err: any) {
      setError(err.message || 'Failed to receive interview evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    setFeedback(null);
    setStreamBuffer('');
    setUserAnswer('');
    setError(null);
    setCurrentIndex((prev) => (prev + 1) % questions.length);
  };

  const handleLoadSampleAnswer = () => {
    setUserAnswer(
      `To handle 500k RPS globally with sub-5ms overhead, I would implement a two-tier hybrid rate limiting architecture.
First, at the edge CDN/Gateway tier, each regional proxy cluster uses an in-memory sliding log / token bucket with local state to authorize 99% of requests without blocking network hops.
Second, edge nodes periodically batch sync delta tokens via an asynchronous Redis Cluster with Raft consensus in the nearest region.
In the event of network partition or cross-region split brain, edge nodes fail-open to safe default quotas to prevent cascading outages.`
    );
  };

  const categoryColors: Record<string, string> = {
    'System Design': 'bg-blue-100 text-blue-700',
    'Technical Architecture': 'bg-purple-100 text-purple-700',
    'Behavioral Leadership': 'bg-emerald-100 text-emerald-700',
    'HR & Culture': 'bg-orange-100 text-orange-700',
    'Coding Patterns': 'bg-rose-100 text-rose-700',
  };

  const verdictColor =
    feedback?.verdict === 'Strong Hire'
      ? 'bg-emerald-600'
      : feedback?.verdict === 'Hire'
      ? 'bg-blue-600'
      : feedback?.verdict === 'Leaning Hire'
      ? 'bg-amber-500'
      : 'bg-red-500';

  return (
    <FeaturePage
      id="mock-interview-page"
      headline="Interview Coach Agent"
      description="Practice technical and behavioral interview questions with AI Bar Raiser feedback. Supports voice input."
      agentName="Interview Coach Agent"
      agentDescription="Generates questions, scores answers, and provides model responses"
      actionButton={{
        label: '📝 Submit Answer',
        loadingLabel: 'Interview Coach Agent evaluating...',
        onClick: handleSubmitAnswer,
        loading,
        disabled: !userAnswer.trim(),
      }}
      secondaryAction={
        !userAnswer.trim()
          ? { label: 'Load Sample Staff Answer', onClick: handleLoadSampleAnswer }
          : undefined
      }
      hasOutput={!!feedback || !!streamBuffer}
      darkMode={darkMode}
      output={
        feedback ? (
          <div className="space-y-6">
            {/* Score & Verdict */}
            <div className={`rounded-2xl p-6 sm:p-7 border ${cardBg}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className={`text-[11px] uppercase tracking-widest font-bold ${textMuted}`}>
                    Interview Bar Raiser Score
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-3">
                    <span className={`text-5xl font-extrabold tracking-tight ${textPrimary}`}>
                      {feedback.score}
                    </span>
                    <span className={`text-base font-semibold ${textMuted}`}>/ 100</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${verdictColor}`}>
                      {feedback.verdict}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-5 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/15 self-start sm:self-center"
                >
                  Next Question →
                </button>
              </div>
              {feedback.keyFollowUpTip && (
                <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} text-xs ${textMuted} leading-relaxed`}>
                  <span className={`font-bold ${textPrimary} block mb-0.5`}>Anticipated Follow-up:</span>
                  {feedback.keyFollowUpTip}
                </div>
              )}
            </div>

            {/* AI Explainability */}
            {feedback.agentExplanation && (
              <AgentExplainer explanation={feedback.agentExplanation} darkMode={darkMode} />
            )}

            {/* Strengths & Growth */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-5 rounded-xl border ${innerCardBg}`}>
                <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Key Strengths</h3>
                <ul className="space-y-1.5">
                  {feedback.strengths.map((str, i) => (
                    <li key={i} className={`flex items-start gap-2 text-xs sm:text-sm ${textMuted}`}>
                      <span className="text-emerald-600 font-bold">✓</span>
                      {str}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`p-5 rounded-xl border ${innerCardBg}`}>
                <h3 className={`text-xs font-bold ${textPrimary} uppercase tracking-wider mb-3`}>Areas for Refinement</h3>
                <ul className="space-y-1.5">
                  {feedback.growthAreas.map((gr, i) => (
                    <li key={i} className={`flex items-start gap-2 text-xs sm:text-sm ${textMuted}`}>
                      <span className="text-blue-600 font-bold">▲</span>
                      {gr}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Model Answer */}
            <div className={`p-6 rounded-2xl border ${innerCardBg} space-y-2`}>
              <h3 className={`text-sm font-bold ${textPrimary}`}>Staff-Level Reference Answer</h3>
              <p className={`text-xs sm:text-sm ${textMuted} leading-relaxed whitespace-pre-wrap`}>
                {feedback.improvedAnswerModel}
              </p>
            </div>
          </div>
        ) : streamBuffer ? (
          <div className={`p-6 rounded-2xl border ${cardBg}`}>
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-blue-600">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Interview Coach Agent — evaluating against Staff+ rubric...
            </div>
            <pre className={`text-xs font-mono ${textMuted} whitespace-pre-wrap leading-relaxed`}>
              {streamBuffer}
            </pre>
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        {/* Question Card */}
        <div className={`p-5 rounded-2xl border ${cardBg} space-y-2`}>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className={`font-semibold ${textMuted}`}>
              Question {currentIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${categoryColors[currentQuestion.category] || 'bg-gray-100 text-gray-700'}`}>
                {currentQuestion.category}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white`}>
                {currentQuestion.difficulty}
              </span>
            </div>
          </div>
          <h2 className={`text-sm sm:text-base font-bold ${textPrimary} leading-snug`}>
            {currentQuestion.question}
          </h2>
          {currentQuestion.contextHint && (
            <p className={`text-xs ${textMuted} italic`}>
              Hint: {currentQuestion.contextHint}
            </p>
          )}
        </div>

        {/* Answer Input */}
        <div className="relative">
          <textarea
            id="interview-answer-input"
            rows={6}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your response using the STAR-T framework, or use voice input..."
            className={`w-full p-4 text-sm border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed transition-colors pr-28 ${inputBg}`}
          />
          <button
            type="button"
            onClick={toggleRecording}
            className={`absolute right-3 bottom-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isRecording
                ? 'bg-red-600 text-white animate-pulse'
                : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`
            }`}
          >
            {isRecording ? <MicOff size={12} /> : <Mic size={12} />}
            {isRecording ? 'Stop' : 'Voice'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}
    </FeaturePage>
  );
};
