import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireAuthority, requireOfficer } from "../middleware/rbac.js";
import {
  createIncident,
  getIncidents,
  getIncident,
  updateIncident,
  reviewIncident,
  resolveIncident,
  getIncidentAssignments,
  assignIncident,
} from "../controllers/incidents.js";

const router = Router();

// All incident routes require authentication
router.use(authenticate);

// GET /api/incidents - List incidents (all roles)
router.get("/", getIncidents);

// GET /api/incidents/:id - Get single incident (all roles, with permission check)
router.get("/:id", getIncident);

// POST /api/incidents - Create incident (authority/admin only)
router.post("/", requireAuthority, createIncident);

// PUT /api/incidents/:id - Update incident (authority/admin/assigned officer)
router.put("/:id", updateIncident);

// POST /api/incidents/:id/review - Review incident (authority/admin only)
router.post("/:id/review", requireAuthority, reviewIncident);

// POST /api/incidents/:id/resolve - Resolve incident (officer/authority/admin)
router.post("/:id/resolve", requireOfficer, resolveIncident);

// GET /api/incidents/:id/assignments - Get assignments for incident
router.get("/:id/assignments", getIncidentAssignments);

// POST /api/incidents/:id/assign - Assign incident to officer (authority/admin)
router.post("/:id/assign", requireAuthority, assignIncident);

export default router;