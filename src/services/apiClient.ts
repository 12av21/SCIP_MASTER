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
  UserRole,
  TrendSummary
} from '../types/scip.js';

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

    let response: Response;
    try {
      response = await fetch(endpoint, { ...options, headers });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new Error('Unable to reach the SCIP API. Check the server connection and try again.');
    }

    const responseText = await response.text();
    let responseData: unknown;
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        if (response.ok) throw new Error('The SCIP API returned an invalid response.');
      }
    }

    if (!response.ok) {
      if (response.status === 401 && token && !['/api/auth/login', '/api/auth/register'].includes(endpoint)) {
        this.setToken(null);
        this.setStoredUser(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('scip:auth-expired'));
        }
      }

      const message = typeof responseData === 'object' && responseData !== null && 'message' in responseData && typeof responseData.message === 'string'
        ? responseData.message
        : `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return responseData as T;
  }

  // --- Public API Methods ---

  // Auth
  public async register(payload: { name: string; email: string; password: string; phone?: string }) {
    const res = await this.request<{ success: boolean; data: { user: User; token: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(res.data.token);
    this.setStoredUser(res.data.user);
    return res.data;
  }

  public async getCurrentUser(signal?: AbortSignal): Promise<User> {
    const response = await this.request<{ success: boolean; data: User }>('/api/auth/me', { signal });
    return response.data;
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

  public async getTrends(signal?: AbortSignal): Promise<TrendSummary> {
    const res = await this.request<{ success: boolean; data: TrendSummary }>('/api/intelligence/trends', { signal });
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
