import { z } from "zod";

const passwordSchema = z.string().min(8).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password must be at most 72 UTF-8 bytes");
const emailSchema = z.string().trim().max(254).email().transform((value) => value.toLowerCase());

export const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email: emailSchema, password: passwordSchema }).strict();
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Invalid credentials") }).strict();

export const reportSchema = z.object({
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(5000),
  category: z.enum(["Water & Drainage", "Roads & Traffic", "Public Sanitation", "Power & Lighting", "Parks & Environment", "Structural Safety", "Public Health", "Noise & Disturbance"]),
  subcategory: z.string().trim().max(100).optional(),
  locationName: z.string().trim().min(2).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
  images: z.array(z.string().url()).max(5).optional(),
}).strict();

export const reportUpdateSchema = z.object({
  title: z.string().trim().min(5).max(200).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  category: z.enum(["Water & Drainage", "Roads & Traffic", "Public Sanitation", "Power & Lighting", "Parks & Environment", "Structural Safety", "Public Health", "Noise & Disturbance"]).optional(),
  subcategory: z.string().trim().max(100).optional(),
  locationName: z.string().trim().min(2).max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  status: z.enum(["submitted", "processing", "analyzed", "linked", "under_review", "assigned", "resolved", "closed"]).optional(),
  urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
  images: z.array(z.string().url()).max(5).optional(),
}).strict();

export const incidentSchema = z.object({
  title: z.string().trim().min(5).max(200),
  category: z.string().min(1),
  description: z.string().trim().min(10).max(5000),
  location: z.object({
    name: z.string().trim().min(2),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radiusMeters: z.number().min(0).optional(),
  }),
  reportIds: z.array(z.string()).min(1),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  priority: z.enum(["P1_CRITICAL", "P2_HIGH", "P3_MEDIUM", "P4_LOW"]).optional(),
  departmentId: z.string().optional(),
}).strict();

export const incidentUpdateSchema = z.object({
  title: z.string().trim().min(5).max(200).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  priority: z.enum(["P1_CRITICAL", "P2_HIGH", "P3_MEDIUM", "P4_LOW"]).optional(),
  status: z.enum(["potential", "under_review", "confirmed", "in_progress", "resolved", "closed", "dismissed"]).optional(),
  assignedOfficerId: z.string().optional(),
  assignedOfficerName: z.string().trim().optional(),
  departmentId: z.string().optional(),
  departmentName: z.string().trim().optional(),
  resolutionNotes: z.string().trim().max(3000).optional(),
  evidence: z.array(z.string().trim()).optional(),
}).strict();

export const incidentReviewSchema = z.object({
  action: z.enum(["confirm", "dismiss"]),
  notes: z.string().trim().min(1).max(2000),
  departmentId: z.string().optional(),
  officerId: z.string().optional(),
}).strict();

export const incidentResolveSchema = z.object({
  actionTaken: z.string().trim().min(1).max(3000),
  preventiveMeasures: z.string().trim().max(3000).optional(),
  costEstimate: z.number().min(0).optional(),
}).strict();

export const departmentSchema = z.object({
  code: z.string().trim().min(2).max(10).toUpperCase(),
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(500).optional(),
  headName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(20).optional(),
}).strict();

export const userRoleUpdateSchema = z.object({
  role: z.enum(["citizen", "officer", "authority", "admin"]),
}).strict();

export const feedbackSchema = z.object({
  reportId: z.string().optional(),
  incidentId: z.string().optional(),
  rating: z.number().min(1).max(5),
  comments: z.string().trim().min(1).max(2000),
}).refine((data) => data.reportId || data.incidentId, { message: "Either reportId or incidentId must be provided" }).strict();

export const agentQuerySchema = z.object({
  query: z.string().trim().min(1).max(1000),
  specificTool: z.string().optional(),
}).strict();

export const auditLogQuerySchema = z.object({
  module: z.enum(["auth", "reports", "incidents", "intelligence", "admin", "security"]).optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
}).strict();

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
}).passthrough();