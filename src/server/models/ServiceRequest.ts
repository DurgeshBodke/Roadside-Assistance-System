import mongoose, { Schema, Document } from "mongoose";
import type {
  GeoPoint,
  RequestStatus,
  ServiceType,
} from "../../shared/types";

export interface IServiceRequest extends Document {
  userId: mongoose.Types.ObjectId;
  mechanicId?: mongoose.Types.ObjectId | null;
  serviceType: ServiceType;
  status: RequestStatus;
  breakdownLocation: {
    lat: number;
    lng: number;
  };
  estimatedPrice: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceRequestSchema = new Schema<IServiceRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mechanicId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    serviceType: {
      type: String,
      enum: [
        "towing",
        "flat-tire",
        "fuel",
        "battery",
        "lockout",
        "other",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "in-progress",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },
    breakdownLocation: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    estimatedPrice: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const ServiceRequestModel =
  mongoose.models.ServiceRequest ||
  mongoose.model<IServiceRequest>(
    "ServiceRequest",
    ServiceRequestSchema
  );

const BASE_PRICE: Record<ServiceType, number> = {
  towing: 1200,
  "flat-tire": 300,
  fuel: 400,
  battery: 500,
  lockout: 350,
  other: 450,
};

export function estimatePrice(serviceType: ServiceType): number {
  return BASE_PRICE[serviceType] ?? 700;
}

export async function createRequest(data: {
  userId: string;
  serviceType: ServiceType;
  breakdownLocation: GeoPoint;
  estimatedPrice?: number;
  notes?: string;
}) {
  return await ServiceRequestModel.create({
    userId: data.userId,
    serviceType: data.serviceType,
    breakdownLocation: data.breakdownLocation,
    estimatedPrice:
      data.estimatedPrice ?? estimatePrice(data.serviceType),
    notes: data.notes ?? "",
  });
}

export async function getAllRequests() {
  return await ServiceRequestModel.find()
    .populate("userId")
    .populate("mechanicId")
    .sort({ createdAt: -1 });
}

export async function getUserRequests(userId: string) {
  return await ServiceRequestModel.find({ userId })
    .populate("mechanicId")
    .sort({ createdAt: -1 });
}

export async function getMechanicRequests(mechanicId: string) {
  return await ServiceRequestModel.find({ mechanicId })
    .populate("userId")
    .sort({ createdAt: -1 });
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus,
  mechanicId?: string
) {
  return await ServiceRequestModel.findByIdAndUpdate(
    id,
    {
      status,
      ...(mechanicId && { mechanicId }),
    },
    {
      new: true,
    }
  );
}