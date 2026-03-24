import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");

    if (!code) {
      return NextResponse.json({ error: "Authorization code missing" }, { status: 400 });
    }

    const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
    const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
    const clientSecret = process.env.AUTH0_CLIENT_SECRET;
    
    const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE;
    const useAudience = process.env.NEXT_PUBLIC_AUTH0_USE_AUDIENCE === "true";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    if (!domain || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Auth0 env missing." },
        { status: 500 }
      );
    }

    const redirectUri = `${baseUrl}/api/auth/callback`;

    const tokenRes = await axios.post(
      `https://${domain}/oauth/token`,
      {
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        audience: useAudience ? audience || undefined : undefined,
      },
      { headers: { "Content-Type": "application/json" } }
    );
    const accessToken = tokenRes.data?.access_token;
    const idToken = tokenRes.data?.id_token;
    const redirectPath = state
      ? Buffer.from(state, "base64url").toString("utf8")
      : "/";

    const sessionToken = useAudience ? accessToken : idToken || accessToken;
    if (!sessionToken) {
      return NextResponse.json(
        { error: "Authentication failed", detail: "No token returned." },
        { status: 500 }
      );
    }

    const response = NextResponse.redirect(`${baseUrl}${redirectPath}`);
    response.cookies.set("token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: "Authentication failed", detail: err.response?.data || err.message },
      { status: 500 }
    );
  }
}
