import mongoose, { Schema, type InferSchemaType, type Model, type Document } from 'mongoose';

const departmentSchema = new Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  headName: { type: String },
  email: { type: String },
  phone: { type: String },
  activeIncidentsCount: { type: Number, default: 0 },
  createdAt: { type: String, required: true }
}, { timestamps: false, versionKey: false });

departmentSchema.index({ name: 1 });

export type DepartmentDocument = InferSchemaType<typeof departmentSchema> & Document;
export const Department: Model<DepartmentDocument> = mongoose.models.Department as Model<DepartmentDocument> ?? mongoose.model<DepartmentDocument>('Department', departmentSchema);