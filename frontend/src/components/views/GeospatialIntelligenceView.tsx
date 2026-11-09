// SCIP Operations - Geospatial Intelligence View
import React, { useState, useEffect, useRef } from 'react';
import { api, HotspotData } from '../../services/apiClient';
import { Report, Incident } from '../../types/scip';
import { GeospatialMap } from '../map/GeospatialMap';
import { ReportDetailModal } from './ReportDetailModal';
import {
  MapPin,
  Layers,
  AlertTriangle,
  Flame,
  Search,
  Filter
} from 'lucide-react';

export const GeospatialIntelligenceView: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [reps, incs, hots] = await Promise.all([api.getReports(), api.getIncidents(), api.getHotspots()]);
      setReports(reps);
      setIncidents(incs);
      setHotspots(hots);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load geospatial data.');
    } finally {
      requestInFlight.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Title */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Geospatial Intelligence & Hotspot Mapping</h1>
        <p className="text-xs text-slate-500 mt-1">
          Geographic hazard distribution across Metro Municipal Corporation sectors.
        </p>
      </div>

      {/* Main Map */}
      {isLoading ? (
        <div role="status" className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading geospatial data…</div>
      ) : loadError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>Geospatial data could not be loaded: {loadError}</span><button type="button" onClick={() => void loadData()} className="font-semibold underline">Retry</button></div>
      ) : reports.length === 0 && incidents.length === 0 && hotspots.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">No reports, incidents, or hotspots were returned for mapping.</div>
      ) : (
        <GeospatialMap reports={reports} incidents={incidents} onSelectReport={rep => setSelectedReportId(rep.id)} onSelectIncident={inc => setSelectedIncident(inc)} selectedReportId={selectedReportId || undefined} selectedIncidentId={selectedIncident?.id || undefined} />
      )}

      {/* Hotspots Analysis Table */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900">Identified Municipal Hotspot Zones</h2>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {hotspots.length} Geographic Clusters Identified
          </span>
        </div>

        {isLoading ? (
          <p role="status" className="text-sm text-slate-500">Loading hotspot data…</p>
        ) : loadError ? (
          <p className="text-sm text-rose-700">Hotspot data is unavailable. Use Retry above.</p>
        ) : hotspots.length === 0 ? (
          <p className="text-sm text-slate-500">No hotspot zones were returned.</p>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {hotspots.slice(0, 3).map((hot, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900">{hot.location}</span>
                <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {hot.reportCount} reports
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>Density Index: {hot.densityIndex}/100</span>
                <span>·</span>
                <span className="font-mono tabular-nums">[{hot.latitude.toFixed(4)}, {hot.longitude.toFixed(4)}]</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
                {hot.categories.map((c: string) => (
                  <span key={c} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {selectedReportId && (
        <ReportDetailModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      )}
    </div>
  );
};
