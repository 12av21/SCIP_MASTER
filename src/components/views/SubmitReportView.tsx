// SCIP Citizen Portal - Submit Report with Real-Time AI Suggestion & Validation
import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient';
import { Report, ReportCategory, UrgencyLevel, AIAnalysis } from '../../types/scip';
import { classifyReport, extractEntities, determineSeverity } from '../../ai/classifier';
import {
  FileText,
  MapPin,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Layers
} from 'lucide-react';

interface SubmitReportViewProps {
  onReportCreated?: (report: Report, analysis: AIAnalysis) => void;
  onNavigateToMyReports?: () => void;
}

const PRESET_LOCATIONS = [
  { name: 'Sector 4 Market Entrance', lat: 28.6142, lng: 77.2091 },
  { name: 'Sector 4 Market Gate 2', lat: 28.6145, lng: 77.2094 },
  { name: 'West Boulevard Transformer 14', lat: 28.6253, lng: 77.2184 },
  { name: 'North Industrial Expressway Ramp B', lat: 28.6380, lng: 77.2300 },
  { name: 'Central Plaza Food Street', lat: 28.6100, lng: 77.2050 },
  { name: 'Riverfront Canal Footbridge', lat: 28.6180, lng: 77.2120 }
];

export const SubmitReportView: React.FC<SubmitReportViewProps> = ({
  onReportCreated,
  onNavigateToMyReports
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory>('Water & Drainage');
  const [locationName, setLocationName] = useState('Sector 4 Market Entrance');
  const [latitude, setLatitude] = useState(28.6142);
  const [longitude, setLongitude] = useState(77.2091);
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');

  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{ report: Report; analysis: AIAnalysis } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Live real-time AI classification preview as the user types description
  useEffect(() => {
    const text = `${title} ${description}`;
    if (text.trim().length > 10) {
      const cls = classifyReport(text);
      const ent = extractEntities(text);
      const sev = determineSeverity(text, urgency);
      setAiSuggestion({
        predictedCategory: cls.predictedCategory,
        confidence: cls.confidence,
        entities: ent,
        severity: sev
      });
    } else {
      setAiSuggestion(null);
    }
  }, [title, description, urgency]);

  const handleApplyAiCategory = () => {
    if (aiSuggestion?.predictedCategory) {
      setCategory(aiSuggestion.predictedCategory);
    }
  };

  const handleLocationPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    setLocationName(preset.name);
    setLatitude(preset.lat);
    setLongitude(preset.lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (title.trim().length < 5) {
      setErrorMessage('Please provide a descriptive title (at least 5 characters).');
      return;
    }
    if (description.trim().length < 10) {
      setErrorMessage('Please provide more detail in the description (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createReport({
        title,
        description,
        category,
        locationName,
        latitude,
        longitude,
        urgency
      });

      setSubmittedResult(res);
      onReportCreated?.(res.report, res.analysis);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setCategory('Water & Drainage');
    setLocationName('Sector 4 Market Entrance');
    setLatitude(28.6142);
    setLongitude(77.2091);
    setUrgency('medium');
    setSubmittedResult(null);
    setErrorMessage('');
  };

  if (submittedResult) {
    const { report, analysis } = submittedResult;
    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-emerald-900 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-emerald-950">Report Successfully Submitted</h2>
              <div className="text-xs text-emerald-700 font-mono mt-0.5">
                Reference ID: <span className="font-semibold">{report.id}</span> · Status: {report.status}
              </div>
            </div>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Your community observation has been entered into the SCIP database and processed through the automated AI intelligence pipeline.
          </p>
        </div>

        {/* AI Analysis Summary Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Automated AI Analysis Findings</h3>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Confidence: {(analysis.categoryConfidence * 100).toFixed(0)}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Predicted Category:</span>
              <div className="font-semibold text-slate-900 mt-0.5">{analysis.categoryPredicted}</div>
            </div>
            <div>
              <span className="text-slate-500">Calculated Risk Score:</span>
              <div className="font-semibold text-indigo-600 font-mono mt-0.5 tabular-nums">
                {analysis.riskScore}/100 ({analysis.severityIndicator.toUpperCase()})
              </div>
            </div>
            <div>
              <span className="text-slate-500">Extracted Keywords:</span>
              <div className="font-medium text-slate-700 mt-0.5">
                {analysis.keywords.slice(0, 4).join(', ') || 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Cluster / Incident Linkage:</span>
              <div className="font-medium text-slate-700 mt-0.5">
                {analysis.possibleIncident
                  ? `Linked to potential incident cluster`
                  : 'Logged as standalone observation'}
              </div>
            </div>
          </div>

          {analysis.topSimilarReports.length > 0 && (
            <div className="border-t border-slate-200 pt-3 text-xs">
              <span className="text-slate-500 font-medium">Similar Observations in Vicinity:</span>
              <ul className="mt-2 space-y-1.5">
                {analysis.topSimilarReports.slice(0, 2).map(sim => (
                  <li key={sim.reportId} className="p-2 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-slate-500 mr-2">{sim.reportId}</span>
                      <span className="text-slate-800">{sim.reportTitle}</span>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px] tabular-nums">
                      {sim.distanceMeters}m away
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToMyReports}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
          >
            View in My Reports
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Title */}
      <div className="border-b border-emerald-100 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Submit Community Observation</h1>
        <p className="text-xs text-emerald-700/80 font-medium mt-1">
          Report municipal issues like water logging, drainage obstruction, broken roads, or electrical hazards.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-emerald-100/90 rounded-2xl p-6 sm:p-8 shadow-xs">
        {/* Title Field */}
        <div>
          <label className="block text-xs font-semibold text-emerald-950 mb-1">
            Report Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Water accumulation near Sector 4 Market"
            className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-emerald-50/20 hover:bg-emerald-50/30 focus:bg-white border border-emerald-100 focus:border-emerald-500 rounded-xl focus:outline-hidden transition-colors"
          />
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-xs font-semibold text-emerald-950 mb-1">
            Detailed Ground Observation <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what you observed: severity of water/damage, landmarks, blocked culverts, traffic impact..."
            className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-emerald-50/20 hover:bg-emerald-50/30 focus:bg-white border border-emerald-100 focus:border-emerald-500 rounded-xl focus:outline-hidden leading-relaxed transition-colors"
          />
        </div>

        {/* Live AI Assistant Suggestion Callout */}
        {aiSuggestion && (
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-950">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>AI Categorization Suggestion</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-700 font-semibold tabular-nums">
                {(aiSuggestion.confidence * 100).toFixed(0)}% Match
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-slate-700">
              <span>
                Based on your description, this best matches category: <strong className="text-emerald-950">{aiSuggestion.predictedCategory}</strong>
              </span>
              {category !== aiSuggestion.predictedCategory && (
                <button
                  type="button"
                  onClick={handleApplyAiCategory}
                  className="px-3 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  Apply Suggested Category
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category & Urgency Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ReportCategory)}
              className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-emerald-50/20 hover:bg-emerald-50/30 focus:bg-white border border-emerald-100 focus:border-emerald-500 rounded-xl focus:outline-hidden transition-colors"
            >
              <option value="Water & Drainage">Water & Drainage</option>
              <option value="Roads & Traffic">Roads & Traffic</option>
              <option value="Public Sanitation">Public Sanitation</option>
              <option value="Power & Lighting">Power & Lighting</option>
              <option value="Parks & Environment">Parks & Environment</option>
              <option value="Structural Safety">Structural Safety</option>
              <option value="Public Health">Public Health</option>
              <option value="Noise & Disturbance">Noise & Disturbance</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-950 mb-1">
              Perceived Urgency
            </label>
            <select
              value={urgency}
              onChange={e => setUrgency(e.target.value as UrgencyLevel)}
              className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-emerald-50/20 hover:bg-emerald-50/30 focus:bg-white border border-emerald-100 focus:border-emerald-500 rounded-xl focus:outline-hidden transition-colors"
            >
              <option value="low">Low (Standard maintenance)</option>
              <option value="medium">Medium (Requires attention)</option>
              <option value="high">High (Disrupting transit/traffic)</option>
              <option value="critical">Critical (Immediate safety danger)</option>
            </select>
          </div>
        </div>

        {/* Location Name & Preset Selection */}
        <div>
          <label className="block text-xs font-semibold text-emerald-950 mb-1">
            Location Description <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={locationName}
            onChange={e => setLocationName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-emerald-50/20 hover:bg-emerald-50/30 focus:bg-white border border-emerald-100 focus:border-emerald-500 rounded-xl focus:outline-hidden transition-colors"
          />

          {/* Quick Municipal Location Presets */}
          <div className="mt-2.5 text-xs text-slate-500">
            <span className="text-[11px] font-semibold text-emerald-800">Quick presets:</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {PRESET_LOCATIONS.map(p => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => handleLocationPreset(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${
                    locationName === p.name
                      ? 'bg-emerald-600 border-emerald-600 text-white font-semibold shadow-xs'
                      : 'bg-emerald-50/60 border-emerald-200/70 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* GPS Coordinates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={latitude}
              onChange={e => setLatitude(parseFloat(e.target.value))}
              className="w-full px-3.5 py-2 text-xs font-mono tabular-nums text-slate-900 bg-emerald-50/10 border border-emerald-100 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={longitude}
              onChange={e => setLongitude(parseFloat(e.target.value))}
              className="w-full px-3.5 py-2 text-xs font-mono tabular-nums text-slate-900 bg-emerald-50/10 border border-emerald-100 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
          <span className="text-[11px] text-emerald-700/70">
            Report will be analyzed by SCIP NLP & clustering engine
          </span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-2 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Processing Analysis...' : 'Submit Report'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
