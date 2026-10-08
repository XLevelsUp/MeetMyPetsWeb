import { NextResponse } from "next/server";

import { blogSession, failureResponse, readJson } from "@/lib/blog-api";
import { blogActionBodySchema } from "@/lib/blog-contract";
import { applyBlogAction } from "@/lib/blogs";

export const dynamic = "force-dynamic";

/** publish / unpublish / delete. Delete requires a reason (enforced by the schema). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await blogSession();
  if (!gate.ok) return gate.response;

  const json = await readJson(request);
  if (!json.ok) return json.response;

  const parsed = blogActionBodySchema.safeParse(json.body);
  if (!parsed.success) {
    return failureResponse("invalid", parsed.error.issues[0]?.message ?? "Invalid action.");
  }

  const { id } = await params;
  const result = await applyBlogAction(id, parsed.data.action, parsed.data.reason, gate.actor);
  if (!result.ok) return failureResponse(result.reason, result.message);
  return NextResponse.json(result);
}
