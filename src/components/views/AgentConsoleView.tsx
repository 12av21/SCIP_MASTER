// SCIP Agent - Multi-Tool Intelligence Agent Console
import React, { useState } from 'react';
import { api } from '../../services/apiClient';
import { AgentBriefing, AgentToolResult } from '../../types/scip';
import {
  Cpu,
  Sparkles,
  Send,
  Layers,
  MapPin,
  TrendingUp,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal
} from 'lucide-react';

const PRESET_QUERIES = [
  { label: 'Sector 4 Flooding', query: 'Analyze drainage and flooding clusters around Sector 4 Market' },
  { label: 'Cluster Detection', query: 'Detect all active spatio-temporal incident clusters in the city' },
  { label: 'Risk Evaluation', query: 'Evaluate multi-factor risk scores and priority for high severity reports' },
  { label: 'Trend & Recurrence', query: 'Examine weekly trend patterns and identify repeat municipal choke points' },
  { label: 'Entity Extraction', query: 'Extract locations, infrastructure components, and physical hazards from recent observations' }
];

export const AgentConsoleView: React.FC = () => {
  const [query, setQuery] = useState(PRESET_QUERIES[0].query);
  const [briefing, setBriefing] = useState<AgentBriefing | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedToolData, setSelectedToolData] = useState<AgentToolResult | null>(null);

  const handleRunAgent = async (promptQuery?: string, specificTool?: string) => {
    const q = promptQuery || query;
    if (!q.trim()) return;

    setIsExecuting(true);
    try {
      const brief = await api.runAgentQuery(q, specificTool);
      setBriefing(brief);
      if (brief.toolResults.length > 0) {
        setSelectedToolData(brief.toolResults[0]);
      }
    } catch (err: any) {
      alert(err.message || 'Agent execution failed.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Title */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">SCIP Intelligence Agent</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Autonomous multi-tool analytical orchestration combining 10 specialized intelligence tools for decision support.
        </p>
      </div>

      {/* Query Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Enter Intelligence Request</span>
          <span className="text-slate-400 font-mono text-[11px]">SCIP Multi-Tool Engine v1.0</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRunAgent()}
            placeholder="Ask SCIP Agent to analyze clusters, extract entities, evaluate risks..."
            className="flex-1 px-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600"
          />
          <button
            onClick={() => handleRunAgent()}
            disabled={isExecuting}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isExecuting ? 'Synthesizing...' : 'Execute Agent'}</span>
          </button>
        </div>

        {/* Preset Query Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] font-medium text-slate-500 mr-1">Quick prompts:</span>
          {PRESET_QUERIES.map(p => (
            <button
              key={p.label}
              onClick={() => {
                setQuery(p.query);
                handleRunAgent(p.query);
              }}
              className="px-2.5 py-1 text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md border border-slate-200 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Direct Tool Invocation Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700 text-xs">Direct Tool Triggers:</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleRunAgent('Run DBSCAN Incident Clustering', 'clustering')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 flex items-center gap-1"
          >
            <Layers className="w-3 h-3 text-indigo-600" />
            <span>Clustering Tool</span>
          </button>
          <button
            onClick={() => handleRunAgent('Analyze municipal trends', 'trends')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 flex items-center gap-1"
          >
            <TrendingUp className="w-3 h-3 text-indigo-600" />
            <span>Trend Tool</span>
          </button>
          <button
            onClick={() => handleRunAgent('Inspect geospatial density', 'hotspots')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 flex items-center gap-1"
          >
            <MapPin className="w-3 h-3 text-indigo-600" />
            <span>Geospatial Tool</span>
          </button>
        </div>
      </div>

      {/* Agent Output Dossier */}
      {briefing && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {briefing.id}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {new Date(briefing.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-500 tabular-nums">
                Synthesis Confidence: <strong className="text-slate-900">{(briefing.confidence * 100).toFixed(0)}%</strong>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
                Executive Synthesis
              </div>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                {briefing.executiveSummary}
              </p>
            </div>

            {/* Recommended Operational Actions */}
            {briefing.recommendedActions.length > 0 && (
              <div className="space-y-2">
                <div className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
                  Recommended Operational Decisions
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {briefing.recommendedActions.map((act, i) => (
                    <li key={i} className="flex items-start gap-2 bg-indigo-50/50 p-2.5 rounded border border-indigo-100">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inviolable Responsible AI Uncertainty Disclaimer */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 text-[11px] leading-relaxed">
              {briefing.uncertaintyDisclaimer}
            </div>
          </div>

          {/* Tool Execution Traces Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tool Execution List */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>Orchestrated Tools ({briefing.toolResults.length})</span>
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {briefing.toolResults.map(tool => {
                  const isSelected = selectedToolData?.toolName === tool.toolName;
                  return (
                    <div
                      key={tool.toolName}
                      onClick={() => setSelectedToolData(tool)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>{tool.toolName}</span>
                        <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                          {tool.executionTimeMs}ms
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-1 line-clamp-2">{tool.summary}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Tool Data Inspector */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="font-bold text-xs text-slate-900">
                  Tool Trace Inspector: {selectedToolData?.toolName || 'Select Tool'}
                </div>
                {selectedToolData && (
                  <span className="text-[11px] font-mono text-emerald-600 font-semibold uppercase">
                    Status: {selectedToolData.status}
                  </span>
                )}
              </div>

              {selectedToolData ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-700">
                    {selectedToolData.summary}
                  </div>

                  <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
                    Structured Tool Output Data
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-96">
                    {JSON.stringify(selectedToolData.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-slate-400">
                  Select a tool from the left panel to inspect trace output.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
