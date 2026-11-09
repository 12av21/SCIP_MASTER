// MongoDB Database Adapter for SCIP - implements same interface as SCIPDatabase

import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import {
  User, Department, Report, Incident, AIAnalysis, Assignment, Resolution,
  Notification, Feedback, AuditLog, RiskScore
} from '../models/index.js';
import {
  User as UserType, Department as DepartmentType, Report as ReportType,
  Incident as IncidentType, AIAnalysis as AIAnalysisType,
  Assignment as AssignmentType, Resolution as ResolutionType,
  Notification as NotificationType, Feedback as FeedbackType,
  AuditLog as AuditLogType, RiskScore as RiskScoreType,
  UserRole, ReportCategory, ReportStatus, UrgencyLevel,
  IncidentSeverity, IncidentPriority, IncidentStatus,
  SimilarReportMatch, RiskFactor, SpatioTemporalCluster
} from '../types/scip.js';
import type { PaginationOptions, ScipRepository } from './repositories/ScipRepository.js';
import {
  SEED_DEPARTMENTS, SEED_USERS, SEED_REPORTS, SEED_INCIDENTS,
  SEED_NOTIFICATIONS, SEED_AUDIT_LOGS
} from './seedData.js';
import { classifyReport, extractEntities, determineSeverity } from '../ai/classifier.js';
import { globalVectorizer } from '../ai/tfidf.js';
import { findSimilarAndDuplicateReports } from '../ai/duplicateDetector.js';
import { detectIncidentClusters } from '../ai/incidentClustering.js';
import { computeExplainableRisk } from '../ai/riskScorer.js';

// Type conversion helpers
function toReport(doc: any): ReportType {
  if (!doc) return null as any;
  return {
    ...doc,
    category: doc.category as ReportCategory,
    status: doc.status as ReportStatus,
    urgency: doc.urgency as UrgencyLevel,
  };
}

function toReports(docs: any[]): ReportType[] {
  return docs.map(toReport);
}

function toIncident(doc: any): IncidentType {
  if (!doc) return null as any;
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category as ReportCategory,
    description: doc.description,
    locationName: doc.locationName || doc.location?.name || '',
    latitude: doc.latitude ?? doc.location?.latitude ?? 0,
    longitude: doc.longitude ?? doc.location?.longitude ?? 0,
    radiusMeters: doc.radiusMeters ?? 0,
    reportIds: doc.reportIds || [],
    severity: doc.severity as IncidentSeverity,
    priority: doc.priority as IncidentPriority,
    status: doc.status as IncidentStatus,
    confidence: doc.confidence ?? 0,
    isAIGenerated: doc.isAIGenerated ?? false,
    humanReviewed: doc.humanReviewed ?? false,
    reviewedBy: doc.reviewedBy,
    reviewedAt: doc.reviewedAt,
    reviewNotes: doc.reviewNotes,
    assignedDepartmentId: doc.assignedDepartmentId,
    assignedDepartmentName: doc.assignedDepartmentName,
    assignedOfficerId: doc.assignedOfficerId,
    assignedOfficerName: doc.assignedOfficerName,
    resolutionNotes: doc.resolutionNotes,
    resolvedAt: doc.resolvedAt,
    evidence: doc.evidence || [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

function toIncidents(docs: any[]): IncidentType[] {
  return docs.map(toIncident);
}

function toAssignment(doc: any): AssignmentType {
  if (!doc) return null as any;
  return {
    ...doc,
    officerId: doc.officerId || doc.staffId || '',
    officerName: doc.officerName || '',
    departmentId: doc.departmentId || '',
    departmentName: doc.departmentName || '',
    status: doc.status as AssignmentType['status'],
  };
}

function toAssignments(docs: any[]): AssignmentType[] {
  return docs.map(toAssignment);
}

function toResolution(doc: any): ResolutionType {
  if (!doc) return null as any;
  return {
    ...doc,
    createdAt: doc.createdAt || doc.resolvedAt,
  };
}

function toNotification(doc: any): NotificationType {
  if (!doc) return null as any;
  return {
    ...doc,
    type: doc.type as NotificationType['type'],
  };
}

function toNotifications(docs: any[]): NotificationType[] {
  return docs.map(toNotification);
}

function toFeedback(doc: any): FeedbackType {
  if (!doc) return null as any;
  return {
    ...doc,
    createdAt: doc.createdAt || doc.submittedAt,
  };
}

function toRiskScore(doc: any): RiskScoreType {
  if (!doc) return null as any;
  return {
    ...doc,
    priority: doc.priority as IncidentPriority,
  };
}

function toRiskScores(docs: any[]): RiskScoreType[] {
  return docs.map(toRiskScore);
}

interface MongoDBConfig {
  uri: string;
  dbName: string;
}

export interface FixtureSeedCollection<T extends { id: string }> {
  name: string;
  records: readonly T[];
  getId(record: T): string;
  duplicateKeyField: string;
  findExisting(id: string): Promise<boolean>;
  insert(record: T): Promise<void>;
}

export interface FixtureSeedSummary {
  collection: string;
  insertedIds: string[];
  skippedExistingIds: string[];
}

export interface MongoFixtureSeedAdapter {
  collections: readonly FixtureSeedCollection<{ id: string }>[];
  getReports(): Promise<ReportType[]>;
  buildAnalysis(report: ReportType): Promise<AIAnalysisType>;
  findAnalysis(reportId: string): Promise<boolean>;
  insertAnalysis(analysis: AIAnalysisType): Promise<void>;
}

function assertFixtureSeedingAllowed(): void {
  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.ENABLE_DEV_FIXTURE_SEEDING !== 'true'
  ) {
    throw new Error(
      'Fixture seeding requires NODE_ENV=development and ENABLE_DEV_FIXTURE_SEEDING=true.'
    );
  }
}

async function seedMissingFixtureRecords<T extends { id: string }>(
  collection: FixtureSeedCollection<T>
): Promise<FixtureSeedSummary> {
  const summary: FixtureSeedSummary = {
    collection: collection.name,
    insertedIds: [],
    skippedExistingIds: []
  };

  for (const record of collection.records) {
    const id = collection.getId(record);
    if (await collection.findExisting(id)) {
      summary.skippedExistingIds.push(id);
      continue;
    }

    try {
      await collection.insert(record);
      summary.insertedIds.push(id);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        if (isExpectedDuplicateFixtureId(error, collection.duplicateKeyField, id)) {
          summary.skippedExistingIds.push(id);
          continue;
        }
        throw new Error(
          `Unexpected duplicate-key conflict while seeding ${collection.name} fixture ${id}: ${describeDuplicateKey(error)}`,
          { cause: error }
        );
      }
      throw error;
    }
  }

  return summary;
}

