import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const USER_ROLES = ["citizen", "officer", "authority", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: USER_ROLES, default: "citizen", required: true },
  departmentId: { type: String, trim: true, index: true },
  departmentName: { type: String, trim: true },
  phone: { type: String, trim: true, maxlength: 20 },
  status: { type: String, enum: ["active", "suspended"], default: "active", required: true, index: true },
  createdAt: { type: String, required: true, default: () => new Date().toISOString() },
  updatedAt: { type: String, required: true, default: () => new Date().toISOString() },
}, { timestamps: true, versionKey: false });

userSchema.index({ role: 1, status: 1 });
userSchema.index({ departmentId: 1, role: 1 });

export type UserDocument = InferSchemaType<typeof userSchema> & mongoose.Document;
export const User: Model<UserDocument> = mongoose.models.User as Model<UserDocument> ?? mongoose.model<UserDocument>("User", userSchema);

export type SafeUser = { id: string; name: string; email: string; role: UserRole; departmentId?: string; departmentName?: string; createdAt: Date };
export function toSafeUser(user: Pick<UserDocument, "_id" | "name" | "email" | "role" | "departmentId" | "departmentName" | "createdAt">): SafeUser {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role as UserRole, departmentId: user.departmentId ?? undefined, departmentName: user.departmentName ?? undefined, createdAt: user.createdAt };
}
