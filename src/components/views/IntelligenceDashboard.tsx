// SCIP Operations - Intelligence Command Center Dashboard
import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient';
import { Incident, Report, SpatioTemporalCluster } from '../../types/scip';
import { GeospatialMap } from '../map/GeospatialMap';
import {
  Radio,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface IntelligenceDashboardProps {
  onNavigateToIncidents: () => void;
  onNavigateToInvestigation: () => void;
  onNavigateToMap: () => void;
  onSelectIncident: (incident: Incident) => void;
  onSelectReport: (report: Report) => void;
}

export const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({
  onNavigateToIncidents,
  onNavigateToInvestigation,
  onNavigateToMap,
  onSelectIncident,
  onSelectReport
}) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [clusters, setClusters] = useState<SpatioTemporalCluster[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [incRes, repRes, clusRes, trendRes] = await Promise.all([
        api.getIncidents(),
        api.getReports(),
        api.getClusters(),
        api.getTrends()
      ]);
      setIncidents(incRes);
      setReports(repRes);
      setClusters(clusRes);
      setTrends(trendRes);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const potentialIncidents = incidents.filter(i => i.status === 'potential');
  const activeConfirmed = incidents.filter(i => i.status === 'confirmed' || i.status === 'in_progress');
  const highPriorityCount = incidents.filter(i => (i.priority === 'P1_CRITICAL' || i.priority === 'P2_HIGH') && i.status !== 'resolved').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-bold text-slate-900">Intelligence Command Center</h1>
          </div>
          <p className="text-xs text-emerald-700/80 font-medium mt-1">
            Real-time municipal threat detection, spatio-temporal incident clusters, and human review decision support.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToIncidents}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Incident Queue ({incidents.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-emerald-100/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Potential Incidents</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2 font-mono tabular-nums">
            {potentialIncidents.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Awaiting human review</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Active Confirmed Incidents</span>
            <Radio className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono tabular-nums">
            {activeConfirmed.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Under departmental dispatch</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>High Risk / P1-P2</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2 font-mono tabular-nums">
            {highPriorityCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Urgent physical hazard</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Resolved Incidents</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono tabular-nums">
            {resolvedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Remediated & closed</div>
        </div>
      </div>

      {/* Human Review Banner for Potential Incidents */}
      {potentialIncidents.length > 0 && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Responsible AI Alert: {potentialIncidents.length} Potential Incident Cluster(s) Awaiting Review</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed max-w-3xl">
              Algorithms have clustered related community reports into potential municipal incidents. Municipal officers must inspect correlated observations and confirm or dismiss the cluster before work order execution.
            </p>
          </div>
          <button
            onClick={onNavigateToIncidents}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors shrink-0"
          >
            Review Potential Incidents
          </button>
        </div>
      )}

      {/* Main Interactive Map & Spatial Intelligence Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Geospatial Intelligence Snapshot</h2>
          <button
            onClick={onNavigateToMap}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
          >
            <span>Full screen map</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <GeospatialMap
          reports={reports}
          incidents={incidents}
          onSelectIncident={onSelectIncident}
          onSelectReport={onSelectReport}
        />
      </div>

      {/* Two Column Grid: Emerging Clusters & Priority Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emerging Spatio-Temporal Clusters */}
        <div className="bg-white rounded-2xl border border-emerald-100/80 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Active Spatio-Temporal Clusters ({clusters.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">DBSCAN Engine</span>
          </div>

          {clusters.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No new unclustered incident patterns detected.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {clusters.map(c => (
                <div key={c.clusterId} className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900">{c.suggestedTitle}</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 tabular-nums">
                      {c.priority}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>{c.category}</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">{c.reportCount} related observations</span>
                    <span>·</span>
                    <span>{c.radiusMeters}m perimeter</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 list-disc pl-4 space-y-0.5">
                    {c.evidence.slice(0, 2).map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Priority Incident Queue */}
        <div className="bg-white rounded-2xl border border-emerald-100/80 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Priority Incidents Under Monitoring
              </h3>
            </div>
            <button
              onClick={onNavigateToIncidents}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
            >
              View queue
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {incidents.slice(0, 4).map(inc => (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className="py-3 hover:bg-slate-50 px-2 rounded cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                    <span className="font-mono text-slate-400">{inc.id}</span>
                    <span>{inc.title}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                    inc.severity === 'critical' ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-slate-600 bg-slate-100'
                  }`}>
                    {inc.priority}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                  <span>{inc.locationName}</span>
                  <span>·</span>
                  <span className="capitalize">{inc.status.replace('_', ' ')}</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">{inc.reportIds.length} observations</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
