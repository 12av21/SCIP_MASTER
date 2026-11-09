import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const resolutionSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  incidentId: { type: String, required: true, index: true },
  resolvedBy: { type: String, required: true, trim: true },
  actionTaken: { type: String, required: true, trim: true, maxlength: 3000 },
  preventiveMeasures: { type: String, trim: true, maxlength: 3000 },
  costEstimate: { type: Number, min: 0 },
  citizenVerified: { type: Boolean, default: false },
  verifiedAt: { type: String },
  verifiedBy: { type: String, trim: true },
  resolvedAt: { type: String, required: true },
  createdAt: { type: String, required: true, default: () => new Date().toISOString() },
}, { timestamps: true, versionKey: false });

export type ResolutionDocument = InferSchemaType<typeof resolutionSchema> & mongoose.Document;
export const Resolution: Model<ResolutionDocument> = mongoose.models.Resolution as Model<ResolutionDocument> ?? mongoose.model<ResolutionDocument>("Resolution", resolutionSchema);