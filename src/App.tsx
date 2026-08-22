import React, { useState, useEffect } from 'react';
import { Navigation, NavRoute } from './components/Navigation';
import { LandingPage } from './pages/LandingPage';
import { ResumePage } from './pages/ResumePage';
import { JobMatchPage } from './pages/JobMatchPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { InterviewPage } from './pages/InterviewPage';
import { ChatPage } from './pages/ChatPage';
import { AuthPage } from './pages/AuthPage';
import { DemoScriptModal } from './components/DemoScriptModal';
import { User } from './types';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('landing');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ai_career_mentor_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ai_career_mentor_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Sync token to user session
  useEffect(() => {
    if (token && !user) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('ai_career_mentor_user', JSON.stringify(data.user));
          } else {
            handleLogout();
          }
        })
        .catch(() => {});
    }
  }, [token]);

  const handleAuthSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('ai_career_mentor_token', newToken);
    localStorage.setItem('ai_career_mentor_user', JSON.stringify(newUser));
    setCurrentRoute('resume');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ai_career_mentor_token');
    localStorage.removeItem('ai_career_mentor_user');
    setCurrentRoute('landing');
  };

  const handleQuickDemo = async () => {
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (data.token && data.user) {
        handleAuthSuccess(data.token, data.user);
      }
    } catch (e) {
      setCurrentRoute('resume');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Top Global Navigation Bar */}
      <Navigation
        currentRoute={currentRoute}
        onRouteChange={(route) => setCurrentRoute(route)}
        user={user}
        onLogout={handleLogout}
        onOpenDemoScript={() => setIsDemoModalOpen(true)}
      />

      {/* Main Content Area: Single-Purpose Screen */}
      <main className="flex-1 flex flex-col justify-start">
        {currentRoute === 'landing' && (
          <LandingPage
            onNavigate={(route) => setCurrentRoute(route)}
            onQuickDemo={handleQuickDemo}
          />
        )}

        {currentRoute === 'auth' && (
          <AuthPage
            onAuthSuccess={handleAuthSuccess}
            onCancel={() => setCurrentRoute('landing')}
          />
        )}

        {currentRoute === 'resume' && (
          <ResumePage
            user={user}
            token={token}
          />
        )}

        {currentRoute === 'job-match' && (
          <JobMatchPage
            user={user}
            token={token}
          />
        )}

        {currentRoute === 'roadmap' && (
          <RoadmapPage
            user={user}
            token={token}
          />
        )}

        {currentRoute === 'interview' && (
          <InterviewPage
            user={user}
            token={token}
          />
        )}

        {currentRoute === 'chat' && (
          <ChatPage
            user={user}
            token={token}
          />
        )}
      </main>

      {/* 60-Second Demo Script Guide Modal */}
      <DemoScriptModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onNavigate={(route) => setCurrentRoute(route)}
      />
    </div>
  );
}
