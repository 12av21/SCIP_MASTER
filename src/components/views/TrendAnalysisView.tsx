import React, { useEffect, useState } from 'react';
import { api } from '../../services/apiClient';
import type { TrendSummary } from '../../types/scip';
import { AlertCircle, BarChart3, Calendar, PieChart, RefreshCw, TrendingUp } from 'lucide-react';

export const TrendAnalysisView: React.FC = () => {
  const [trends, setTrends] = useState<TrendSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void loadTrends(controller.signal);
    return () => controller.abort();
  }, []);

  const loadTrends = async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setTrends(await api.getTrends(signal));
    } catch (error) {
      if (!signal?.aborted) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load trend data.');
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  };

  const renderCounts = (entries: [string, number][], emptyMessage: string) => {
    if (entries.length === 0) {
      return <p className="py-6 text-center text-xs text-slate-500">{emptyMessage}</p>;
    }

    const maximum = Math.max(1, ...entries.map(([, count]) => count));
    return entries.map(([label, count]) => (
      <div key={label} className="grid grid-cols-[minmax(0,1fr)_2fr_auto] items-center gap-3 text-xs">
        <span className="truncate text-slate-600">{label}</span>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${count} items`}>
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(count / maximum) * 100}%` }} />
        </div>
        <span className="min-w-6 text-right font-mono font-semibold text-slate-800">{count}</span>
      </div>
    ));
  };

  if (isLoading && !trends) {
    return <div className="py-24 text-center text-xs text-slate-500" role="status">Loading trend data...</div>;
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center" role="alert">
        <AlertCircle className="mx-auto mb-2 h-5 w-5 text-rose-600" />
        <p className="text-sm font-semibold text-rose-800">Trend data could not be loaded</p>
        <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        <button type="button" onClick={() => void loadTrends()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!trends || (trends.totalReports === 0 && trends.totalIncidents === 0)) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <BarChart3 className="mx-auto mb-3 h-6 w-6 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-800">No trend data available</h2>
        <p className="mt-1 text-xs text-slate-500">Trend summaries will appear after reports or incidents are recorded.</p>
      </div>
    );
  }

  const categoryEntries = Object.entries(trends.categoryCounts).sort((a, b) => b[1] - a[1]);
  const statusEntries = Object.entries(trends.statusCounts).sort((a, b) => b[1] - a[1]);
  const dailyEntries = Object.entries(trends.dailyVolume).sort(([a], [b]) => b.localeCompare(a));
  const incidentStatusEntries = Object.entries(trends.incidentStatusCounts).sort((a, b) => b[1] - a[1]);
  const metrics = [
    { label: 'Total reports', value: trends.totalReports },
    { label: 'Total incidents', value: trends.totalIncidents },
    { label: 'Active incidents', value: trends.activeIncidents },
    { label: 'Potential incidents', value: trends.potentialIncidents }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-4">
      <header className="border-b border-emerald-100 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Trend & Recurrence Intelligence</h1>
        <p className="mt-1 text-xs text-emerald-700/80">Counts derived from current report and incident records returned by the API.</p>
      </header>

      {isLoading && <p className="text-xs text-slate-500" role="status">Refreshing trend data...</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Current totals">
        {metrics.map(metric => (
          <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-medium text-slate-500">{metric.label}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{metric.value}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900"><PieChart className="h-4 w-4 text-emerald-600" /> Reports by category</h2>
          <div className="space-y-3">{renderCounts(categoryEntries, 'No category counts were returned.')}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900"><TrendingUp className="h-4 w-4 text-emerald-600" /> Reports by status</h2>
          <div className="space-y-3">{renderCounts(statusEntries, 'No report status counts were returned.')}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900"><Calendar className="h-4 w-4 text-emerald-600" /> Daily report volume</h2>
          <div className="max-h-80 space-y-3 overflow-y-auto">{renderCounts(dailyEntries, 'No daily report counts were returned.')}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900"><BarChart3 className="h-4 w-4 text-emerald-600" /> Incidents by status</h2>
          <div className="space-y-3">{renderCounts(incidentStatusEntries, 'No incident status counts were returned.')}</div>
        </div>
      </section>
    </div>
  );
};
