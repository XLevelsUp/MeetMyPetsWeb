import { NextResponse } from "next/server";
import { z } from "zod";

import { blogSession, failureResponse, readJson } from "@/lib/blog-api";
import { SLUG_RE } from "@/lib/blog-contract";
import { blogPaths, revalidateMarketing } from "@/lib/blog-revalidate";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ slugs: z.array(z.string().regex(SLUG_RE)).max(20).default([]) });

/**
 * Recovery path: re-sends the cache refresh when it failed during a save, so an
 * editor can fix a stale public page without editing the article again.
 */
export async function POST(request: Request) {
  const gate = await blogSession();
  if (!gate.ok) return gate.response;

  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = bodySchema.safeParse(json.body);
  if (!parsed.success) return failureResponse("invalid", "Invalid slugs.");

  return NextResponse.json(await revalidateMarketing(blogPaths(parsed.data.slugs)));
}
