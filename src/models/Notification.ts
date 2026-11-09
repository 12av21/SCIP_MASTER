import mongoose, { Schema, type InferSchemaType, type Model, type Document } from 'mongoose';

const notificationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['report_status', 'incident_alert', 'assignment', 'resolution', 'system'], required: true },
  read: { type: Boolean, default: false },
  link: { type: String },
  createdAt: { type: String, required: true }
}, { timestamps: false, versionKey: false });

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & Document;
export const Notification: Model<NotificationDocument> = mongoose.models.Notification as Model<NotificationDocument> ?? mongoose.model<NotificationDocument>('Notification', notificationSchema);