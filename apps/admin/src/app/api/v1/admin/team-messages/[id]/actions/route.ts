import { z } from "zod";

import { actOnTeamMessage } from "@/lib/team-messages";
import { messageActionBodySchema } from "@/lib/team-messages-contract";
import { badRequest, readJson, teamResponse, teamSession } from "@/lib/team-messages-http";

export const dynamic = "force-dynamic";

// Edit or delete/cancel one message; POST like every other mutation in this panel.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await teamSession();
  if (!session.ok) return session.response;
  const { id } = await params;
  if (!z.guid().safeParse(id).success) return badRequest("Unknown message.");
  const json = await readJson(request);
  if (!json.ok) return badRequest("Expected a JSON body.");
  const parsed = messageActionBodySchema.safeParse(json.body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid change.");
  return teamResponse(await actOnTeamMessage(id, parsed.data, session.actorId));
}
