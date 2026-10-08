import { NextResponse } from "next/server";

import { blogSession, failureResponse, readJson } from "@/lib/blog-api";
import { blogSaveBodySchema } from "@/lib/blog-contract";
import { getBlogPost, updateBlogPost } from "@/lib/blogs";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const gate = await blogSession();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const result = await getBlogPost(id);
  if (!result.ok) return failureResponse(result.reason, result.message);
  return NextResponse.json(result.data);
}

/** POST, not PUT/PATCH — every mutation in this panel is a POST. */
export async function POST(request: Request, { params }: Params) {
  const gate = await blogSession();
  if (!gate.ok) return gate.response;

  const json = await readJson(request);
  if (!json.ok) return json.response;

  const parsed = blogSaveBodySchema.safeParse(json.body);
  if (!parsed.success) {
    return failureResponse("invalid", parsed.error.issues[0]?.message ?? "Invalid article.");
  }

  const { id } = await params;
  const { intent, ...input } = parsed.data;
  const result = await updateBlogPost(id, input, intent, gate.actor);
  if (!result.ok) return failureResponse(result.reason, result.message);
  return NextResponse.json(result);
}
