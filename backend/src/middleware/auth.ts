import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User, type SafeUser, type UserRole } from "../models/user.js";

declare global {
  namespace Express {
    interface Request { authUser?: SafeUser }
  }
}

function unauthorized(res: Response): void {
  res.status(401).json({ success: false, error: "Authentication required" });
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) return unauthorized(res);
  let subject: string;
  try {
    const payload = jwt.verify(match[1]!, process.env.JWT_SECRET!, { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.sub !== "string") return unauthorized(res);
    subject = payload.sub;
  } catch {
    unauthorized(res);
    return;
  }
  const user = await User.findById(subject).exec();
  if (!user || user.status !== "active") return unauthorized(res);
  req.authUser = { 
    id: user._id.toString(), 
    name: user.name, 
    email: user.email, 
    role: user.role as UserRole, 
    departmentId: user.departmentId ?? undefined, 
    departmentName: user.departmentName ?? undefined, 
    createdAt: user.createdAt 
  };
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) { unauthorized(res); return; }
    if (!roles.includes(req.authUser.role)) { res.status(403).json({ success: false, error: "Forbidden" }); return; }
    next();
  };
}
