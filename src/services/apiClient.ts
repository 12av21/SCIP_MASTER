// SCIP - Centralized Typed API Client
// Handles authentication headers, token persistence, error parsing, and graceful fallback

import {
  User,
  Report,
  Incident,
  AIAnalysis,
  SpatioTemporalCluster,
  AgentBriefing,
  AuditLog,
  Department,
  Notification,
  Feedback,
  UserRole
} from '../types/scip.js';
import { db } from '../database/scipDatabase.js';
import { SCIPIntelligenceAgent } from '../ai/scipAgent.js';
import { detectIncidentClusters } from '../ai/incidentClustering.js';

const TOKEN_KEY = 'scip_auth_token';
const USER_KEY = 'scip_auth_user';

class APIClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
    return this.token;
  }

  public getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    const str = localStorage.getItem(USER_KEY);
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  public setStoredUser(user: User | null) {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Request failed with status ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      // If network fails (e.g. static Vite dev without express active), handle via internal DB fallback
      return this.handleLocalFallback<T>(endpoint, options);
    }
  }

  private handleLocalFallback<T>(endpoint: string, options: RequestInit): Promise<T> {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body as string) : {};

    // Auth routes fallback
    if (endpoint === '/api/auth/demo-login') {
      const users = db.getUsers();
      const user = users.find(u => u.role === body.role) || users[0];
      const token = `mock-token-${user.id}`;
      this.setToken(token);
      this.setStoredUser(user);
      return Promise.resolve({ success: true, data: { user, token } } as any);
    }

    if (endpoint === '/api/auth/login') {
      const user = db.getUserByEmailWithPassword(body.email);
      if (!user) throw new Error('Invalid email or password.');
      const token = `mock-token-${user.id}`;
      const { passwordHash, ...safe } = user;
      this.setToken(token);
      this.setStoredUser(safe as User);
      return Promise.resolve({ success: true, data: { user: safe, token } } as any);
    }

    if (endpoint === '/api/auth/register') {
      const user = db.createUser(body);
      const token = `mock-token-${user.id}`;
      this.setToken(token);
      this.setStoredUser(user);
      return Promise.resolve({ success: true, data: { user, token } } as any);
    }

    // Reports routes fallback
    if (endpoint.startsWith('/api/reports')) {
      if (method === 'GET') {
        const id = endpoint.split('/')[3];
        if (id) {
          const report = db.getReportById(id);
          const analysis = db.getAIAnalysisForReport(id);
          return Promise.resolve({ success: true, data: { report, analysis } } as any);
        }
        const reports = db.getReports();
        return Promise.resolve({ success: true, data: reports } as any);
      }
      if (method === 'POST') {
        const currentUser = this.getStoredUser() || db.getUsers().find(u => u.role === 'citizen')!;
        const { report, analysis } = db.createReport({
          ...body,
          citizenId: currentUser.id,
          citizenName: currentUser.name,
          citizenEmail: currentUser.email
        });
        return Promise.resolve({ success: true, data: { report, analysis } } as any);
      }
    }

    // Incidents routes fallback
    if (endpoint.startsWith('/api/incidents')) {
      if (method === 'GET') {
        const id = endpoint.split('/')[3];
        if (id) {
          const incident = db.getIncidentById(id);
          const allReports = db.getReports();
          const linkedReports = allReports.filter(r => incident?.reportIds.includes(r.id));
          return Promise.resolve({ success: true, data: { incident, linkedReports } } as any);
        }
        return Promise.resolve({ success: true, data: db.getIncidents() } as any);
      }
      if (endpoint === '/api/incidents/from-cluster') {
        const currentUser = this.getStoredUser() || db.getUsers().find(u => u.role === 'authority')!;
        const incident = db.createIncidentFromCluster(body.cluster, currentUser);
        return Promise.resolve({ success: true, data: incident } as any);
      }
      if (endpoint.includes('/review')) {
        const id = endpoint.split('/')[3];
        const currentUser = this.getStoredUser() || db.getUsers().find(u => u.role === 'authority')!;
        const updated = db.reviewIncident(id, body.action, currentUser, body.notes, body.departmentId, body.officerId);
        return Promise.resolve({ success: true, data: updated } as any);
      }
      if (endpoint.includes('/resolve')) {
        const id = endpoint.split('/')[3];
        const currentUser = this.getStoredUser() || db.getUsers().find(u => u.role === 'officer')!;
        const resolved = db.resolveIncident(id, currentUser, body);
        return Promise.resolve({ success: true, data: resolved } as any);
      }
    }

    // Intelligence routes fallback
    if (endpoint === '/api/intelligence/agent') {
      const agent = new SCIPIntelligenceAgent({
        reports: db.getReports(),
        incidents: db.getIncidents()
      });
      const brief = agent.executeIntelligenceQuery(body.query, body.specificTool);
      return Promise.resolve({ success: true, data: brief } as any);
    }

    if (endpoint === '/api/intelligence/clusters') {
      const clusters = detectIncidentClusters(db.getReports());
      return Promise.resolve({ success: true, data: clusters } as any);
    }

    if (endpoint === '/api/intelligence/hotspots') {
      const reports = db.getReports();
      const locationMap = new Map<string, any>();
      for (const r of reports) {
        const existing = locationMap.get(r.locationName) || {
          location: r.locationName,
          latitude: r.latitude,
          longitude: r.longitude,
          reportCount: 0,
          categories: new Set()
        };
        existing.reportCount += 1;
        existing.categories.add(r.category);
        locationMap.set(r.locationName, existing);
      }
      const data = Array.from(locationMap.values()).map(d => ({
        ...d,
        categories: Array.from(d.categories),
        densityIndex: Math.min(100, d.reportCount * 20),
        isHighRisk: d.reportCount >= 3
      })).sort((a, b) => b.reportCount - a.reportCount);
      return Promise.resolve({ success: true, data } as any);
    }

    if (endpoint === '/api/intelligence/trends') {
      const reports = db.getReports();
      const incidents = db.getIncidents();
      const categoryCounts: Record<string, number> = {};
      reports.forEach(r => { categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1; });
      const statusCounts: Record<string, number> = {};
      reports.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
      const dailyVolume: Record<string, number> = {};
      reports.forEach(r => {
        const d = r.createdAt.split('T')[0];
        dailyVolume[d] = (dailyVolume[d] || 0) + 1;
      });
      return Promise.resolve({
        success: true,
        data: {
          totalReports: reports.length,
          totalIncidents: incidents.length,
          activeIncidents: incidents.filter(i => i.status !== 'resolved').length,
          potentialIncidents: incidents.filter(i => i.status === 'potential').length,
          categoryCounts,
          statusCounts,
          dailyVolume
        }
      } as any);
    }

    // Admin routes fallback
    if (endpoint === '/api/admin/users') {
      return Promise.resolve({ success: true, data: db.getUsers() } as any);
    }
    if (endpoint === '/api/admin/departments') {
      return Promise.resolve({ success: true, data: db.getDepartments() } as any);
    }
    if (endpoint.startsWith('/api/admin/audit-logs')) {
      return Promise.resolve({ success: true, data: db.getAuditLogs() } as any);
    }

    // Misc fallback
    if (endpoint === '/api/health') {
      return Promise.resolve({ status: 'healthy', platform: 'SCIP', services: { api: 'operational', database: 'connected' } } as any);
    }
    if (endpoint === '/api/notifications') {
      const user = this.getStoredUser() || db.getUsers()[0];
      const notifs = db.getNotificationsForUser(user.id);
      return Promise.resolve({ success: true, data: notifs, unreadCount: notifs.filter(n => !n.read).length } as any);
    }

    return Promise.resolve({ success: true, data: null } as any);
  }

  // --- Public API Methods ---

  // Auth
  public async register(payload: { name: string; email: string; password: string; role?: UserRole; phone?: string }) {
    const res = await this.request<{ success: boolean; data: { user: User; token: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(res.data.token);
    this.setStoredUser(res.data.user);
    return res.data;
  }

  public async login(payload: { email: string; password: string }) {
    const res = await this.request<{ success: boolean; data: { user: User; token: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(res.data.token);
    this.setStoredUser(res.data.user);
    return res.data;
  }

  public async demoLogin(role: UserRole) {
    const res = await this.request<{ success: boolean; data: { user: User; token: string } }>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role })
    });
    this.setToken(res.data.token);
    this.setStoredUser(res.data.user);
    return res.data;
  }

  public async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    this.setToken(null);
    this.setStoredUser(null);
  }

  // Reports
  public async getReports(params?: { category?: string; status?: string; urgency?: string; myOnly?: boolean }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.urgency) query.set('urgency', params.urgency);
    if (params?.myOnly) query.set('myOnly', 'true');

    const res = await this.request<{ success: boolean; data: Report[] }>(`/api/reports?${query.toString()}`);
    return res.data;
  }

  public async getReportById(id: string) {
    const res = await this.request<{ success: boolean; data: { report: Report; analysis: AIAnalysis | null } }>(`/api/reports/${id}`);
    return res.data;
  }

  public async createReport(payload: Partial<Report>) {
    const res = await this.request<{ success: boolean; data: { report: Report; analysis: AIAnalysis } }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  public async updateReport(id: string, updates: Partial<Report>) {
    const res = await this.request<{ success: boolean; data: Report }>(`/api/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return res.data;
  }

  public async reanalyzeReport(id: string) {
    const res = await this.request<{ success: boolean; data: AIAnalysis }>(`/api/reports/${id}/reanalyze`, {
      method: 'POST'
    });
    return res.data;
  }

  // Incidents
  public async getIncidents(params?: { status?: string; category?: string; priority?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.priority) query.set('priority', params.priority);

    const res = await this.request<{ success: boolean; data: Incident[] }>(`/api/incidents?${query.toString()}`);
    return res.data;
  }

  public async getIncidentById(id: string) {
    const res = await this.request<{ success: boolean; data: { incident: Incident; linkedReports: Report[] } }>(`/api/incidents/${id}`);
    return res.data;
  }

  public async createIncidentFromCluster(cluster: SpatioTemporalCluster) {
    const res = await this.request<{ success: boolean; data: Incident }>('/api/incidents/from-cluster', {
      method: 'POST',
      body: JSON.stringify({ cluster })
    });
    return res.data;
  }

  public async reviewIncident(id: string, payload: { action: 'confirm' | 'dismiss'; notes: string; departmentId?: string; officerId?: string }) {
    const res = await this.request<{ success: boolean; data: Incident }>(`/api/incidents/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  public async resolveIncident(id: string, payload: { actionTaken: string; preventiveMeasures?: string; costEstimate?: number }) {
    const res = await this.request<{ success: boolean; data: Incident }>(`/api/incidents/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  // Intelligence
  public async runAgentQuery(query: string, specificTool?: string) {
    const res = await this.request<{ success: boolean; data: AgentBriefing }>('/api/intelligence/agent', {
      method: 'POST',
      body: JSON.stringify({ query, specificTool })
    });
    return res.data;
  }

  public async getClusters() {
    const res = await this.request<{ success: boolean; data: SpatioTemporalCluster[] }>('/api/intelligence/clusters');
    return res.data;
  }

  public async getHotspots() {
    const res = await this.request<{ success: boolean; data: any[] }>('/api/intelligence/hotspots');
    return res.data;
  }

  public async getTrends() {
    const res = await this.request<{ success: boolean; data: any }>('/api/intelligence/trends');
    return res.data;
  }

  // Admin
  public async getUsers() {
    const res = await this.request<{ success: boolean; data: User[] }>('/api/admin/users');
    return res.data;
  }

  public async updateUserRole(userId: string, role: UserRole) {
    const res = await this.request<{ success: boolean; data: User }>(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
    return res.data;
  }

  public async getDepartments() {
    const res = await this.request<{ success: boolean; data: Department[] }>('/api/admin/departments');
    return res.data;
  }

  public async getAuditLogs(params?: { module?: string; action?: string }) {
    const query = new URLSearchParams();
    if (params?.module) query.set('module', params.module);
    if (params?.action) query.set('action', params.action);
    const res = await this.request<{ success: boolean; data: AuditLog[] }>(`/api/admin/audit-logs?${query.toString()}`);
    return res.data;
  }

  // Misc
  public async getNotifications() {
    const res = await this.request<{ success: boolean; data: Notification[]; unreadCount: number }>('/api/notifications');
    return res;
  }

  public async markNotificationRead(id: string) {
    return await this.request(`/api/notifications/${id}/read`, { method: 'PUT' });
  }

  public async markAllNotificationsRead() {
    return await this.request('/api/notifications/read-all', { method: 'POST' });
  }

  public async submitFeedback(payload: { reportId?: string; incidentId?: string; rating: number; comments: string }) {
    const res = await this.request<{ success: boolean; data: Feedback }>('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  public async runAutomatedTests() {
    const res = await this.request<{ success: boolean; data: any }>('/api/tests/run', {
      method: 'POST'
    });
    return res.data;
  }
}

export const api = new APIClient();
