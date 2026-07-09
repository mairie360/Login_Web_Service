import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

const DEFAULT_BFF_BASE_URL = "http://localhost:4000";

function getBffBaseUrl() {
  return (
    process.env.BFF_USER_BASE_URL ??
    process.env.NEXT_PUBLIC_BFF_USER_BASE_URL ??
    DEFAULT_BFF_BASE_URL
  ).replace(/\/+$/, "");
}

function createProxyHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("accept-encoding");

  return headers;
}

async function proxyBffRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const requestUrl = new URL(request.url);
  const targetUrl = new URL(
    `${getBffBaseUrl()}/${path.map(encodeURIComponent).join("/")}`
  );

  targetUrl.search = requestUrl.search;

  const init: RequestInit = {
    method: request.method,
    headers: createProxyHeaders(request),
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(targetUrl, init);
  } catch (error) {
    return Response.json(
      {
        error: {
          code: "BFF_USER_UNAVAILABLE",
          message: "Le BFF utilisateur est injoignable.",
          details: [error instanceof Error ? error.message : String(error)],
        },
      },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers(upstreamResponse.headers);

  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export function GET(request: NextRequest, context: RouteContext) {
  return proxyBffRequest(request, context);
}

export function POST(request: NextRequest, context: RouteContext) {
  return proxyBffRequest(request, context);
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return proxyBffRequest(request, context);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return proxyBffRequest(request, context);
}
