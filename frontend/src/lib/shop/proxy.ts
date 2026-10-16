/* Same-origin reverse proxy to the AgainERP API (pattern from againerp docs/MULTI-FRONTEND-API-CONNECT.md).

   The browser only ever talks to this site: /api/v1/* and /uploads/* are forwarded to API_PROXY_TARGET
   (local: http://127.0.0.1:8060, Docker: http://api:8010, live: the Railway API). So no CORS setup per
   environment, and product photos are served from the shop's own domain. */

import { NextResponse, type NextRequest } from "next/server";

/** header the API reads to decide which storefront site a request belongs to */
export const SITE_HOST_HEADER = "x-storefront-host";

export function apiOrigin(): string {
  return (
    process.env.API_PROXY_TARGET?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_AGAINERP_API_URL?.trim().replace(/\/$/, "") ||
    "http://127.0.0.1:8060"
  );
}

const ATTEMPTS = 3;
const TIMEOUT_MS = 25_000;

async function fetchUpstream(target: URL, init: RequestInit): Promise<Response> {
  let last: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      return await fetch(target, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) {
      last = err;
      if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw last;
}

export async function proxyToApi(req: NextRequest, upstreamPath: string): Promise<NextResponse> {
  const target = new URL(upstreamPath, `${apiOrigin()}/`);
  target.search = req.nextUrl.search;

  const headers = new Headers(req.headers);
  // forwarding `host` itself would break the upstream fetch; the shop's domain travels in its own header
  const host = req.headers.get("host");
  if (host && !headers.has(SITE_HOST_HEADER)) headers.set(SITE_HOST_HEADER, host);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const method = req.method.toUpperCase();
  let upstream: Response;
  try {
    upstream = await fetchUpstream(target, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "API unreachable";
    return NextResponse.json({ detail: `Cannot reach the catalogue API at ${apiOrigin()} (${message}). Set API_PROXY_TARGET.` }, { status: 502 });
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    // fetch already decoded the body
    if (!["transfer-encoding", "connection", "content-encoding", "content-length"].includes(key.toLowerCase())) out.set(key, value);
  });
  return new NextResponse(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}
