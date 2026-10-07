// SCIP Citizen Portal - Citizen Dashboard View
import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { Report, Incident } from '../../types/scip';
import { ReportDetailModal } from './ReportDetailModal';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlusCircle,
  MapPin,
  ArrowRight
} from 'lucide-react';

interface CitizenDashboardProps {
  onNavigateToSubmit: () => void;
  onNavigateToMyReports: () => void;
  onOpenIncident?: (incidentId: string) => void;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({
  onNavigateToSubmit,
  onNavigateToMyReports,
  onOpenIncident
}) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const rep = await api.getReports({ myOnly: true });
      const inc = await api.getIncidents();
      setReports(rep);
      setIncidents(inc);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const activeReportsCount = reports.filter(r => r.status !== 'resolved' && r.status !== 'closed').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const activeCommunityIncidents = incidents.filter(i => i.status === 'confirmed' || i.status === 'in_progress');

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-emerald-100/80 p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Welcome back, {user?.name || 'Citizen'}
          </h1>
          <p className="text-xs text-emerald-700/80 font-medium mt-1">
            Citizen Community Intelligence Portal · Metro Municipal Corporation
          </p>
        </div>

        <button
          onClick={onNavigateToSubmit}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report an Issue</span>
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-emerald-100/70 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>My Submitted Observations</span>
            <FileText className="w-4 h-4 text-emerald-600/70" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {reports.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Total lifetime submissions</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100/70 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Under Review / Assigned</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono tabular-nums">
            {activeReportsCount}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1">Currently being investigated</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100/70 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Resolved Observations</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono tabular-nums">
            {resolvedCount}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1">Action completed by authorities</div>
        </div>
      </div>

      {/* Public Community Hazard Alert Banner (if active incidents exist) */}
      {activeCommunityIncidents.length > 0 && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
            <AlertTriangle className="w-4 h-4 text-emerald-600" />
            <span>Active Community Advisories in Metro District</span>
          </div>
          <div className="divide-y divide-emerald-200/60">
            {activeCommunityIncidents.slice(0, 2).map(inc => (
              <div key={inc.id} className="py-2 text-xs text-emerald-900 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-950 mr-2">{inc.title}</span>
                  <span className="text-[11px] text-emerald-700">({inc.locationName})</span>
                </div>
                {onOpenIncident && (
                  <button
                    onClick={() => onOpenIncident(inc.id)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
                  >
                    <span>View advisory</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Submissions List */}
      <div className="bg-white rounded-2xl border border-emerald-100/80 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900">Recent Observations</h2>
          <button
            onClick={onNavigateToMyReports}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="py-10 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-slate-800">No community reports yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Submit your first observation to begin generating municipal intelligence. AI relationships and cluster detection activate automatically upon intake.
            </p>
            <button
              onClick={onNavigateToSubmit}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Submit First Observation</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.slice(0, 4).map(r => (
              <div
                key={r.id}
                onClick={() => setSelectedReportId(r.id)}
                className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded cursor-pointer transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">{r.title}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{r.category}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{r.locationName}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-600 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    {r.status}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono tabular-nums">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReportId && (
        <ReportDetailModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onOpenIncident={onOpenIncident}
        />
      )}
    </div>
  );
};
