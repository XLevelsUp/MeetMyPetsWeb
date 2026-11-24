import type { NextRequest } from "next/server";

import { searchParamsToQuery } from "@/lib/contract-shared";
import { listTeamMessages, sendTeamMessage } from "@/lib/team-messages";
import { listQuerySchema, sendBodySchema } from "@/lib/team-messages-contract";
import { badRequest, readJson, teamResponse, teamSession } from "@/lib/team-messages-http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await teamSession();
  if (!session.ok) return session.response;
  const query = searchParamsToQuery(listQuerySchema, request.nextUrl.searchParams);
  return teamResponse(await listTeamMessages(query, session.actorId));
}

export async function POST(request: Request) {
  const session = await teamSession();
  if (!session.ok) return session.response;
  const json = await readJson(request);
  if (!json.ok) return badRequest("Expected a JSON body.");
  const parsed = sendBodySchema.safeParse(json.body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid message.");
  return teamResponse(await sendTeamMessage(parsed.data, session.actorId));
}
