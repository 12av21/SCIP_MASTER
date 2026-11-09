import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const entitiesSchema = new Schema({
  locations: [{ type: String, trim: true }],
  infrastructure: [{ type: String, trim: true }],
  hazards: [{ type: String, trim: true }],
  temporal: [{ type: String, trim: true }],
}, { _id: false });

const similarReportMatchSchema = new Schema({
  reportId: { type: String, required: true },
  reportTitle: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  similarityScore: { type: Number, required: true, min: 0, max: 1 },
  distanceMeters: { type: Number, required: true, min: 0 },
  timeDeltaHours: { type: Number, required: true, min: 0 },
  matchingTerms: [{ type: String, trim: true }],
  isPotentialDuplicate: { type: Boolean, default: false },
}, { _id: false });

const aiAnalysisSchema = new Schema({
  reportId: { type: String, required: true, unique: true, index: true },
  categoryPredicted: { type: String, required: true },
  categoryConfidence: { type: Number, required: true, min: 0, max: 1 },
  keywords: [{ type: String, trim: true }],
  entities: { type: entitiesSchema, required: true },
  sentiment: { type: String, enum: ["negative", "neutral", "urgent"], required: true },
  duplicateProbability: { type: Number, required: true, min: 0, max: 1 },
  topSimilarReports: [similarReportMatchSchema],
  possibleIncident: { type: Boolean, default: false },
  incidentClusterId: { type: String, index: true },
  severityIndicator: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
  riskScore: { type: Number, required: true, min: 0, max: 100 },
  evidence: [{ type: String, trim: true }],
  uncertaintyNotes: { type: String, trim: true, maxlength: 1000 },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  processedAt: { type: String, required: true },
  modelVersion: { type: String, default: "1.0.0" },
}, { timestamps: true, versionKey: false });

export type AIAnalysisDocument = InferSchemaType<typeof aiAnalysisSchema> & mongoose.Document;
export const AIAnalysis: Model<AIAnalysisDocument> = mongoose.models.AIAnalysis as Model<AIAnalysisDocument> ?? mongoose.model<AIAnalysisDocument>("AIAnalysis", aiAnalysisSchema);