// Reports Controller - Handles report CRUD and AI analysis integration

import type { Request, Response } from "express";
import { Report } from "../models/report.js";
import { AIAnalysis } from "../models/aiAnalysis.js";
import { User } from "../models/user.js";
import { AuditLog } from "../models/auditLog.js";
import {
  reportSchema,
  reportUpdateSchema,
  paginationSchema,
} from "../validators/index.js";
import {
  classifyReport,
  extractEntities,
  determineSeverity,
} from "../ai/classifier.js";
import { globalVectorizer } from "../ai/tfidf.js";
import { findSimilarAndDuplicateReports } from "../ai/duplicateDetector.js";
import { computeExplainableRisk } from "../ai/riskScorer.js";
import { generateId } from "../utils/idGenerator.js";
import { createNotification } from "../services/notificationService.js";

function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

// Helper: Run AI analysis on a report
async function runAIAnalysis(report: any, user: any) {
  try {
    const text = `${report.title} ${report.description}`;
    const classification = classifyReport(text, report.category);
    const entities = extractEntities(text);
    // determineSeverity expects text and optional urgencyDeclared, returns UrgencyLevel string
    const severity = determineSeverity(text, report.urgency as any);

    const allReports = await Report.find().lean();
    const docs = allReports.map(r => ({
      id: r.id,
      text: `${r.title} ${r.description} ${r.category} ${r.locationName}`,
    }));
    globalVectorizer.fit(docs);

    // findSimilarAndDuplicateReports expects Report type from types/scip.ts
    const reportForDuplicateCheck = {
      id: report.id,
      title: report.title,
      description: report.description,
      category: report.category,
      subcategory: report.subcategory,
      locationName: report.locationName,
      latitude: report.latitude,
      longitude: report.longitude,
      citizenId: report.citizenId,
      citizenName: report.citizenName,
      citizenEmail: report.citizenEmail,
      status: report.status,
      urgency: report.urgency,
      incidentId: report.incidentId,
      images: report.images,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
    const { topSimilar, duplicateProbability } = findSimilarAndDuplicateReports(reportForDuplicateCheck, allReports as any);
    
    // computeExplainableRisk expects RiskEvaluationInput
    const riskResult = computeExplainableRisk({
      entityType: 'report',
      entityId: report.id,
      reports: allReports as any,
      locationName: report.locationName,
    });

    // Generate keywords from top scoring terms in classification
    const keywords = classification.allScores.slice(0, 5).map(s => s.category);
    
    // Determine sentiment based on severity
    const sentiment = severity === 'critical' ? 'urgent' : severity === 'high' ? 'negative' : 'neutral';

    const aiAnalysis = {
      reportId: report.id,
      categoryPredicted: classification.predictedCategory,
      categoryConfidence: classification.confidence,
      keywords,
      entities,
      sentiment,
      duplicateProbability,
      topSimilarReports: topSimilar.map(s => ({
        reportId: s.reportId,
        reportTitle: s.reportTitle,
        category: s.category,
        similarityScore: s.similarityScore,
        distanceMeters: s.distanceMeters,
        timeDeltaHours: s.timeDeltaHours,
        matchingTerms: s.matchingTerms,
        isPotentialDuplicate: s.isPotentialDuplicate,
      })),
      possibleIncident: duplicateProbability > 0.6 || topSimilar.length >= 3,
      incidentClusterId: undefined,
      severityIndicator: severity,
      riskScore: riskResult.score,
      evidence: riskResult.factors.map(f => `${f.factor}: ${f.description}`),
      uncertaintyNotes: riskResult.explanation,
      confidence: classification.confidence * 0.7 + (1 - duplicateProbability) * 0.3,
      processedAt: new Date().toISOString(),
      modelVersion: "1.0.0",
    };

    await AIAnalysis.findOneAndUpdate(
      { reportId: report.id },
      aiAnalysis,
      { upsert: true, new: true }
    );

    await Report.findOneAndUpdate(
      { id: report.id },
      { status: "analyzed", urgency: severity, updatedAt: new Date().toISOString() }
    );

    await AuditLog.create({
      id: generateId("AUD"),
      action: "AI_ANALYSIS_COMPLETED",
      module: "intelligence",
      recordId: report.id,
      userId: "SYSTEM_AI",
      userEmail: "ai.pipeline@scip.intern",
      userRole: "admin", // Use valid role from enum
      ipAddress: "internal",
      details: `AI analysis completed for report: ${report.title}`,
      timestamp: new Date().toISOString(),
    });

    if (aiAnalysis.possibleIncident) {
      const clusterId = generateId("INC");
      await AIAnalysis.findOneAndUpdate(
        { reportId: report.id },
        { incidentClusterId: clusterId }
      );
    }
  } catch (error) {
    console.error("AI analysis failed:", error);
  }
}

// POST /api/reports - Create report
export async function createReport(req: Request, res: Response): Promise<void> {
  const parseResult = reportSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const user = req.authUser!;
    const reportData = {
      ...parseResult.data,
      id: generateId("RPT"),
      citizenId: user.id,
      citizenName: user.name,
      citizenEmail: user.email,
      status: "submitted" as const,
      urgency: "low" as const,
    };

    const report = await Report.create(reportData);

    await AuditLog.create({
      id: generateId("AUD"),
      action: "REPORT_CREATED",
      module: "reports",
      recordId: report.id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: getClientIp(req),
      details: `Report created: ${report.title}`,
      timestamp: new Date().toISOString(),
    });

    // Event integration: notify all authority/admin users about a new report.
    // Failures are swallowed by the notification service so the report remains created.
    await createNotification({
      userId: user.id,
      type: "report_status",
      title: "Report Submitted",
      message: `Your report has been submitted: ${report.title}`,
      relatedId: report.id,
      relatedType: "report",
      link: `/reports/${report.id}`,
    });

    const authorities = await User.find({ role: { $in: ["authority", "admin"] } }).select("_id").lean();
    for (const auth of authorities) {
      await createNotification({
        userId: auth._id.toString(),
        type: "incident_alert",
        title: "New Community Report",
        message: `New report filed: ${report.title}`,
        relatedId: report.id,
        relatedType: "report",
        link: `/reports/${report.id}`,
      });
    }

    runAIAnalysis(report, user);

    res.status(201).json({
      success: true,
      data: { report },
    });
  } catch (error) {
    console.error("Create report failed:", error);
    res.status(500).json({ success: false, error: "Failed to create report" });
  }
}

