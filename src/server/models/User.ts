import mongoose, { Schema, Document } from "mongoose";
import type { PublicUser, Role, UserStatus } from "../../shared/types";

export interface IUser extends Document {
  role: Role;
  name: string;
  email: string;
  passwordHash: string;
  location: {
    lat: number;
    lng: number;
  };
  status: UserStatus;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    role: {
      type: String,
      enum: ["driver", "mechanic", "admin"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    location: {
      lat: {
        type: Number,
        default: 0,
      },
      lng: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export function toPublic(user: IUser): PublicUser {
  return {
    _id: user._id.toString(),
    role: user.role,
    name: user.name,
    email: user.email,
    location: user.location,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}