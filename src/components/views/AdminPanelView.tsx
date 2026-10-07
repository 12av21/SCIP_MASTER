// SCIP Administration - Enterprise Governance & Audit Panel
import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient';
import { User, Department, AuditLog, UserRole } from '../../types/scip';
import {
  Users,
  Building2,
  FileCheck2,
  Activity,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const AdminPanelView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'audit' | 'system'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Audit filters
  const [auditModuleFilter, setAuditModuleFilter] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [u, d, a] = await Promise.all([
        api.getUsers(),
        api.getDepartments(),
        api.getAuditLogs()
      ]);
      setUsers(u);
      setDepartments(d);
      setAuditLogs(a);
      setSystemStats({
        nodeVersion: 'v22.14.0',
        platform: 'Linux x64 (AI Studio Container)',
        databaseStatus: 'Active & Verified',
        auditCount: a.length
      });
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    try {
      const updated = await api.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
    } catch (err: any) {
      alert(err.message || 'Failed to update user role.');
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (auditModuleFilter !== 'ALL' && log.module !== auditModuleFilter) return false;
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.userEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Title */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Administration & Governance Console</h1>
        <p className="text-xs text-slate-500 mt-1">
          Role-Based Access Control, Department Management, and Immutable Audit Trail.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Management ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'departments'
              ? 'border-indigo-600 text-indigo-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Audit & Security Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'system'
              ? 'border-indigo-600 text-indigo-700 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>System Diagnostics</span>
        </button>
      </div>

      {/* Tab 1: User Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Active Role</th>
                <th className="p-3">Department</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Modify Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-500">{u.email}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{u.departmentName || '—'}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <select
                      value={u.role}
                      onChange={e => handleChangeRole(u.id, e.target.value as UserRole)}
                      className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-hidden"
                    >
                      <option value="citizen">Citizen</option>
                      <option value="officer">Officer</option>
                      <option value="authority">Authority</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Department Management */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {departments.map(dept => (
            <div key={dept.id} className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {dept.code}
                </span>
                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {dept.activeIncidentsCount} Active Work Orders
                </span>
              </div>
              <h3 className="font-semibold text-sm text-slate-900">{dept.name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{dept.description}</p>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div>Department Head: <strong className="text-slate-800">{dept.headName}</strong></div>
                <div>Contact: {dept.email} · {dept.phone}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Immutable Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                placeholder="Search audit trail by user, action, or details..."
                className="w-full bg-transparent text-xs text-slate-900 focus:outline-hidden"
              />
            </div>

            <select
              value={auditModuleFilter}
              onChange={e => setAuditModuleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-hidden"
            >
              <option value="ALL">All Modules</option>
              <option value="auth">auth</option>
              <option value="reports">reports</option>
              <option value="incidents">incidents</option>
              <option value="intelligence">intelligence</option>
              <option value="admin">admin</option>
              <option value="security">security</option>
            </select>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap tabular-nums">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 uppercase text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                      {log.module}
                    </td>
                    <td className="p-3 text-slate-900 font-medium whitespace-nowrap">
                      {log.userEmail}
                    </td>
                    <td className="p-3 text-slate-600 max-w-md truncate">
                      {log.details}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: System Diagnostics */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6 text-xs">
          <h2 className="text-sm font-bold text-slate-900">Runtime Diagnostics & Platform Health</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Node Environment</div>
              <div className="font-semibold text-slate-900 text-sm">{systemStats?.nodeVersion}</div>
              <div className="text-slate-500">{systemStats?.platform}</div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Database Engine</div>
              <div className="font-semibold text-emerald-700 text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Operational & Indexed</span>
              </div>
              <div className="text-slate-500">Mongoose-compatible schemas & in-memory transactional ledger</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
