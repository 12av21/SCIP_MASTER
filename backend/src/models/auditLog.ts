import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const auditLogSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  action: {
    type: String,
    enum: [
      "LOGIN_SUCCESS", "LOGIN_FAILED", "LOGOUT",
      "USER_CREATED", "ROLE_CHANGED",
      "REPORT_CREATED", "REPORT_UPDATED", "REPORT_DELETED",
      "AI_ANALYSIS_COMPLETED",
      "INCIDENT_DETECTED", "INCIDENT_REVIEWED", "INCIDENT_ASSIGNED", "INCIDENT_RESOLVED", "INCIDENT_DISMISSED",
      "SECURITY_EVENT",
    ],
    required: true,
    index: true,
  },
  module: {
    type: String,
    enum: ["auth", "reports", "incidents", "intelligence", "admin", "security"],
    required: true,
    index: true,
  },
  recordId: { type: String, index: true },
  userId: { type: String, required: true, index: true },
  userEmail: { type: String, required: true, trim: true, lowercase: true },
  userRole: { type: String, enum: ["citizen", "officer", "authority", "admin"], required: true },
  ipAddress: { type: String, required: true },
  details: { type: String, required: true, trim: true, maxlength: 2000 },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: String, required: true, index: true },
}, { timestamps: true, versionKey: false });

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ module: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ recordId: 1, timestamp: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema> & mongoose.Document;
export const AuditLog: Model<AuditLogDocument> = mongoose.models.AuditLog as Model<AuditLogDocument> ?? mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);