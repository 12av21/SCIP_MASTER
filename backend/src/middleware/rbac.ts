// RBAC Middleware - Role-Based Access Control

import type { Request, Response, NextFunction } from "express";

export function requireAuthority(req: Request, res: Response, next: NextFunction): void {
  if (!["authority", "admin"].includes(req.authUser?.role || "")) {
    res.status(403).json({ success: false, error: "Requires authority or admin role" });
    return;
  }
  next();
}

export function requireOfficer(req: Request, res: Response, next: NextFunction): void {
  if (!["officer", "authority", "admin"].includes(req.authUser?.role || "")) {
    res.status(403).json({ success: false, error: "Requires officer, authority, or admin role" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.authUser?.role !== "admin") {
    res.status(403).json({ success: false, error: "Requires admin role" });
    return;
  }
  next();
}