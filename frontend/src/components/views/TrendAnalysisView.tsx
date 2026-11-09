import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, BarChart3, FileText, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { api, TrendAnalytics } from '../../services/apiClient';

type CountEntry = [string, number];

const TrendAnalysisView: React.FC = () => {
  const [trends, setTrends] = useState<TrendAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestInFlight = useRef(false);
  const requestId = useRef(0);

  const loadTrends = useCallback(async (signal?: AbortSignal) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getTrends(signal);
      if (currentRequestId === requestId.current) setTrends(data);
    } catch (error) {
      if (!signal?.aborted && currentRequestId === requestId.current) {
        setTrends(null);
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load trend data.');
      }
    } finally {
      if (currentRequestId === requestId.current) {
        requestInFlight.current = false;
        if (!signal?.aborted) setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadTrends(controller.signal);
    return () => {
      controller.abort();
      requestId.current += 1;
      requestInFlight.current = false;
    };
  }, [loadTrends]);

  const categoryEntries = Object.entries(trends?.categoryCounts ?? {}).sort((a, b) => b[1] - a[1]) as CountEntry[];
  const statusEntries = Object.entries(trends?.statusCounts ?? {}).sort((a, b) => b[1] - a[1]) as CountEntry[];
  const incidentEntries = Object.entries(trends?.incidentStatusCounts ?? {}).sort((a, b) => b[1] - a[1]) as CountEntry[];
  const dailyEntries = (Object.entries(trends?.dailyVolume ?? {}).sort(([a], [b]) => a.localeCompare(b)) as CountEntry[]).slice(-14);
  const hasTrendData = Boolean(trends && (trends.totalReports > 0 || trends.totalIncidents > 0 || categoryEntries.length || statusEntries.length || dailyEntries.length || incidentEntries.length));

  const renderBreakdown = (title: string, entries: CountEntry[], emptyLabel: string) => {
    const maxCount = Math.max(...entries.map(([, count]) => count), 0);
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          <ul className="space-y-3">
            {entries.map(([label, count]) => (
              <li key={label}>
                <div className="mb-1 flex justify-between gap-3 text-xs">
                  <span className="truncate text-slate-600">{label.replace(/_/g, ' ')}</span>
                  <span className="font-semibold tabular-nums text-slate-900">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${label}: ${count}`}>
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${maxCount ? (count / maxCount) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-100 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Trend &amp; Recurrence Intelligence</h1>
          <p className="mt-1 text-sm text-slate-600">Report and incident trends returned by the platform.</p>
        </div>
        <button type="button" onClick={() => void loadTrends()} disabled={isLoading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Retry
        </button>
      </header>

      {isLoading && !trends && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-12 text-sm text-slate-600" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading trend data…
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-semibold">Trend data could not be loaded</p><p className="mt-1">{errorMessage}</p></div>
        </div>
      )}

      {!isLoading && !errorMessage && trends && !hasTrendData && (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-sm font-semibold text-slate-800">No trend data available</h2>
          <p className="mt-1 text-sm text-slate-500">The platform has not returned any reports or incidents to analyze.</p>
        </div>
      )}

      {trends && hasTrendData && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total reports', value: trends.totalReports, icon: FileText },
              { label: 'Total incidents', value: trends.totalIncidents, icon: Activity },
              { label: 'Active incidents', value: trends.activeIncidents, icon: TrendingUp },
              { label: 'Potential incidents', value: trends.potentialIncidents, icon: AlertCircle },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Icon className="h-5 w-5" /></span>
                <div><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold tabular-nums text-slate-900">{value}</p></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {renderBreakdown('Reports by category', categoryEntries, 'No category counts were returned.')}
            {renderBreakdown('Reports by status', statusEntries, 'No report status counts were returned.')}
            {renderBreakdown('Incidents by status', incidentEntries, 'No incident status counts were returned.')}
            {renderBreakdown('Daily report volume (most recent 14 dates with data)', dailyEntries, 'No daily report volume was returned.')}
          </div>
          <p className="text-xs text-slate-500">Counts are provided by the intelligence trends API. SLA, resolution velocity, and infrastructure lifecycle metrics are not part of its response.</p>
        </>
      )}
    </main>
  );
};

export { TrendAnalysisView };
