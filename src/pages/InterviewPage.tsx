import React, { useState, useEffect, useRef } from 'react';
import { FeaturePage } from '../components/FeaturePage';
import { InterviewFeedback, InterviewQuestion, User } from '../types';

interface InterviewPageProps {
  user: User | null;
  token: string | null;
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
];

export const InterviewPage: React.FC<InterviewPageProps> = ({ user, token }) => {
  const [questions, setQuestions] = useState<InterviewQuestion[]>(DEFAULT_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [streamBuffer, setStreamBuffer] = useState('');
  const recognitionRef = useRef<any>(null);

  const currentQuestion = questions[currentIndex] || DEFAULT_QUESTIONS[0];

  // Fetch live questions from backend
  useEffect(() => {
    fetch('/api/interview/questions')
      .then((r) => r.json())
      .then((data) => {
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
        }
      })
      .catch(() => {});
  }, []);

  // Voice recording support
  const toggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Voice recognition is not supported in this browser. Please type your answer.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
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
          if (transcript) {
            setUserAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
        setError(null);
      } catch (err: any) {
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

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    setError(null);
    setLoading(true);
    setFeedback(null);
    setStreamBuffer('');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

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

      if (!response.ok || !response.body) {
        throw new Error('Failed to evaluate answer.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data:')) {
            const jsonStr = line.replace(/^data:\s*/, '');
            try {
              const data = JSON.parse(jsonStr);
              if (data.text) {
                setStreamBuffer((prev) => prev + data.text);
              }
              if (data.score !== undefined) {
                setFeedback(data);
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
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

  return (
    <FeaturePage
      id="mock-interview-page"
      headline="Mock Technical Interview"
      description="Practice real-time interview questions tailored to your target seniority level."
      actionButton={{
        label: 'Submit Answer',
        loadingLabel: 'Evaluating Answer...',
        onClick: handleSubmitAnswer,
        loading,
        disabled: !userAnswer.trim(),
      }}
      secondaryAction={
        !userAnswer.trim()
          ? {
              label: 'Load Sample Staff Answer',
              onClick: handleLoadSampleAnswer,
            }
          : undefined
      }
      hasOutput={!!feedback || !!streamBuffer}
      output={
        feedback ? (
          <div className="space-y-8">
            {/* Score & Bar Raiser Verdict */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-gray-400">
                    Interview Bar Raiser Score
                  </span>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
                      {feedback.score}
                    </span>
                    <span className="text-base font-semibold text-gray-400">/ 100</span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#0066FF] text-white shadow-xs">
                      {feedback.verdict}
                    </span>
                  </div>
                </div>

                <button
                  id="next-interview-question-btn"
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-5 py-3 text-xs font-bold text-white bg-[#0066FF] hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/15 self-start sm:self-center cursor-pointer"
                >
                  Next Question →
                </button>
              </div>

              {feedback.keyFollowUpTip && (
                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-700 leading-relaxed">
                  <span className="font-bold text-gray-900 block mb-0.5">Anticipated Follow-up Question:</span>
                  {feedback.keyFollowUpTip}
                </div>
              )}
            </div>

            {/* Strengths & Growth Areas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-xs">
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                  Key Strengths
                </h3>
                <ul className="space-y-1.5 text-xs sm:text-sm text-gray-700">
                  {feedback.strengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold select-none">✓</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-xs">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                  Areas for Refinement
                </h3>
                <ul className="space-y-1.5 text-xs sm:text-sm text-gray-700">
                  {feedback.growthAreas.map((gr, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#0066FF] font-bold select-none">▲</span>
                      <span>{gr}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Optimal Model Answer */}
            <div className="p-6 rounded-2xl border border-gray-200 bg-white space-y-2 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                Staff-Level Reference Answer Model
              </h3>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {feedback.improvedAnswerModel}
              </p>
            </div>
          </div>
        ) : streamBuffer ? (
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[#0066FF]">
              <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-pulse" />
              Evaluating answer against Staff+ rubric...
            </div>
            <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
              {streamBuffer}
            </pre>
          </div>
        ) : null
      }
    >
      {/* 1. Single Question Card + Input Surface */}
      <div className="space-y-4">
        <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
            <span>Question {currentIndex + 1} of {questions.length} • {currentQuestion.category}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0066FF] font-bold text-[11px]">
              {currentQuestion.difficulty} Level
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
            {currentQuestion.question}
          </h2>

          {currentQuestion.contextHint && (
            <p className="text-xs text-gray-500 italic pt-1">
              Hint: {currentQuestion.contextHint}
            </p>
          )}
        </div>

        {/* Answer Text / Voice Input */}
        <div className="relative">
          <textarea
            id="interview-answer-input"
            rows={6}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your response using the STAR-T framework, or click the mic icon to dictate..."
            className="w-full p-4 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] resize-y leading-relaxed transition-colors"
          />

          <button
            type="button"
            onClick={toggleRecording}
            className={`absolute right-3 bottom-4 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              isRecording
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-blue-50 text-[#0066FF] hover:bg-blue-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-[#0066FF]'}`} />
            {isRecording ? 'Listening...' : 'Voice Input'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}
    </FeaturePage>
  );
};
