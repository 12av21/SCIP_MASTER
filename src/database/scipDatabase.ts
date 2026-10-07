// SCIP Database Engine - In-Memory & Persisted Data Layer
// Implements transactional records, indexes, audit logging hooks, and real AI analysis integration

import {
  User,
  Department,
  Report,
  Incident,
  AIAnalysis,
  Assignment,
  Resolution,
  Notification,
  Feedback,
  AuditLog,
  RiskScore,
  SpatioTemporalCluster,
  UserRole,
  IncidentStatus
} from '../types/scip.js';
import {
  SEED_DEPARTMENTS,
  SEED_USERS,
  SEED_REPORTS,
  SEED_INCIDENTS,
  SEED_NOTIFICATIONS,
  SEED_AUDIT_LOGS
} from './seedData.js';
import { classifyReport, extractEntities, determineSeverity } from '../ai/classifier.js';
import { globalVectorizer } from '../ai/tfidf.js';
import { findSimilarAndDuplicateReports } from '../ai/duplicateDetector.js';
import { detectIncidentClusters } from '../ai/incidentClustering.js';
import { computeExplainableRisk } from '../ai/riskScorer.js';

class SCIPDatabase {
  private users: Map<string, User> = new Map();
  private departments: Map<string, Department> = new Map();
  private reports: Map<string, Report> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private analyses: Map<string, AIAnalysis> = new Map();
  private assignments: Map<string, Assignment> = new Map();
  private resolutions: Map<string, Resolution> = new Map();
  private notifications: Notification[] = [];
  private feedbacks: Feedback[] = [];
  private auditLogs: AuditLog[] = [];
  private riskScores: Map<string, RiskScore> = new Map();

  constructor() {
    this.seedDatabase();
  }

  public seedDatabase(): void {
    this.users.clear();
    this.departments.clear();
    this.reports.clear();
    this.incidents.clear();
    this.analyses.clear();
    this.assignments.clear();
    this.resolutions.clear();
    this.notifications = [...SEED_NOTIFICATIONS];
    this.feedbacks = [];
    this.auditLogs = [...SEED_AUDIT_LOGS];
    this.riskScores.clear();

    SEED_DEPARTMENTS.forEach(d => this.departments.set(d.id, { ...d }));
    SEED_USERS.forEach(u => this.users.set(u.id, { ...u }));
    SEED_REPORTS.forEach(r => this.reports.set(r.id, { ...r }));
    SEED_INCIDENTS.forEach(i => this.incidents.set(i.id, { ...i }));

    // Fit TF-IDF on seed reports
    const docs = Array.from(this.reports.values()).map(r => ({
      id: r.id,
      text: `${r.title} ${r.description} ${r.category} ${r.locationName}`
    }));
    globalVectorizer.fit(docs);

    // Run AI analysis for each seed report
    for (const r of this.reports.values()) {
      this.runAndStoreAIAnalysis(r, false);
    }
  }

  // --- Audit Logging Hook ---
  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const fullLog: AuditLog = {
      ...log,
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(fullLog);
    return fullLog;
  }

  public getAuditLogs(filters?: { module?: string; action?: string; userId?: string }): AuditLog[] {
    let logs = [...this.auditLogs];
    if (filters?.module) logs = logs.filter(l => l.module === filters.module);
    if (filters?.action) logs = logs.filter(l => l.action === filters.action);
    if (filters?.userId) logs = logs.filter(l => l.userId === filters.userId);
    return logs;
  }

  // --- Users & Auth ---
  public getUsers(): User[] {
    return Array.from(this.users.values()).map(u => {
      const { passwordHash, ...safeUser } = u;
      return safeUser as User;
    });
  }

