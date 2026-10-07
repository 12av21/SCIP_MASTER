// SCIP Public - Enterprise Light Landing Page
// "From Community Reports to Community Intelligence"
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  Cpu,
  UserCheck,
  ArrowRight,
  MapPin,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  Layers,
  Network,
  Eye,
  Lock,
  Compass,
  Sparkles,
  BarChart3,
  Calendar,
  AlertTriangle,
  Building,
  Users,
  Search,
  BookOpen,
  HelpCircle,
  Activity
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (tab: string) => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenAuth }) => {
  const { isAuthenticated, role } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (role === 'citizen') onNavigate('citizen-dashboard');
      else if (role === 'officer') onNavigate('incidents');
      else if (role === 'authority') onNavigate('intel-dashboard');
      else onNavigate('admin-panel');
    } else {
      if (onOpenAuth) onOpenAuth('signup');
      else onNavigate('submit-report');
    }
  };

  const handleExploreIntelligence = () => {
    if (isAuthenticated) {
      onNavigate('intel-dashboard');
    } else {
      if (onOpenAuth) onOpenAuth('login');
      else onNavigate('intel-dashboard');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-16 py-4 text-slate-800">
      {/* 1. HERO SECTION */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-14 relative overflow-hidden shadow-xs">
        <div className="max-w-3xl relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Smart Community Intelligence Platform
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            From Community Reports to <span className="text-blue-600">Community Intelligence.</span>
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            SCIP connects community reports, AI analysis, geospatial patterns, and incident relationships to help municipal organizations identify emerging problems before they escalate into civic crises.
          </p>

          {/* Workflow Pill Strip */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-2 text-xs text-slate-700 font-medium">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Pipeline:</span>
            <span className="font-bold text-slate-900">Report</span>
            <span className="text-slate-300">→</span>
            <span className="font-bold text-slate-900">Understand</span>
            <span className="text-slate-300">→</span>
            <span className="font-bold text-blue-600">Connect</span>
            <span className="text-slate-300">→</span>
            <span className="font-bold text-slate-900">Detect</span>
            <span className="text-slate-300">→</span>
            <span className="font-bold text-slate-900">Analyze</span>
            <span className="text-slate-300">→</span>
            <span className="font-bold text-emerald-600">Decide</span>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleGetStarted}
              className="px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleExploreIntelligence}
              className="px-6 py-3 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Explore Intelligence
            </button>

            <button
              onClick={() => onNavigate('about')}
              className="px-4 py-3 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Responsible AI Charter →
            </button>
          </div>
        </div>

        {/* Decorative Grid Accent */}
        <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-blue-50/60 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* 2. HOW SCIP WORKS */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600">System Architecture</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">How SCIP Works</h2>
          <p className="text-xs sm:text-sm text-slate-600">
            A continuous loop transforming raw citizen observations into governed decision intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
              01
            </div>
            <h3 className="font-bold text-slate-900 text-sm">1. Citizen Intake & Geotagging</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Residents submit reports with title, detailed notes, category, and GPS coordinates. Every report is stored immutably with full provenance.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
              02
            </div>
            <h3 className="font-bold text-slate-900 text-sm">2. AI Semantic & Spatio-Temporal Linking</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Deterministic TF-IDF vectorization, entity extraction, and DBSCAN algorithms analyze semantic similarity and geographic proximity across observations.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <h3 className="font-bold text-slate-900 text-sm">3. Human Review & Decision Support</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Municipal authorities receive structured incident hypotheses with confidence intervals and evidence trails to dispatch work orders to responsible departments.
            </p>
          </div>
        </div>
      </section>

      {/* 3. RELATIONSHIP DETECTION HIGHLIGHT */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden">
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-400">Core Innovation</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Connecting Isolated Observations into a Single Incident
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            In standard complaint portals, duplicate complaints create noise. SCIP detects that multiple independent citizen reports describe the same root infrastructure failure:
          </p>

          {/* Real Demonstration Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs space-y-1">
              <span className="text-[10px] text-blue-400 font-mono">Citizen 1 · Ward 4</span>
              <p className="font-medium text-slate-200">"Water has accumulated near Central Market."</p>
            </div>
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs space-y-1">
              <span className="text-[10px] text-blue-400 font-mono">Citizen 2 · Ward 4</span>
              <p className="font-medium text-slate-200">"Storm drain is severely blocked near market."</p>
            </div>
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs space-y-1">
              <span className="text-[10px] text-blue-400 font-mono">Citizen 3 · Ward 4</span>
              <p className="font-medium text-slate-200">"Road is flooded and traffic is disrupted."</p>
            </div>
          </div>

          <div className="p-4 bg-blue-950/60 rounded-xl border border-blue-800/80 flex items-center justify-between text-xs mt-4">
            <div>
              <span className="text-blue-300 font-semibold block">SCIP Incident Synthesis Result:</span>
              <span className="text-slate-300 text-[11px]">
                Incident #INC-WTR-01 · <strong>Market Drainage & Flooding Surge</strong> (Confidence: 89% · 3 Related Reports · High Priority)
              </span>
            </div>
            <button
              onClick={() => onNavigate('incidents')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shrink-0"
            >
              View Queue
            </button>
          </div>
        </div>
      </section>

      {/* 4. THE RESPONSIBLE AI CHARTER SECTION */}
      <section className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Governance Foundation</div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Responsible AI & The Three Separation Principles
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="text-xs font-mono font-bold text-blue-600">PRINCIPLE 01</span>
            <h4 className="font-bold text-slate-900 text-sm">Community Report = Observation</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Citizens submit ground observations of visible symptoms (e.g. water stagnation or cracked asphalt). They are factual field signals, not administrative conclusions.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="text-xs font-mono font-bold text-indigo-600">PRINCIPLE 02</span>
            <h4 className="font-bold text-slate-900 text-sm">AI Incident = Interpretation</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Algorithms synthesize correlation evidence (spatial proximity, time windows, and keyword overlap). It forms an analytical hypothesis, never an automated decree.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="text-xs font-mono font-bold text-emerald-600">PRINCIPLE 03</span>
            <h4 className="font-bold text-slate-900 text-sm">Administrative Action = Human Review</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Accountable public officers must inspect the evidence trail, validate or dismiss the incident hypothesis, and assign official municipal department work orders.
            </p>
          </div>
        </div>
      </section>

      {/* 5. CAPABILITIES GRID (MAP, TRENDS, AGENT, AUDIT) */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Core Modules</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Enterprise Intelligence Capabilities</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate('map')}
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group space-y-3"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Geospatial Intelligence</h4>
            <p className="text-xs text-slate-600">
              Interactive Leaflet GIS with report pins, incident radiuses, and spatio-temporal cluster densities.
            </p>
          </div>

          <div
            onClick={() => onNavigate('trends')}
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group space-y-3"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Trend & Risk Analytics</h4>
            <p className="text-xs text-slate-600">
              Recurrence rates, weekly volume spikes, and explainable multi-factor severity scoring.
            </p>
          </div>

          <div
            onClick={() => onNavigate('agent')}
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group space-y-3"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">SCIP Intelligence Agent</h4>
            <p className="text-xs text-slate-600">
              Multi-tool analytical engine with TF-IDF, entity extraction, and structured brief generation.
            </p>
          </div>

          <div
            onClick={() => onNavigate('admin-panel')}
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group space-y-3"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Security & Audit Trails</h4>
            <p className="text-xs text-slate-600">
              Cryptographic bcrypt hashing, role-based access control, and immutable audit logging.
            </p>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to experience Smart Community Intelligence?
          </h3>
          <p className="text-blue-100 text-xs sm:text-sm">
            Sign in with an evaluation role or register as a citizen to submit and track community observations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleGetStarted}
            className="px-6 py-3 text-xs sm:text-sm font-bold text-blue-700 bg-white hover:bg-blue-50 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Sign Up / Sign In'}
          </button>
        </div>
      </section>

      {/* 7. ENTERPRISE FOOTER */}
      <footer className="pt-8 border-t border-slate-200 text-xs text-slate-500 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-[10px]">
              SC
            </div>
            <span className="font-bold text-slate-800 text-sm">SCIP</span>
            <span className="text-slate-400">·</span>
            <span>Smart Community Intelligence Platform</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <button onClick={() => onNavigate('home')} className="hover:text-slate-900">Home</button>
            <button onClick={() => onNavigate('about')} className="hover:text-slate-900">Responsible AI Charter</button>
            <button onClick={() => onNavigate('tests')} className="hover:text-slate-900">Audit Suite (22-Point)</button>
            {!isAuthenticated && onOpenAuth && (
              <button onClick={() => onOpenAuth('login')} className="hover:text-blue-600 font-semibold">Sign In</button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          <div>
            MCA Project Implementation · Developed by Adarsh Verma · Governed Municipal Decision Support
          </div>
          <div>
            © 2026 SCIP. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
