// SCIP Layout - Enterprise Light Sidebar Navigation
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Home,
  Info,
  LayoutDashboard,
  PlusCircle,
  ListOrdered,
  Radio,
  AlertOctagon,
  Search,
  MapPin,
  TrendingUp,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  X,
  Palette,
  Shield
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  onOpenAuth
}) => {
  const { user, role, hasPermission } = useAuth();
  const { activeTheme, openThemeStudio } = useTheme();

  const handleNav = (tab: string) => {
    if (!user && tab !== 'home' && tab !== 'about' && tab !== 'tests') {
      if (onOpenAuth) onOpenAuth('login');
      onCloseMobile();
      return;
    }
    onNavigate(tab);
    onCloseMobile();
  };

  const isOfficerOrAbove = role === 'officer' || role === 'authority' || role === 'admin';
  const isAuthorityOrAbove = role === 'authority' || role === 'admin';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 z-40 h-full w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="lg:hidden h-16 flex items-center justify-between px-4 border-b border-slate-200">
          <div className="font-semibold text-slate-900 text-sm">Navigation Menu</div>
          <button onClick={onCloseMobile} className="p-1 text-slate-500 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Guest Sign-in Banner */}
          {!user && (
            <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Guest Access</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                Sign in to submit reports or access operational dashboards.
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={() => {
                    onCloseMobile();
                    if (onOpenAuth) onOpenAuth('login');
                  }}
                  className="flex-1 py-1 text-center text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onCloseMobile();
                    if (onOpenAuth) onOpenAuth('signup');
                  }}
                  className="flex-1 py-1 text-center text-xs font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {/* Public Group */}
          <div>
            <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              General
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleNav('home')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'home'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Home className={`w-4 h-4 shrink-0 ${currentTab === 'home' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Public Portal</span>
              </button>
              <button
                onClick={() => handleNav('about')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'about'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Info className={`w-4 h-4 shrink-0 ${currentTab === 'about' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>About & Responsible AI</span>
              </button>
            </nav>
          </div>

          {/* Citizen Portal Group */}
          <div>
            <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Citizen Reporting
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleNav('citizen-dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'citizen-dashboard'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${currentTab === 'citizen-dashboard' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Citizen Dashboard</span>
              </button>
              <button
                onClick={() => handleNav('submit-report')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'submit-report'
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/60'
                }`}
              >
                <PlusCircle className={`w-4 h-4 shrink-0 ${currentTab === 'submit-report' ? 'text-white' : 'text-emerald-600'}`} />
                <span className="font-semibold">Submit New Report</span>
              </button>
              <button
                onClick={() => handleNav('my-reports')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'my-reports'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <ListOrdered className={`w-4 h-4 shrink-0 ${currentTab === 'my-reports' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>My Submitted Reports</span>
              </button>
            </nav>
          </div>

          {/* Operations & Intelligence (Accessible to officer, authority, admin, or for review) */}
          <div>
            <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Operations & Intel</span>
              {!isOfficerOrAbove && (
                <span className="text-[10px] text-amber-600 font-normal lowercase">(officer preview)</span>
              )}
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleNav('intel-dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'intel-dashboard'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Radio className={`w-4 h-4 shrink-0 ${currentTab === 'intel-dashboard' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Intelligence Command</span>
              </button>
              <button
                onClick={() => handleNav('incidents')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'incidents'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <AlertOctagon className={`w-4 h-4 shrink-0 ${currentTab === 'incidents' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Incident Queue & Review</span>
              </button>
              <button
                onClick={() => handleNav('investigation')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'investigation'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Search className={`w-4 h-4 shrink-0 ${currentTab === 'investigation' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Report Investigation</span>
              </button>
              <button
                onClick={() => handleNav('map')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'map'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <MapPin className={`w-4 h-4 shrink-0 ${currentTab === 'map' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Geospatial Intelligence</span>
              </button>
              <button
                onClick={() => handleNav('trends')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'trends'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <TrendingUp className={`w-4 h-4 shrink-0 ${currentTab === 'trends' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Trends & Recurrence</span>
              </button>
            </nav>
          </div>

          {/* SCIP Agent Console */}
          <div>
            <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              AI Decision Support
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleNav('agent')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'agent'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Cpu className={`w-4 h-4 shrink-0 ${currentTab === 'agent' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>SCIP Intelligence Agent</span>
              </button>
            </nav>
          </div>

          {/* Governance & Administration */}
          <div>
            <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Governance</span>
              {!isAuthorityOrAbove && (
                <span className="text-[10px] text-amber-600 font-normal lowercase">(admin preview)</span>
              )}
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleNav('admin-panel')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'admin-panel'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 shrink-0 ${currentTab === 'admin-panel' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Admin & Audit Trail</span>
              </button>
            </nav>
          </div>

          {/* Verification & Quality Audit */}
          <div>
            <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Verification
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleNav('tests')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  currentTab === 'tests'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${currentTab === 'tests' ? 'text-emerald-600' : 'text-emerald-500'}`} />
                <span>22-Point Audit Suite</span>
              </button>
            </nav>
          </div>

          {/* Design System & Color Theme Studio */}
          <div>
            <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Design System
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => {
                  openThemeStudio();
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-slate-700 hover:bg-slate-50 hover:text-slate-900 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-700" style={{ color: activeTheme.primary }} />
                  <span>Color Theme Studio</span>
                </div>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white"
                  style={{ backgroundColor: activeTheme.primary }}
                  title={`Active: ${activeTheme.name}`}
                />
              </button>
            </nav>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200 text-[11px] text-slate-500">
          <div className="font-medium text-slate-700">SCIP Master v1.0</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Responsible Municipal AI</div>
        </div>
      </aside>
    </>
  );
};
