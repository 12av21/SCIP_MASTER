// SCIP Operations - Incident Queue & Responsible AI Human Review Workflow
import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { Incident, Report, Department, User } from '../../types/scip';
import { ReportDetailModal } from './ReportDetailModal';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  ShieldCheck,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  MapPin,
  Check,
  X
} from 'lucide-react';

interface IncidentManagementViewProps {
  onOpenReport?: (reportId: string) => void;
}

export const IncidentManagementView: React.FC<IncidentManagementViewProps> = ({ onOpenReport }) => {
  const { user, hasPermission } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Incident for Inspection & Human Review
  const [reviewingIncident, setReviewingIncident] = useState<Incident | null>(null);
  const [reviewAction, setReviewAction] = useState<'confirm' | 'dismiss'>('confirm');
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');

  // Resolution Modal State
  const [resolvingIncident, setResolvingIncident] = useState<Incident | null>(null);
  const [actionTaken, setActionTaken] = useState('');
  const [preventiveMeasures, setPreventiveMeasures] = useState('');
  const [costEstimate, setCostEstimate] = useState<number | ''>('');

  // Inspection of Linked Reports
  const [inspectingReportId, setInspectingReportId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [incRes, deptRes, userRes] = await Promise.all([
        api.getIncidents(),
        api.getDepartments(),
        api.getUsers()
      ]);
      setIncidents(incRes);
      setDepartments(deptRes);
      setOfficers(userRes.filter(u => u.role === 'officer' || u.role === 'authority'));
      if (deptRes.length > 0) setSelectedDeptId(deptRes[0].id);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const filteredIncidents = incidents.filter(i => {
    if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && i.category !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.locationName.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExecuteReview = async () => {
    if (!reviewingIncident) return;
    if (!reviewNotes) {
      alert('Please provide human review accountability notes.');
      return;
    }

    try {
      const updated = await api.reviewIncident(reviewingIncident.id, {
        action: reviewAction,
        notes: reviewNotes,
        departmentId: reviewAction === 'confirm' ? selectedDeptId : undefined,
        officerId: reviewAction === 'confirm' ? selectedOfficerId : undefined
      });

      setIncidents(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      setReviewingIncident(null);
      setReviewNotes('');
    } catch (err: any) {
      alert(err.message || 'Review execution failed.');
    }
  };

  const handleExecuteResolution = async () => {
    if (!resolvingIncident) return;
    if (!actionTaken || actionTaken.length < 5) {
      alert('Please specify the remediation action taken.');
      return;
    }

    try {
      const updated = await api.resolveIncident(resolvingIncident.id, {
        actionTaken,
        preventiveMeasures,
        costEstimate: Number(costEstimate) || undefined
      });

      setIncidents(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      setResolvingIncident(null);
      setActionTaken('');
      setPreventiveMeasures('');
    } catch (err: any) {
      alert(err.message || 'Resolution submission failed.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'potential':
        return 'bg-amber-50 text-amber-900 border-amber-300 font-semibold';
      case 'confirmed':
      case 'in_progress':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold';
      case 'dismissed':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Incident Review & Work Order Queue</h1>
          <p className="text-xs text-emerald-700/80 font-medium mt-1">
            Human-in-the-loop review queue for algorithmic incident proposals and operational dispatch.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-emerald-100/90 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-emerald-50/20 px-3 py-1.5 rounded-xl border border-emerald-100">
          <Search className="w-4 h-4 text-emerald-600 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by title, location, or INC ID..."
            className="w-full bg-transparent text-xs text-slate-900 focus:outline-hidden placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-emerald-50/30 border border-emerald-100 rounded-xl text-slate-700 text-xs focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="potential">Potential (Awaiting Review)</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-emerald-50/30 border border-emerald-100 rounded-xl text-slate-700 text-xs focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            <option value="Water & Drainage">Water & Drainage</option>
            <option value="Roads & Traffic">Roads & Traffic</option>
            <option value="Power & Lighting">Power & Lighting</option>
            <option value="Public Sanitation">Public Sanitation</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-2xl border border-emerald-100/80 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading incidents...</div>
        ) : filteredIncidents.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No matching incidents found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-emerald-50/50 border-b border-emerald-100 text-emerald-950 font-semibold">
                <tr>
                  <th className="p-3.5">Incident ID</th>
                  <th className="p-3.5">Title & Location</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Priority / Risk</th>
                  <th className="p-3.5">Linked Observations</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Assigned Department</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredIncidents.map(inc => (
                  <tr key={inc.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] font-bold text-emerald-700 whitespace-nowrap">
                      {inc.id}
                    </td>
                    <td className="p-3.5 max-w-sm">
                      <div className="font-semibold text-slate-900 leading-tight">{inc.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>{inc.locationName}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 whitespace-nowrap">{inc.category}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums ${
                        inc.severity === 'critical' ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                      }`}>
                        {inc.priority}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] whitespace-nowrap tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{inc.reportIds.length} reports</span>
                        <button
                          onClick={() => setInspectingReportId(inc.reportIds[0])}
                          className="text-[10px] text-emerald-600 hover:text-emerald-800 font-semibold"
                          title="Inspect first linked report"
                        >
                          (view)
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${getStatusBadge(inc.status)}`}>
                        {inc.status === 'potential' ? 'Awaiting Human Review' : inc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                      {inc.assignedDepartmentName || 'Unassigned'}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap space-x-1.5">
                      {inc.status === 'potential' && (
                        <button
                          onClick={() => {
                            setReviewingIncident(inc);
                            setReviewAction('confirm');
                            setReviewNotes('');
                          }}
                          className="px-3 py-1.5 text-[11px] font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors shadow-xs"
                        >
                          Human Review
                        </button>
                      )}

                      {(inc.status === 'confirmed' || inc.status === 'in_progress') && (
                        <button
                          onClick={() => {
                            setResolvingIncident(inc);
                            setActionTaken('');
                          }}
                          className="px-3 py-1.5 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                        >
                          Resolve
                        </button>
                      )}

                      {inc.status === 'resolved' && (
                        <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Human Review Modal (Responsible AI Enforcement) */}
      {reviewingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Responsible AI Human Review: {reviewingIncident.id}</span>
              </div>
              <button onClick={() => setReviewingIncident(null)} className="text-amber-800 hover:text-amber-950">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-semibold text-slate-900 text-sm">{reviewingIncident.title}</div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                  <span>{reviewingIncident.locationName}</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">{reviewingIncident.reportIds.length} linked citizen observations</span>
                </div>
                <ul className="mt-2 text-slate-600 list-disc pl-4 space-y-0.5 text-[11px]">
                  {reviewingIncident.evidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>

              {/* Action Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Review Determination</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer flex-1 select-none">
                    <input
                      type="radio"
                      name="reviewAction"
                      value="confirm"
                      checked={reviewAction === 'confirm'}
                      onChange={() => setReviewAction('confirm')}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Confirm Incident</div>
                      <div className="text-[10px] text-slate-500">Corroborated ground conditions; dispatch work order</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer flex-1 select-none">
                    <input
                      type="radio"
                      name="reviewAction"
                      value="dismiss"
                      checked={reviewAction === 'dismiss'}
                      onChange={() => setReviewAction('dismiss')}
                      className="text-rose-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Dismiss Cluster</div>
                      <div className="text-[10px] text-slate-500">Unrelated reports or false positive interpretation</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Department Assignment if confirmed */}
              {reviewAction === 'confirm' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assign Responsible Department</label>
                    <select
                      value={selectedDeptId}
                      onChange={e => setSelectedDeptId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-900"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Lead Assigned Officer</label>
                    <select
                      value={selectedOfficerId}
                      onChange={e => setSelectedOfficerId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-900"
                    >
                      <option value="">Unassigned field pool</option>
                      {officers.map(off => (
                        <option key={off.id} value={off.id}>
                          {off.name} ({off.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Review Notes / Accountability audit log */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Officer Review Accountability Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Record justification, field inspection findings, or operational directions..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Action permanently logged in municipal audit ledger</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReviewingIncident(null)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteReview}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium"
                >
                  Submit Human Determination
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incident Resolution Modal */}
      {resolvingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Document Municipal Resolution: {resolvingIncident.id}</span>
              </div>
              <button onClick={() => setResolvingIncident(null)} className="text-emerald-800 hover:text-emerald-950">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Action Taken & Remediation Summary <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={actionTaken}
                  onChange={e => setActionTaken(e.target.value)}
                  placeholder="e.g. Cleared clogged culvert using vacuum pump truck; cleared standing water from roadway."
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Preventive Measures</label>
                <input
                  type="text"
                  value={preventiveMeasures}
                  onChange={e => setPreventiveMeasures(e.target.value)}
                  placeholder="e.g. Scheduled bi-weekly desilting; installed trash intake grate."
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cost Estimate (USD / INR)</label>
                <input
                  type="number"
                  value={costEstimate}
                  onChange={e => setCostEstimate(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 1450"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-slate-900 bg-white focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setResolvingIncident(null)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteResolution}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
              >
                Mark Incident Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspecting Linked Report Modal */}
      {inspectingReportId && (
        <ReportDetailModal
          reportId={inspectingReportId}
          onClose={() => setInspectingReportId(null)}
        />
      )}
    </div>
  );
};
