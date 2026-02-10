/**
 * Catch-all proxy: forward /api/* to the API Gateway.
 * Used when next.config rewrites are not applied (e.g. env not available at runtime).
 * Gateway URL from API_GATEWAY_URL or NEXT_PUBLIC_API_BASE_URL.
 */

import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.API_GATEWAY_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";

function getGatewayBase(): string {
  return GATEWAY_URL.replace(/\/$/, "");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const base = getGatewayBase();
  if (!base) {
    return NextResponse.json(
      { error: "API gateway not configured (API_GATEWAY_URL)" },
      { status: 503 }
    );
  }

  const { path } = await context.params;
  const pathSegment = Array.isArray(path) ? path.join("/") : path || "";
  const pathname = `/api/${pathSegment}`;
  const search = request.nextUrl.search;
  const url = `${base}${pathname}${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("host", new URL(base).host);

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
  };
  if (request.body && !["GET", "HEAD"].includes(request.method)) {
    init.body = request.body;
    init.duplex = "half"; // required by Node fetch when sending a body
  }

  try {
    const res = await fetch(url, init as RequestInit);
    const resHeaders = new Headers(res.headers);
    resHeaders.delete("content-encoding");
    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("API proxy error", { url, method: request.method, message });
    return NextResponse.json(
      {
        error: "Gateway unreachable",
        detail: message,
        hint: "From Docker UI use API_GATEWAY_URL=http://api-gateway:3001 (internal hostname).",
      },
      { status: 502 }
    );
  }
}
