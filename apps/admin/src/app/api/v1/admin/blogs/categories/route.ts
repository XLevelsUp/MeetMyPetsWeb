import { NextResponse } from "next/server";

import { blogSession, failureResponse, readJson } from "@/lib/blog-api";
import { blogCategoryInputSchema } from "@/lib/blog-contract";
import { createBlogCategory, listBlogCategories } from "@/lib/blogs";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await blogSession();
  if (!gate.ok) return gate.response;

  const result = await listBlogCategories();
  if (!result.ok) return failureResponse(result.reason, result.message);
  return NextResponse.json({ items: result.data });
}

export async function POST(request: Request) {
  const gate = await blogSession();
  if (!gate.ok) return gate.response;

  const json = await readJson(request);
  if (!json.ok) return json.response;

  const parsed = blogCategoryInputSchema.safeParse(json.body);
  if (!parsed.success) {
    return failureResponse("invalid", parsed.error.issues[0]?.message ?? "Invalid category.");
  }

  const result = await createBlogCategory(parsed.data.name, gate.actor);
  if (!result.ok) return failureResponse(result.reason, result.message);
  return NextResponse.json(result.data);
}
