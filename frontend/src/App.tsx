// Smart Community Intelligence Platform (SCIP) - Master Application Shell
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './components/views/LandingPage';
import { AboutPage } from './components/views/AboutPage';
import { CitizenDashboard } from './components/views/CitizenDashboard';
import { SubmitReportView } from './components/views/SubmitReportView';
import { MyReportsView } from './components/views/MyReportsView';
import { IntelligenceDashboard } from './components/views/IntelligenceDashboard';
import { IncidentManagementView } from './components/views/IncidentManagementView';
import { ReportInvestigationView } from './components/views/ReportInvestigationView';
import { GeospatialIntelligenceView } from './components/views/GeospatialIntelligenceView';
import { TrendAnalysisView } from './components/views/TrendAnalysisView';
import { AgentConsoleView } from './components/views/AgentConsoleView';
import { AdminPanelView } from './components/views/AdminPanelView';
import { TestRunnerView } from './components/views/TestRunnerView';
import { ReportDetailModal } from './components/views/ReportDetailModal';
import { ProfileView } from './components/views/ProfileView';
import { AuthModal } from './components/views/AuthModal';
import { Incident, Report, UserRole } from './types/scip';

const protectedTabRoles: Record<string, UserRole[]> = {
  'citizen-dashboard': ['citizen'],
  'submit-report': ['citizen'],
  'my-reports': ['citizen'],
  'intel-dashboard': ['officer', 'authority', 'admin'],
  incidents: ['officer', 'authority', 'admin'],
  investigation: ['officer', 'authority', 'admin'],
  map: ['officer', 'authority', 'admin'],
  trends: ['officer', 'authority', 'admin'],
  agent: ['authority', 'admin'],
  'admin-panel': ['admin'],
  tests: ['admin'],
};

const dashboardTabByRole: Record<UserRole, string> = {
  citizen: 'citizen-dashboard',
  officer: 'intel-dashboard',
  authority: 'intel-dashboard',
  admin: 'admin-panel',
};

function SCIPMainLayout() {
  const { user, role, isAuthenticated, authError } = useAuth();
  const { mode } = useTheme();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeModalReportId, setActiveModalReportId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  const navigateToTab = (tab: string) => {
    setAccessMessage(null);
    setCurrentTab(tab);
  };

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Route protection guard
  useEffect(() => {
    const publicTabs = ['home', 'about'];
    if (publicTabs.includes(currentTab)) return;

    if (!isAuthenticated) {
      setCurrentTab('home');
      handleOpenAuth('login');
      return;
    }

    const allowedRoles = protectedTabRoles[currentTab];
    if (allowedRoles && !allowedRoles.includes(role)) {
      setAccessMessage('Your account does not have permission to open that section.');
      setCurrentTab(dashboardTabByRole[role]);
      return;
    }

    if (currentTab === 'tests' && !import.meta.env.DEV) {
      setAccessMessage('The audit runner is only available in a development build.');
      setCurrentTab(dashboardTabByRole[role]);
    }
  }, [currentTab, isAuthenticated, role]);

  const handleSelectReport = (report: Report) => {
    setActiveModalReportId(report.id);
  };

  const handleSelectIncident = (incident: Incident) => {
    setCurrentTab('incidents');
  };

  return (
    <div className="min-h-screen bg-bg-primary text-primary flex flex-col font-sans antialiased transition-colors duration-200">
      {/* Top Navigation Bar */}
      <TopBar
        currentTab={currentTab}
        onNavigate={navigateToTab}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onNavigate={navigateToTab}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenAuth={handleOpenAuth}
        />

        {/* Dynamic Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {authError && <div role="alert" className="mx-auto mb-4 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span>{authError}</span><button type="button" onClick={() => handleOpenAuth('login')} className="font-semibold underline">Sign in</button></div>}
          {accessMessage && <div role="alert" className="mx-auto mb-4 max-w-7xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{accessMessage}</div>}
          {currentTab === 'home' && (
            <LandingPage onNavigate={navigateToTab} onOpenAuth={handleOpenAuth} />
          )}

          {currentTab === 'about' && (
            <AboutPage />
          )}

          {currentTab === 'citizen-dashboard' && (
            <CitizenDashboard
              onNavigateToSubmit={() => navigateToTab('submit-report')}
              onNavigateToMyReports={() => navigateToTab('my-reports')}
              onOpenIncident={() => navigateToTab('incidents')}
            />
          )}

          {currentTab === 'submit-report' && (
            <SubmitReportView
              onReportCreated={() => {}}
              onNavigateToMyReports={() => navigateToTab('my-reports')}
            />
          )}

          {currentTab === 'my-reports' && (
            <MyReportsView
              onNavigateToSubmit={() => navigateToTab('submit-report')}
              onOpenIncident={() => navigateToTab('incidents')}
            />
          )}

          {currentTab === 'intel-dashboard' && (
            <IntelligenceDashboard
              onNavigateToIncidents={() => navigateToTab('incidents')}
              onNavigateToInvestigation={() => navigateToTab('investigation')}
              onNavigateToMap={() => navigateToTab('map')}
              onSelectIncident={handleSelectIncident}
              onSelectReport={handleSelectReport}
            />
          )}

          {currentTab === 'incidents' && (
            <IncidentManagementView
              onOpenReport={reportId => setActiveModalReportId(reportId)}
            />
          )}

          {currentTab === 'investigation' && (
            <ReportInvestigationView />
          )}

          {currentTab === 'map' && (
            <GeospatialIntelligenceView />
          )}

          {currentTab === 'trends' && (
            <TrendAnalysisView />
          )}

          {currentTab === 'agent' && (
            <AgentConsoleView />
          )}

          {currentTab === 'admin-panel' && (
            <AdminPanelView />
          )}

          {currentTab === 'profile' && (
            <ProfileView />
          )}

          {currentTab === 'tests' && (
            <TestRunnerView />
          )}
        </main>
      </div>

      {/* Global Report Detail Inspector */}
      {activeModalReportId && (
        <ReportDetailModal
          reportId={activeModalReportId}
          onClose={() => setActiveModalReportId(null)}
          onOpenIncident={() => {
            setActiveModalReportId(null);
            navigateToTab('incidents');
          }}
        />
      )}

      {/* Official Municipal Authentication Dialog */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccessNavigate={(targetTab) => {
          setIsAuthModalOpen(false);
          navigateToTab(targetTab);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SCIPMainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}
