import {
  GeoPoint,
  RequestStatus,
  ServiceType,
} from "../../shared/types";

import { connect } from "../db";
import { decodeToken } from "../services/auth";
import { UserModel } from "../models/User";
import {
  ServiceRequestModel,
  estimatePrice,
} from "../models/ServiceRequest";

export interface ApiResponse {
  status: number;
  body: any;
}

const ok = (body: any): ApiResponse => ({
  status: 200,
  body,
});

const created = (body: any): ApiResponse => ({
  status: 201,
  body,
});

const error = (status: number, message: string): ApiResponse => ({
  status,
  body: { error: message },
});

async function currentUser(token: string | null) {
  if (!token) return null;

  const decoded: any = decodeToken(token);

  if (!decoded) return null;

  return await UserModel.findById(decoded.id);
}

/* ================= DRIVER ================= */

export async function createRequest(args: {
  token: string | null;
  serviceType: ServiceType;
  breakdownLocation: GeoPoint;
  notes?: string;
}) {
  await connect();

  const user = await currentUser(args.token);

  if (!user) {
    return error(401, "Unauthorized");
  }

  const request = await ServiceRequestModel.create({
    userId: user._id,
    serviceType: args.serviceType,
    status: "pending",
    breakdownLocation: args.breakdownLocation,
    estimatedPrice: estimatePrice(args.serviceType),
    notes: args.notes || "",
  });

  return created(request);
}

/* ================= MY REQUESTS ================= */

export async function myRequests(token: string | null) {
  await connect();

  const user = await currentUser(token);

  if (!user) {
    return error(401, "Unauthorized");
  }

  let requests;

  if (user.role === "driver") {
    requests = await ServiceRequestModel.find({
      userId: user._id,
    })
      .populate("mechanicId")
      .sort({
        createdAt: -1,
      });
  } else if (user.role === "mechanic") {
    requests = await ServiceRequestModel.find({
      mechanicId: user._id,
    })
      .populate("userId")
      .sort({
        createdAt: -1,
      });
  } else {
    requests = await ServiceRequestModel.find()
      .populate("userId")
      .populate("mechanicId")
      .sort({
        createdAt: -1,
      });
  }

  return ok({
    requests,
  });
}

/* ================= MECHANIC ================= */

export async function nearbyRequests(args: {
  token: string | null;
  point: GeoPoint;
  radiusKm?: number;
}) {
  await connect();

  const user = await currentUser(args.token);

  if (!user) {
    return error(401, "Unauthorized");
  }

  const requests = await ServiceRequestModel.find({
    status: "pending",
  }).populate("userId");

  return ok({
    radiusKm: args.radiusKm || 25,
    requests,
  });
}

export async function updateStatus(args: {
  token: string | null;
  requestId: string;
  status: RequestStatus;
}) {
  await connect();

  const user = await currentUser(args.token);

  if (!user) {
    return error(401, "Unauthorized");
  }

  const request = await ServiceRequestModel.findById(
    args.requestId
  );

  if (!request) {
    return error(404, "Request not found");
  }

  request.status = args.status;

  if (
    args.status === "accepted" &&
    !request.mechanicId
  ) {
    request.mechanicId = user._id;
  }

  await request.save();

  return ok(request);
}

/* ================= ADMIN ================= */

export async function adminOverview(
  token: string | null
) {
  await connect();

  const admin = await currentUser(token);

  if (!admin || admin.role !== "admin") {
    return error(401, "Unauthorized");
  }

  const users = await UserModel.find().select(
    "-passwordHash"
  );

  const requests = await ServiceRequestModel.find()
    .populate("userId")
    .populate("mechanicId");

  return ok({
    users,
    requests,
    counts: {
      pending: await ServiceRequestModel.countDocuments({
        status: "pending",
      }),
      accepted:
        await ServiceRequestModel.countDocuments({
          status: "accepted",
        }),
      "in-progress":
        await ServiceRequestModel.countDocuments({
          status: "in-progress",
        }),
      completed:
        await ServiceRequestModel.countDocuments({
          status: "completed",
        }),
      cancelled:
        await ServiceRequestModel.countDocuments({
          status: "cancelled",
        }),
    },
  });
}