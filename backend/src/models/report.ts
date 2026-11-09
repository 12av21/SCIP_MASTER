import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const REPORT_CATEGORIES = [
  "Water & Drainage",
  "Roads & Traffic",
  "Public Sanitation",
  "Power & Lighting",
  "Parks & Environment",
  "Structural Safety",
  "Public Health",
  "Noise & Disturbance",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_STATUSES = [
  "submitted",
  "processing",
  "analyzed",
  "linked",
  "under_review",
  "assigned",
  "resolved",
  "closed",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const URGENCY_LEVELS = ["low", "medium", "high", "critical"] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

const reportSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 5, maxlength: 200 },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
  category: { type: String, enum: REPORT_CATEGORIES, required: true, index: true },
  subcategory: { type: String, trim: true, maxlength: 100 },
  locationName: { type: String, required: true, trim: true, maxlength: 200, index: true },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  citizenId: { type: String, required: true, index: true },
  citizenName: { type: String, required: true, trim: true },
  citizenEmail: { type: String, required: true, trim: true, lowercase: true },
  status: { type: String, enum: REPORT_STATUSES, default: "submitted", index: true },
  urgency: { type: String, enum: URGENCY_LEVELS, default: "medium" },
  incidentId: { type: String, index: true },
  images: [{ type: String, trim: true }],
  createdAt: { type: String, required: true, default: () => new Date().toISOString() },
  updatedAt: { type: String, required: true, default: () => new Date().toISOString() },
}, { timestamps: true, versionKey: false });

// Compound indexes for common queries
reportSchema.index({ citizenId: 1, createdAt: -1 });
reportSchema.index({ category: 1, status: 1 });
reportSchema.index({ latitude: 1, longitude: 1 });
reportSchema.index({ incidentId: 1, status: 1 });

export type ReportDocument = InferSchemaType<typeof reportSchema> & mongoose.Document;
export const Report: Model<ReportDocument> = mongoose.models.Report as Model<ReportDocument> ?? mongoose.model<ReportDocument>("Report", reportSchema);