function isExpectedDuplicateFixtureId(
  error: unknown,
  fixtureIdField: string,
  fixtureId: string
): boolean {
  if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 11000) {
    return false;
  }

  const keyPattern = 'keyPattern' in error ? error.keyPattern : undefined;
  const keyValue = 'keyValue' in error ? error.keyValue : undefined;
  const pattern =
    keyPattern && typeof keyPattern === 'object'
      ? keyPattern as Record<string, unknown>
      : undefined;
  const values =
    keyValue && typeof keyValue === 'object'
      ? keyValue as Record<string, unknown>
      : undefined;
  return (
    !!pattern &&
    Object.keys(pattern).length === 1 &&
    Object.hasOwn(pattern, fixtureIdField) &&
    !!values &&
    Object.hasOwn(values, fixtureIdField) &&
    values[fixtureIdField] === fixtureId
  );
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return !!error && typeof error === 'object' && 'code' in error && error.code === 11000;
}

function describeDuplicateKey(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'keyPattern' in error &&
    error.keyPattern !== null &&
    typeof error.keyPattern === 'object'
  ) {
    const fields = Object.keys(error.keyPattern);
    if (fields.length > 0) return `conflicting unique field(s): ${fields.join(', ')}`;
  }
  if (error instanceof Error) return error.message;
  return 'duplicate key did not match the fixture identifier';
}

function pageWindow(pagination?: PaginationOptions): { skip: number; limit: number } {
  const skip = Math.max(0, Math.floor(pagination?.skip ?? 0));
  const limit = Math.min(100, Math.max(1, Math.floor(pagination?.limit ?? 100)));
  return { skip, limit };
}

function isDuplicateKeyOn(error: unknown, field: string): boolean {
  if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 11000 || !('keyPattern' in error)) {
    return false;
  }
  const keyPattern = error.keyPattern;
  return !!keyPattern && typeof keyPattern === 'object' && Object.hasOwn(keyPattern, field);
}

export function serializeMongoDocument<T>(doc: T | null): T | null {
  if (!doc) return null;
  const candidate = doc as T & { toObject?: () => unknown };
  const value = typeof candidate.toObject === 'function' ? candidate.toObject() : doc;
  if (!value || typeof value !== 'object') return doc;
  const plain = { ...(value as Record<string, unknown>) };
  delete plain._id;
  delete plain.__v;
  return plain as T;
}

export class MongoDatabase implements ScipRepository {
  private connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private fixtureSeedPromise: Promise<FixtureSeedSummary[]> | null = null;

  constructor(
    private config: MongoDBConfig,
    private fixtureSeedAdapter?: MongoFixtureSeedAdapter
  ) {}

  async connect(): Promise<void> {
    if (this.connected) return;
    if (this.connectionPromise) return this.connectionPromise;
    const connection = this._connect();
    this.connectionPromise = connection;
    try {
      await connection;
    } finally {
      if (this.connectionPromise === connection) this.connectionPromise = null;
    }
  }