// GET /api/reports - List reports (with pagination and filters)
export async function getReports(req: Request, res: Response): Promise<void> {
  const parseResult = paginationSchema.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: "Invalid query parameters",
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  const { page, limit, sort, order } = parseResult.data;
  // Extract filter fields from req.query directly (not in paginationSchema)
  const category = req.query.category as string | undefined;
  const status = req.query.status as string | undefined;
  const urgency = req.query.urgency as string | undefined;
  const search = req.query.search as string | undefined;
  const sortBy = (req.query.sortBy as string) || sort;
  const sortOrder = (req.query.sortOrder as string) || order;
  const user = req.authUser!;

  try {
    const query: Record<string, unknown> = {};

    if (user.role === "citizen") {
      query.citizenId = user.id;
    } else if (user.role === "officer") {
      const officer = await User.findById(user.id).lean();
      if (!officer?.departmentId) {
        res.status(403).json({ success: false, error: "Officer has no assigned department" });
        return;
      }
      query.departmentId = officer.departmentId;
    }

    if (category) query.category = category;
    if (status) query.status = status;
    if (urgency) query.urgency = urgency;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { locationName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    }

    const [reports, total] = await Promise.all([
      Report.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Report.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get reports failed:", error);
    res.status(500).json({ success: false, error: "Failed to fetch reports" });
  }
}

// GET /api/reports/:id - Get single report
export async function getReport(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const report = await Report.findOne({ id }).lean();
    if (!report) {
      res.status(404).json({ success: false, error: "Report not found" });
      return;
    }

    if (req.authUser!.role === "citizen" && report.citizenId !== req.authUser!.id) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    const aiAnalysis = await AIAnalysis.findOne({ reportId: id }).lean();

    res.json({ success: true, data: { report, aiAnalysis } });
  } catch (error) {
    console.error("Get report failed:", error);
    res.status(500).json({ success: false, error: "Failed to fetch report" });
  }
}

// PUT /api/reports/:id - Update report
export async function updateReport(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parseResult = reportUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const report = await Report.findOne({ id }).exec();
    if (!report) {
      res.status(404).json({ success: false, error: "Report not found" });
      return;
    }

    const user = req.authUser!;
    if (user.role !== "admin" && report.citizenId !== user.id) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    const oldStatus = report.status;
    const updates = { ...parseResult.data, updatedAt: new Date().toISOString() };
    Object.assign(report, updates);
    await report.save();

    await AuditLog.create({
      id: generateId("AUD"),
      action: "REPORT_UPDATED",
      module: "reports",
      recordId: String(id),
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: getClientIp(req),
      details: `Report updated: ${report.title}`,
      timestamp: new Date().toISOString(),
    });

    // Event integration: notify the report owner on status changes.
    if (parseResult.data.status && parseResult.data.status !== oldStatus) {
      await createNotification({
        userId: report.citizenId,
        type: "report_status",
        title: "Report Status Updated",
        message: `Report ${report.id} status changed to ${parseResult.data.status}`,
        relatedId: String(id),
        relatedType: "report",
        link: `/reports/${id}`,
      });
    }

    res.json({ success: true, data: { report } });
  } catch (error) {
    console.error("Update report failed:", error);
    res.status(500).json({ success: false, error: "Failed to update report" });
  }
}

