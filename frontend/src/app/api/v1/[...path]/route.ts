import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/shop/proxy";

/* /api/v1/* → the AgainERP API (see lib/shop/proxy.ts) */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxyToApi(req, `/api/v1/${(path ?? []).map(encodeURIComponent).join("/")}`);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
