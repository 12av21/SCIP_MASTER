import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const assignmentSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  incidentId: { type: String, required: true, index: true },
  officerId: { type: String, required: true, index: true },
  officerName: { type: String, required: true, trim: true },
  departmentId: { type: String, required: true, index: true },
  departmentName: { type: String, required: true, trim: true },
  assignedBy: { type: String, required: true, trim: true },
  assignedByRole: { type: String, enum: ["authority", "admin", "officer", "citizen"], required: true },
  status: { type: String, enum: ["assigned", "acknowledged", "in_progress", "completed", "reassigned"], default: "assigned", index: true },
  notes: { type: String, trim: true, maxlength: 2000 },
  acknowledgedAt: { type: String },
  completedAt: { type: String },
  createdAt: { type: String, required: true, default: () => new Date().toISOString() },
  updatedAt: { type: String, required: true, default: () => new Date().toISOString() },
}, { timestamps: true, versionKey: false });

assignmentSchema.index({ incidentId: 1, status: 1 });
assignmentSchema.index({ officerId: 1, status: 1 });

export type AssignmentDocument = InferSchemaType<typeof assignmentSchema> & mongoose.Document;
export const Assignment: Model<AssignmentDocument> = mongoose.models.Assignment as Model<AssignmentDocument> ?? mongoose.model<AssignmentDocument>("Assignment", assignmentSchema);