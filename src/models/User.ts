import mongoose, { Schema, type InferSchemaType, type Model, type Document } from 'mongoose';

export const USER_ROLES = ['citizen', 'officer', 'authority', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, minlength: 20, select: false },
  role: { type: String, enum: USER_ROLES, default: 'citizen', required: true },
  departmentId: { type: String },
  departmentName: { type: String },
  phone: { type: String },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { timestamps: false, versionKey: false });

userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ departmentId: 1 });

export type UserDocument = InferSchemaType<typeof userSchema> & Document;
export const User: Model<UserDocument> = mongoose.models.User as Model<UserDocument> ?? mongoose.model<UserDocument>('User', userSchema);

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export function toSafeUser(user: Pick<UserDocument, 'id' | 'name' | 'email' | 'role' | 'createdAt'>): SafeUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role as UserRole, createdAt: user.createdAt };
}