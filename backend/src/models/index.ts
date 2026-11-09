// SCIP Backend - Mongoose Models Index
// Centralized export of all database models

export { User, type UserDocument, type UserRole, type SafeUser, toSafeUser, USER_ROLES } from "./user.js";
export { Report, type ReportDocument, type ReportCategory, type ReportStatus, type UrgencyLevel, REPORT_CATEGORIES, REPORT_STATUSES, URGENCY_LEVELS } from "./report.js";
export { Incident, type IncidentDocument, type IncidentSeverity, type IncidentPriority, type IncidentStatus, INCIDENT_SEVERITIES, INCIDENT_PRIORITIES, INCIDENT_STATUSES } from "./incident.js";
export { Department, type DepartmentDocument } from "./department.js";
export { AIAnalysis, type AIAnalysisDocument } from "./aiAnalysis.js";
export { Notification, type NotificationDocument } from "./notification.js";
export { AuditLog, type AuditLogDocument } from "./auditLog.js";
export { Assignment, type AssignmentDocument } from "./assignment.js";
export { Resolution, type ResolutionDocument } from "./resolution.js";
export { RiskScore, type RiskScoreDocument } from "./riskScore.js";
export { Feedback, type FeedbackDocument } from "./feedback.js";