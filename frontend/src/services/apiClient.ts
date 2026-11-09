// SCIP - Centralized Typed API Client
// Handles authentication headers, token persistence, error parsing

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
} from '../types/scip';

const TOKEN_KEY = 'scip_auth_token';
const USER_KEY = 'scip_auth_user';

export interface TrendAnalytics {
  totalReports: number;
  totalIncidents: number;
  activeIncidents: number;
  potentialIncidents: number;
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  dailyVolume: Record<string, number>;
  incidentStatusCounts: Record<string, number>;
}

export interface SystemStats {
  nodeVersion: string;
  platform: string;
  uptimeSeconds: number;
  memory: { heapUsedMB: number; heapTotalMB: number; rssMB: number };
  database: { status: string; usersCount: number; reportsCount: number; incidentsCount: number; auditLogsCount: number };
}

export interface HotspotData {
  location: string;
  latitude: number;
  longitude: number;
  reportCount: number;
  categories: string[];
  densityIndex: number;
  isHighRisk: boolean;
}

export interface IncidentDetails {
  incident: Incident;
  linkedReports: Report[];
}

export interface AutomatedTestResult {
  testId: number;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

export interface AutomatedTestSummary {
  totalTests: number;
  passedCount: number;
  failedCount: number;
  passRatePercent: number;
  executedAt: string;
  results: AutomatedTestResult[];
}

export class APIError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = 'APIError';
  }
}

function errorMessageFromResponse(body: unknown, status: number): string {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const response = body as Record<string, unknown>;
    const message = typeof response.message === 'string' ? response.message : typeof response.error === 'string' ? response.error : null;
    const errors = Array.isArray(response.errors) ? response.errors.filter((item): item is string => typeof item === 'string') : [];
    const details = response.details && typeof response.details === 'object' && !Array.isArray(response.details)
      ? Object.entries(response.details as Record<string, unknown>).flatMap(([field, value]) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map(item => `${field}: ${item}`) : [])
      : [];
    const extra = [...errors, ...details].join(' ');
    if (message || extra) return [message, extra].filter(Boolean).join(' ');
  }
  return `Request failed with status ${status}.`;
}

function isCountMap(value: unknown): value is Record<string, number> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every(item => typeof item === 'number' && Number.isFinite(item) && item >= 0);
}

function isTrendAnalytics(value: unknown): value is TrendAnalytics {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return ['totalReports', 'totalIncidents', 'activeIncidents', 'potentialIncidents'].every(key => typeof data[key] === 'number' && Number.isFinite(data[key]) && (data[key] as number) >= 0)
    && isCountMap(data.categoryCounts)
    && isCountMap(data.statusCounts)
    && isCountMap(data.dailyVolume)
    && isCountMap(data.incidentStatusCounts);
}

class APIClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
    }
  }

  public setToken(token: string | null, remember = true) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      if (token) {
        (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
      }
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
    }
    return this.token;
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
    headers.set('Accept', 'application/json');
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let res: Response;
    try {
      res = await fetch(endpoint, { ...options, headers });
    } catch (error) {
      if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
      throw new APIError('Unable to connect to the SCIP API. Check your connection and try again.', 0);
    }

    let responseData: unknown = null;
    try {
      const responseText = await res.text();
      responseData = responseText ? JSON.parse(responseText) as unknown : null;
    } catch {
      if (res.ok) throw new APIError('The server returned an invalid response.', res.status);
    }

    if (res.ok && responseData && typeof responseData === 'object' && !Array.isArray(responseData) && (responseData as Record<string, unknown>).success === false) {
      throw new APIError(errorMessageFromResponse(responseData, res.status), res.status, responseData);
    }

    if (!res.ok) {
      if (res.status === 401 && token) {
        this.logout();
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('scip:auth-expired'));
      }
      throw new APIError(errorMessageFromResponse(responseData, res.status), res.status, responseData);
    }

    return responseData as T;
  }

  // Auth
  public async login(email: string, password: string, remember = true) {
    const res = await this.request<{ success: boolean; data: { user: User; token: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.data.token, remember);
    this.setStoredUser(res.data.user);
    return res.data;
  }

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
    const res = await this.request<{ success: boolean; data: User }>('/api/auth/me', { signal });
    this.setStoredUser(res.data);
    return res.data;
  }

  public logout() {
    this.setToken(null);
    this.setStoredUser(null);
  }

  // Reports
  public async submitReport(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'incidentId' | 'images' | 'citizenId' | 'citizenName' | 'citizenEmail'>) {
    return this.createReport(report);
  }

  public async createReport(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'incidentId' | 'images' | 'citizenId' | 'citizenName' | 'citizenEmail'>) {
    const res = await this.request<{ success: boolean; data: { report: Report; analysis?: AIAnalysis | null } }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(report)
    });
    if (!res.data?.report?.id) {
      throw new Error('The server response did not confirm report creation.');
    }
    return res.data;
  }

  public async getReports(params?: { status?: string; category?: string; myOnly?: boolean }, signal?: AbortSignal) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.myOnly) query.set('myOnly', 'true');
    const res = await this.request<{ success: boolean; data: Report[] }>(`/api/reports?${query.toString()}`, { signal });
    return res.data;
  }

  public async getReport(id: string, signal?: AbortSignal) {
    const res = await this.request<{ success: boolean; data: { report: Report; analysis?: AIAnalysis | null } }>(`/api/reports/${id}`, { signal });
    return res.data;
  }

  // Alias for getReport
  public async getReportById(id: string, signal?: AbortSignal) {
    return this.getReport(id, signal);
  }

  public async getMyReports(signal?: AbortSignal) {
    return this.getReports({ myOnly: true }, signal);
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
  public async getIncidents(params?: { status?: string; category?: string; priority?: string }, signal?: AbortSignal) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.priority) query.set('priority', params.priority);
    const res = await this.request<{ success: boolean; data: Incident[] }>(`/api/incidents?${query.toString()}`, { signal });
    return res.data;
  }

  public async getIncident(id: string, signal?: AbortSignal): Promise<IncidentDetails> {
    const res = await this.request<{ success: boolean; data: IncidentDetails }>(`/api/incidents/${id}`, { signal });
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
  public async runAgentQuery(query: string, specificTool?: string, signal?: AbortSignal) {
    const res = await this.request<{ success: boolean; data: AgentBriefing }>('/api/intelligence/agent', {
      method: 'POST',
      body: JSON.stringify({ query, specificTool }),
      signal
    });
    return res.data;
  }

  public async getClusters(signal?: AbortSignal) {
    const res = await this.request<{ success: boolean; data: SpatioTemporalCluster[] }>('/api/intelligence/clusters', { signal });
    return res.data;
  }

  public async getHotspots(signal?: AbortSignal) {
    const res = await this.request<{ success: boolean; data: HotspotData[] }>('/api/intelligence/hotspots', { signal });
    return res.data;
  }

  public async getTrends(signal?: AbortSignal): Promise<TrendAnalytics> {
    const res = await this.request<{ success: boolean; data: unknown }>('/api/intelligence/trends', { signal });
    if (!isTrendAnalytics(res.data)) {
      throw new APIError('The trends endpoint returned an unsupported response format.', 200, res.data);
    }
    return res.data;
  }

  // Admin
  public async getUsers(signal?: AbortSignal) {
    const res = await this.request<{ success: boolean; data: User[] }>('/api/admin/users', { signal });
    return res.data;
  }

  public async updateUserRole(userId: string, role: UserRole) {
    const res = await this.request<{ success: boolean; data: User }>(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
    return res.data;
  }

  public async getDepartments(signal?: AbortSignal) {
    const res = await this.request<{ success: boolean; data: Department[] }>('/api/admin/departments', { signal });
    return res.data;
  }

  public async getAuditLogs(params?: { module?: string; action?: string }, signal?: AbortSignal) {
    const query = new URLSearchParams();
    if (params?.module) query.set('module', params.module);
    if (params?.action) query.set('action', params.action);
    const res = await this.request<{ success: boolean; data: AuditLog[] }>(`/api/admin/audit-logs?${query.toString()}`, { signal });
    return res.data;
  }

  public async getSystemStats(signal?: AbortSignal): Promise<SystemStats> {
    const res = await this.request<{ success: boolean; data: SystemStats }>('/api/admin/system-stats', { signal });
    return res.data;
  }

  // Misc
  public async getNotifications(signal?: AbortSignal): Promise<{ success: boolean; data: Notification[]; unreadCount: number }> {
    return this.request<{ success: boolean; data: Notification[]; unreadCount: number }>('/api/notifications', { signal });
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

  public async runAutomatedTests(): Promise<AutomatedTestSummary> {
    const res = await this.request<{ success: boolean; data: AutomatedTestSummary }>('/api/tests/run', {
      method: 'POST'
    });
    return res.data;
  }
}

export const api = new APIClient();
