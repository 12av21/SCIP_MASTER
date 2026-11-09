import mongoose, { Schema, type InferSchemaType, type Model, type Document } from 'mongoose';

const auditLogSchema = new Schema({
  id: { type: String, required: true, unique: true },
  action: { type: String, required: true },
  module: { type: String, enum: ['auth', 'reports', 'incidents', 'intelligence', 'admin', 'security'], required: true },
  recordId: { type: String },
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  userRole: { type: String, required: true },
  ipAddress: { type: String, required: true },
  details: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: String, required: true }
}, { timestamps: false, versionKey: false });

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ module: 1, action: 1 });
auditLogSchema.index({ recordId: 1 });
auditLogSchema.index({ timestamp: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema> & Document;
export const AuditLog: Model<AuditLogDocument> = mongoose.models.AuditLog as Model<AuditLogDocument> ?? mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema);