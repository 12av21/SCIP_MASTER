import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/apiClient';
import { AIAnalysis, Report, ReportCategory, UrgencyLevel } from '../../types/scip';
import { classifyReport, determineSeverity, extractEntities } from '../../ai/classifier';
import { AlertCircle, Brain, CheckCircle2, Loader2, Send, Sparkles } from 'lucide-react';

interface SubmitReportViewProps {
  onReportCreated?: (report: Report, analysis?: AIAnalysis) => void;
  onNavigateToMyReports?: () => void;
}

type LocalAiSuggestion = Pick<ReturnType<typeof classifyReport>, 'predictedCategory' | 'confidence'> & {
  entities: ReturnType<typeof extractEntities>;
  severity: ReturnType<typeof determineSeverity>;
};

const CATEGORY_DISPLAY: { value: ReportCategory; label: string; icon: string }[] = [
  { value: 'Water & Drainage', label: 'Water & Drainage', icon: '💧' },
  { value: 'Roads & Traffic', label: 'Roads & Traffic', icon: '🛣️' },
  { value: 'Public Sanitation', label: 'Public Sanitation', icon: '🗑️' },
  { value: 'Power & Lighting', label: 'Power & Lighting', icon: '⚡' },
  { value: 'Parks & Environment', label: 'Parks & Environment', icon: '🌳' },
  { value: 'Structural Safety', label: 'Structural Safety', icon: '🏗️' },
  { value: 'Public Health', label: 'Public Health', icon: '🏥' },
  { value: 'Noise & Disturbance', label: 'Noise & Disturbance', icon: '🔊' },
];

type SubmissionResult = { report: Report; analysis?: AIAnalysis | null };

