// SCIP Layout - Government Portal Top Bar
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  User,
  LogOut,
  Settings,
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
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
}
export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onMenuClick,
  isMobileMenuOpen
}) => {
  const { user, role, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mockNotifications = [
    { id: 1, type: 'alert', title: 'New Incident Report', message: 'High priority incident reported in Sector 7', time: '2m ago', read: false },
    { id: 2, type: 'info', title: 'System Update', message: 'SCIP Intelligence Agent v2.1 deployed', time: '1h ago', read: false },
    { id: 3, type: 'success', title: 'Report Verified', message: 'Your report #SCIP-2024-0892 has been verified', time: '3h ago', read: true },
    { id: 4, type: 'warning', title: 'Recurrence Alert', message: 'Pattern detected in Zone 12 - similar to Incident #0847', time: '5h ago', read: true },
  ];
  const unreadCount = mockNotifications.filter(n => !n.read).length;
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(event.target as Node)) {
        setRoleSwitcherOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
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
  const handleRoleSwitch = (newRole: string) => {
    console.log('Switch role to:', newRole);
    setRoleSwitcherOpen(false);
  };
  const handleSignOut = () => {
    logout();
    setUserMenuOpen(false);
  };
  const handleMarkAllRead = () => {
    console.log('Mark all notifications as read');
  };
  const isCitizen = role === 'citizen';
  const isResponder = role === 'responder';
  const isAdmin = role === 'admin' || role === 'superadmin';
  return (
    <header className="h-16 bg-surface border-b border-border sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
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
        {/* Search Input (Desktop) */}
        <div className="hidden lg:flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="search"
              placeholder="Search schemes, services, reports..."
              className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              aria-label="Search schemes and services"
            />
          </div>
        </div>
      </div>
      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
          aria-label="Switch theme"
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
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {mockNotifications.map((notif) => (
                  <button
                    key={notif.id}
                    className="w-full p-3 hover:bg-bg-secondary transition-colors text-left border-b border-border last:border-0"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 mt-2 rounded-full flex-shrink-0 "
                        style={{
                          backgroundColor: notif.type === 'alert' ? 'var(--color-danger)' :
                          notif.type === 'warning' ? 'var(--color-warning)' :
                          notif.type === 'success' ? 'var(--color-success)' : 'var(--color-primary)'
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium " style={{ color: !notif.read ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{notif.message}</p>
                        <p className="text-[10px] text-text-muted mt-1">{notif.time}</p>
                      </div>
                      {!notif.read && <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0 mt-2" />}
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-border">
                <button className="w-full text-sm text-primary hover:text-primary/80 font-medium py-2">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Role Switcher (Demo) */}
        <div className="relative hidden sm:block" ref={roleSwitcherRef}>
          <button
            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
            aria-label="Switch role (demo)"
            aria-expanded={roleSwitcherOpen}
          >
            {isCitizen ? <Flag className="w-4 h-4 text-accent-saffron" /> : isResponder ? <Shield className="w-4 h-4 text-accent-teal" /> : <UserCheck className="w-4 h-4 text-primary" />}
            <span className="capitalize">{role}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {roleSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-surface-elevated border border-border rounded-xl shadow-modal overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
              <button
                onClick={() => handleRoleSwitch('citizen')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
              >
                <Flag className="w-4 h-4 text-accent-saffron" />
                <span>Citizen</span>
                {isCitizen && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
              <button
                onClick={() => handleRoleSwitch('responder')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
              >
                <Shield className="w-4 h-4 text-accent-teal" />
                <span>Responder</span>
                {isResponder && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
              <button
                onClick={() => handleRoleSwitch('admin')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
              >
                <UserCheck className="w-4 h-4 text-primary" />
                <span>Admin</span>
                {isAdmin && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
            </div>
          )}
        </div>
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
                {isCitizen ? <Flag className="w-4 h-4 text-primary" /> : <Shield className="w-4 h-4 text-primary" />}
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
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors">
                    <FileText className="w-4 h-4" />
                    <span>My Reports</span>
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors">
                    <BarChart2 className="w-4 h-4" />
                    <span>Analytics</span>
                  </button>
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
            onClick={() => console.log('Open login')}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};