  private async _connect(): Promise<void> {
    try {
      await mongoose.connect(this.config.uri, {
        dbName: this.config.dbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      await Promise.all([
        User.init(),
        Department.init(),
        Report.init(),
        Incident.init(),
        AIAnalysis.init(),
        Assignment.init(),
        Resolution.init(),
        Notification.init(),
        Feedback.init(),
        AuditLog.init(),
        RiskScore.init()
      ]);
      const reports = await Report.find().select('id title description category locationName').lean();
      globalVectorizer.fit(reports.map(report => ({
        id: report.id,
        text: `${report.title} ${report.description} ${report.category} ${report.locationName}`
      })));
      this.connected = true;
      console.log('[MongoDB] Connected successfully');
    } catch (error) {
      this.connected = false;
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      throw new Error(`[MongoDB] Connection failed (${errorName}); verify MONGODB_URI and database availability.`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await mongoose.disconnect();
      this.connected = false;
      console.log('[MongoDB] Disconnected');
    }
  }

  async seedDatabase(): Promise<FixtureSeedSummary[]> {
    assertFixtureSeedingAllowed();
    if (this.fixtureSeedPromise) return this.fixtureSeedPromise;

    const seedPromise = this.seedFixtureData();
    this.fixtureSeedPromise = seedPromise;
    try {
      return await seedPromise;
    } finally {
      if (this.fixtureSeedPromise === seedPromise) this.fixtureSeedPromise = null;
    }
  }

  private async seedFixtureData(): Promise<FixtureSeedSummary[]> {
    await this.connect();

    const adapter = this.fixtureSeedAdapter ?? this.createMongoFixtureSeedAdapter();
    const summaries = await Promise.all(
      adapter.collections.map(collection => seedMissingFixtureRecords(collection))
    );
    const reports = await adapter.getReports();
    globalVectorizer.fit(
      reports.map(report => ({
        id: report.id,
        text: `${report.title} ${report.description} ${report.category} ${report.locationName}`
      }))
    );

    const analyses = await Promise.all(reports.map(report => adapter.buildAnalysis(report)));
    const analysisRecords = analyses.map(analysis => ({
      id: analysis.reportId,
      analysis
    }));
    const analysisSummary = await seedMissingFixtureRecords({
      name: 'aiAnalyses',
      records: analysisRecords,
      getId: record => record.id,
      duplicateKeyField: 'reportId',
      findExisting: adapter.findAnalysis,
      insert: record => adapter.insertAnalysis(record.analysis)
    });
    summaries.push(analysisSummary);

    for (const summary of summaries) {
      console.info(
        `[MongoDB] Fixture seeding ${summary.collection}: inserted=${summary.insertedIds.length} ` +
        `[${summary.insertedIds.join(', ')}], skipped-existing=${summary.skippedExistingIds.length} ` +
        `[${summary.skippedExistingIds.join(', ')}]`
      );
    }
    return summaries;
  }

  private createMongoFixtureSeedAdapter(): MongoFixtureSeedAdapter {
    const fixtureCollection = <T extends { id: string }>(
      name: string,
      records: readonly T[],
      findExisting: (id: string) => Promise<boolean>,
      insert: (record: T) => Promise<unknown>
    ): FixtureSeedCollection<T> => ({
      name,
      records,
      getId: record => record.id,
      duplicateKeyField: 'id',
      findExisting,
      insert: async record => { await insert(record); }
    });

    return {
      collections: [
        fixtureCollection('departments', SEED_DEPARTMENTS,
          async id => Boolean(await Department.exists({ id })),
          record => Department.create(record)),
        fixtureCollection('users', SEED_USERS,
          async id => Boolean(await User.exists({ id })),
          record => User.create(record)),
        fixtureCollection('reports', SEED_REPORTS,
          async id => Boolean(await Report.exists({ id })),
          record => Report.create(record)),
        fixtureCollection('incidents', SEED_INCIDENTS,
          async id => Boolean(await Incident.exists({ id })),
          record => Incident.create(record)),
        fixtureCollection('notifications', SEED_NOTIFICATIONS,
          async id => Boolean(await Notification.exists({ id })),
          record => Notification.create(record)),
        fixtureCollection('auditLogs', SEED_AUDIT_LOGS,
          async id => Boolean(await AuditLog.exists({ id })),
          record => AuditLog.create(record))
      ],
      getReports: async () => {
        const reportDocs = await Report.find({
          id: { $in: SEED_REPORTS.map(report => report.id) }
        }).lean();
        return toReports(reportDocs);
      },
      buildAnalysis: report => this.buildAIAnalysis(report),
      findAnalysis: async reportId => Boolean(await AIAnalysis.exists({ reportId })),
      insertAnalysis: async analysis => { await AIAnalysis.create(analysis); }
    };
  }

  private toPlain<T>(doc: T | null): T | null {
    return serializeMongoDocument(doc);
  }
  private toPlainArray<T>(docs: T[]): T[] {
    return docs.map(d => this.toPlain(d)!).filter(Boolean) as T[];
  }

  // --- Audit Logging ---
  async logAudit(log: Omit<AuditLogType, 'id' | 'timestamp'>): Promise<AuditLogType> {
    await this.connect();
    const fullLog: AuditLogType = { ...log, id: `AUD-${randomUUID()}`, timestamp: new Date().toISOString() };
    await AuditLog.create(fullLog);
    return fullLog;
  }
  async getAuditLogs(filters?: { module?: string; action?: string; userId?: string }, pagination?: PaginationOptions): Promise<AuditLogType[]> {
    await this.connect();
    const query: Record<string, any> = {};
    if (filters?.module) query.module = filters.module;
    if (filters?.action) query.action = filters.action;
    if (filters?.userId) query.userId = filters.userId;
    const { skip, limit } = pageWindow(pagination);
    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean();
    return this.toPlainArray(logs) as AuditLogType[];
  }
  async countAuditLogs(filters?: { module?: string; action?: string; userId?: string }): Promise<number> {
    await this.connect();
    const query: Record<string, any> = {};
    if (filters?.module) query.module = filters.module;
    if (filters?.action) query.action = filters.action;
    if (filters?.userId) query.userId = filters.userId;
    return AuditLog.countDocuments(query);
  }

  // --- Users & Auth ---
  async getUsers(pagination?: PaginationOptions): Promise<UserType[]> {
    await this.connect();
    const { skip, limit } = pageWindow(pagination);
    const users = await User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    return this.toPlainArray(users).map(u => { const { passwordHash, ...safe } = u; return safe as UserType; });
  }
  async countUsers(): Promise<number> {
    await this.connect();
    return User.countDocuments();
  }
  async getUserById(id: string): Promise<UserType | undefined> {
    await this.connect();
    const user = await User.findOne({ id }).lean();
    if (!user) return undefined;
    const { passwordHash, ...safe } = this.toPlain(user)!;
    return safe as UserType;
  }
  async getUserByEmailWithPassword(email: string): Promise<UserType | undefined> {
    await this.connect();
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash').lean();
    return this.toPlain(user) as UserType | undefined;
  }
  async createUser(userData: Omit<UserType, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserType> {
    await this.connect();
    const id = `USR-${randomUUID()}`;
    const now = new Date().toISOString();
    const newUser: UserType = { ...userData, id, createdAt: now, updatedAt: now };
    try {
      await User.create(newUser);
    } catch (error) {
      if (isDuplicateKeyOn(error, 'email')) {
        throw new Error('DUPLICATE_EMAIL');
      }
      throw error;
    }
    await this.logAudit({ action: 'USER_CREATED', module: 'auth', recordId: id, userId: id, userEmail: newUser.email, userRole: newUser.role, ipAddress: '127.0.0.1', details: `New user registered: ${newUser.name} (${newUser.role})` });
    const { passwordHash, ...safe } = newUser;
    return safe;
  }
  async updateUserRole(userId: string, newRole: UserRole, adminUser: UserType): Promise<UserType> {
    await this.connect();
    const current = await User.findOne({ id: userId }).lean();
    if (!current) throw new Error('User not found');
    const user = await User.findOneAndUpdate(
      { id: userId },
      { role: newRole, updatedAt: new Date().toISOString() },
      { new: true, runValidators: true }
    ).lean();
    if (!user) throw new Error('User not found');
    const { passwordHash, ...safe } = this.toPlain(user)!;
    await this.logAudit({ action: 'ROLE_CHANGED', module: 'admin', recordId: userId, userId: adminUser.id, userEmail: adminUser.email, userRole: adminUser.role, ipAddress: '127.0.0.1', details: `Changed role of ${user.name} from ${current.role} to ${newRole}` });
    return safe as UserType;
  }

  // --- Departments ---
  async getDepartments(pagination?: PaginationOptions): Promise<DepartmentType[]> {
    await this.connect();
    const { skip, limit } = pageWindow(pagination);
    const depts = await Department.find().sort({ name: 1 }).skip(skip).limit(limit).lean();
    return this.toPlainArray(depts) as DepartmentType[];
  }
  async getDepartmentById(id: string): Promise<DepartmentType | undefined> {
    await this.connect();
    const dept = await Department.findOne({ id }).lean();
    return this.toPlain(dept) as DepartmentType | undefined;
  }
// --- Reports & AI Integration ---
  async getReports(filter?: { citizenId?: string; category?: string; status?: string; urgency?: string }, pagination?: PaginationOptions): Promise<ReportType[]> {
    await this.connect();
    const query: Record<string, any> = {};
    if (filter?.citizenId) query.citizenId = filter.citizenId;
    if (filter?.category) query.category = filter.category;
    if (filter?.status) query.status = filter.status;
    if (filter?.urgency) query.urgency = filter.urgency;
    const { skip, limit } = pageWindow(pagination);
    const reports = await Report.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    return this.toPlainArray(reports) as ReportType[];
  }
  async countReports(filter?: { citizenId?: string; category?: string; status?: string; urgency?: string }): Promise<number> {
    await this.connect();
    const query: Record<string, any> = {};
    if (filter?.citizenId) query.citizenId = filter.citizenId;
    if (filter?.category) query.category = filter.category;
    if (filter?.status) query.status = filter.status;
    if (filter?.urgency) query.urgency = filter.urgency;
    return Report.countDocuments(query);
  }
  async getReportById(id: string): Promise<ReportType | undefined> {
    await this.connect();
    const report = await Report.findOne({ id }).lean();
    return this.toPlain(report) as ReportType | undefined;
  }
  async getReportsByIds(ids: string[]): Promise<ReportType[]> {
    await this.connect();
    if (ids.length === 0) return [];
    const reports = await Report.find({ id: { $in: ids } }).lean();
    return toReports(this.toPlainArray(reports));
  }
  async getReportIdsByCitizen(citizenId: string): Promise<string[]> {
    await this.connect();
    const reports = await Report.find({ citizenId }).select({ id: 1, _id: 0 }).lean();
    return reports.map(report => report.id);
  }
  async getAIAnalysisForReport(reportId: string): Promise<AIAnalysisType | undefined> {
    await this.connect();
    const analysis = await AIAnalysis.findOne({ reportId }).lean();
    return this.toPlain(analysis) as AIAnalysisType | undefined;
  }
  async createReport(reportInput: Omit<ReportType, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<{ report: ReportType; analysis: AIAnalysisType }> {
    await this.connect();
    const id = `REP-${new Date().getFullYear()}-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const report: ReportType = { ...reportInput, id, status: 'analyzed', createdAt: now, updatedAt: now };
    try {
      await Report.create(report);
    } catch (error) {
      if (isDuplicateKeyOn(error, 'id')) {
        throw new Error('DUPLICATE_REPORT');
      }
      throw error;
    }
    const docs = (await Report.find().lean()).map(r => ({ id: r.id, text: `${r.title} ${r.description} ${r.category} ${r.locationName}` }));
    globalVectorizer.fit(docs);
    const analysis = await this.runAndStoreAIAnalysis(report, true);
    await this.logAudit({ action: 'REPORT_CREATED', module: 'reports', recordId: id, userId: report.citizenId, userEmail: report.citizenEmail, userRole: 'citizen', ipAddress: '127.0.0.1', details: `Report submitted: "${report.title}" at ${report.locationName}` });
    await this.createNotification({ userId: report.citizenId, title: 'Report Received & Analyzed', message: `Your report ${id} was logged. AI identified category as "${analysis.categoryPredicted}" (${(analysis.categoryConfidence * 100).toFixed(0)}% confidence).`, type: 'report_status', link: id });
    return { report: this.toPlain(report) as ReportType, analysis: this.toPlain(analysis) as AIAnalysisType };
  }
  async updateReport(id: string, updates: Partial<ReportType>, user: UserType): Promise<ReportType> {
    await this.connect();
    const report = await Report.findOne({ id }).lean();
    if (!report) throw new Error('Report not found');
    if (user.role === 'citizen') {
      if (report.citizenId !== user.id) throw new Error('Unauthorized to edit this report');
      if (report.status !== 'submitted' && report.status !== 'analyzed') throw new Error('Report cannot be modified once linked or investigated');
    }
    const allowedFields: (keyof ReportType)[] = [
      'title', 'description', 'category', 'subcategory', 'locationName',
      'latitude', 'longitude', 'urgency', 'status', 'images'
    ];
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([field]) => allowedFields.includes(field as keyof ReportType))
    );
    const updated = await Report.findOneAndUpdate(
      { id },
      { ...safeUpdates, updatedAt: new Date().toISOString() },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) throw new Error('Report not found');
    await this.logAudit({ action: 'REPORT_UPDATED', module: 'reports', recordId: id, userId: user.id, userEmail: user.email, userRole: user.role, ipAddress: '127.0.0.1', details: `Updated report ${id}` });
    return this.toPlain(updated) as ReportType;
  }
  async runAndStoreAIAnalysis(report: ReportType, recordAudit = true): Promise<AIAnalysisType> {
    await this.connect();
    const analysis = await this.buildAIAnalysis(report);
    await AIAnalysis.findOneAndUpdate({ reportId: report.id }, analysis, { upsert: true, new: true });
    if (recordAudit) await this.logAudit({ action: 'AI_ANALYSIS_COMPLETED', module: 'intelligence', recordId: report.id, userId: 'SYSTEM_AI', userEmail: 'ai.pipeline@scip.internal', userRole: 'admin', ipAddress: '127.0.0.1', details: `AI Analysis completed for ${report.id}: ${analysis.categoryPredicted} (Risk: ${analysis.riskScore}/100)` });
    return analysis;
  }

  private async buildAIAnalysis(report: ReportType): Promise<AIAnalysisType> {
    const allReportsRaw = await Report.find().lean();
    const allReports = toReports(allReportsRaw);
    const text = `${report.title} ${report.description} ${report.locationName}`;
    const classResult = classifyReport(text, report.category);
    const entities = extractEntities(text);
    const { topSimilar, duplicateProbability } = findSimilarAndDuplicateReports(report, allReports);
    const clusters = detectIncidentClusters(allReports);
    const linkedCluster = clusters.find(c => c.reportIds.includes(report.id));
    const severityIndicator = determineSeverity(text, report.urgency);
    const riskEval = computeExplainableRisk({ entityType: 'report', entityId: report.id, reports: [report], locationName: report.locationName, isRecurrentHotspot: report.locationName.toLowerCase().includes('sector 4') });
    const evidence = [...topSimilar.map(s => `Similar: ${s.reportTitle} (${(s.similarityScore * 100).toFixed(0)}%)`), `TF-IDF classification confidence: ${(classResult.confidence * 100).toFixed(0)}%`, linkedCluster ? `Cluster detected: ${linkedCluster.reportCount} related in ${linkedCluster.radiusMeters}m` : 'Stand-alone observation'];
    return { reportId: report.id, categoryPredicted: classResult.predictedCategory, categoryConfidence: classResult.confidence, keywords: globalVectorizer.getTopKeywords(globalVectorizer.transform(text), 6), entities, sentiment: severityIndicator === 'critical' ? 'urgent' : 'negative', duplicateProbability, topSimilarReports: topSimilar, possibleIncident: Boolean(linkedCluster), incidentClusterId: linkedCluster?.clusterId, severityIndicator, riskScore: riskEval.score, evidence, confidence: classResult.confidence, processedAt: new Date().toISOString() };
  }

  // --- Incidents ---
  async getIncidents(filter?: { status?: string; category?: string; priority?: string; reportIds?: string[] }, pagination?: PaginationOptions): Promise<IncidentType[]> {
    await this.connect();
    const query: Record<string, any> = {};
    if (filter?.status) query.status = filter.status;
    if (filter?.category) query.category = filter.category;
    if (filter?.priority) query.priority = filter.priority;
    if (filter?.reportIds) {
      if (filter.reportIds.length === 0) return [];
      query.reportIds = { $in: filter.reportIds };
    }
    const { skip, limit } = pageWindow(pagination);
    const incidents = await Incident.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    return toIncidents(this.toPlainArray(incidents));
  }
  async countIncidents(filter?: { status?: string; category?: string; priority?: string; reportIds?: string[] }): Promise<number> {
    await this.connect();
    const query: Record<string, any> = {};
    if (filter?.status) query.status = filter.status;
    if (filter?.category) query.category = filter.category;
    if (filter?.priority) query.priority = filter.priority;
    if (filter?.reportIds) {
      if (filter.reportIds.length === 0) return 0;
      query.reportIds = { $in: filter.reportIds };
    }
    return Incident.countDocuments(query);
  }
  async getIncidentById(id: string): Promise<IncidentType | undefined> {
    await this.connect();
    const incident = await Incident.findOne({ id }).lean();
    return incident ? toIncident(this.toPlain(incident)) : undefined;
  }
  async createIncidentFromCluster(cluster: SpatioTemporalCluster, creator: UserType): Promise<IncidentType> {
    await this.connect();
    if (cluster.reportIds.length === 0 || new Set(cluster.reportIds).size !== cluster.reportIds.length) {
      throw new Error('INVALID_CLUSTER_REPORTS');
    }
    const reports = await Report.find({ id: { $in: cluster.reportIds } }).lean();
    if (reports.length !== cluster.reportIds.length) throw new Error('REPORT_REFERENCE_NOT_FOUND');
    if (reports.some(report => report.incidentId)) throw new Error('REPORT_ALREADY_LINKED');
    const categories = [...new Set(reports.map(r => r.category as ReportCategory))];
    const severitiesRaw = await Promise.all(reports.map(async r => {
      const analysis = await AIAnalysis.findOne({ reportId: r.id }).lean();
      return analysis?.severityIndicator || 'low';
    }));
    const severities = severitiesRaw.sort((a, b) => { const o: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }; return (o[b] || 0) - (o[a] || 0); });
    const topSeverity = severities[0] || 'medium';
    const priorityMap: Record<string, IncidentPriority> = { critical: 'P1_CRITICAL', high: 'P2_HIGH', medium: 'P3_MEDIUM', low: 'P4_LOW' };
    const id = `INC-${new Date().getFullYear()}-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const incident: IncidentType = {
      id, title: `Incident: ${categories.join('/')} in ${reports[0]?.locationName || 'Unknown Area'}`,
      description: `Cluster of ${cluster.reportCount} reports within ${cluster.radiusMeters}m radius. Categories: ${categories.join(', ')}. Top severity: ${topSeverity}.`,
      category: categories[0], severity: topSeverity as IncidentSeverity, priority: priorityMap[topSeverity] || 'P3_MEDIUM',
      status: 'potential', reportIds: cluster.reportIds,
      locationName: reports[0]?.locationName || 'Unknown Area', latitude: cluster.centroid.latitude, longitude: cluster.centroid.longitude, radiusMeters: cluster.radiusMeters,
      confidence: cluster.confidence, isAIGenerated: true, humanReviewed: false, evidence: cluster.evidence, createdAt: now, updatedAt: now
    };
    await Incident.create(incident);
    await Report.updateMany({ id: { $in: cluster.reportIds } }, { status: 'linked', incidentId: id, updatedAt: now });
    for (const r of reports) await this.createNotification({ userId: r.citizenId, title: 'Report Linked to Incident', message: `Your report ${r.id} is now part of incident ${id}.`, type: 'report_status', link: id });
    await this.logAudit({ action: 'INCIDENT_DETECTED', module: 'incidents', recordId: id, userId: creator.id, userEmail: creator.email, userRole: creator.role, ipAddress: '127.0.0.1', details: `Incident ${id} auto-created from cluster ${cluster.clusterId} with ${cluster.reportCount} reports` });
    return incident;
  }
  async reviewIncident(
    incidentId: string,
    action: 'confirm' | 'dismiss',
    reviewer: UserType,
    notes: string,
    departmentId?: string,
    officerId?: string
  ): Promise<IncidentType> {
    await this.connect();
    const incident = await Incident.findOne({ id: incidentId }).lean();
    if (!incident) throw new Error('INCIDENT_NOT_FOUND');
    if (action === 'confirm' && departmentId && !(await Department.exists({ id: departmentId }))) {
      throw new Error('DEPARTMENT_NOT_FOUND');
    }
    if (action === 'confirm' && officerId && !(await User.exists({ id: officerId }))) {
      throw new Error('OFFICER_NOT_FOUND');
    }
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: action === 'confirm' ? 'confirmed' : 'dismissed',
      humanReviewed: true,
      reviewedBy: `${reviewer.name} (${reviewer.role})`,
      reviewedAt: now,
      reviewNotes: notes,
      updatedAt: now
    };
    if (action === 'confirm' && departmentId) {
      updates.assignedDepartmentId = departmentId;
      updates.assignedDepartmentName = (await Department.findOne({ id: departmentId }).lean())?.name;
    }
    if (action === 'confirm' && officerId) {
      updates.assignedOfficerId = officerId;
      updates.assignedOfficerName = (await User.findOne({ id: officerId }).lean())?.name;
    }
    const updated = await Incident.findOneAndUpdate({ id: incidentId }, updates, { new: true, runValidators: true }).lean();
    if (!updated) throw new Error('INCIDENT_NOT_FOUND');
    await Report.updateMany(
      { id: { $in: incident.reportIds } },
      action === 'confirm'
        ? { $set: { status: 'under_review', updatedAt: now } }
        : { $set: { status: 'analyzed', updatedAt: now }, $unset: { incidentId: 1 } }
    );
    await this.logAudit({
      action: action === 'confirm' ? 'INCIDENT_REVIEWED' : 'INCIDENT_DISMISSED',
      module: 'incidents',
      recordId: incidentId,
      userId: reviewer.id,
      userEmail: reviewer.email,
      userRole: reviewer.role,
      ipAddress: '127.0.0.1',
      details: `${action === 'confirm' ? 'Confirmed' : 'Dismissed'} incident ${incidentId}. Notes: ${notes}`
    });
    return toIncident(this.toPlain(updated));
  }
  async resolveIncident(
    incidentId: string,
    resolver: UserType,
    resolutionData: { actionTaken: string; preventiveMeasures?: string; costEstimate?: number }
  ): Promise<IncidentType> {
    await this.connect();
    const incident = await Incident.findOne({ id: incidentId }).lean();
    if (!incident) throw new Error('INCIDENT_NOT_FOUND');
    const reports = await Report.find({ id: { $in: incident.reportIds } }).lean();
    if (reports.length !== incident.reportIds.length) throw new Error('REPORT_REFERENCE_NOT_FOUND');
    const now = new Date().toISOString();
    const resolution: ResolutionType = {
      id: `RES-${randomUUID()}`,
      incidentId,
      resolvedBy: resolver.name,
      actionTaken: resolutionData.actionTaken,
      preventiveMeasures: resolutionData.preventiveMeasures,
      costEstimate: resolutionData.costEstimate,
      citizenVerified: false,
      resolvedAt: now
    };
    await Resolution.create(resolution);
    const updated = await Incident.findOneAndUpdate(
      { id: incidentId },
      { status: 'resolved', resolutionNotes: resolutionData.actionTaken, resolvedAt: now, resolvedBy: resolver.id, updatedAt: now },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) throw new Error('INCIDENT_NOT_FOUND');
    await Report.updateMany({ id: { $in: incident.reportIds } }, { status: 'resolved', updatedAt: now });
    for (const report of reports) {
      await this.createNotification({
        userId: report.citizenId,
        title: 'Incident Resolved',
        message: `The incident affecting your report ${report.id} has been resolved by municipal authorities. Resolution: "${resolutionData.actionTaken}".`,
        type: 'resolution',
        link: report.id
      });
    }
    await this.logAudit({
      action: 'INCIDENT_RESOLVED',
      module: 'incidents',
      recordId: incidentId,
      userId: resolver.id,
      userEmail: resolver.email,
      userRole: resolver.role,
      ipAddress: '127.0.0.1',
      details: `Resolved incident ${incidentId}: ${resolutionData.actionTaken}`
    });
    return toIncident(this.toPlain(updated));
  }
  async updateIncidentStatus(id: string, status: IncidentStatus, user: UserType): Promise<IncidentType> {
    await this.connect();
    const incident = await Incident.findOneAndUpdate({ id }, { status, updatedAt: new Date().toISOString() }, { new: true }).lean();
    if (!incident) throw new Error('Incident not found');
    await this.logAudit({ action: 'INCIDENT_REVIEWED', module: 'incidents', recordId: id, userId: user.id, userEmail: user.email, userRole: user.role, ipAddress: '127.0.0.1', details: `Incident ${id} status changed to ${status}` });
    return toIncident(this.toPlain(incident));
  }
  private chooseDepartment(categories: ReportCategory[], severity: IncidentSeverity): string {
    const cat = categories[0];
    const map: Record<string, string> = { infrastructure: 'Public Works', sanitation: 'Sanitation', water: 'Water Supply', electrical: 'Electrical', roads: 'Road Maintenance', environment: 'Environment', safety: 'Public Safety', other: 'Public Works' };
    return map[cat] || 'Public Works';
  }
// --- Assignments & Resolutions ---
  async getAssignments(incidentId?: string): Promise<AssignmentType[]> {
    await this.connect();
    const query = incidentId ? { incidentId } : {};
    const assignments = await Assignment.find(query).sort({ assignedAt: -1 }).lean();
    return toAssignments(this.toPlainArray(assignments));
  }
  async assignIncident(incidentId: string, staffId: string, assignedBy: UserType): Promise<AssignmentType> {
    await this.connect();
    const [incident, staff] = await Promise.all([
      Incident.findOne({ id: incidentId }).lean(),
      User.findOne({ id: staffId }).lean()
    ]);
    if (!incident) throw new Error('INCIDENT_NOT_FOUND');
    if (!staff || !['officer', 'authority', 'admin'].includes(staff.role)) throw new Error('STAFF_NOT_FOUND');
    const department = staff.departmentId ? await Department.findOne({ id: staff.departmentId }).lean() : undefined;
    if (!department) throw new Error('DEPARTMENT_NOT_FOUND');
    const now = new Date().toISOString();
    const assignment: AssignmentType = {
      id: `ASN-${randomUUID()}`,
      incidentId,
      officerId: staff.id,
      officerName: staff.name,
      assignedBy: assignedBy.id,
      assignedAt: now,
      status: 'assigned',
      departmentId: department.id,
      departmentName: department.name,
      notes: ''
    };
    await Assignment.create(assignment);
    await Incident.findOneAndUpdate(
      { id: incidentId },
      {
        status: 'in_progress',
        assignedOfficerId: staff.id,
        assignedOfficerName: staff.name,
        assignedDepartmentId: department.id,
        assignedDepartmentName: department.name,
        updatedAt: now
      },
      { runValidators: true }
    );
    await this.logAudit({ action: 'INCIDENT_ASSIGNED', module: 'incidents', recordId: incidentId, userId: assignedBy.id, userEmail: assignedBy.email, userRole: assignedBy.role, ipAddress: '127.0.0.1', details: `Incident ${incidentId} assigned to staff ${staffId}` });
    return assignment;
  }
  async createResolution(resolutionData: Omit<ResolutionType, 'id' | 'resolvedAt'>): Promise<ResolutionType> {
    await this.connect();
    if (!(await Incident.exists({ id: resolutionData.incidentId }))) throw new Error('INCIDENT_NOT_FOUND');
    const resolution: ResolutionType = { ...resolutionData, id: `RES-${randomUUID()}`, resolvedAt: new Date().toISOString() };
    await Resolution.create(resolution);
    return resolution;
  }
  async getResolutionByIncident(incidentId: string): Promise<ResolutionType | undefined> {
    await this.connect();
    const res = await Resolution.findOne({ incidentId }).lean();
    return res ? toResolution(this.toPlain(res)) : undefined;
  }

  // --- Notifications ---
  async getNotifications(userId: string): Promise<NotificationType[]> {
    await this.connect();
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).lean();
    return toNotifications(notifications);
  }
  async createNotification(notification: Omit<NotificationType, 'id' | 'read' | 'createdAt'>): Promise<NotificationType> {
    await this.connect();
    const notif: NotificationType = { ...notification, id: `NOTIF-${randomUUID()}`, read: false, createdAt: new Date().toISOString() };
    await Notification.create(notif);
    return notif;
  }
  async getNotificationsForUser(userId: string, pagination?: PaginationOptions): Promise<NotificationType[]> {
    await this.connect();
    const { skip, limit } = pageWindow(pagination);
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    return toNotifications(notifications);
  }
  async countUnreadNotificationsForUser(userId: string): Promise<number> {
    await this.connect();
    return Notification.countDocuments({ userId, read: false });
  }
  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    await this.connect();
    const result = await Notification.updateOne({ id: notificationId, userId }, { read: true });
    return result.modifiedCount > 0;
  }
  async markAllNotificationsAsRead(userId: string): Promise<number> {
    await this.connect();
    const result = await Notification.updateMany({ userId, read: false }, { read: true });
    return result.modifiedCount;
  }

  // --- Feedback ---
  async submitFeedback(feedback: Omit<FeedbackType, 'id' | 'createdAt'>): Promise<FeedbackType> {
    await this.connect();
    if (feedback.reportId && !(await Report.exists({ id: feedback.reportId }))) throw new Error('REPORT_NOT_FOUND');
    if (feedback.incidentId && !(await Incident.exists({ id: feedback.incidentId }))) throw new Error('INCIDENT_NOT_FOUND');
    const fb: FeedbackType = { ...feedback, id: `FBK-${randomUUID()}`, createdAt: new Date().toISOString() };
    await Feedback.create(fb);
    return fb;
  }
  async getFeedbackForReport(reportId: string): Promise<FeedbackType | undefined> {
    await this.connect();
    const fb = await Feedback.findOne({ reportId }).lean();
    return fb ? toFeedback(this.toPlain(fb)) : undefined;
  }
  async countRecords(): Promise<{ users: number; reports: number; incidents: number; auditLogs: number }> {
    await this.connect();
    const [users, reports, incidents, auditLogs] = await Promise.all([
      User.countDocuments(),
      Report.countDocuments(),
      Incident.countDocuments(),
      AuditLog.countDocuments()
    ]);
    return { users, reports, incidents, auditLogs };
  }

  // --- Risk Scores ---
  async storeRiskScore(score: Omit<RiskScoreType, 'id' | 'computedAt'>): Promise<RiskScoreType> {
    await this.connect();
    const rs: RiskScoreType = { ...score, id: `RSK-${Date.now().toString().slice(-6)}`, computedAt: new Date().toISOString() };
    await RiskScore.findOneAndUpdate({ entityType: score.entityType, entityId: score.entityId }, rs, { upsert: true, new: true });
    return rs;
  }
  async getRiskScores(entityType: string, entityId?: string): Promise<RiskScoreType[]> {
    await this.connect();
    const query: Record<string, any> = { entityType };
    if (entityId) query.entityId = entityId;
    const scores = await RiskScore.find(query).sort({ score: -1 }).lean();
    return toRiskScores(this.toPlainArray(scores));
  }
  async getTopRiskScores(limit: number = 10): Promise<RiskScoreType[]> {
    await this.connect();
    const scores = await RiskScore.find().sort({ score: -1 }).limit(limit).lean();
    return toRiskScores(this.toPlainArray(scores));
  }

  // --- Intelligence / Analytics ---
  async getSpatioTemporalClusters(): Promise<SpatioTemporalCluster[]> {
    await this.connect();
    const allReportsRaw = await Report.find().lean();
    const allReports = toReports(allReportsRaw);
    return detectIncidentClusters(allReports);
  }
  async getCategoryTrends(): Promise<Record<string, number>> {
    await this.connect();
    const reports = await Report.find().lean();
    const trends: Record<string, number> = {};
    for (const r of reports) trends[r.category] = (trends[r.category] || 0) + 1;
    return trends;
  }
  async getLocationHotspots(limit = 10): Promise<Array<{ location: string; count: number; riskScore: number }>> {
    await this.connect();
    const reports = await Report.find().lean();
    const locMap: Record<string, { count: number; totalRisk: number }> = {};
    for (const r of reports) {
      const ai = await AIAnalysis.findOne({ reportId: r.id }).lean();
      const risk = ai?.riskScore || 0;
      if (!locMap[r.locationName]) locMap[r.locationName] = { count: 0, totalRisk: 0 };
      locMap[r.locationName].count++;
      locMap[r.locationName].totalRisk += risk;
    }
    return Object.entries(locMap).map(([location, v]) => ({ location, count: v.count, riskScore: Math.round(v.totalRisk / v.count) })).sort((a, b) => b.riskScore - a.riskScore).slice(0, limit);
  }
  async getSimilarReports(reportId: string): Promise<SimilarReportMatch[]> {
    await this.connect();
    const report = await Report.findOne({ id: reportId }).lean();
    const allReportsRaw = await Report.find().lean();
    const allReports = toReports(allReportsRaw);
    const { topSimilar } = findSimilarAndDuplicateReports(toReport(report), allReports);
    return topSimilar;
  }
  async getRiskFactors(entityType: string, entityId: string): Promise<RiskFactor[]> {
    await this.connect();
    const riskScore = await RiskScore.findOne({ entityType, entityId } as any).lean();
    return riskScore?.factors || [];
  }

  // --- Health Check ---
  async healthCheck(): Promise<{ status: string; database: string; collections: number }> {
    await this.connect();
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection not established');
    const collections = await db.listCollections().toArray();
    return { status: 'ok', database: this.config.dbName, collections: collections.length };
  }
}

let _mongoInstance: MongoDatabase | null = null;

export function getMongoDatabase(config?: MongoDBConfig): MongoDatabase {
  if (!_mongoInstance && config) _mongoInstance = new MongoDatabase(config);
  if (!_mongoInstance) throw new Error('MongoDatabase not initialized. Call getMongoDatabase(config) first.');
  return _mongoInstance;
}

export function createMongoDatabase(config: MongoDBConfig): MongoDatabase {
  return new MongoDatabase(config);
}
