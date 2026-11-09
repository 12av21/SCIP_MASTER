// SCIP Operations - Geospatial Intelligence View
import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient';
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
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [reps, incs, hots] = await Promise.all([
        api.getReports(),
        api.getIncidents(),
        api.getHotspots()
      ]);
      setReports(reps);
      setIncidents(incs);
      setHotspots(hots);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load geospatial data.');
    } finally {
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

      {isLoading && <div role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Loading map data…</div>}
      {errorMessage && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex flex-wrap items-center justify-between gap-3">
          <span>{errorMessage}</span>
          <button onClick={loadData} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* Main Map */}
      <GeospatialMap
        reports={reports}
        incidents={incidents}
        onSelectReport={rep => setSelectedReportId(rep.id)}
        onSelectIncident={inc => setSelectedIncident(inc)}
        selectedReportId={selectedReportId || undefined}
        selectedIncidentId={selectedIncident?.id || undefined}
      />

      {/* Hotspots Analysis Table */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900">Identified Municipal Hotspot Zones</h2>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {isLoading || errorMessage ? '—' : hotspots.length} Geographic Clusters Identified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading ? (
            <div role="status" className="col-span-full py-8 text-center text-xs text-slate-500">Loading hotspot data…</div>
          ) : errorMessage ? (
            <div role="alert" className="col-span-full py-8 text-center text-xs text-red-700">Hotspot data is unavailable.</div>
          ) : hotspots.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-500">No hotspot data is available.</div>
          ) : hotspots.slice(0, 3).map((hot, idx) => (
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
