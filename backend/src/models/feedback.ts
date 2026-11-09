import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const feedbackSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  reportId: { type: String, index: true },
  incidentId: { type: String, index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: String, required: true, default: () => new Date().toISOString() },
}, { timestamps: true, versionKey: false });

feedbackSchema.index({ reportId: 1, createdAt: -1 });
feedbackSchema.index({ incidentId: 1, createdAt: -1 });
feedbackSchema.index({ userId: 1, createdAt: -1 });

export type FeedbackDocument = InferSchemaType<typeof feedbackSchema> & mongoose.Document;
export const Feedback: Model<FeedbackDocument> = mongoose.models.Feedback as Model<FeedbackDocument> ?? mongoose.model<FeedbackDocument>("Feedback", feedbackSchema);