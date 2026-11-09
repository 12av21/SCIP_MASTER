import mongoose, { Schema, type InferSchemaType, type Model, type Document } from 'mongoose';

const incidentSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  priority: { type: String, enum: ['P1_CRITICAL', 'P2_HIGH', 'P3_MEDIUM', 'P4_LOW'], required: true },
  status: { type: String, enum: ['potential', 'under_review', 'confirmed', 'in_progress', 'resolved', 'closed', 'dismissed'], required: true, default: 'potential' },
  reportIds: [{ type: String }],
  clusterId: { type: String },
  locationName: { type: String, required: true },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  radiusMeters: { type: Number, required: true, min: 0 },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  isAIGenerated: { type: Boolean, default: false },
  humanReviewed: { type: Boolean, default: false },
  reviewedBy: { type: String },
  reviewedAt: { type: String },
  reviewNotes: { type: String },
  evidence: [{ type: String }],
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    name: { type: String }
  },
  assignedDepartmentId: { type: String },
  assignedDepartmentName: { type: String },
  assignedOfficerId: { type: String },
  assignedOfficerName: { type: String },
  confirmedBy: { type: String },
  confirmedAt: { type: String },
  resolutionNotes: { type: String },
  resolvedAt: { type: String },
  resolvedBy: { type: String },
  citizenVerified: { type: Boolean, default: false },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { timestamps: false, versionKey: false });

incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ category: 1, priority: 1, createdAt: -1 });
incidentSchema.index({ reportIds: 1 });
incidentSchema.index({ assignedDepartmentId: 1 });
incidentSchema.index({ clusterId: 1 });
incidentSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

export type IncidentDocument = InferSchemaType<typeof incidentSchema> & Document;
export const Incident: Model<IncidentDocument> = mongoose.models.Incident as Model<IncidentDocument> ?? mongoose.model<IncidentDocument>('Incident', incidentSchema);