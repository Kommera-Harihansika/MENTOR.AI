import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, User } from '../types';
import { Brain, Send, Zap } from 'lucide-react';

interface ChatPageProps {
  user: User | null;
  token: string | null;
  darkMode?: boolean;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_init',
    sender: 'assistant',
    text: 'Hello! I\'m your AI Career Advisor — I\'m context-aware and remember your resume, skills, and career goals across this session.\n\nAsk me about compensation negotiations, Staff+ promotions, technical strategy, system design, or interview preparation.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

const SUGGESTED_QUESTIONS = [
  'How do I negotiate a Staff Engineer equity grant?',
  'What separates a Senior vs Staff RFC?',
  'How to handle system design trade-offs under high QPS?',
  'What skills should I prioritize for an ML Engineer role?',
  'How do I demonstrate organizational impact at Staff level?',
];

export const ChatPage: React.FC<ChatPageProps> = ({ user, token, darkMode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const bg = darkMode ? 'bg-gray-950' : 'bg-white';
  const chatBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200';
  const userBubble = 'bg-blue-600 text-white rounded-tr-none';
  const assistantBubble = darkMode
    ? 'bg-gray-800 text-gray-100 border border-gray-700 rounded-tl-none'
    : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = darkMode
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:bg-gray-700'
    : 'bg-gray-50 border-gray-200 focus:bg-white';

  const handleSendMessage = async (promptOverride?: string) => {
    const prompt = (promptOverride || inputPrompt).trim();
    if (!prompt || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setIsStreaming(true);
    setError(null);

    const assistantMsgId = `asst_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        sender: 'assistant',
        text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: newMessages,
          userContext: user
            ? `${user.name} (${user.targetRole || 'Senior Engineer'})`
            : 'Senior Tech Engineer',
        }),
      });

      if (!response.ok || !response.body) throw new Error('Failed to start chat stream.');

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

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.replace(/^data:\s*/, '');
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, text: m.text + data.text } : m
                  )
                );
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error receiving response.');
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className={`w-full max-w-[720px] mx-auto px-4 py-8 md:py-10 ${bg}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">AI Career Advisor</span>
          </div>
          <span className={`text-xs ${textMuted} hidden sm:block`}>Context-aware · Remembers your resume & goals</span>
        </div>
        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${textPrimary} leading-snug`}>
          AI Career Advisory Chat
        </h1>
        <p className={`text-sm ${textMuted} mt-1`}>
          Strategic guidance for promotions, negotiations, system design, and interview preparation.
        </p>
      </div>

      {/* Chat Area */}
      <div className={`rounded-2xl border ${chatBg} min-h-[360px] max-h-[500px] overflow-y-auto p-4 sm:p-5 space-y-5 mb-4`}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {msg.sender === 'assistant' && (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Brain size={11} className="text-white" />
                </div>
              )}
              <span className={`text-[11px] font-bold ${textMuted}`}>
                {msg.sender === 'user' ? (user?.name?.split(' ')[0] || 'You') : 'Career Advisor'}
              </span>
              <span className={`text-[10px] ${textMuted}`}>{msg.timestamp}</span>
            </div>
            <div
              className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[88%] whitespace-pre-wrap ${
                msg.sender === 'user' ? userBubble : assistantBubble
              }`}
            >
              {msg.text || (
                <span className="inline-flex items-center gap-1.5 text-gray-400 italic">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse delay-75" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse delay-150" />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Bar */}
      <div className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          id="career-chat-input"
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Ask about Staff promotions, negotiations, system design..."
          className={`flex-1 px-4 py-3 text-sm border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${inputBg}`}
        />
        <button
          id="career-chat-send-btn"
          type="button"
          onClick={() => handleSendMessage()}
          disabled={!inputPrompt.trim() || isStreaming}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-2xl transition-all shadow-md shadow-blue-500/15"
        >
          <Send size={16} />
        </button>
      </div>

      {/* Suggested Questions */}
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendMessage(q)}
            disabled={isStreaming}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors text-left ${
              darkMode
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <Zap size={10} className="inline mr-1 opacity-70" />
            {q}
          </button>
        ))}
      </div>

      {/* Context indicator */}
      {user && (
        <div className={`mt-4 flex items-center gap-2 text-xs ${textMuted}`}>
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          Context: {user.name} · {user.targetRole || 'Engineer'} ·{' '}
          {user.resumeFileName ? `Resume: ${user.resumeFileName}` : 'No resume uploaded'}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}
    </div>
  );
};
