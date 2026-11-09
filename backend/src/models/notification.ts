import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const notificationSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  type: { type: String, enum: ["report_status", "incident_alert", "assignment", "resolution", "system", "incident_assigned", "incident_resolved"], required: true },
  read: { type: Boolean, default: false, index: true },
  link: { type: String, trim: true },
  relatedId: { type: String, index: true },
  relatedType: { type: String },
}, { timestamps: true, versionKey: false });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & mongoose.Document;
export const Notification: Model<NotificationDocument> = mongoose.models.Notification as Model<NotificationDocument> ?? mongoose.model<NotificationDocument>("Notification", notificationSchema);