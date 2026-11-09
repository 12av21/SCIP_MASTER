// Incidents Controller - Handles incident CRUD, review, assignment, resolution

import type { Request, Response } from "express";
import { Incident } from "../models/incident.js";
import { Report } from "../models/report.js";
import { Assignment } from "../models/assignment.js";
import { Resolution } from "../models/resolution.js";
import { AuditLog } from "../models/auditLog.js";
import { Department } from "../models/department.js";
import { User } from "../models/user.js";
import { RiskScore } from "../models/riskScore.js";
import { incidentSchema, incidentUpdateSchema, incidentReviewSchema, incidentResolveSchema } from "../validators/index.js";
import { computeExplainableRisk } from "../ai/riskScorer.js";
import { generateId } from "../utils/idGenerator.js";
import { createNotification } from "../services/notificationService.js";

function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

// POST /api/incidents - Create incident (authority/admin only)
export async function createIncident(req: Request, res: Response): Promise<void> {
  const parsed = incidentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid incident data", details: parsed.error.flatten() });
    return;
  }

  if (!["authority", "admin"].includes(req.authUser!.role)) {
    res.status(403).json({ success: false, error: "Only authorities and admins can create incidents" });
    return;
  }

  const user = req.authUser!;
  const now = new Date().toISOString();
  const incidentId = generateId("INC");

  const reports = await Report.find({ id: { $in: parsed.data.reportIds } }).lean();
  if (reports.length !== parsed.data.reportIds.length) {
    res.status(400).json({ success: false, error: "One or more reports not found" });
    return;
  }

  let departmentId = parsed.data.departmentId;
  let departmentName = "";
  if (!departmentId && reports.length > 0) {
    const firstReport = reports[0];
    const category = firstReport?.category;
    if (category && typeof category === 'string') {
      const categoryPrefix = category.split("&")[0]?.trim().substring(0, 3) || "";
      const dept = await Department.findOne({
        $or: [
          { code: { $regex: categoryPrefix, $options: "i" } },
          { name: { $regex: category, $options: "i" } }
        ]
      }).lean();
      if (dept && dept.id && dept.name) { departmentId = dept.id; departmentName = dept.name; }
    }
  } else if (departmentId) {
    const dept = await Department.findOne({ id: departmentId }).lean();
    if (dept) departmentName = dept.name;
  }

  const incidentData = {
    ...parsed.data,
    id: incidentId,
    departmentId,
    departmentName,
    status: "potential" as const,
    severity: parsed.data.severity || "medium",
    priority: parsed.data.priority || "P3_MEDIUM",
  };

  try {
    const incident = await Incident.create(incidentData);
    await Report.updateMany({ id: { $in: parsed.data.reportIds } }, { incidentId, status: "linked", updatedAt: now });

    const riskResult = computeExplainableRisk({
      entityType: "incident",
      entityId: incidentId,
      reports: reports as any,
      locationName: incidentData.location.name,
      isRecurrentHotspot: false,
    });
    await RiskScore.findOneAndUpdate({ entityType: "incident", entityId: incidentId }, {
      id: generateId("RISK"), entityType: "incident", entityId: incidentId,
      score: riskResult.score, priority: riskResult.priority,
      factors: riskResult.factors, explanation: riskResult.explanation, computedAt: now,
    }, { upsert: true });

    await AuditLog.create({
      id: generateId("AUD"),
      action: "INCIDENT_DETECTED",
      module: "incidents",
      recordId: incidentId,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: getClientIp(req),
      details: `Incident created from ${reports.length} report(s): ${incident.title}`,
      timestamp: now,
    });

    res.status(201).json({ success: true, data: { incident } });
  } catch (error) {
    console.error("Create incident failed:", error);
    res.status(500).json({ success: false, error: "Failed to create incident" });
  }
}

