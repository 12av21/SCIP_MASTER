import mongoose, { Schema, type InferSchemaType, type Model, type Document } from 'mongoose';

const feedbackSchema = new Schema({
  id: { type: String, required: true, unique: true },
  reportId: { type: String },
  incidentId: { type: String },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String },
  createdAt: { type: String, required: true }
}, { timestamps: false, versionKey: false });

feedbackSchema.index({ reportId: 1 });
feedbackSchema.index({ incidentId: 1 });
feedbackSchema.index({ userId: 1 });

export type FeedbackDocument = InferSchemaType<typeof feedbackSchema> & Document;
export const Feedback: Model<FeedbackDocument> = mongoose.models.Feedback as Model<FeedbackDocument> ?? mongoose.model<FeedbackDocument>('Feedback', feedbackSchema);