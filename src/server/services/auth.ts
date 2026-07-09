import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connect } from "../db";
import { UserModel } from "../models/User";
import type { Role } from "../../shared/types";

const JWT_SECRET = process.env.JWT_SECRET || "durgesh_secret_key";
const JWT_EXPIRES = "7d";

export interface AuthResult {
  token: string;
  user: {
    _id: string;
    role: Role;
    name: string;
    email: string;
  };
}

export interface ApiError {
  error: string;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  location?: { lat: number; lng: number };
}): Promise<AuthResult | ApiError> {
  await connect();

  const email = input.email.trim().toLowerCase();

  const existingUser = await UserModel.findOne({ email });

  if (existingUser) {
    return {
      error: "Email already exists.",
    };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await UserModel.create({
    name: input.name.trim(),
    email,
    passwordHash,
    role: input.role,
    location: input.location ?? {
      lat: 0,
      lng: 0,
    },
    status: "active",
  });

  const token = jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES,
    }
  );

  return {
    token,
    user: {
      _id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    },
  };
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResult | ApiError> {
  await connect();

  const email = input.email.trim().toLowerCase();

  const user = await UserModel.findOne({ email });

  if (!user) {
    return {
      error: "Invalid email or password.",
    };
  }

  const validPassword = await bcrypt.compare(
    input.password,
    user.passwordHash
  );

  if (!validPassword) {
    return {
      error: "Invalid email or password.",
    };
  }

  if (user.status !== "active") {
    return {
      error: "Account suspended.",
    };
  }

  const token = jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES,
    }
  );

  return {
    token,
    user: {
      _id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    },
  };
}

export function decodeToken(
  token: string
): { id: string; role: Role } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      id: string;
      role: Role;
    };
  } catch {
    return null;
  }
}