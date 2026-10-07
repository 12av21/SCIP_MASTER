// Smart Community Intelligence Platform (SCIP) - Core Type Definitions

export type UserRole = 'citizen' | 'officer' | 'authority' | 'admin';

export type UserPermission =
  | 'user.read'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'report.create'
  | 'report.read'
  | 'report.update'
  | 'report.delete'
  | 'report.assign'
  | 'incident.read'
  | 'incident.create'
  | 'incident.update'
  | 'incident.assign'
  | 'incident.resolve'
  | 'analytics.read'
  | 'intelligence.read'
  | 'audit.read'
  | 'admin.manage';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  phone?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  headName: string;
  email: string;
  phone: string;
  activeIncidentsCount: number;
  createdAt: string;
}

export type ReportCategory =
  | 'Water & Drainage'
  | 'Roads & Traffic'
  | 'Public Sanitation'
  | 'Power & Lighting'
  | 'Parks & Environment'
  | 'Structural Safety'
  | 'Public Health'
  | 'Noise & Disturbance';

export type ReportStatus =
  | 'submitted'
  | 'processing'
  | 'analyzed'
  | 'linked'
  | 'under_review'
  | 'assigned'
  | 'resolved'
  | 'closed';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  subcategory?: string;
  locationName: string;
  latitude: number;
  longitude: number;
  citizenId: string;
  citizenName: string;
  citizenEmail: string;
  status: ReportStatus;
  urgency: UrgencyLevel;
  incidentId?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SimilarReportMatch {
  reportId: string;
  reportTitle: string;
  category: ReportCategory;
  similarityScore: number; // 0 to 1
  distanceMeters: number;
  timeDeltaHours: number;
  matchingTerms: string[];
  isPotentialDuplicate: boolean;
}

export interface AIAnalysis {
  reportId: string;
  categoryPredicted: ReportCategory;
  categoryConfidence: number; // 0 to 1
  keywords: string[];
  entities: {
    locations: string[];
    infrastructure: string[];
    hazards: string[];
    temporal: string[];
  };
  sentiment: 'negative' | 'neutral' | 'urgent';
  duplicateProbability: number;
  topSimilarReports: SimilarReportMatch[];
  possibleIncident: boolean;
  incidentClusterId?: string;
  severityIndicator: UrgencyLevel;
  riskScore: number; // 0 to 100
  evidence: string[];
  uncertaintyNotes?: string;
  confidence: number;
  processedAt: string;
}

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentPriority = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';
export type IncidentStatus =
  | 'potential'
  | 'under_review'
  | 'confirmed'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'dismissed';

export interface Incident {
  id: string;
  title: string;
  category: ReportCategory;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  reportIds: string[];
  severity: IncidentSeverity;
  priority: IncidentPriority;
  confidence: number; // 0 to 1
  status: IncidentStatus;
  isAIGenerated: boolean;
  humanReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  assignedDepartmentId?: string;
  assignedDepartmentName?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  incidentId: string;
  departmentId: string;
  departmentName: string;
  officerId: string;
  officerName: string;
  assignedBy: string;
  notes: string;
  status: 'assigned' | 'in_progress' | 'completed';
  assignedAt: string;
}

export interface Resolution {
  id: string;
  incidentId: string;
  resolvedBy: string;
  actionTaken: string;
  preventiveMeasures?: string;
  equipmentUsed?: string[];
  costEstimate?: number;
  citizenVerified: boolean;
  resolvedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'report_status' | 'incident_alert' | 'assignment' | 'resolution' | 'system';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  reportId?: string;
  incidentId?: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comments: string;
  createdAt: string;
}

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'USER_CREATED'
  | 'ROLE_CHANGED'
  | 'REPORT_CREATED'
  | 'REPORT_UPDATED'
  | 'REPORT_DELETED'
  | 'AI_ANALYSIS_COMPLETED'
  | 'INCIDENT_DETECTED'
  | 'INCIDENT_REVIEWED'
  | 'INCIDENT_ASSIGNED'
  | 'INCIDENT_RESOLVED'
  | 'INCIDENT_DISMISSED'
  | 'SECURITY_EVENT';

export interface AuditLog {
  id: string;
  action: AuditAction;
  module: 'auth' | 'reports' | 'incidents' | 'intelligence' | 'admin' | 'security';
  recordId?: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  ipAddress: string;
  details: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  score: number;
  description: string;
}

export interface RiskScore {
  id: string;
  entityType: 'report' | 'incident' | 'cluster';
  entityId: string;
  score: number; // 0 to 100
  priority: IncidentPriority;
  factors: RiskFactor[];
  explanation: string;
  computedAt: string;
}

export interface SpatioTemporalCluster {
  clusterId: string;
  category: ReportCategory;
  centroid: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
  reportIds: string[];
  reportCount: number;
  suggestedTitle: string;
  severity: IncidentSeverity;
  priority: IncidentPriority;
  confidence: number;
  evidence: string[];
  timeSpanHours: number;
}

export interface AgentToolResult {
  toolName: string;
  status: 'success' | 'partial' | 'insufficient_evidence';
  executionTimeMs: number;
  summary: string;
  data: any;
}

export interface AgentBriefing {
  id: string;
  query: string;
  timestamp: string;
  executiveSummary: string;
  confidence: number;
  toolResults: AgentToolResult[];
  recommendedActions: string[];
  uncertaintyDisclaimer: string;
}

// Runtime placeholder exports to guarantee Node.js 22 native type-stripping module resolution
export const User = {} as any;
export const Department = {} as any;
export const Report = {} as any;
export const Incident = {} as any;
export const AuditLog = {} as any;
export const Notification = {} as any;
export const RiskScore = {} as any;
export const RiskFactor = {} as any;
export const SpatioTemporalCluster = {} as any;
export const AgentBriefing = {} as any;
export const AgentToolResult = {} as any;
export const SimilarReportMatch = {} as any;
export const AIAnalysis = {} as any;
export const Feedback = {} as any;
export const Assignment = {} as any;
export const Resolution = {} as any;
export const UserRole = {} as any;
export const UserPermission = {} as any;
export const ReportCategory = {} as any;
export const ReportStatus = {} as any;
export const UrgencyLevel = {} as any;
export const IncidentSeverity = {} as any;
export const IncidentPriority = {} as any;
export const IncidentStatus = {} as any;
export const AuditAction = {} as any;

