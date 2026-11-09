import type {
  AIAnalysis,
  AuditLog,
  Department,
  Feedback,
  Incident,
  Notification,
  Report,
  Resolution,
  User
} from '../../types/scip.js';

export interface PaginationOptions {
  limit?: number;
  skip?: number;
}

export interface ScipRepository {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<{ status: string; database: string; collections: number }>;
  logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>;
  getAuditLogs(filters?: { module?: string; action?: string; userId?: string }, pagination?: PaginationOptions): Promise<AuditLog[]>;
  countAuditLogs(filters?: { module?: string; action?: string; userId?: string }): Promise<number>;
  getUsers(pagination?: PaginationOptions): Promise<User[]>;
  countUsers(): Promise<number>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmailWithPassword(email: string): Promise<User | undefined>;
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUserRole(userId: string, newRole: User['role'], adminUser: User): Promise<User>;
  getDepartments(pagination?: PaginationOptions): Promise<Department[]>;
  getDepartmentById(id: string): Promise<Department | undefined>;
  getReports(
    filter?: { citizenId?: string; category?: string; status?: string; urgency?: string },
    pagination?: PaginationOptions
  ): Promise<Report[]>;
  getReportsByIds(ids: string[]): Promise<Report[]>;
  getReportIdsByCitizen(citizenId: string): Promise<string[]>;
  countReports(filter?: { citizenId?: string; category?: string; status?: string; urgency?: string }): Promise<number>;
  getReportById(id: string): Promise<Report | undefined>;
  getAIAnalysisForReport(reportId: string): Promise<AIAnalysis | undefined>;
  createReport(reportInput: Omit<Report, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<{ report: Report; analysis: AIAnalysis }>;
  updateReport(id: string, updates: Partial<Report>, user: User): Promise<Report>;
  runAndStoreAIAnalysis(report: Report, recordAudit?: boolean): Promise<AIAnalysis>;
  getIncidents(filter?: { status?: string; category?: string; priority?: string; reportIds?: string[] }, pagination?: PaginationOptions): Promise<Incident[]>;
  countIncidents(filter?: { status?: string; category?: string; priority?: string; reportIds?: string[] }): Promise<number>;
  getIncidentById(id: string): Promise<Incident | undefined>;
  createIncidentFromCluster(cluster: import('../../types/scip.js').SpatioTemporalCluster, creator: User): Promise<Incident>;
  reviewIncident(incidentId: string, action: 'confirm' | 'dismiss', reviewer: User, notes: string, departmentId?: string, officerId?: string): Promise<Incident>;
  resolveIncident(incidentId: string, resolver: User, resolutionData: { actionTaken: string; preventiveMeasures?: string; costEstimate?: number }): Promise<Incident>;
  getNotificationsForUser(userId: string, pagination?: PaginationOptions): Promise<Notification[]>;
  countUnreadNotificationsForUser(userId: string): Promise<number>;
  markNotificationAsRead(notificationId: string, userId: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<number>;
  submitFeedback(data: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback>;
  getFeedbackForReport(reportId: string): Promise<Feedback | undefined>;
  createResolution(data: Omit<Resolution, 'id' | 'resolvedAt'>): Promise<Resolution>;
  countRecords(): Promise<{ users: number; reports: number; incidents: number; auditLogs: number }>;
}
