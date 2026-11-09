import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const riskFactorSchema = new Schema({
  factor: { type: String, required: true, trim: true },
  weight: { type: Number, required: true, min: 0, max: 1 },
  score: { type: Number, required: true, min: 0, max: 100 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
}, { _id: false });

const riskScoreSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  entityType: { type: String, enum: ["report", "incident", "cluster"], required: true, index: true },
  entityId: { type: String, required: true, index: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  priority: { type: String, enum: ["P1_CRITICAL", "P2_HIGH", "P3_MEDIUM", "P4_LOW"], required: true },
  factors: [riskFactorSchema],
  explanation: { type: String, required: true, trim: true, maxlength: 2000 },
  computedAt: { type: String, required: true, index: true },
}, { timestamps: true, versionKey: false });

riskScoreSchema.index({ entityType: 1, entityId: 1 }, { unique: true });
riskScoreSchema.index({ score: -1, computedAt: -1 });

export type RiskScoreDocument = InferSchemaType<typeof riskScoreSchema> & mongoose.Document;
export const RiskScore: Model<RiskScoreDocument> = mongoose.models.RiskScore as Model<RiskScoreDocument> ?? mongoose.model<RiskScoreDocument>("RiskScore", riskScoreSchema);