// DELETE /api/reports/:id - Delete report
export async function deleteReport(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const report = await Report.findOne({ id }).exec();
    if (!report) {
      res.status(404).json({ success: false, error: "Report not found" });
      return;
    }

    if (req.authUser!.role !== "admin" && report.citizenId !== req.authUser!.id) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    await Report.deleteOne({ id });
    await AIAnalysis.deleteOne({ reportId: id });

    await AuditLog.create({
      id: generateId("AUD"),
      action: "REPORT_DELETED",
      module: "reports",
      recordId: String(id),
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      userRole: req.authUser!.role,
      ipAddress: getClientIp(req),
      details: `Report deleted: ${report.title}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, data: { message: "Report deleted" } });
  } catch (error) {
    console.error("Delete report failed:", error);
    res.status(500).json({ success: false, error: "Failed to delete report" });
  }
}

// GET /api/reports/:id/analysis - Get AI analysis for a report
export async function getReportAnalysis(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const report = await Report.findOne({ id }).lean();
    if (!report) {
      res.status(404).json({ success: false, error: "Report not found" });
      return;
    }

    if (req.authUser!.role === "citizen" && report.citizenId !== req.authUser!.id) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    const aiAnalysis = await AIAnalysis.findOne({ reportId: id }).lean();
    if (!aiAnalysis) {
      res.status(404).json({ success: false, error: "AI analysis not available yet" });
      return;
    }

    res.json({ success: true, data: { aiAnalysis } });
  } catch (error) {
    console.error("Get analysis failed:", error);
    res.status(500).json({ success: false, error: "Failed to fetch analysis" });
  }
}

// POST /api/reports/:id/similar - Get similar reports
export async function getSimilarReports(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const report = await Report.findOne({ id }).lean();
    if (!report) {
      res.status(404).json({ success: false, error: "Report not found" });
      return;
    }

    if (req.authUser!.role === "citizen" && report.citizenId !== req.authUser!.id) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    const allReports = await Report.find().lean();
    const reportForDuplicateCheck = {
      id: report.id,
      title: report.title,
      description: report.description,
      category: report.category,
      subcategory: report.subcategory ?? undefined,
      locationName: report.locationName,
      latitude: report.latitude,
      longitude: report.longitude,
      citizenId: report.citizenId,
      citizenName: report.citizenName,
      citizenEmail: report.citizenEmail,
      status: report.status,
      urgency: report.urgency,
      incidentId: report.incidentId ?? undefined,
      images: report.images,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
    const { topSimilar } = findSimilarAndDuplicateReports(reportForDuplicateCheck, allReports as any);

    res.json({ success: true, data: { similarReports: topSimilar } });
  } catch (error) {
    console.error("Get similar reports failed:", error);
    res.status(500).json({ success: false, error: "Failed to fetch similar reports" });
  }
}