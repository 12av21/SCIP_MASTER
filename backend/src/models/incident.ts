import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_PRIORITIES = ["P1_CRITICAL", "P2_HIGH", "P3_MEDIUM", "P4_LOW"] as const;
export type IncidentPriority = (typeof INCIDENT_PRIORITIES)[number];

export const INCIDENT_STATUSES = [
  "potential",
  "under_review",
  "confirmed",
  "in_progress",
  "resolved",
  "closed",
  "dismissed",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

const locationSchema = new Schema({
  name: { type: String, required: true, trim: true },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  radiusMeters: { type: Number, default: 0, min: 0 },
}, { _id: false });

const incidentSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 5, maxlength: 200 },
  category: { type: String, required: true, index: true },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  location: { type: locationSchema, required: true },
  radiusMeters: { type: Number, default: 0, min: 0 },
  reportIds: [{ type: String, index: true }],
  severity: { type: String, enum: INCIDENT_SEVERITIES, default: "low" },
  priority: { type: String, enum: INCIDENT_PRIORITIES, default: "P4_LOW" },
  status: { type: String, enum: INCIDENT_STATUSES, default: "potential", index: true },
  assignedOfficerId: { type: String, index: true },
  assignedOfficerName: { type: String, trim: true },
  departmentId: { type: String, index: true },
  departmentName: { type: String, trim: true },
  confirmedAt: { type: String },
  resolvedAt: { type: String },
  resolutionNotes: { type: String, trim: true, maxlength: 3000 },
  evidence: [{ type: String, trim: true }],
  createdAt: { type: String, required: true, default: () => new Date().toISOString() },
  updatedAt: { type: String, required: true, default: () => new Date().toISOString() },
}, { timestamps: true, versionKey: false });

// Compound indexes
incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ departmentId: 1, status: 1 });
incidentSchema.index({ assignedOfficerId: 1, status: 1 });
incidentSchema.index({ "location.latitude": 1, "location.longitude": 1 });

export type IncidentDocument = InferSchemaType<typeof incidentSchema> & mongoose.Document;
export const Incident: Model<IncidentDocument> = mongoose.models.Incident as Model<IncidentDocument> ?? mongoose.model<IncidentDocument>("Incident", incidentSchema);