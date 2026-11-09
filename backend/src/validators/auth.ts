import { z } from "zod";

const passwordSchema = z.string().min(8).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password must be at most 72 UTF-8 bytes");
const emailSchema = z.string().trim().max(254).email().transform((value) => value.toLowerCase());

export const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email: emailSchema, password: passwordSchema }).strict();
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Invalid credentials") }).strict();
