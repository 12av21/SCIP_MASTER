// Reports API Routes
// All routes require authentication; authorization is enforced in the controller.

import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createReport,
  getReports,
  getReport,
  updateReport,
  deleteReport,
  getReportAnalysis,
  getSimilarReports,
} from "../controllers/reports.js";

const router = Router();

router.use(authenticate);

// POST /api/reports - Create report (any authenticated user)
router.post("/", createReport);

// GET /api/reports - List reports (paginated, filtered, role-based)
router.get("/", getReports);

// GET /api/reports/:id - Get single report
router.get("/:id", getReport);

// PUT /api/reports/:id - Update report (owner or admin)
router.put("/:id", updateReport);

// DELETE /api/reports/:id - Delete report (owner or admin)
router.delete("/:id", deleteReport);

// GET /api/reports/:id/analysis - Get AI analysis
router.get("/:id/analysis", getReportAnalysis);

// POST /api/reports/:id/similar - Get similar reports
router.post("/:id/similar", getSimilarReports);

export default router;