  public getUserById(id: string): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    const { passwordHash, ...safeUser } = user;
    return safeUser as User;
  }

  public getUserByEmailWithPassword(email: string): User | undefined {
    return Array.from(this.users.values()).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );
  }

  public createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const existing = this.getUserByEmailWithPassword(userData.email);
    if (existing) {
      throw new Error(`Email ${userData.email} is already registered.`);
    }

    const id = `USR-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const newUser: User = {
      ...userData,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.users.set(id, newUser);

    this.logAudit({
      action: 'USER_CREATED',
      module: 'auth',
      recordId: id,
      userId: id,
      userEmail: newUser.email,
      userRole: newUser.role,
      ipAddress: '127.0.0.1',
      details: `New user registered: ${newUser.name} (${newUser.role})`
    });

    const { passwordHash, ...safe } = newUser;
    return safe as User;
  }

  public updateUserRole(userId: string, newRole: UserRole, adminUser: User): User {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const oldRole = user.role;
    user.role = newRole;
    user.updatedAt = new Date().toISOString();

    this.logAudit({
      action: 'ROLE_CHANGED',
      module: 'admin',
      recordId: userId,
      userId: adminUser.id,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      ipAddress: '127.0.0.1',
      details: `Changed role of ${user.name} from ${oldRole} to ${newRole}`
    });

    const { passwordHash, ...safe } = user;
    return safe as User;
  }

  // --- Departments ---
  public getDepartments(): Department[] {
    return Array.from(this.departments.values());
  }

  public getDepartmentById(id: string): Department | undefined {
    return this.departments.get(id);
  }

  // --- Reports & AI Integration ---
  public getReports(filter?: {
    citizenId?: string;
    category?: string;
    status?: string;
    urgency?: string;
  }): Report[] {
    let list = Array.from(this.reports.values());
    if (filter?.citizenId) list = list.filter(r => r.citizenId === filter.citizenId);
    if (filter?.category) list = list.filter(r => r.category === filter.category);
    if (filter?.status) list = list.filter(r => r.status === filter.status);
    if (filter?.urgency) list = list.filter(r => r.urgency === filter.urgency);

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getReportById(id: string): Report | undefined {
    return this.reports.get(id);
  }

  public getAIAnalysisForReport(reportId: string): AIAnalysis | undefined {
    return this.analyses.get(reportId);
  }

  public createReport(reportInput: Omit<Report, 'id' | 'status' | 'createdAt' | 'updatedAt'>): {
    report: Report;
    analysis: AIAnalysis;
  } {
    const id = `REP-${new Date().getFullYear()}-${String(this.reports.size + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const report: Report = {
      ...reportInput,
      id,
      status: 'analyzed',
      createdAt: now,
      updatedAt: now
    };

    this.reports.set(id, report);

    // Update TF-IDF corpus
    const docs = Array.from(this.reports.values()).map(r => ({
      id: r.id,
      text: `${r.title} ${r.description} ${r.category} ${r.locationName}`
    }));
    globalVectorizer.fit(docs);

    // Perform AI analysis
    const analysis = this.runAndStoreAIAnalysis(report, true);

    // Record audit event
    this.logAudit({
      action: 'REPORT_CREATED',
      module: 'reports',
      recordId: id,
      userId: report.citizenId,
      userEmail: report.citizenEmail,
      userRole: 'citizen',
      ipAddress: '127.0.0.1',
      details: `Report submitted: "${report.title}" at ${report.locationName}`
    });

    // Notify citizen
    this.createNotification({
      userId: report.citizenId,
      title: 'Report Received & Analyzed',
      message: `Your report ${id} was logged. AI identified category as "${analysis.categoryPredicted}" (${(analysis.categoryConfidence * 100).toFixed(0)}% confidence).`,
      type: 'report_status',
      link: id
    });

    return { report, analysis };
  }

  public updateReport(id: string, updates: Partial<Report>, user: User): Report {
    const report = this.reports.get(id);
    if (!report) throw new Error('Report not found');

    // Citizens can only edit if status is still submitted or analyzed
    if (user.role === 'citizen') {
      if (report.citizenId !== user.id) {
        throw new Error('Unauthorized to edit this report');
      }
      if (report.status !== 'submitted' && report.status !== 'analyzed') {
        throw new Error('Report cannot be modified once linked or investigated');
      }
    }

    Object.assign(report, updates, { updatedAt: new Date().toISOString() });
    this.reports.set(id, report);

    this.logAudit({
      action: 'REPORT_UPDATED',
      module: 'reports',
      recordId: id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: '127.0.0.1',
      details: `Updated report ${id}`
    });

    return report;
  }

  public runAndStoreAIAnalysis(report: Report, recordAudit: boolean = true): AIAnalysis {
    const allReports = Array.from(this.reports.values());
    const text = `${report.title} ${report.description} ${report.locationName}`;

    // 1. Classification
    const classResult = classifyReport(text, report.category);

    // 2. Entity Extraction
    const entities = extractEntities(text);

    // 3. Duplicate Detection & Similar Reports
    const { topSimilar, duplicateProbability, evidence: dupEvidence } =
      findSimilarAndDuplicateReports(report, allReports);

    // 4. Incident Clustering Check
    const clusters = detectIncidentClusters(allReports);
    const linkedCluster = clusters.find(c => c.reportIds.includes(report.id));

    // 5. Urgency & Risk
    const severityIndicator = determineSeverity(text, report.urgency);
    const riskEval = computeExplainableRisk({
      entityType: 'report',
      entityId: report.id,
      reports: [report],
      locationName: report.locationName,
      isRecurrentHotspot: report.locationName.toLowerCase().includes('sector 4')
    });

    const evidence = [
      ...dupEvidence,
      `Supervised TF-IDF classification confidence: ${(classResult.confidence * 100).toFixed(0)}%`,
      linkedCluster
        ? `Spatio-temporal cluster detected: linked to ${linkedCluster.reportCount} related observations in ${linkedCluster.radiusMeters}m radius`
        : 'Stand-alone observation (no active incident cluster threshold reached yet)'
    ];

    const analysis: AIAnalysis = {
      reportId: report.id,
      categoryPredicted: classResult.predictedCategory,
      categoryConfidence: classResult.confidence,
      keywords: globalVectorizer.getTopKeywords(globalVectorizer.transform(text), 6),
      entities,
      sentiment: severityIndicator === 'critical' ? 'urgent' : 'negative',
      duplicateProbability,
      topSimilarReports: topSimilar,
      possibleIncident: Boolean(linkedCluster),
      incidentClusterId: linkedCluster?.clusterId,
      severityIndicator,
      riskScore: riskEval.score,
      evidence,
      confidence: classResult.confidence,
      processedAt: new Date().toISOString()
    };

    this.analyses.set(report.id, analysis);

    if (recordAudit) {
      this.logAudit({
        action: 'AI_ANALYSIS_COMPLETED',
        module: 'intelligence',
        recordId: report.id,
        userId: 'SYSTEM_AI',
        userEmail: 'ai.pipeline@scip.internal',
        userRole: 'admin',
        ipAddress: '127.0.0.1',
        details: `AI Analysis completed for ${report.id}: ${analysis.categoryPredicted} (Risk: ${analysis.riskScore}/100)`
      });
    }

    return analysis;
  }

  // --- Incidents & Human Review ---
  public getIncidents(filter?: { status?: string; category?: string; priority?: string }): Incident[] {
    let list = Array.from(this.incidents.values());
    if (filter?.status) list = list.filter(i => i.status === filter.status);
    if (filter?.category) list = list.filter(i => i.category === filter.category);
    if (filter?.priority) list = list.filter(i => i.priority === filter.priority);

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getIncidentById(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  public createIncidentFromCluster(cluster: SpatioTemporalCluster, creatorUser: User): Incident {
    const id = `INC-${new Date().getFullYear()}-${String(this.incidents.size + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const incident: Incident = {
      id,
      title: cluster.suggestedTitle,
      category: cluster.category,
      description: `Synthesized potential incident derived from ${cluster.reportCount} correlated community reports within ${cluster.radiusMeters}m radius.`,
      locationName: `Cluster Centroid (${cluster.centroid.latitude}, ${cluster.centroid.longitude})`,
      latitude: cluster.centroid.latitude,
      longitude: cluster.centroid.longitude,
      radiusMeters: cluster.radiusMeters,
      reportIds: cluster.reportIds,
      severity: cluster.severity,
      priority: cluster.priority,
      confidence: cluster.confidence,
      status: 'potential',
      isAIGenerated: true,
      humanReviewed: false,
      evidence: cluster.evidence,
      createdAt: now,
      updatedAt: now
    };

    this.incidents.set(id, incident);

    // Link each report
    for (const rId of cluster.reportIds) {
      const rep = this.reports.get(rId);
      if (rep) {
        rep.status = 'linked';
        rep.incidentId = id;
        this.reports.set(rId, rep);
      }
    }

    this.logAudit({
      action: 'INCIDENT_DETECTED',
      module: 'incidents',
      recordId: id,
      userId: creatorUser.id,
      userEmail: creatorUser.email,
      userRole: creatorUser.role,
      ipAddress: '127.0.0.1',
      details: `Formed potential incident ${id} from cluster with ${cluster.reportCount} reports`
    });

    return incident;
  }

  public reviewIncident(
    incidentId: string,
    action: 'confirm' | 'dismiss',
    reviewer: User,
    notes: string,
    departmentId?: string,
    officerId?: string
  ): Incident {
    const incident = this.incidents.get(incidentId);
    if (!incident) throw new Error('Incident not found');

    const now = new Date().toISOString();

    if (action === 'confirm') {
      incident.status = 'confirmed';
      incident.humanReviewed = true;
      incident.reviewedBy = `${reviewer.name} (${reviewer.role})`;
      incident.reviewedAt = now;
      incident.reviewNotes = notes;

      if (departmentId) {
        const dept = this.departments.get(departmentId);
        incident.assignedDepartmentId = departmentId;
        incident.assignedDepartmentName = dept?.name;
      }
      if (officerId) {
        const off = this.users.get(officerId);
        incident.assignedOfficerId = officerId;
        incident.assignedOfficerName = off?.name;
      }

      this.logAudit({
        action: 'INCIDENT_REVIEWED',
        module: 'incidents',
        recordId: incidentId,
        userId: reviewer.id,
        userEmail: reviewer.email,
        userRole: reviewer.role,
        ipAddress: '127.0.0.1',
        details: `Confirmed incident ${incidentId}. Notes: ${notes}`
      });

      // Update linked reports status to assigned / under_review
      for (const rId of incident.reportIds) {
        const r = this.reports.get(rId);
        if (r) {
          r.status = 'under_review';
          this.reports.set(rId, r);
        }
      }
    } else {
      incident.status = 'dismissed';
      incident.humanReviewed = true;
      incident.reviewedBy = `${reviewer.name} (${reviewer.role})`;
      incident.reviewedAt = now;
      incident.reviewNotes = notes;

      this.logAudit({
        action: 'INCIDENT_DISMISSED',
        module: 'incidents',
        recordId: incidentId,
        userId: reviewer.id,
        userEmail: reviewer.email,
        userRole: reviewer.role,
        ipAddress: '127.0.0.1',
        details: `Dismissed potential incident ${incidentId}. Reason: ${notes}`
      });

      // Unlink reports
      for (const rId of incident.reportIds) {
        const r = this.reports.get(rId);
        if (r) {
          r.status = 'analyzed';
          r.incidentId = undefined;
          this.reports.set(rId, r);
        }
      }
    }

    incident.updatedAt = now;
    this.incidents.set(incidentId, incident);
    return incident;
  }

  public resolveIncident(
    incidentId: string,
    resolver: User,
    resolutionData: {
      actionTaken: string;
      preventiveMeasures?: string;
      costEstimate?: number;
    }
  ): Incident {
    const incident = this.incidents.get(incidentId);
    if (!incident) throw new Error('Incident not found');

    const now = new Date().toISOString();
    incident.status = 'resolved';
    incident.resolutionNotes = resolutionData.actionTaken;
    incident.resolvedAt = now;
    incident.updatedAt = now;

    const resRecord: Resolution = {
      id: `RES-${Date.now().toString().slice(-6)}`,
      incidentId,
      resolvedBy: resolver.name,
      actionTaken: resolutionData.actionTaken,
      preventiveMeasures: resolutionData.preventiveMeasures,
      costEstimate: resolutionData.costEstimate,
      citizenVerified: false,
      resolvedAt: now
    };
    this.resolutions.set(resRecord.id, resRecord);

    // Mark all linked reports as resolved
    for (const rId of incident.reportIds) {
      const r = this.reports.get(rId);
      if (r) {
        r.status = 'resolved';
        this.reports.set(rId, r);

        // Notify citizen
        this.createNotification({
          userId: r.citizenId,
          title: 'Incident Resolved',
          message: `The incident affecting your report ${r.id} has been resolved by municipal authorities. Resolution: "${resolutionData.actionTaken}".`,
          type: 'resolution',
          link: r.id
        });
      }
    }

    this.logAudit({
      action: 'INCIDENT_RESOLVED',
      module: 'incidents',
      recordId: incidentId,
      userId: resolver.id,
      userEmail: resolver.email,
      userRole: resolver.role,
      ipAddress: '127.0.0.1',
      details: `Resolved incident ${incidentId}: ${resolutionData.actionTaken}`
    });

    return incident;
  }

  // --- Notifications ---
  public getNotificationsForUser(userId: string): Notification[] {
    return this.notifications.filter(n => n.userId === userId);
  }

  public createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
    const notif: Notification = {
      ...data,
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.notifications.unshift(notif);
    return notif;
  }

  public markNotificationAsRead(notifId: string, userId: string): void {
    const notif = this.notifications.find(n => n.id === notifId && n.userId === userId);
    if (notif) notif.read = true;
  }

  public markAllNotificationsAsRead(userId: string): void {
    this.notifications.filter(n => n.userId === userId).forEach(n => { n.read = true; });
  }

  // --- Feedback ---
  public submitFeedback(data: Omit<Feedback, 'id' | 'createdAt'>): Feedback {
    const fb: Feedback = {
      ...data,
      id: `FB-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString()
    };
    this.feedbacks.unshift(fb);
    return fb;
  }

  public getFeedbacks(): Feedback[] {
    return this.feedbacks;
  }
}

// Global Singleton Database Instance
export const db = new SCIPDatabase();