export const SubmitReportView: React.FC<SubmitReportViewProps> = ({ onReportCreated, onNavigateToMyReports }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [subcategory, setSubcategory] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');
  const [localAiSuggestion, setLocalAiSuggestion] = useState<LocalAiSuggestion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<SubmissionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  useEffect(() => {
    const text = `${title} ${description}`.trim();
    if (text.length < 10) {
      setLocalAiSuggestion(null);
      return;
    }
    const classification = classifyReport(text);
    setLocalAiSuggestion({ predictedCategory: classification.predictedCategory, confidence: classification.confidence, entities: extractEntities(text), severity: determineSeverity(text, urgency) });
  }, [title, description, urgency]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestInFlight.current) return;
    setErrorMessage(null);
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = locationName.trim();
    if (!category) return setErrorMessage('Select a report category.');
    if (!latitude.trim() || !longitude.trim()) return setErrorMessage('Enter the location coordinates.');
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (trimmedTitle.length < 5 || trimmedTitle.length > 200) return setErrorMessage('Title must be between 5 and 200 characters.');
    if (trimmedDescription.length < 10 || trimmedDescription.length > 5000) return setErrorMessage('Description must be between 10 and 5,000 characters.');
    if (trimmedLocation.length < 2 || trimmedLocation.length > 200) return setErrorMessage('Location must be between 2 and 200 characters.');
    if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) return setErrorMessage('Latitude must be a number between -90 and 90.');
    if (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) return setErrorMessage('Longitude must be a number between -180 and 180.');

    requestInFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await api.createReport({
        title: trimmedTitle,
        description: trimmedDescription,
        category,
        ...(subcategory.trim() ? { subcategory: subcategory.trim() } : {}),
        locationName: trimmedLocation,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        urgency,
      });
      if (!result.report?.id) throw new Error('The server did not confirm report creation. Please try again.');
      setSubmittedResult(result);
      onReportCreated?.(result.report, result.analysis ?? undefined);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Report submission failed. Please try again.');
    } finally {
      requestInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setCategory(''); setSubcategory('');
    setLocationName(''); setLatitude(''); setLongitude('');
    setUrgency('medium'); setLocalAiSuggestion(null); setSubmittedResult(null); setErrorMessage(null);
  };

  if (submittedResult) {
    const { report, analysis } = submittedResult;
    return (
      <main className="mx-auto max-w-3xl space-y-5 py-6">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950" role="status">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" /><div><h1 className="font-bold">Report successfully submitted</h1><p className="mt-1 text-sm">The backend confirmed creation. Reference: <span className="font-mono font-semibold">{report.id}</span></p><p className="mt-1 text-xs">Status: {report.status}</p></div></div>
        </section>
        {analysis ? <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold text-slate-900">Analysis returned by the backend</h2><p className="mt-2 text-sm text-slate-600">Category: {analysis.categoryPredicted} · Risk score: {analysis.riskScore}/100</p></section> : <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">The report was created, but the backend did not return an AI analysis result.</p>}
        {localAiSuggestion && <section className="rounded-xl border border-amber-200 bg-amber-50 p-5" aria-label="Local AI preview"><h2 className="flex items-center gap-2 text-sm font-semibold text-amber-950"><Brain className="h-4 w-4" />Local AI preview (not backend-confirmed)</h2><p className="mt-2 text-sm text-amber-900">Suggested category: {localAiSuggestion.predictedCategory} · Confidence: {(localAiSuggestion.confidence * 100).toFixed(0)}% · Severity suggestion: {localAiSuggestion.severity}</p></section>}
        <div className="flex flex-wrap gap-3"><button type="button" onClick={resetForm} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Submit another report</button>{onNavigateToMyReports && <button type="button" onClick={onNavigateToMyReports} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">View my reports</button>}</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 py-6">
      <header className="border-b border-emerald-100 pb-4"><h1 className="text-xl font-bold text-slate-900">Submit a Community Report</h1><p className="mt-1 text-sm text-slate-600">Provide the incident details and location for municipal review.</p></header>
      {errorMessage && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorMessage}</div>}
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <label className="block text-sm font-medium text-slate-700">Title <span className="text-rose-600">*</span><input required minLength={5} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="block text-sm font-medium text-slate-700">Description <span className="text-rose-600">*</span><textarea required minLength={10} maxLength={5000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">Category <span className="text-rose-600">*</span><select required value={category} onChange={(event) => setCategory(event.target.value as ReportCategory | '')} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="" disabled>Select a category…</option>{CATEGORY_DISPLAY.map((item) => <option key={item.value} value={item.value}>{item.icon} {item.label}</option>)}</select></label>
          <label className="block text-sm font-medium text-slate-700">Subcategory<input maxLength={100} value={subcategory} onChange={(event) => setSubcategory(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        </div>
        <label className="block text-sm font-medium text-slate-700">Location name <span className="text-rose-600">*</span><input required minLength={2} maxLength={200} value={locationName} onChange={(event) => setLocationName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">Latitude <span className="text-rose-600">*</span><input required type="number" step="any" min={-90} max={90} value={latitude} onChange={(event) => setLatitude(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="block text-sm font-medium text-slate-700">Longitude <span className="text-rose-600">*</span><input required type="number" step="any" min={-180} max={180} value={longitude} onChange={(event) => setLongitude(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="block text-sm font-medium text-slate-700">Urgency<select value={urgency} onChange={(event) => setUrgency(event.target.value as UrgencyLevel)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{(['low', 'medium', 'high', 'critical'] as const).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        {localAiSuggestion && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4" aria-label="Local AI preview"><h2 className="flex items-center gap-2 text-sm font-semibold text-amber-950"><Sparkles className="h-4 w-4" />Local AI preview · not backend-confirmed</h2><p className="mt-2 text-sm text-amber-900">Suggested category: {localAiSuggestion.predictedCategory} ({(localAiSuggestion.confidence * 100).toFixed(0)}% model confidence). Suggested severity: {localAiSuggestion.severity}.</p>{localAiSuggestion.entities.locations.length > 0 && <p className="mt-1 text-xs text-amber-800">Detected location terms: {localAiSuggestion.entities.locations.join(', ')}</p>}{localAiSuggestion.predictedCategory !== category && <button type="button" onClick={() => setCategory(localAiSuggestion.predictedCategory)} className="mt-3 text-xs font-semibold text-amber-900 underline">Use suggested category</button>}</section>}
        <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting report…</> : <><Send className="h-4 w-4" />Submit report</>}</button>
      </form>
    </main>
  );
};
