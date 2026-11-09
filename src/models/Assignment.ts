import mongoose, { Schema, type InferSchemaType, type Model, type Document } from 'mongoose';

const assignmentSchema = new Schema({
  id: { type: String, required: true, unique: true },
  incidentId: { type: String, required: true },
  departmentId: { type: String, required: true },
  departmentName: { type: String, required: true },
  officerId: { type: String },
  officerName: { type: String },
  notes: { type: String, default: '' },
  assignedBy: { type: String, required: true },
  assignedAt: { type: String, required: true },
  status: { type: String, enum: ['assigned', 'in_progress', 'completed', 'rejected'], default: 'assigned' }
}, { timestamps: false, versionKey: false });

assignmentSchema.index({ incidentId: 1 });
assignmentSchema.index({ departmentId: 1 });

export type AssignmentDocument = InferSchemaType<typeof assignmentSchema> & Document;
export const Assignment: Model<AssignmentDocument> = mongoose.models.Assignment as Model<AssignmentDocument> ?? mongoose.model<AssignmentDocument>('Assignment', assignmentSchema);