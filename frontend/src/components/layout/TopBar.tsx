// SCIP Layout - Government Portal Top Bar
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/apiClient';
import { Notification } from '../../types/scip';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  User,
  LogOut,
  Shield,
  Flag,
  UserCheck,
  ChevronDown,
  X,
  Check,
  AlertCircle,
  Info,
  Home,
  FileText,
  BarChart2
} from 'lucide-react';

interface TopBarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onToggleMobileSidebar: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onNavigate,
  onToggleMobileSidebar,
  onOpenAuth
}) => {
  const { user, role, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [updatingNotifications, setUpdatingNotifications] = useState(false);
  const notificationRequestInFlight = useRef(false);
  const notificationRequestId = useRef(0);
  const notificationUpdateInFlight = useRef(false);

  const loadNotifications = useCallback(async (signal?: AbortSignal) => {
    if (!user || notificationRequestInFlight.current) return;
    notificationRequestInFlight.current = true;
    const requestId = ++notificationRequestId.current;
    setNotificationsLoading(true);
    setNotificationError(null);
    try {
      const response = await api.getNotifications(signal);
      if (requestId === notificationRequestId.current) setNotifications(response.data);
    } catch (error) {
      if (!signal?.aborted && requestId === notificationRequestId.current) setNotificationError(error instanceof Error ? error.message : 'Unable to load notifications.');
    } finally {
      if (requestId === notificationRequestId.current) {
        notificationRequestInFlight.current = false;
        if (!signal?.aborted) setNotificationsLoading(false);
      }
    }
  }, [user?.id]);

  const unreadCount = notifications.filter(notification => !notification.read).length;

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNotificationError(null);
      setNotificationsLoading(false);
      return;
    }
    const controller = new AbortController();
    void loadNotifications(controller.signal);
    return () => {
      controller.abort();
      notificationRequestId.current += 1;
      notificationRequestInFlight.current = false;
    };
  }, [user?.id, loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTabLabel = (tab: string) => {
    const labels: Record<string, string> = {
      'home': 'Community Home',
      'about': 'About & Charter',
      'citizen-dashboard': 'My Dashboard',
      'submit-report': 'Submit Report',
      'my-reports': 'My Reports',
      'intel-dashboard': 'Intelligence Dashboard',
      'incidents': 'Incident Management',
      'investigation': 'Report Investigation',
      'map': 'Geospatial Intelligence',
      'trends': 'Trends & Recurrence',
      'agent': 'SCIP Intelligence Agent',
      'admin-panel': 'Admin & Audit Trail',
      'tests': '22-Point Audit Suite',
    };
    return labels[tab] || tab;
  };

  const handleSignOut = () => {
    logout();
    setUserMenuOpen(false);
  };

  const navigateFromUserMenu = (tab: string) => {
    onNavigate(tab);
    setUserMenuOpen(false);
  };

  const handleMarkAllRead = async () => {
    if (notificationUpdateInFlight.current) return;
    notificationUpdateInFlight.current = true;
    setUpdatingNotifications(true);
    setNotificationError(null);
    try {
      await api.markAllNotificationsRead();
      setNotifications(current => current.map(notification => ({ ...notification, read: true })));
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Unable to mark notifications as read.');
    } finally {
      notificationUpdateInFlight.current = false;
      setUpdatingNotifications(false);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    if (notificationUpdateInFlight.current) return;
    const notification = notifications.find(item => item.id === id);
    if (!notification || notification.read) return;
    notificationUpdateInFlight.current = true;
    setUpdatingNotifications(true);
    setNotificationError(null);
    try {
      await api.markNotificationRead(id);
      setNotifications(current => current.map(item => item.id === id ? { ...item, read: true } : item));
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Unable to update this notification.');
    } finally {
      notificationUpdateInFlight.current = false;
      setUpdatingNotifications(false);
    }
  };

  const isCitizen = role === 'citizen';
  const isOfficer = role === 'officer';
  const isAuthority = role === 'authority';

  return (
    <header className="h-16 bg-surface border-b border-border sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Government Emblem & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-[10px] font-medium text-primary tracking-wider uppercase">Government of India</div>
            <div className="text-sm font-semibold text-text-primary">SCIP</div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="hidden sm:block h-6 w-px bg-border" />

      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 min-w-[18px] bg-danger text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-elevated border border-border rounded-xl shadow-modal overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => void handleMarkAllRead()}
                    disabled={updatingNotifications}
                    className="text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notificationsLoading ? (
                  <p role="status" className="p-4 text-sm text-text-muted">Loading notifications…</p>
                ) : notificationError ? (
                  <div className="p-4 text-sm text-danger" role="alert"><p>{notificationError}</p><button type="button" onClick={() => void loadNotifications()} className="mt-2 font-semibold underline">Retry</button></div>
                ) : !user ? (
                  <p className="p-4 text-sm text-text-muted">Sign in to view your notifications.</p>
                ) : notifications.length === 0 ? (
                  <p className="p-4 text-sm text-text-muted">No notifications have been returned.</p>
                ) : notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => void handleMarkNotificationRead(notif.id)}
                    className="w-full p-3 hover:bg-bg-secondary transition-colors text-left border-b border-border last:border-0"
                  >
                    <div className="flex items-start gap-2">
                      <div className={getNotificationColor(notif.type)} />
                      <div className="flex-1 min-w-0">
                        <p className={notif.read ? 'text-sm font-medium text-text-secondary' : 'text-sm font-medium text-text-primary'}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{notif.message}</p>
                        <p className="text-[10px] text-text-muted mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                      </div>
                      {!notif.read && <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0 mt-2" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role Badge */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-sm text-text-secondary">
            {isCitizen ? <Flag className="w-4 h-4 text-accent-saffron" /> : isOfficer ? <Shield className="w-4 h-4 text-accent-teal" /> : isAuthority ? <UserCheck className="w-4 h-4 text-accent-amber" /> : <UserCheck className="w-4 h-4 text-primary" />}
            <span className="capitalize">{role}</span>
          </div>
        )}

        {/* User Menu */}
        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
                {isCitizen ? <Flag className="w-4 h-4 text-primary" /> : isOfficer ? <Shield className="w-4 h-4 text-primary" /> : <UserCheck className="w-4 h-4 text-primary" />}
              </div>
              <span className="hidden md:block truncate max-w-[120px]">{user.name}</span>
              <ChevronDown className="w-4 h-4 hidden md:block" />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-elevated border border-border rounded-xl shadow-modal overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                  <p className="text-xs text-text-muted capitalize">{role}</p>
                </div>
                <nav className="py-1">
                  <button onClick={() => navigateFromUserMenu('profile')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  <button onClick={() => navigateFromUserMenu(isCitizen ? 'my-reports' : 'incidents')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors">
                    <FileText className="w-4 h-4" />
                    <span>{isCitizen ? 'My Reports' : 'Incident Management'}</span>
                  </button>
                  {!isCitizen && <button onClick={() => navigateFromUserMenu('intel-dashboard')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors">
                    <BarChart2 className="w-4 h-4" />
                    <span>Intelligence Dashboard</span>
                  </button>}
                </nav>
                <div className="border-t border-border p-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Login Button (when not authenticated) */}
        {!user && (
          <button
            className="btn-primary px-4 py-2 text-sm hidden sm:block"
            onClick={() => onOpenAuth('login')}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};

function getNotificationColor(type: Notification['type']) {
  switch (type) {
    case 'incident_alert': return 'w-2 h-2 mt-2 rounded-full flex-shrink-0 bg-danger';
    case 'assignment': return 'w-2 h-2 mt-2 rounded-full flex-shrink-0 bg-warning';
    case 'resolution': return 'w-2 h-2 mt-2 rounded-full flex-shrink-0 bg-success';
    default: return 'w-2 h-2 mt-2 rounded-full flex-shrink-0 bg-primary';
  }
}