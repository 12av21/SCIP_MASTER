import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, toSafeUser } from "../models/user.js";
import { authenticate } from "../middleware/auth.js";
import { loginSchema, registerSchema } from "../validators/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Invalid registration data" });
  const { name, email, password } = parsed.data;
  try {
    if (await User.exists({ email })) return res.status(409).json({ success: false, error: "An account with this email already exists" });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: "citizen", status: "active" });
    const token = jwt.sign({}, process.env.JWT_SECRET!, { algorithm: "HS256", subject: user._id.toString(), expiresIn: "1h" });
    return res.status(201).json({ success: true, data: { user: toSafeUser(user), token } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return res.status(409).json({ success: false, error: "An account with this email already exists" });
    throw error;
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Invalid login data" });
  const user = await User.findOne({ email: parsed.data.email }).select("+passwordHash").exec();
  if (!user || user.status !== "active" || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ success: false, error: "Invalid email or password" });
  const token = jwt.sign({}, process.env.JWT_SECRET!, { algorithm: "HS256", subject: user._id.toString(), expiresIn: "1h" });
  return res.status(200).json({ success: true, data: { user: toSafeUser(user), token } });
});

router.get("/me", authenticate, (req, res) => res.status(200).json({ success: true, data: req.authUser }));

export default router;
