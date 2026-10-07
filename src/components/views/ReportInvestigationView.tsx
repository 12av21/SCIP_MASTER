// SCIP Operations - Report Investigation & Similarity Linking View
import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient.js';
import { Report, AIAnalysis, Incident } from '../../types/scip.js';
import { ReportDetailModal } from './ReportDetailModal.js';
import {
  Search,
  Sparkles,
  Link,
  MapPin,
  ExternalLink,
  AlertCircle,
  Clock,
  Filter,
  Layers
} from 'lucide-react';

export const ReportInvestigationView: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectModalId, setInspectModalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reps, incs] = await Promise.all([
        api.getReports(),
        api.getIncidents()
      ]);
      setReports(reps);
      setIncidents(incs);
      if (reps.length > 0) {
        handleSelectReport(reps[0]);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectReport = async (rep: Report) => {
    setSelectedReport(rep);
    try {
      const res = await api.getReportById(rep.id);
      setAnalysis(res.analysis);
    } catch {
      // Ignore
    }
  };

  const filteredReports = reports.filter(r => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.locationName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Title */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Report Investigation & Evidence Linking</h1>
        <p className="text-xs text-slate-500 mt-1">
          Perform forensic semantic similarity searches, inspect extracted ground entities, and examine incident linkages.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Report List */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col h-[700px]">
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filter reports by keyword..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredReports.map(rep => {
              const isSelected = selectedReport?.id === rep.id;
              return (
                <div
                  key={rep.id}
                  onClick={() => handleSelectReport(rep)}
                  className={`p-3 text-xs cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                    <span className="font-semibold text-indigo-700">{rep.id}</span>
                    <span className="capitalize">{rep.status}</span>
                  </div>
                  <div className="font-medium text-slate-900 mt-1 leading-snug">{rep.title}</div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                    <span>{rep.category}</span>
                    <span>·</span>
                    <span>{rep.locationName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Detailed Investigation Dossier */}
        <div className="lg:col-span-2 space-y-5">
          {selectedReport ? (
            <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {selectedReport.id}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-600 capitalize">Status: {selectedReport.status}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-2">{selectedReport.title}</h2>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedReport.locationName}</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">[{selectedReport.latitude}, {selectedReport.longitude}]</span>
                  </div>
                </div>

                <button
                  onClick={() => setInspectModalId(selectedReport.id)}
                  className="px-3 py-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold border border-indigo-200 rounded-md hover:bg-indigo-50 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Full Dossier</span>
                </button>
              </div>

              {/* Raw Observation Description */}
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-700 text-xs uppercase tracking-wider">
                  Ground Truth Observation
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  {selectedReport.description}
                </div>
              </div>

              {/* AI Semantic Features */}
              {analysis && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>NLP Extraction & Semantic Features</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-medium">Categorization</div>
                      <div className="font-semibold text-slate-900 mt-0.5">{analysis.categoryPredicted}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 tabular-nums">
                        {(analysis.categoryConfidence * 100).toFixed(0)}% confidence
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-medium">Duplicate Probability</div>
                      <div className="font-semibold text-indigo-700 font-mono mt-0.5 tabular-nums">
                        {(analysis.duplicateProbability * 100).toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {analysis.duplicateProbability >= 0.70 ? 'High probability duplicate' : 'Distinct observation'}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-medium">Risk Priority</div>
                      <div className="font-semibold text-slate-900 font-mono mt-0.5 tabular-nums">
                        {analysis.riskScore}/100 ({analysis.severityIndicator.toUpperCase()})
                      </div>
                    </div>
                  </div>

                  {/* Top Similar Reports Comparison Table */}
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-semibold text-slate-800">
                      Correlated Observations Across City ({analysis.topSimilarReports.length})
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="p-2.5">Related Report</th>
                            <th className="p-2.5">Category</th>
                            <th className="p-2.5">Distance</th>
                            <th className="p-2.5">Time Delta</th>
                            <th className="p-2.5">Similarity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {analysis.topSimilarReports.map(sim => (
                            <tr key={sim.reportId} className="hover:bg-slate-50">
                              <td className="p-2.5 font-medium text-slate-900">
                                <span className="font-mono text-slate-400 mr-1.5">{sim.reportId}</span>
                                <span>{sim.reportTitle}</span>
                              </td>
                              <td className="p-2.5 text-slate-500 whitespace-nowrap">{sim.category}</td>
                              <td className="p-2.5 font-mono tabular-nums whitespace-nowrap">{sim.distanceMeters}m</td>
                              <td className="p-2.5 font-mono tabular-nums whitespace-nowrap">{sim.timeDeltaHours}h</td>
                              <td className="p-2.5 font-mono font-semibold text-indigo-700 tabular-nums whitespace-nowrap">
                                {(sim.similarityScore * 100).toFixed(0)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-lg">
              Select a report from the list to begin investigation.
            </div>
          )}
        </div>
      </div>

      {inspectModalId && (
        <ReportDetailModal
          reportId={inspectModalId}
          onClose={() => setInspectModalId(null)}
        />
      )}
    </div>
  );
};
