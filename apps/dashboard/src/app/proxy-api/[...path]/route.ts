import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/env";

async function proxyRequest(req: NextRequest, path: string[]) {
  const target = `${getApiBaseUrl()}/api/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  const forward = ["authorization", "content-type", "x-internal-token"] as const;
  for (const name of forward) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(target, init);
  const outHeaders = new Headers();
  for (const name of ["content-type", "content-disposition", "content-length"]) {
    const value = res.headers.get(name);
    if (value) outHeaders.set(name, value);
  }

  return new NextResponse(res.body, {
    status: res.status,
    headers: outHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, (await ctx.params).path);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, (await ctx.params).path);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, (await ctx.params).path);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, (await ctx.params).path);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxyRequest(req, (await ctx.params).path);
}
