// SCIP Verification - 22-Point Automated System Audit Suite
import React, { useState } from 'react';
import { api } from '../../services/apiClient.js';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  Sparkles,
  Terminal,
  ShieldCheck,
  Cpu,
  Layers,
  Check
} from 'lucide-react';

interface TestCaseResult {
  testId: number;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

export const TestRunnerView: React.FC = () => {
  const [results, setResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<{
    totalTests: number;
    passedCount: number;
    failedCount: number;
    passRatePercent: number;
  } | null>(null);

  const handleExecuteTests = async () => {
    setIsRunning(true);
    try {
      const res = await api.runAutomatedTests();
      if (res && res.data) {
        setResults(res.data.results);
        setSummary({
          totalTests: res.data.totalTests,
          passedCount: res.data.passedCount,
          failedCount: res.data.failedCount,
          passRatePercent: res.data.passRatePercent
        });
      }
    } catch (err: any) {
      alert(err.message || 'Test runner failed.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">22-Point Comprehensive System Audit</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated verification verifying all 22 technical audit criteria (Auth, RBAC, NLP, DBSCAN, Geospatial, Risk Scoring, and Human Review).
          </p>
        </div>

        <button
          onClick={handleExecuteTests}
          disabled={isRunning}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md shadow-xs flex items-center gap-2 transition-colors"
        >
          {isRunning ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>{isRunning ? 'Executing 22 Tests...' : 'Execute Full Audit Suite'}</span>
        </button>
      </div>

      {/* Summary Scorecard (when executed) */}
      {summary && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Verification Checks</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">{summary.totalTests}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Passed Checks</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono tabular-nums">{summary.passedCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Failed Checks</div>
              <div className="text-2xl font-bold text-slate-400 mt-1 font-mono tabular-nums">{summary.failedCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Audit Pass Rate</div>
              <div className="text-2xl font-bold text-indigo-600 mt-1 font-mono tabular-nums">{summary.passRatePercent}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Test List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {results.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 space-y-3">
            <Terminal className="w-8 h-8 text-slate-300 mx-auto" />
            <div>Click "Execute Full Audit Suite" to run all 22 live verification tests.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {results.map(t => (
              <div key={t.testId} className="p-4 hover:bg-slate-50 flex items-start gap-3.5 transition-colors">
                {t.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-400">
                        #{String(t.testId).padStart(2, '0')}
                      </span>
                      <span className="font-semibold text-xs text-slate-900">{t.name}</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {t.category}
                      </span>
                    </div>

                    <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                      {t.durationMs}ms
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {t.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
