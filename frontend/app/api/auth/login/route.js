import { NextResponse } from "next/server";

export async function GET(req) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE;
  const useAudience = process.env.NEXT_PUBLIC_AUTH0_USE_AUDIENCE === "true";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/";
  const forceLogin = req.nextUrl.searchParams.get("forceLogin") === "true";

  if (!domain || !clientId) {
    return NextResponse.json(
      { error: "Auth0 env missing." },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/api/auth/callback`;
  const stateValue = Buffer.from(returnTo).toString("base64url");

  const authorizeUrl =
    `https://${domain}/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent("openid profile email")}` +
    (forceLogin ? `&prompt=login` : "") +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(stateValue)}` +
    (useAudience && audience ? `&audience=${encodeURIComponent(audience)}` : "");

  return NextResponse.redirect(authorizeUrl);
}
