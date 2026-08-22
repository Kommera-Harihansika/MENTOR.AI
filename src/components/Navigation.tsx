import React, { useState } from 'react';
import { NavRoute, User } from '../types';
import {
  Brain,
  FileText,
  Target,
  Map,
  MessageSquare,
  BarChart3,
  Building2,
  Cpu,
  LogIn,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronRight,
} from 'lucide-react';

interface NavigationProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  user: User | null;
  onLogout: () => void;
  onOpenDemoScript: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

interface NavItem {
  route: NavRoute;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  group?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentRoute,
  onRouteChange,
  user,
  onLogout,
  onOpenDemoScript,
  darkMode = false,
  onToggleDarkMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      route: 'resume',
      label: 'Resume Agent',
      icon: <FileText size={16} />,
      group: 'Agents',
    },
    {
      route: 'job-match',
      label: 'Job Match Agent',
      icon: <Target size={16} />,
      group: 'Agents',
    },
    {
      route: 'roadmap',
      label: 'Career Strategy Agent',
      icon: <Map size={16} />,
      group: 'Agents',
    },
    {
      route: 'interview',
      label: 'Interview Coach Agent',
      icon: <MessageSquare size={16} />,
      badge: 'New',
      group: 'Agents',
    },
    {
      route: 'chat',
      label: 'AI Advisor',
      icon: <Brain size={16} />,
      group: 'Agents',
    },
    {
      route: 'dashboard',
      label: 'Career Dashboard',
      icon: <BarChart3 size={16} />,
      group: 'Insights',
    },
    {
      route: 'enterprise',
      label: 'Enterprise',
      icon: <Building2 size={16} />,
      group: 'Platform',
    },
    {
      route: 'architecture',
      label: 'Architecture',
      icon: <Cpu size={16} />,
      group: 'Platform',
    },
  ];

  const bg = darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-100';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50';
  const activeBg = darkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-[#0066FF]';
  const mobileBg = darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-100';

  return (
    <>
      {/* Top Navigation Bar */}
      <header className={`sticky top-0 z-30 w-full ${bg} border-b shadow-sm`}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Brand */}
          <button
            onClick={() => onRouteChange('landing')}
            className="flex items-center gap-2.5 group focus:outline-none shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md shadow-blue-500/25">
              <Brain size={16} className="text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className={`text-sm font-extrabold tracking-tight ${textPrimary} group-hover:text-blue-600 transition-colors`}>
                CareerAI
              </span>
              <span className={`text-[10px] font-medium ${textMuted} leading-tight`}>
                Intelligence Platform
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => onRouteChange(item.route)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? activeBg
                      : `${textMuted} ${hoverBg} hover:${textPrimary}`
                  }`}
                >
                  {item.icon}
                  {item.label}
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Dark Mode Toggle */}
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-lg ${hoverBg} ${textMuted} transition-colors`}
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            )}

            {/* Demo Script */}
            <button
              onClick={onOpenDemoScript}
              className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                darkMode
                  ? 'border-gray-700 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                  : 'border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              <Zap size={12} />
              Demo
            </button>

            {/* Auth */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className={`hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full ${
                  darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-50 text-gray-800 border border-gray-100'
                }`}>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  {user.name.split(' ')[0]}
                </div>
                <button
                  onClick={onLogout}
                  className={`p-2 rounded-lg ${hoverBg} ${textMuted} transition-colors`}
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onRouteChange('auth')}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
              >
                <LogIn size={13} />
                Sign In
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-lg ${hoverBg} ${textMuted} transition-colors`}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className={`lg:hidden ${mobileBg} border-t shadow-lg`}>
            <div className="px-4 py-3 space-y-1 max-h-[80vh] overflow-y-auto">
              {/* Group: Agents */}
              <p className={`text-[10px] font-bold uppercase tracking-widest ${textMuted} px-2 pt-2 pb-1`}>
                AI Agents
              </p>
              {navItems.filter(i => i.group === 'Agents').map((item) => {
                const isActive = currentRoute === item.route;
                return (
                  <button
                    key={item.route}
                    onClick={() => { onRouteChange(item.route); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive ? activeBg : `${textMuted} ${hoverBg}`
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </span>
                    <ChevronRight size={14} className="opacity-40" />
                  </button>
                );
              })}

              <p className={`text-[10px] font-bold uppercase tracking-widest ${textMuted} px-2 pt-3 pb-1`}>
                Insights & Platform
              </p>
              {navItems.filter(i => i.group !== 'Agents').map((item) => {
                const isActive = currentRoute === item.route;
                return (
                  <button
                    key={item.route}
                    onClick={() => { onRouteChange(item.route); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive ? activeBg : `${textMuted} ${hoverBg}`
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </span>
                    <ChevronRight size={14} className="opacity-40" />
                  </button>
                );
              })}

              {/* Auth section */}
              <div className="pt-3 pb-2 border-t border-gray-200 mt-2">
                {user ? (
                  <button
                    onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${textMuted} ${hoverBg}`}
                  >
                    <LogOut size={15} />
                    Sign Out ({user.name.split(' ')[0]})
                  </button>
                ) : (
                  <button
                    onClick={() => { onRouteChange('auth'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <LogIn size={15} />
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
