import dotenv from "dotenv";
import { connectDatabase } from "./config/database.js";
import { app } from "./app.js";

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || Buffer.byteLength(jwtSecret, "utf8") < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 UTF-8 bytes. Generate one with: node -e \"console.log(require('node:crypto').randomBytes(32).toString('base64url'))\"");
}

const PORT = process.env.PORT || 5000;

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`SCIP backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start SCIP backend; check local MongoDB availability and configuration.");
    process.exit(1);
  }
}

startServer();
