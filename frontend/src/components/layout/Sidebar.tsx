// SCIP Layout - Navigation Sidebar
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Home,
  Info,
  LayoutDashboard,
  FileText,
  BarChart2,
  AlertCircle,
  Search,
  MapPin,
  TrendingUp,
  Bot,
  Settings,
  TestTube,
  ChevronRight,
  ChevronLeft,
  X,
  Menu,
  Shield,
  Flag,
  Users,
  Building2,
  Activity,
  FileQuestion,
  FolderKanban
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

interface NavItem {
  tab: string;
  label: string;
  icon: React.ReactNode;
  roles?: ('citizen' | 'officer' | 'authority' | 'admin')[];
  children?: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  onOpenAuth
}) => {
  const { user, role, isAuthenticated } = useAuth();
  const { mode, toggleTheme } = useTheme();

  const navItems: NavItem[] = [
    { tab: 'home', label: 'Community Home', icon: <Home className="w-5 h-5" /> },
    { tab: 'about', label: 'About & Charter', icon: <Info className="w-5 h-5" /> },
    { tab: 'citizen-dashboard', label: 'My Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['citizen'] },
    { tab: 'submit-report', label: 'Submit Report', icon: <FileText className="w-5 h-5" />, roles: ['citizen'] },
    { tab: 'my-reports', label: 'My Reports', icon: <FolderKanban className="w-5 h-5" />, roles: ['citizen'] },
    { tab: 'intel-dashboard', label: 'Intelligence Dashboard', icon: <BarChart2 className="w-5 h-5" />, roles: ['officer', 'authority', 'admin'] },
    { tab: 'incidents', label: 'Incident Management', icon: <AlertCircle className="w-5 h-5" />, roles: ['officer', 'authority', 'admin'] },
    { tab: 'investigation', label: 'Report Investigation', icon: <FileQuestion className="w-5 h-5" />, roles: ['officer', 'authority', 'admin'] },
    { tab: 'map', label: 'Geospatial Intelligence', icon: <MapPin className="w-5 h-5" />, roles: ['officer', 'authority', 'admin'] },
    { tab: 'trends', label: 'Trends & Recurrence', icon: <TrendingUp className="w-5 h-5" />, roles: ['officer', 'authority', 'admin'] },
    { tab: 'agent', label: 'SCIP Intelligence Agent', icon: <Bot className="w-5 h-5" />, roles: ['authority', 'admin'] },
    { tab: 'admin-panel', label: 'Admin & Audit Trail', icon: <Settings className="w-5 h-5" />, roles: ['admin'] },
    { tab: 'tests', label: '22-Point Audit Suite', icon: <TestTube className="w-5 h-5" />, roles: ['admin'] },
  ];

  const filteredItems = navItems.filter(item => {
    if (item.tab === 'tests' && !import.meta.env.DEV) return false;
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(role);
  });

  const isActive = (tab: string) => currentTab === tab;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border
          transform transition-transform duration-300 ease-in-out lg:transform-none
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-medium text-primary tracking-wider uppercase">Government of India</div>
              <div className="text-sm font-semibold text-text-primary">SCIP</div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 rounded-lg text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" role="navigation" aria-label="Main navigation">
          {filteredItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => {
                onNavigate(item.tab);
                onCloseMobile();
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive(item.tab)
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                }
              `}
              aria-current={isActive(item.tab) ? 'page' : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
              {isActive(item.tab) && <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-3">
          {/* User Info / Auth */}
          {user ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                {role === 'citizen' ? <Flag className="w-4 h-4 text-primary" /> : <Shield className="w-4 h-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                <p className="text-xs text-text-muted capitalize">{role}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 px-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="w-full btn-primary py-2 text-sm"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="w-full btn-outline py-2 text-sm"
              >
                Create Account
              </button>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {mode === 'dark' ? <Activity className="w-5 h-5 text-warning" /> : <Activity className="w-5 h-5 text-text-secondary" />}
            <span>{mode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </aside>
    </>
  );
};