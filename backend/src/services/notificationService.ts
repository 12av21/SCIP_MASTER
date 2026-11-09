// SCIP Backend - Notification Service
// Centralized, idempotent notification creation with recipient isolation.
// Failures are logged and never propagate to the caller so that report/incident
// operations remain successful even if notification persistence fails.

import { Notification, NotificationDocument } from "../models/notification.js";
import { generateId } from "../utils/idGenerator.js";

export type NotificationType =
  | "report_status"
  | "incident_alert"
  | "assignment"
  | "resolution"
  | "system"
  | "incident_assigned"
  | "incident_resolved";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: "report" | "incident" | "assignment" | "resolution";
  link?: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
}

export function toNotificationRecord(doc: NotificationDocument): NotificationRecord {
  return {
    id: doc.id,
    userId: doc.userId,
    type: doc.type as NotificationType,
    title: doc.title,
    message: doc.message,
    read: doc.read,
    link: doc.link ?? undefined,
    relatedId: doc.relatedId ?? undefined,
    relatedType: doc.relatedType ?? undefined,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

/**
 * Create a notification, enforcing idempotency per (userId, relatedId, relatedType, type).
 * Returns the notification record or null if a duplicate already exists.
 * Errors are logged and swallowed so callers are unaffected.
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<NotificationRecord | null> {
  try {
    // Idempotency guard: skip if an identical notification already exists.
    if (params.relatedId && params.relatedType) {
      const existing = await Notification.findOne({
        userId: params.userId,
        type: params.type,
        relatedId: params.relatedId,
        relatedType: params.relatedType,
      }).lean();
      if (existing) {
        return toNotificationRecord(existing as unknown as NotificationDocument);
      }
    }

    const doc = await Notification.create({
      id: generateId("NOT"),
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      read: false,
      link: params.link,
      relatedId: params.relatedId,
      relatedType: params.relatedType,
    });
    return toNotificationRecord(doc);
  } catch (error) {
    console.error("[notificationService] createNotification failed:", error);
    return null;
  }
}

export async function listNotifications(
  userId: string,
  unreadOnly = false
): Promise<NotificationRecord[]> {
  const query: Record<string, unknown> = { userId };
  if (unreadOnly) query.read = false;
  const docs = await Notification.find(query).sort({ createdAt: -1 }).lean();
  return docs.map((d) => toNotificationRecord(d as unknown as NotificationDocument));
}

export async function markRead(id: string, userId: string): Promise<NotificationRecord | null> {
  const doc = await Notification.findOneAndUpdate(
    { id, userId },
    { read: true },
    { new: true }
  ).lean();
  return doc ? toNotificationRecord(doc as unknown as NotificationDocument) : null;
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true }
  );
  return result.modifiedCount;
}