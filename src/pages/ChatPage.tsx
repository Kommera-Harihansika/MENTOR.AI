import React, { useState, useRef, useEffect } from 'react';
import { FeaturePage } from '../components/FeaturePage';
import { ChatMessage, User } from '../types';

interface ChatPageProps {
  user: User | null;
  token: string | null;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_init',
    sender: 'assistant',
    text: 'Hello. I am your AI Career Mentor. Ask me anything about compensation negotiations, Staff/Principal engineering promotions, technical RFCs, or interview strategy.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

export const ChatPage: React.FC<ChatPageProps> = ({ user, token }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSendMessage = async () => {
    if (!inputPrompt.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: inputPrompt.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setIsStreaming(true);
    setError(null);

    const assistantMsgId = `asst_${Date.now()}`;
    const placeholderAssistant: ChatMessage = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, placeholderAssistant]);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: newMessages,
          userContext: user ? `${user.name} (${user.targetRole || 'Senior Engineer'})` : 'Senior Tech Engineer',
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start chat stream.');
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
            const dataStr = line.replace(/^data:\s*/, '');
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, text: m.text + data.text } : m
                  )
                );
              }
            } catch (e) {
              // Ignore non-json lines
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error receiving mentor response.');
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <FeaturePage
      id="career-chat-page"
      headline="AI Career Advisory Chat"
      description="Direct, distraction-free strategic guidance for negotiations, promotions, and system design."
    >
      <div className="space-y-4">
        {/* Messages Stream Container */}
        <div className="p-4 sm:p-6 rounded-2xl border border-gray-200 bg-white min-h-[320px] max-h-[460px] overflow-y-auto space-y-4 shadow-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-gray-400">
                  {msg.sender === 'user' ? 'You' : 'Career Mentor'}
                </span>
                <span className="text-[10px] text-gray-300">{msg.timestamp}</span>
              </div>
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[90%] whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-[#0066FF] text-white rounded-tr-none shadow-xs'
                    : 'bg-gray-50 text-gray-800 border border-gray-200 rounded-tl-none'
                }`}
              >
                {msg.text || (
                  <span className="inline-flex items-center gap-1.5 text-gray-400 italic">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF] animate-pulse" />
                    Synthesizing advice...
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="flex gap-2 items-center">
          <input
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
            placeholder="Ask about Staff promos, FAANG offer negotiations, RFCs..."
            className="flex-1 px-4 py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-[#0066FF] transition-colors"
          />

          <button
            id="career-chat-send-btn"
            type="button"
            onClick={handleSendMessage}
            disabled={!inputPrompt.trim() || isStreaming}
            className="px-6 py-3.5 text-sm font-bold text-white bg-[#0066FF] hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-2xl transition-all shadow-md shadow-blue-500/15 cursor-pointer"
          >
            Send
          </button>
        </div>

        {/* Quick Question Prompts */}
        <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
          {[
            'How do I negotiate a Staff Engineer equity grant?',
            'What separates a Senior vs Staff RFC?',
            'How to handle system design trade-offs under high QPS?',
          ].map((promptText, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInputPrompt(promptText)}
              className="text-[11px] font-semibold text-[#0066FF] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors text-left cursor-pointer"
            >
              {promptText}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}
      </div>
    </FeaturePage>
  );
};
