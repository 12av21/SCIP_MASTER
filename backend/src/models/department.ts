import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const departmentSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 10 },
  name: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, trim: true, maxlength: 500 },
  headName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true, maxlength: 20 },
  activeIncidentsCount: { type: Number, default: 0, min: 0 },
  createdAt: { type: String, required: true, default: () => new Date().toISOString() },
}, { timestamps: true, versionKey: false });

export type DepartmentDocument = InferSchemaType<typeof departmentSchema> & mongoose.Document;
export const Department: Model<DepartmentDocument> = mongoose.models.Department as Model<DepartmentDocument> ?? mongoose.model<DepartmentDocument>("Department", departmentSchema);