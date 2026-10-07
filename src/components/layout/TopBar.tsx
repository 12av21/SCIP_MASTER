// SCIP Layout - Enterprise Light Top Navigation Bar
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ThemeStudioModal } from '../theme/ThemeStudioModal';
import { api } from '../../services/apiClient';
import { Notification, UserRole } from '../../types/scip';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  FileText,
  User as UserIcon,
  LogOut,
  Sparkles,
  ChevronDown,
  Palette
} from 'lucide-react';

interface TopBarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onToggleMobileSidebar: () => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onNavigate,
  onToggleMobileSidebar,
  onOpenAuth
}) => {
  const { user, role, switchDemoRole, logout } = useAuth();
  const { activeTheme, isThemeStudioOpen, openThemeStudio, closeThemeStudio } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res && res.data) {
        setNotifications(res.data);
      }
    } catch {
      // Ignore network errors
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getBreadcrumbLabel = (tab: string) => {
    switch (tab) {
      case 'home': return 'Public Portal / Community Home';
      case 'about': return 'Platform / Responsible AI Charter';
      case 'citizen-dashboard': return 'Citizen Portal / My Dashboard';
      case 'submit-report': return 'Citizen Portal / Submit Report';
      case 'my-reports': return 'Citizen Portal / My Observations';
      case 'intel-dashboard': return 'Operations / Intelligence Dashboard';
      case 'incidents': return 'Operations / Incident Review & Queue';
      case 'investigation': return 'Operations / Report Investigation';
      case 'map': return 'Geospatial / City Intelligence Map';
      case 'trends': return 'Analytics / Trends & Recurrence';
      case 'agent': return 'SCIP Agent / Multi-Tool Console';
      case 'admin-panel': return 'Administration / Governance & Audit';
      case 'tests': return 'Verification / 22-Point Audit Suite';
      default: return 'SCIP / Intelligence Platform';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Zone 1: Mobile Hamburger + Brand Wordmark */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
          aria-label="Toggle Navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            SC
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-base tracking-tight leading-none">
              SCIP
            </div>
            <div className="text-[10px] text-emerald-600/90 font-medium tracking-wide leading-none mt-0.5 hidden sm:block">
              Community Intelligence Platform
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center text-xs text-slate-400 font-medium pl-3 border-l border-slate-200">
          <span className="text-slate-700 font-medium">{getBreadcrumbLabel(currentTab)}</span>
        </div>
      </div>

      {/* Zone 2 & 3: Role Switcher, System Audit CTA, Notification Center & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {user ? (
          <>
            {/* Quick Role Persona Switcher (For seamless testing across citizen/officer/authority/admin) */}
            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-emerald-50/60 hover:bg-emerald-100/70 rounded-lg border border-emerald-200/80 transition-colors cursor-pointer"
                title="Switch active role to test access control"
              >
                <span className="text-slate-500 font-normal">Role:</span>
                <span className="font-semibold uppercase tracking-wider text-emerald-700 text-[11px]">{role}</span>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-emerald-100 py-1 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Switch Test Persona
                  </div>
                  {(['citizen', 'officer', 'authority', 'admin'] as UserRole[]).map(r => (
                    <button
                      key={r}
                      onClick={() => {
                        switchDemoRole(r);
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50/60 transition-colors cursor-pointer ${role === r ? 'font-semibold text-emerald-700 bg-emerald-50' : 'text-slate-700'}`}
                    >
                      <span className="capitalize">{r}</span>
                      {role === r && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-600 rounded-full" />
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-900">Notifications ({notifications.length})</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">No notifications</div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            api.markNotificationRead(notif.id);
                            if (notif.link?.startsWith('INC')) {
                              onNavigate('incidents');
                            } else if (notif.link?.startsWith('REP')) {
                              onNavigate('my-reports');
                            }
                            setIsNotifOpen(false);
                          }}
                          className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${!notif.read ? 'bg-indigo-50/30' : ''}`}
                        >
                          <div className="font-medium text-slate-900 flex items-center justify-between">
                            <span>{notif.title}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1 line-clamp-2">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 text-xs font-semibold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden xl:block text-left text-xs">
                  <div className="font-medium text-slate-900 leading-none">{user?.name || 'User'}</div>
                  <div className="text-[10px] text-slate-500 leading-none mt-1 capitalize">{role}</div>
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-semibold text-slate-900">{user?.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold uppercase mt-0.5">{role}</div>
                  </div>
                  <button
                    onClick={() => {
                      onNavigate(role === 'citizen' ? 'my-reports' : 'admin-panel');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Account Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                      onNavigate('home');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth && onOpenAuth('signup')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Quick Audit Suite Action */}
        <button
          onClick={() => onNavigate('tests')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Audit Tests</span>
        </button>

        {/* Theme & Palette Studio */}
        <button
          onClick={openThemeStudio}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all hover:shadow-xs cursor-pointer"
          style={{
            backgroundColor: activeTheme.primaryLight,
            borderColor: activeTheme.primaryBorder,
            color: activeTheme.primary
          }}
          title="Inspect Color Theme & Copy to Your Project"
        >
          <span
            className="w-2.5 h-2.5 rounded-full ring-1 ring-white shrink-0"
            style={{ backgroundColor: activeTheme.primary }}
          />
          <span className="hidden sm:inline font-semibold">Theme</span>
          <Palette className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Theme Studio & Project Exporter Modal */}
      <ThemeStudioModal isOpen={isThemeStudioOpen} onClose={closeThemeStudio} />
    </header>
  );
};
