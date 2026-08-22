import React from 'react';
import { User } from '../types';

export type NavRoute = 'landing' | 'resume' | 'job-match' | 'roadmap' | 'interview' | 'chat' | 'auth';

interface NavigationProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  user: User | null;
  onLogout: () => void;
  onOpenDemoScript: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentRoute,
  onRouteChange,
  user,
  onLogout,
  onOpenDemoScript,
}) => {
  const navItems: { route: NavRoute; label: string }[] = [
    { route: 'resume', label: 'Resume' },
    { route: 'job-match', label: 'Job Match' },
    { route: 'roadmap', label: 'Roadmap' },
    { route: 'interview', label: 'Interview' },
    { route: 'chat', label: 'Chat' },
  ];

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-100">
      <div className="w-full max-w-6xl mx-auto px-6 sm:px-12 py-4 flex items-center justify-between">
        {/* Left: Brand Name */}
        <div className="flex items-center gap-10">
          <button
            id="nav-logo-btn"
            onClick={() => onRouteChange('landing')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <span className="text-base sm:text-lg font-bold tracking-tight uppercase text-gray-900 group-hover:text-[#0066FF] transition-colors">
              AI Career Mentor
            </span>
          </button>

          {/* Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  id={`nav-link-${item.route}`}
                  onClick={() => onRouteChange(item.route)}
                  className={`text-sm transition-colors cursor-pointer py-1 ${
                    isActive
                      ? 'font-semibold text-[#0066FF]'
                      : 'font-medium text-gray-400 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Active Session Status & Auth / Demo Script */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-900 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>{user ? user.name.split(' ')[0] : 'Active Session'}</span>
          </div>

          <button
            id="nav-demo-script-btn"
            onClick={onOpenDemoScript}
            className="text-xs font-medium text-gray-500 hover:text-[#0066FF] px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors"
          >
            60s Guide
          </button>

          {user ? (
            <button
              id="nav-logout-btn"
              onClick={onLogout}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <button
              id="nav-login-btn"
              onClick={() => onRouteChange('auth')}
              className={`text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                currentRoute === 'auth'
                  ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/20'
                  : 'text-[#0066FF] bg-blue-50 hover:bg-blue-100'
              }`}
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-Nav */}
      <div className="md:hidden flex items-center justify-around px-2 py-2 border-t border-gray-100 bg-white overflow-x-auto text-xs">
        {navItems.map((item) => {
          const isActive = currentRoute === item.route;
          return (
            <button
              key={item.route}
              onClick={() => onRouteChange(item.route)}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                isActive
                  ? 'text-[#0066FF] bg-blue-50 font-semibold'
                  : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
