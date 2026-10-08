import { NextResponse } from "next/server";

import { blogSession, failureResponse } from "@/lib/blog-api";
import { uploadBlogImage } from "@/lib/blog-images";

export const dynamic = "force-dynamic";

/** multipart/form-data with one `file` field. Type and size are checked in uploadBlogImage. */
export async function POST(request: Request) {
  const gate = await blogSession();
  if (!gate.ok) return gate.response;

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return failureResponse("invalid", "Expected a multipart form with a file.");
  }
  if (!(file instanceof File)) return failureResponse("invalid", "Choose an image to upload.");

  const result = await uploadBlogImage(file);
  if (!result.ok) return failureResponse(result.reason, result.message);
  return NextResponse.json({ url: result.url });
}
