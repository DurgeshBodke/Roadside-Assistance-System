import type {
  GeoPoint,
  RequestStatus,
  ServiceType,
} from "./shared/types";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "roadside.token";
const USER_KEY = "roadside.user";

export interface StoredUser {
  _id: string;
  role: "driver" | "mechanic" | "admin";
  name: string;
  email: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);

  return raw ? JSON.parse(raw) : null;
}

function saveSession(token: string, user: StoredUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(
  url: string,
  method = "GET",
  body?: any
) {
  const token = getToken();

  const response = await fetch(API + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response.json();
}

/* ================= AUTH ================= */

export async function apiRegister(input: {
  name: string;
  email: string;
  password: string;
  role: "driver" | "mechanic" | "admin";
}) {
  const data = await request(
    "/auth/register",
    "POST",
    input
  );

  if (data.error) {
    return {
      ok: false,
      error: data.error,
    };
  }

  saveSession(data.token, data.user);

  return {
    ok: true,
    user: data.user,
  };
}

export async function apiLogin(input: {
  email: string;
  password: string;
}) {
  const data = await request(
    "/auth/login",
    "POST",
    input
  );

  if (data.error) {
    return {
      ok: false,
      error: data.error,
    };
  }

  saveSession(data.token, data.user);

  return {
    ok: true,
    user: data.user,
  };
}

/* ================= REQUESTS ================= */

export async function apiCreateRequest(input: {
  serviceType: ServiceType;
  breakdownLocation: GeoPoint;
  notes?: string;
}) {
  const data = await request(
    "/requests",
    "POST",
    input
  );

  if (data.error) {
    return {
      ok: false,
      error: data.error,
    };
  }

  return {
    ok: true,
    request: data,
  };
}

export async function apiNearbyRequests(
  point: GeoPoint,
  radiusKm = 25
) {
  const data = await request(
    `/requests/nearby?lat=${point.lat}&lng=${point.lng}&radius=${radiusKm}`
  );

  if (data.error) {
    return {
      ok: false,
      error: data.error,
    };
  }

  return {
    ok: true,
    data,
  };
}

export async function apiUpdateStatus(
  requestId: string,
  status: RequestStatus
) {
  const data = await request(
    `/requests/${requestId}/status`,
    "PUT",
    {
      status,
    }
  );

  if (data.error) {
    return {
      ok: false,
      error: data.error,
    };
  }

  return {
    ok: true,
    request: data,
  };
}

export async function apiMyRequests() {
  const data = await request("/requests/my");

  if (data.error) {
    return {
      ok: false,
      error: data.error,
    };
  }

  return {
    ok: true,
    data,
  };
}

export async function apiAdminOverview() {
  const data = await request(
    "/admin/overview"
  );

  if (data.error) {
    return {
      ok: false,
      error: data.error,
    };
  }

  return {
    ok: true,
    data,
  };
}

export async function simulateMechanicAccept(
  requestId: string
): Promise<boolean> {
  const result = await apiUpdateStatus(
    requestId,
    "accepted"
  );

  return result.ok;
}