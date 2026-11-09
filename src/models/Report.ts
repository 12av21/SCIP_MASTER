import mongoose, { Schema, type InferSchemaType, type Model, type Document } from 'mongoose';

const reportSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true, minlength: 5, maxlength: 200 },
  description: { type: String, required: true, minlength: 10, maxlength: 5000 },
  category: {
    type: String,
    enum: ['Water & Drainage', 'Roads & Traffic', 'Public Sanitation', 'Power & Lighting', 'Parks & Environment', 'Structural Safety', 'Public Health', 'Noise & Disturbance'],
    required: true
  },
  subcategory: { type: String, maxlength: 100 },
  locationName: { type: String, required: true, minlength: 2, maxlength: 200 },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  citizenId: { type: String, required: true },
  citizenName: { type: String, required: true },
  citizenEmail: { type: String, required: true },
  status: { type: String, enum: ['submitted', 'processing', 'analyzed', 'linked', 'under_review', 'assigned', 'resolved', 'closed'], required: true, default: 'submitted' },
  urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  incidentId: { type: String },
  images: [{ type: String }],
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { timestamps: false, versionKey: false });

// Geospatial index for location-based queries
reportSchema.index({ latitude: 1, longitude: 1 });
reportSchema.index({ citizenId: 1, createdAt: -1 });
reportSchema.index({ status: 1 });
reportSchema.index({ category: 1 });
reportSchema.index({ createdAt: -1 });

export type ReportDocument = InferSchemaType<typeof reportSchema> & Document;
export const Report: Model<ReportDocument> = mongoose.models.Report as Model<ReportDocument> ?? mongoose.model<ReportDocument>('Report', reportSchema);