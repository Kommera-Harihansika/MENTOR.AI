import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { LandingPage } from './pages/LandingPage';
import { ResumePage } from './pages/ResumePage';
import { JobMatchPage } from './pages/JobMatchPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { InterviewPage } from './pages/InterviewPage';
import { ChatPage } from './pages/ChatPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { EnterprisePage } from './pages/EnterprisePage';
import { DemoScriptModal } from './components/DemoScriptModal';
import { NavRoute, User } from './types';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('landing');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ai_career_mentor_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ai_career_mentor_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ai_career_dark_mode') === 'true';
  });

  // Sync dark mode to body class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ai_career_dark_mode', String(darkMode));
  }, [darkMode]);

  // Validate token on load
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
    setCurrentRoute('dashboard');
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
    } catch {
      setCurrentRoute('resume');
    }
  };

  const bg = darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900';

  return (
    <div className={`min-h-screen flex flex-col ${bg} selection:bg-blue-600 selection:text-white`}>
      <Navigation
        currentRoute={currentRoute}
        onRouteChange={(route) => setCurrentRoute(route)}
        user={user}
        onLogout={handleLogout}
        onOpenDemoScript={() => setIsDemoModalOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
      />

      <main className="flex-1 flex flex-col">
        {currentRoute === 'landing' && (
          <LandingPage
            onNavigate={(route) => setCurrentRoute(route)}
            onQuickDemo={handleQuickDemo}
            darkMode={darkMode}
          />
        )}

        {currentRoute === 'auth' && (
          <AuthPage
            onAuthSuccess={handleAuthSuccess}
            onCancel={() => setCurrentRoute('landing')}
            darkMode={darkMode}
          />
        )}

        {currentRoute === 'dashboard' && (
          <DashboardPage
            user={user}
            token={token}
            onNavigate={(route) => setCurrentRoute(route)}
            darkMode={darkMode}
          />
        )}

        {currentRoute === 'resume' && (
          <ResumePage
            user={user}
            token={token}
            darkMode={darkMode}
            onAnalysisDone={(result) => {
              // Update stored user file name so Job Match shows the correct source
              if (user) {
                const updated = { ...user, resumeFileName: user.resumeFileName || 'Uploaded Resume' };
                setUser(updated);
                localStorage.setItem('ai_career_mentor_user', JSON.stringify(updated));
              }
            }}
          />
        )}

        {currentRoute === 'job-match' && (
          <JobMatchPage
            user={user}
            token={token}
            darkMode={darkMode}
          />
        )}

        {currentRoute === 'roadmap' && (
          <RoadmapPage
            user={user}
            token={token}
            darkMode={darkMode}
          />
        )}

        {currentRoute === 'interview' && (
          <InterviewPage
            user={user}
            token={token}
            darkMode={darkMode}
          />
        )}

        {currentRoute === 'chat' && (
          <ChatPage
            user={user}
            token={token}
            darkMode={darkMode}
          />
        )}

        {currentRoute === 'architecture' && (
          <ArchitecturePage darkMode={darkMode} />
        )}

        {currentRoute === 'enterprise' && (
          <EnterprisePage
            onNavigate={(route) => setCurrentRoute(route)}
            darkMode={darkMode}
          />
        )}
      </main>

      <DemoScriptModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onNavigate={(route) => setCurrentRoute(route)}
      />
    </div>
  );
}
