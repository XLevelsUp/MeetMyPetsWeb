import { NextResponse, type NextRequest } from "next/server";

import type { ApiError } from "@/lib/api-contract";
import { requireRole } from "@/lib/dal";
import { SETTINGS_ROLES } from "@/lib/roles";
import { createBreed, listBreeds } from "@/lib/taxonomy";
import { breedsQuerySchema, createBreedBodySchema } from "@/lib/taxonomy-contract";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireRole(...SETTINGS_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  const params = request.nextUrl.searchParams;
  const query = breedsQuerySchema.parse({
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
    q: params.get("q") ?? undefined,
    status: params.get("status") ?? undefined,
    speciesId: params.get("speciesId") ?? undefined,
  });

  const result = await listBreeds(query);
  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: result.reason, message: result.message },
      { status: 500 },
    );
  }

  return NextResponse.json(result.data);
}

export async function POST(request: Request) {
  const session = await requireRole(...SETTINGS_ROLES);
  if (!session.ok) {
    const status = session.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json<ApiError>(
      { error: session.reason, message: session.message },
      { status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "invalid_body", message: "Expected a JSON body." },
      { status: 400 },
    );
  }

  const parsed = createBreedBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: "invalid_body", message: parsed.error.issues[0]?.message ?? "Invalid breed." },
      { status: 400 },
    );
  }

  const { reason, ...input } = parsed.data;
  const result = await createBreed(input, reason, {
    userId: session.userId,
    email: session.email,
    role: session.role,
  });

  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : result.reason === "conflict" ? 409 : 500;
    return NextResponse.json<ApiError>({ error: result.reason, message: result.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
