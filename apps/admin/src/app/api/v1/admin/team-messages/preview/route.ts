import { previewAudience } from "@/lib/team-messages";
import { previewBodySchema } from "@/lib/team-messages-contract";
import { badRequest, readJson, teamResponse, teamSession } from "@/lib/team-messages-http";

export const dynamic = "force-dynamic";

// POST because the audience (up to 1000 ids) does not fit in a query string.
export async function POST(request: Request) {
  const session = await teamSession();
  if (!session.ok) return session.response;
  const json = await readJson(request);
  if (!json.ok) return badRequest("Expected a JSON body.");
  const parsed = previewBodySchema.safeParse(json.body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Choose who should receive this message.");
  return teamResponse(await previewAudience(parsed.data, session.actorId));
}
