import { NextResponse, type NextRequest } from "next/server";

import { blogSession, failureResponse, readJson } from "@/lib/blog-api";
import { blogListQuerySchema, blogSaveBodySchema } from "@/lib/blog-contract";
import { createBlogPost, listBlogPosts } from "@/lib/blogs";
import { searchParamsToQuery } from "@/lib/contract-shared";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = await blogSession();
  if (!gate.ok) return gate.response;

  const query = searchParamsToQuery(blogListQuerySchema, request.nextUrl.searchParams);
  const result = await listBlogPosts(query);
  if (!result.ok) return failureResponse(result.reason, result.message);
  return NextResponse.json(result.data);
}

export async function POST(request: Request) {
  const gate = await blogSession();
  if (!gate.ok) return gate.response;

  const json = await readJson(request);
  if (!json.ok) return json.response;

  const parsed = blogSaveBodySchema.safeParse(json.body);
  if (!parsed.success) {
    return failureResponse("invalid", parsed.error.issues[0]?.message ?? "Invalid article.");
  }

  const { intent, ...input } = parsed.data;
  const result = await createBlogPost(input, intent, gate.actor);
  if (!result.ok) return failureResponse(result.reason, result.message);
  return NextResponse.json(result);
}
