import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRouter from "./routes/auth.js";
import incidentsRouter from "./routes/incidents.js";
import reportsRouter from "./routes/reports.js";
import notificationsRouter from "./routes/notifications.js";

export const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "16kb" }));
app.get("/api/health", (_req, res) => res.status(200).json({ success: true, service: "SCIP Backend", status: "healthy", timestamp: new Date().toISOString() }));
app.use("/api/auth", authRouter);
app.use("/api/incidents", incidentsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/notifications", notificationsRouter);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Request failed");
  res.status(500).json({ success: false, error: "Internal server error" });
});
