import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";

function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeRole(data) {
  const input = [data?.roles];
  const list = [];
  for (const value of input) {
    if (Array.isArray(value)) {
      for (const item of value) list.push(item);
    } else if (value) {
      list.push(value);
    }
  }
  return Array.from(
    new Set(list.map((value) => String(value).trim().toLowerCase()).filter(Boolean))
  );
}

export async function GET(req) {
  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const jwtPayload = decodeJwtPayload(token);
  const jwtRoles = normalizeRole({
    roles: jwtPayload?.["https://society-api.example.com/roles"],
  });
  if (jwtRoles.length) {
    return NextResponse.json({
      authenticated: true,
      data: {
        sub: jwtPayload?.sub || null,
        email: jwtPayload?.email || null,
        roles: jwtRoles,
      },
    });
  }

  try {
    const res = await apiClient.get("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    });
    const payload = res.data?.data || {};
    const roles = normalizeRole(payload);

    if (!roles.length) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "Access denied.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      data: {
        sub: payload.sub || null,
        email: payload.email || null,
        roles,
      },
    });
  } catch (error) {
    const isTimeout = error?.code === "ECONNABORTED";
    const status = isTimeout ? 503 : error?.response?.status || 500;
    const backendMessage = isTimeout
      ? "Auth service timeout. Please retry."
      : error?.response?.data?.message || "Auth check failed.";
    return NextResponse.json(
      {
        authenticated: false,
        error: backendMessage,
      },
      { status }
    );
  }
}
