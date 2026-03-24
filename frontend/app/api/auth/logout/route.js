import { NextResponse } from "next/server";

export async function GET() {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  let logoutUrl = baseUrl;
  if (domain && clientId) {
    logoutUrl =
      `https://${domain}/v2/logout?client_id=${encodeURIComponent(clientId)}` +
      `&returnTo=${encodeURIComponent(baseUrl)}`;
  }

  const response = NextResponse.redirect(logoutUrl);
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
