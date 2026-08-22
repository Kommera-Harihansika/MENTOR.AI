import React, { useState } from 'react';
import { User } from '../types';
import { Brain, LogIn, UserPlus } from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess: (token: string, user: User) => void;
  onCancel?: () => void;
  darkMode?: boolean;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, onCancel, darkMode }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('Staff Software Engineer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageBg = darkMode ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const labelColor = darkMode ? 'text-gray-300' : 'text-gray-700';
  const inputBg = darkMode
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:bg-gray-750'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white';
  const dividerColor = darkMode ? 'border-gray-800' : 'border-gray-100';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { email, password } : { email, password, name, targetRole };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');
      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Could not load demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full min-h-[80vh] flex items-center justify-center px-4 py-12 ${pageBg}`}>
      <div className={`w-full max-w-[420px] rounded-2xl border shadow-sm p-6 sm:p-8 ${cardBg}`}>
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md shadow-blue-500/25 mb-3">
            <Brain size={20} className="text-white" />
          </div>
          <h1 className={`text-xl font-extrabold tracking-tight ${textPrimary}`}>
            {isLogin ? 'Sign in to CareerAI' : 'Create your account'}
          </h1>
          <p className={`mt-1.5 text-xs ${textMuted} text-center max-w-[280px] leading-relaxed`}>
            {isLogin
              ? 'Access your resume analysis, job match reports, and interview history.'
              : 'Start your AI-powered career acceleration journey.'}
          </p>
        </div>

        {/* Demo account shortcut */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full mb-5 py-3 px-4 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Continue with Demo Account (Alex Chen)
        </button>

        <div className={`relative flex items-center gap-3 mb-5`}>
          <div className={`flex-1 h-px ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
          <span className={`text-[11px] font-semibold ${textMuted} uppercase tracking-wider`}>or</span>
          <div className={`flex-1 h-px ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
        </div>

        {error && (
          <div className="mb-4 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className={`block text-xs font-semibold ${labelColor} mb-1.5`}>Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${inputBg}`}
              />
            </div>
          )}

          <div>
            <label className={`block text-xs font-semibold ${labelColor} mb-1.5`}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${inputBg}`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold ${labelColor} mb-1.5`}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${inputBg}`}
            />
          </div>

          {!isLogin && (
            <div>
              <label className={`block text-xs font-semibold ${labelColor} mb-1.5`}>Target Role</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Staff Software Engineer"
                className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${inputBg}`}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-blue-500/15 flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : isLogin ? (
              <LogIn size={15} />
            ) : (
              <UserPlus size={15} />
            )}
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className={`mt-5 pt-5 border-t ${dividerColor} text-center`}>
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className={`text-xs font-semibold ${textMuted} hover:text-blue-600 transition-colors`}
          >
            {isLogin ? "Don't have an account? Sign up free" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
