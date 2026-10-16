import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/shop/proxy";

/* /uploads/* → product photos and other media stored by the AgainERP API (see lib/shop/proxy.ts) */
export const runtime = "nodejs";

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxyToApi(req, `/uploads/${path.map(encodeURIComponent).join("/")}`);
}

export const GET = handle;
export const HEAD = handle;
