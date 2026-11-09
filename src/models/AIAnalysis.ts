import mongoose, { Schema, type InferSchemaType, type Model, type Document } from 'mongoose';

const aiAnalysisSchema = new Schema({
  reportId: { type: String, required: true, unique: true },
  categoryPredicted: { type: String, required: true },
  categoryConfidence: { type: Number, required: true },
  keywords: [{ type: String }],
  entities: {
    locations: [{ type: String }],
    infrastructure: [{ type: String }],
    hazards: [{ type: String }],
    temporal: [{ type: String }]
  },
  sentiment: { type: String, enum: ['negative', 'neutral', 'urgent'] },
  duplicateProbability: { type: Number },
  topSimilarReports: [{
    reportId: String,
    reportTitle: String,
    category: String,
    similarityScore: Number,
    distanceMeters: Number,
    timeDeltaHours: Number,
    matchingTerms: [String],
    isPotentialDuplicate: Boolean
  }],
  possibleIncident: { type: Boolean },
  incidentClusterId: { type: String },
  severityIndicator: { type: String },
  riskScore: { type: Number },
  evidence: [{ type: String }],
  uncertaintyNotes: { type: String },
  confidence: { type: Number },
  processedAt: { type: String, required: true }
}, { timestamps: false, versionKey: false });

export type AIAnalysisDocument = InferSchemaType<typeof aiAnalysisSchema> & Document;
export const AIAnalysis: Model<AIAnalysisDocument> = mongoose.models.AIAnalysis as Model<AIAnalysisDocument> ?? mongoose.model<AIAnalysisDocument>('AIAnalysis', aiAnalysisSchema);