import { NextResponse } from "next/server";

import { blogSession, failureResponse } from "@/lib/blog-api";
import { createPreview } from "@/lib/blogs";

export const dynamic = "force-dynamic";

/** Mints a one-hour preview link on the marketing site. Previews the SAVED version. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await blogSession();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const result = await createPreview(id);
  if (!result.ok) return failureResponse(result.reason, result.message);
  return NextResponse.json(result.data);
}
