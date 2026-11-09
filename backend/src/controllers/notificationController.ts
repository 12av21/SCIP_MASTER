// Notifications Controller - List and mark-read endpoints.
// All endpoints enforce recipient isolation: users can only see their own notifications.

import type { Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  listNotifications,
  markRead,
  markAllRead,
} from "../services/notificationService.js";

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const user = req.authUser!;
    const unreadOnly = req.query.unread === "true";
    const notifications = await listNotifications(user.id, unreadOnly);
    const unreadCount = notifications.filter((n) => !n.read).length;
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    console.error("Get notifications failed:", error);
    res.status(500).json({ success: false, error: "Failed to fetch notifications" });
  }
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    const user = req.authUser!;
    const id = String(req.params.id);
    const notification = await markRead(id, user.id);
    if (!notification) {
      res.status(404).json({ success: false, error: "Notification not found" });
      return;
    }
    res.json({ success: true, data: { notification } });
  } catch (error) {
    console.error("Mark notification read failed:", error);
    res.status(500).json({ success: false, error: "Failed to mark notification read" });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
  try {
    const user = req.authUser!;
    const count = await markAllRead(user.id);
    res.json({ success: true, data: { message: "All notifications marked as read", count } });
  } catch (error) {
    console.error("Mark all notifications read failed:", error);
    res.status(500).json({ success: false, error: "Failed to mark all notifications read" });
  }
}