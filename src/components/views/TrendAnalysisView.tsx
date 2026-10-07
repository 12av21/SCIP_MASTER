// SCIP Operations - Trend & Recurrence Analysis View
import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';

export const TrendAnalysisView: React.FC = () => {
  const [trends, setTrends] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrends();
  }, []);

  const loadTrends = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTrends();
      setTrends(data);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !trends) {
    return <div className="py-24 text-center text-xs text-slate-400">Loading trend analytics...</div>;
  }

  const categoryEntries = Object.entries(trends.categoryCounts || {}).sort((a: any, b: any) => b[1] - a[1]);
  const statusEntries = Object.entries(trends.statusCounts || {});
  const dailyEntries = Object.entries(trends.dailyVolume || {});

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Title */}
      <div className="border-b border-emerald-100 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Trend & Recurrence Intelligence</h1>
        <p className="text-xs text-emerald-700/80 font-medium mt-1">
          Longitudinal analysis of community hazard patterns, repeat choke points, and municipal resolution velocity.
        </p>
      </div>

      {/* Mockup-Inspired Operational Performance Donut Rings & Timeline Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Progress Cards (Matching Mockup Image Top Left) */}
        <div className="bg-white rounded-2xl border border-emerald-100/90 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Municipal Efficiency Metrics</h2>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Live KPIs</span>
          </div>
          <div className="flex items-center justify-around pt-2">
            {/* Donut 1: 78% */}
            <div className="text-center space-y-1">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-emerald-500" strokeDasharray="78, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute font-bold text-xs text-slate-900 font-mono">78%</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-800">SLA Met</div>
              <div className="text-[10px] text-slate-400">Within 24h</div>
            </div>

            {/* Donut 2: 52% */}
            <div className="text-center space-y-1">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-emerald-600" strokeDasharray="52, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute font-bold text-xs text-slate-900 font-mono">52%</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-800">Clustered</div>
              <div className="text-[10px] text-slate-400">DBSCAN match</div>
            </div>

            {/* Donut 3: 28% */}
            <div className="text-center space-y-1">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-emerald-700" strokeDasharray="28, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute font-bold text-xs text-slate-900 font-mono">28%</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-800">Preventive</div>
              <div className="text-[10px] text-slate-400">Pre-empted</div>
            </div>
          </div>
        </div>

        {/* Weekly Activity Tracker (Matching Mockup Top Middle) */}
        <div className="bg-white rounded-2xl border border-emerald-100/90 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Weekly Incident Velocity</h2>
            <span className="text-[10px] text-slate-400 font-mono">Oct 2026</span>
          </div>

          <div className="flex items-center justify-between text-xs px-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
              <div key={d} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">{d}</span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 4 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'}`}>
                  {12 + i}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Resolution velocity index</span>
              <span className="font-bold text-emerald-700 font-mono">82%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '82%' }} />
            </div>
          </div>
        </div>

        {/* Multi-Year Longitudinal Progress (Matching Mockup Middle Right) */}
        <div className="bg-white rounded-2xl border border-emerald-100/90 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Infrastructure Lifecycle</h2>
            <span className="text-[10px] text-emerald-700 font-mono font-semibold">Longitudinal</span>
          </div>

          <div className="flex items-center justify-between px-2 pt-3">
            {[
              { year: '2026', label: 'Active Plan', status: 'current' },
              { year: '2025', label: 'Upgraded', status: 'done' },
              { year: '2024', label: 'Audited', status: 'done' },
            ].map((milestone, idx) => (
              <div key={milestone.year} className="flex flex-col items-center text-center relative flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${milestone.status === 'current' ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' : 'bg-emerald-100 text-emerald-800'}`}>
                  ✓
                </div>
                <div className="font-bold text-xs text-slate-900 mt-2">{milestone.year}</div>
                <div className="text-[10px] text-slate-400">{milestone.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-emerald-100/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Cumulative Reports Intake</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">{trends.totalReports}</div>
          <div className="text-[10px] text-slate-400 mt-1">Across 8 municipal categories</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Active Incidents</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono tabular-nums">{trends.activeIncidents}</div>
          <div className="text-[10px] text-emerald-600/80 mt-1">Under investigation or resolution</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Potential Incident Clusters</div>
          <div className="text-2xl font-bold text-amber-600 mt-1 font-mono tabular-nums">{trends.potentialIncidents}</div>
          <div className="text-[10px] text-amber-600/80 mt-1">Requiring human confirmation</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Top Category Volume</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 truncate">
            {String(categoryEntries[0]?.[0] || 'Water & Drainage')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono tabular-nums">
            {Number(categoryEntries[0]?.[1] || 0)} observations ({(((Number(categoryEntries[0]?.[1] || 0)) / (trends.totalReports || 1)) * 100).toFixed(0)}%)
          </div>
        </div>
      </div>

      {/* Category Breakdown & Daily Volume Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-emerald-100/80 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Category Distribution
              </h2>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold font-mono">Normalized</span>
          </div>

          <div className="space-y-3">
            {categoryEntries.map(([cat, count]: [string, any]) => {
              const pct = Math.round((count / trends.totalReports) * 100);
              return (
                <div key={cat} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-slate-800">{cat}</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-emerald-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Volume Trends */}
        <div className="bg-white rounded-2xl border border-emerald-100/80 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Daily Report Submissions
              </h2>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold font-mono">Last 7 Days</span>
          </div>

          <div className="space-y-3">
            {dailyEntries.map(([date, count]: [string, any]) => {
              const maxVol = Math.max(...dailyEntries.map(e => e[1] as number), 1);
              const barWidth = Math.round((count / maxVol) * 100);
              return (
                <div key={date} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-slate-700 font-mono text-[11px]">{date}</span>
                    <span className="font-mono text-emerald-800 font-bold tabular-nums">
                      {count} reports
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-emerald-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
