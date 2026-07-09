export type Role = "driver" | "mechanic" | "admin";

export type UserStatus = "active" | "suspended";

export type ServiceType =
  | "towing"
  | "flat-tire"
  | "fuel"
  | "battery"
  | "lockout"
  | "other";

export type RequestStatus =
  | "pending"
  | "accepted"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface User {
  _id: string;
  role: Role;
  name: string;
  email: string;
  passwordHash?: string;
  location: GeoPoint;
  status: UserStatus;
  createdAt: string;
}

export interface ServiceRequest {
  _id: string;
  userId: string | User;
  mechanicId: string | User | null;
  serviceType: ServiceType;
  status: RequestStatus;
  breakdownLocation: GeoPoint;
  estimatedPrice: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<User, "passwordHash">;