// GET /api/incidents - List incidents (paginated, filtered, role-based)
export async function getIncidents(req: Request, res: Response): Promise<void> {
  const { page = "1", limit = "20", status, severity, priority, departmentId, assignedOfficerId, search, sortBy = "createdAt", sortOrder = "desc" } = req.query;
  const user = req.authUser!;

  try {
    const query: Record<string, unknown> = {};

    if (user.role === "citizen") {
      const userReports = await Report.find({ citizenId: user.id }).select("incidentId").lean();
      const incidentIds = userReports.map(r => r.incidentId).filter(Boolean);
      query.id = { $in: incidentIds };
    } else if (user.role === "officer") {
      const officerScope = user.departmentId
        ? [{ departmentId: user.departmentId }, { assignedOfficerId: user.id }]
        : [{ assignedOfficerId: user.id }];
      query.$or = officerScope;
    }

    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (priority) query.priority = priority;
    if (departmentId) query.departmentId = departmentId;
    if (assignedOfficerId) query.assignedOfficerId = assignedOfficerId;
    if (search) {
      const searchConditions = [
        { title: { $regex: search as string, $options: "i" } },
        { description: { $regex: search as string, $options: "i" } },
        { departmentName: { $regex: search as string, $options: "i" } },
      ];
      const accessConditions = query.$or;
      if (accessConditions) {
        query.$and = [
          { $or: accessConditions },
          { $or: searchConditions },
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const [incidents, total] = await Promise.all([
      Incident.find(query).sort(sortObj).skip(skip).limit(limitNum).lean(),
      Incident.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("Get incidents failed:", error);
    res.status(500).json({ success: false, error: "Failed to fetch incidents" });
  }
}

// GET /api/incidents/:id - Get single incident with full details
export async function getIncident(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const incidentId = id as string;

  try {
    const incident = await Incident.findOne({ id: incidentId }).lean();
    if (!incident) {
      res.status(404).json({ success: false, error: "Incident not found" });
      return;
    }

    if (req.authUser!.role === "citizen") {
      const userReports = await Report.find({ citizenId: req.authUser!.id }).select("incidentId").lean();
      const incidentIds = userReports.map(r => r.incidentId).filter(Boolean) as string[];
      if (!incidentIds.includes(incidentId)) {
        res.status(403).json({ success: false, error: "Forbidden" });
        return;
      }
    } else if (req.authUser!.role === "officer") {
      if (incident.departmentId !== req.authUser!.departmentId && incident.assignedOfficerId !== req.authUser!.id) {
        res.status(403).json({ success: false, error: "Forbidden" });
        return;
      }
    }

    const [reports, assignments, riskScore, resolution] = await Promise.all([
      Report.find({ id: { $in: incident.reportIds } }).lean(),
      Assignment.find({ incidentId }).sort({ createdAt: -1 }).lean(),
      RiskScore.findOne({ entityType: "incident", entityId: incidentId }).lean(),
      Resolution.findOne({ incidentId }).lean(),
    ]);

    res.json({
      success: true,
      data: {
        incident,
        reports,
        assignments,
        riskScore,
        resolution,
      },
    });
  } catch (error) {
    console.error("Get incident failed:", error);
    res.status(500).json({ success: false, error: "Failed to fetch incident" });
  }
}

// PUT /api/incidents/:id - Update incident (officer/authority/admin with field restrictions)
export async function updateIncident(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = incidentUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid update data", details: parsed.error.flatten() });
    return;
  }

  try {
    const incident = await Incident.findOne({ id }).exec();
    if (!incident) {
      res.status(404).json({ success: false, error: "Incident not found" });
      return;
    }

    const user = req.authUser!;
    if (user.role === "citizen") {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    if (user.role === "officer") {
      if (incident.assignedOfficerId !== user.id) {
        res.status(403).json({ success: false, error: "Forbidden - not assigned to this incident" });
        return;
      }
      const allowedFields = ["status", "resolutionNotes", "evidence"] as const;
      const updates: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in parsed.data && parsed.data[key] !== undefined) {
          updates[key] = parsed.data[key];
        }
      }
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ success: false, error: "No valid fields to update" });
        return;
      }
      Object.assign(incident, updates);
      incident.updatedAt = new Date().toISOString() as any;
      await incident.save();

      await AuditLog.create({
        id: generateId("AUD"),
        action: "INCIDENT_REVIEWED",
        module: "incidents",
        recordId: String(id),
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        ipAddress: getClientIp(req),
        details: `Incident updated by officer: ${incident.title}`,
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, data: { incident } });
      return;
    }

    const updates = { ...parsed.data, updatedAt: new Date().toISOString() } as any;
    Object.assign(incident, updates);
    await incident.save();

    await AuditLog.create({
      id: generateId("AUD"),
      action: "INCIDENT_REVIEWED",
      module: "incidents",
      recordId: String(id),
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: getClientIp(req),
      details: `Incident updated by authority/admin: ${incident.title}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, data: { incident } });
  } catch (error) {
    console.error("Update incident failed:", error);
    res.status(500).json({ success: false, error: "Failed to update incident" });
  }
}

// POST /api/incidents/:id/review - Review incident (authority/admin confirm/dismiss)
export async function reviewIncident(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const incidentId = id as string;
  const parsed = incidentReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid review data", details: parsed.error.flatten() });
    return;
  }

  try {
    const incident = await Incident.findOne({ id: incidentId }).exec();
    if (!incident) {
      res.status(404).json({ success: false, error: "Incident not found" });
      return;
    }

    const user = req.authUser!;
    if (!["authority", "admin"].includes(user.role)) {
      res.status(403).json({ success: false, error: "Only authorities and admins can review incidents" });
      return;
    }

    const now = new Date().toISOString();
    const { action, notes, departmentId, officerId } = parsed.data;

    if (action === "confirm") {
      incident.status = "confirmed";
      incident.confirmedAt = now;
      if (departmentId) {
        const dept = await Department.findOne({ id: departmentId }).lean();
        if (dept) { incident.departmentId = dept.id; incident.departmentName = dept.name; }
      }
      if (officerId) {
        const officer = await User.findOne({ id: officerId }).lean();
        if (officer) { incident.assignedOfficerId = officer._id.toString(); incident.assignedOfficerName = officer.name; }
      }
    } else if (action === "dismiss") {
      incident.status = "dismissed";
    }
    incident.updatedAt = now as any;
    await incident.save();

    await AuditLog.create({
      id: generateId("AUD"),
      action: action === "confirm" ? "INCIDENT_REVIEWED" : "INCIDENT_DISMISSED",
      module: "incidents",
      recordId: String(incidentId),
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: getClientIp(req),
      details: `Incident ${action}ed: ${incident.title}. Notes: ${notes}`,
      timestamp: now,
    });

    if (action === "confirm" && incident.assignedOfficerId) {
      const officer = await User.findOne({ id: incident.assignedOfficerId }).lean();
      if (officer) {
        await createNotification({
          userId: officer._id.toString(),
          type: "incident_assigned",
          title: "Incident Assigned",
          message: `You have been assigned to incident: ${incident.title}`,
          relatedId: incidentId,
          relatedType: "incident",
          link: `/incidents/${incidentId}`,
        });
      }
    }

    // Event integration: notify linked citizens about review outcome.
    const linkedReports = await Report.find({ id: { $in: incident.reportIds } }).lean();
    for (const report of linkedReports) {
      await createNotification({
        userId: report.citizenId,
        type: action === "confirm" ? "incident_alert" : "report_status",
        title: action === "confirm" ? "Incident Confirmed" : "Incident Dismissed",
        message: `Incident ${incident.title} has been ${action === "confirm" ? "confirmed and dispatched" : "dismissed"}.`,
        relatedId: incidentId,
        relatedType: "incident",
        link: `/incidents/${incidentId}`,
      });
    }

    res.json({ success: true, data: { incident } });
  } catch (error) {
    console.error("Review incident failed:", error);
    res.status(500).json({ success: false, error: "Failed to review incident" });
  }
}

// POST /api/incidents/:id/resolve - Resolve incident (officer/authority/admin)
export async function resolveIncident(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const incidentId = id as string;
  const parsed = incidentResolveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid resolve data", details: parsed.error.flatten() });
    return;
  }

  try {
    const incident = await Incident.findOne({ id: incidentId }).exec();
    if (!incident) {
      res.status(404).json({ success: false, error: "Incident not found" });
      return;
    }

    const user = req.authUser!;
    if (user.role === "citizen") {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }
    if (user.role === "officer" && incident.assignedOfficerId !== user.id) {
      res.status(403).json({ success: false, error: "Forbidden - not assigned to this incident" });
      return;
    }

    const now = new Date().toISOString();
    incident.status = "resolved";
    incident.resolvedAt = now;
    incident.resolutionNotes = parsed.data.actionTaken;
    incident.updatedAt = now as any;
    await incident.save();

    const resolution = await Resolution.create({
      id: generateId("RES"),
      incidentId,
      resolvedBy: user.id,
      actionTaken: parsed.data.actionTaken,
      preventiveMeasures: parsed.data.preventiveMeasures,
      costEstimate: parsed.data.costEstimate,
      resolvedAt: now,
    });

    await AuditLog.create({
      id: generateId("AUD"),
      action: "INCIDENT_RESOLVED",
      module: "incidents",
      recordId: String(incidentId),
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: getClientIp(req),
      details: `Incident resolved: ${incident.title}`,
      timestamp: now,
    });

    const reports = await Report.find({ id: { $in: incident.reportIds } }).lean();
    for (const report of reports) {
      await createNotification({
        userId: report.citizenId,
        type: "incident_resolved",
        title: "Incident Resolved",
        message: `Your reported incident has been resolved: ${incident.title}`,
        relatedId: incidentId,
        relatedType: "incident",
        link: `/incidents/${incidentId}`,
      });
    }

    res.json({ success: true, data: { incident, resolution } });
  } catch (error) {
    console.error("Resolve incident failed:", error);
    res.status(500).json({ success: false, error: "Failed to resolve incident" });
  }
}

// GET /api/incidents/:id/assignments - Get incident assignments
export async function getIncidentAssignments(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const incidentId = id as string;

  try {
    const incident = await Incident.findOne({ id: incidentId }).lean();
    if (!incident) {
      res.status(404).json({ success: false, error: "Incident not found" });
      return;
    }

    if (req.authUser!.role === "citizen") {
      const userReports = await Report.find({ citizenId: req.authUser!.id }).select("incidentId").lean();
      const incidentIds = userReports.map(r => r.incidentId).filter(Boolean) as string[];
      if (!incidentIds.includes(incidentId)) {
        res.status(403).json({ success: false, error: "Forbidden" });
        return;
      }
    } else if (req.authUser!.role === "officer") {
      if (incident.departmentId !== req.authUser!.departmentId && incident.assignedOfficerId !== req.authUser!.id) {
        res.status(403).json({ success: false, error: "Forbidden" });
        return;
      }
    }

    const assignments = await Assignment.find({ incidentId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { assignments } });
  } catch (error) {
    console.error("Get incident assignments failed:", error);
    res.status(500).json({ success: false, error: "Failed to fetch assignments" });
  }
}

// POST /api/incidents/:id/assign - Assign incident to officer (authority/admin)
export async function assignIncident(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const incidentId = id as string;
  const { officerId } = req.body;

  if (!officerId) {
    res.status(400).json({ success: false, error: "officerId is required" });
    return;
  }

  try {
    const incident = await Incident.findOne({ id: incidentId }).exec();
    if (!incident) {
      res.status(404).json({ success: false, error: "Incident not found" });
      return;
    }

    const user = req.authUser!;
    if (!["authority", "admin"].includes(user.role)) {
      res.status(403).json({ success: false, error: "Only authorities and admins can assign incidents" });
      return;
    }

    const officer = await User.findOne({ id: officerId }).lean();
    if (!officer || officer.role !== "officer") {
      res.status(400).json({ success: false, error: "Invalid officer ID" });
      return;
    }

    const now = new Date().toISOString();
    const officerIdStr = officer._id.toString();
    incident.assignedOfficerId = officerIdStr;
    incident.assignedOfficerName = officer.name;
    incident.status = "in_progress";
    incident.updatedAt = now as any;
    await incident.save();

    const assignment = await Assignment.create({
      id: generateId("ASG"),
      incidentId,
      officerId: officerIdStr,
      officerName: officer.name,
      departmentId: incident.departmentId || "",
      departmentName: incident.departmentName || "",
      assignedBy: user.id,
      assignedByRole: user.role,
      status: "assigned",
    });

    await AuditLog.create({
      id: generateId("AUD"),
      action: "INCIDENT_ASSIGNED",
      module: "incidents",
      recordId: String(incidentId),
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: getClientIp(req),
      details: `Incident assigned to officer: ${officer.name} (${officerIdStr})`,
      timestamp: now,
    });

    await createNotification({
      userId: officerIdStr,
      type: "incident_assigned",
      title: "Incident Assigned",
      message: `You have been assigned to incident: ${incident.title}`,
      relatedId: incidentId,
      relatedType: "incident",
      link: `/incidents/${incidentId}`,
    });

    res.json({ success: true, data: { incident, assignment } });
  } catch (error) {
    console.error("Assign incident failed:", error);
    res.status(500).json({ success: false, error: "Failed to assign incident" });
  }
}