import mongoose, { Schema, type InferSchemaType, type Model, type Document } from 'mongoose';

const resolutionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  incidentId: { type: String, required: true },
  resolvedBy: { type: String, required: true },
  actionTaken: { type: String, required: true },
  preventiveMeasures: { type: String },
  equipmentUsed: [{ type: String }],
  costEstimate: { type: Number },
  citizenVerified: { type: Boolean, default: false },
  resolvedAt: { type: String, required: true }
}, { timestamps: false, versionKey: false });

resolutionSchema.index({ incidentId: 1 });

export type ResolutionDocument = InferSchemaType<typeof resolutionSchema> & Document;
export const Resolution: Model<ResolutionDocument> = mongoose.models.Resolution as Model<ResolutionDocument> ?? mongoose.model<ResolutionDocument>('Resolution', resolutionSchema);