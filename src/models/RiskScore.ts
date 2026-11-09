import mongoose, { Schema, type InferSchemaType, type Model, type Document } from 'mongoose';

const riskFactorSchema = new Schema({
  factor: { type: String, required: true },
  weight: { type: Number, required: true },
  score: { type: Number, required: true },
  description: { type: String, required: true }
}, { _id: false });

const riskScoreSchema = new Schema({
  id: { type: String, required: true, unique: true },
  entityType: { type: String, enum: ['report', 'incident', 'cluster'], required: true },
  entityId: { type: String, required: true },
  score: { type: Number, required: true },
  priority: { type: String, required: true },
  factors: [riskFactorSchema],
  explanation: { type: String },
  computedAt: { type: String, required: true }
}, { timestamps: false, versionKey: false });

riskScoreSchema.index({ entityType: 1, entityId: 1 }, { unique: true });

export type RiskFactorDocument = InferSchemaType<typeof riskFactorSchema> & Document;
export type RiskScoreDocument = InferSchemaType<typeof riskScoreSchema> & Document;
export const RiskScore: Model<RiskScoreDocument> = mongoose.models.RiskScore as Model<RiskScoreDocument> ?? mongoose.model<RiskScoreDocument>('RiskScore', riskScoreSchema);