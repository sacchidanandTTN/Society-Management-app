import { NextResponse } from "next/server";

const backendOrigin =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";

const buildTargetUrl = (request) => {
  const search = request.nextUrl.search || "";
  const pathname = request.nextUrl.pathname || "";
  const pathStr = pathname.replace(/^\/api\/v1\/?/, "").replace(/\/$/, "") || "";
  return `${backendOrigin}/api/v1/${pathStr}${search}`;
};

const buildForwardHeaders = (request) => {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);

  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  return headers;
};

const readRequestBody = async (request) => {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  const body = await request.arrayBuffer();
  return body.byteLength ? body : undefined;
};

async function proxy(request) {
  const targetUrl = buildTargetUrl(request);
  const headers = buildForwardHeaders(request);
  const body = await readRequestBody(request);

  const res = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  const outHeaders = new Headers();
  const ct = res.headers.get("content-type");
  if (ct) outHeaders.set("Content-Type", ct);

  const text = await res.text();

  if (!outHeaders.has("Content-Type") && text) {
    outHeaders.set("Content-Type", "application/json; charset=utf-8");
  }

  return new NextResponse(text, { status: res.status, headers: outHeaders });
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
