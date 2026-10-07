// SCIP - Report Detail & AI Transparency Modal
import React, { useState, useEffect } from 'react';
import { Report, AIAnalysis } from '../../types/scip.js';
import { api } from '../../services/apiClient.js';
import {
  X,
  Sparkles,
  MapPin,
  Clock,
  AlertCircle,
  Layers,
  ShieldCheck,
  RotateCw,
  FileText
} from 'lucide-react';

interface ReportDetailModalProps {
  reportId: string | null;
  onClose: () => void;
  onOpenIncident?: (incidentId: string) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  reportId,
  onClose,
  onOpenIncident
}) => {
  const [report, setReport] = useState<Report | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  useEffect(() => {
    if (reportId) {
      loadDetails(reportId);
    }
  }, [reportId]);

  const loadDetails = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await api.getReportById(id);
      setReport(res.report);
      setAnalysis(res.analysis);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleReanalyze = async () => {
    if (!reportId) return;
    setIsReanalyzing(true);
    try {
      const fresh = await api.reanalyzeReport(reportId);
      setAnalysis(fresh);
    } finally {
      setIsReanalyzing(false);
    }
  };

  if (!reportId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {report?.id || reportId}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-600 capitalize">
              Status: <strong className="text-slate-900">{report?.status || 'Loading...'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-200/60 transition-colors"
              title="Re-run AI Analysis pipeline"
            >
              <RotateCw className={`w-4 h-4 ${isReanalyzing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {isLoading || !report ? (
            <div className="py-12 text-center text-slate-400">Loading observation details...</div>
          ) : (
            <>
              {/* Report Raw Observation Details */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 leading-snug">{report.title}</h2>
                <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{report.locationName}</span>
                  </span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">
                    [{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}]
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(report.createdAt).toLocaleString()}</span>
                  </span>
                  <span>·</span>
                  <span>By: {report.citizenName}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed">
                  {report.description}
                </div>
              </div>

              {/* Linked Incident Callout (if connected) */}
              {report.incidentId && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-indigo-900">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      Correlated to municipal incident <strong className="font-mono">{report.incidentId}</strong>
                    </span>
                  </div>
                  {onOpenIncident && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenIncident(report.incidentId!);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-indigo-300 rounded text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      View Incident
                    </button>
                  )}
                </div>
              )}

              {/* AI Analytical Interpretation Box */}
              {analysis && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span className="font-semibold text-slate-900 text-xs">
                        Algorithmic Analytical Interpretation
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                      Confidence: {(analysis.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[10px] text-slate-400 font-medium">Categorization</div>
                        <div className="font-semibold text-slate-900 mt-0.5">{analysis.categoryPredicted}</div>
                      </div>
                      <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[10px] text-slate-400 font-medium">Risk Score</div>
                        <div className="font-semibold text-indigo-700 font-mono mt-0.5 tabular-nums">
                          {analysis.riskScore}/100
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[10px] text-slate-400 font-medium">Duplicate Risk</div>
                        <div className="font-semibold text-slate-900 font-mono mt-0.5 tabular-nums">
                          {(analysis.duplicateProbability * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[10px] text-slate-400 font-medium">Cluster Status</div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {analysis.possibleIncident ? 'Cluster Member' : 'Unique'}
                        </div>
                      </div>
                    </div>

                    {/* Entities Breakdown */}
                    <div className="space-y-1.5">
                      <div className="font-semibold text-slate-700 text-[11px]">Extracted Municipal Entities:</div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {analysis.entities.locations.map(l => (
                          <span key={l} className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
                            Location: {l}
                          </span>
                        ))}
                        {analysis.entities.infrastructure.map(inf => (
                          <span key={inf} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                            Infra: {inf}
                          </span>
                        ))}
                        {analysis.entities.hazards.map(h => (
                          <span key={h} className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700">
                            Hazard: {h}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Corroborating Evidence */}
                    <div className="space-y-1.5">
                      <div className="font-semibold text-slate-700 text-[11px]">Evidence & Rationalization:</div>
                      <ul className="space-y-1 text-slate-600 pl-4 list-disc text-[11px]">
                        {analysis.evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Top Similar Reports */}
                    {analysis.topSimilarReports.length > 0 && (
                      <div className="space-y-2 border-t border-slate-200 pt-3">
                        <div className="font-semibold text-slate-700 text-[11px]">
                          Related Community Reports ({analysis.topSimilarReports.length}):
                        </div>
                        <div className="divide-y divide-slate-100">
                          {analysis.topSimilarReports.map(sim => (
                            <div key={sim.reportId} className="py-1.5 flex items-center justify-between text-[11px]">
                              <div>
                                <span className="font-mono text-slate-400 mr-2">{sim.reportId}</span>
                                <span className="text-slate-800 font-medium">{sim.reportTitle}</span>
                              </div>
                              <div className="flex items-center gap-3 font-mono text-slate-500 tabular-nums">
                                <span>{sim.distanceMeters}m</span>
                                <span>·</span>
                                <span>Sim: {(sim.similarityScore * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-slate-500 text-[11px]">
          <span>Observations subject to verification by municipal authorities.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-md font-medium text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
