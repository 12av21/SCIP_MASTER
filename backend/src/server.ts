import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDatabase } from "./config/database.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "SCIP Backend",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`SCIP backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start SCIP backend:", error);
    process.exit(1);
  }
}

startServer();