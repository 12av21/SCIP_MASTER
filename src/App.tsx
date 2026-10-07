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
import { AuthModal } from './components/views/AuthModal';
import { Report, Incident } from './types/scip';

function SCIPMainLayout() {
  const { user, role, isAuthenticated } = useAuth();
  const { activeTheme } = useTheme();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeModalReportId, setActiveModalReportId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Route protection guard
  useEffect(() => {
    const publicTabs = ['home', 'about', 'tests'];
    if (!isAuthenticated && !publicTabs.includes(currentTab)) {
      setCurrentTab('home');
      handleOpenAuth('login');
    }
  }, [currentTab, isAuthenticated]);

  const handleSelectReport = (report: Report) => {
    setActiveModalReportId(report.id);
  };

  const handleSelectIncident = (incident: Incident) => {
    setCurrentTab('incidents');
  };

  return (
    <div
      className="min-h-screen text-slate-800 flex flex-col font-sans antialiased transition-colors duration-200"
      style={{
        backgroundColor: activeTheme.surfaceBg,
        backgroundImage: `radial-gradient(ellipse 80% 80% at 50% -20%, ${activeTheme.primaryLight}, rgba(255,255,255,0))`
      }}
    >
      {/* Top Navigation Bar */}
      <TopBar
        currentTab={currentTab}
        onNavigate={setCurrentTab}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onNavigate={setCurrentTab}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenAuth={handleOpenAuth}
        />

        {/* Dynamic Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {currentTab === 'home' && (
            <LandingPage onNavigate={setCurrentTab} onOpenAuth={handleOpenAuth} />
          )}

          {currentTab === 'about' && (
            <AboutPage />
          )}

          {currentTab === 'citizen-dashboard' && (
            <CitizenDashboard
              onNavigateToSubmit={() => setCurrentTab('submit-report')}
              onNavigateToMyReports={() => setCurrentTab('my-reports')}
              onOpenIncident={() => setCurrentTab('incidents')}
            />
          )}

          {currentTab === 'submit-report' && (
            <SubmitReportView
              onReportCreated={() => {}}
              onNavigateToMyReports={() => setCurrentTab('my-reports')}
            />
          )}

          {currentTab === 'my-reports' && (
            <MyReportsView
              onNavigateToSubmit={() => setCurrentTab('submit-report')}
              onOpenIncident={() => setCurrentTab('incidents')}
            />
          )}

          {currentTab === 'intel-dashboard' && (
            <IntelligenceDashboard
              onNavigateToIncidents={() => setCurrentTab('incidents')}
              onNavigateToInvestigation={() => setCurrentTab('investigation')}
              onNavigateToMap={() => setCurrentTab('map')}
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
            setCurrentTab('incidents');
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
          setCurrentTab(targetTab);
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
