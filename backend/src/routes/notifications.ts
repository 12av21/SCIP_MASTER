// Notifications API Routes
// All routes require authentication and enforce recipient isolation.

import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notificationController.js";

const router = Router();

router.use(authenticate);

router.get("/", getNotifications);
router.put("/:id/read", markNotificationRead);
router.post("/read-all", markAllNotificationsRead);

export default router;