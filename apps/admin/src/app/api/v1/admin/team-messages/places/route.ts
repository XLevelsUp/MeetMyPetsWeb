import { listPlaceOptions } from "@/lib/team-messages";
import { teamResponse, teamSession } from "@/lib/team-messages-http";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await teamSession();
  if (!session.ok) return session.response;
  return teamResponse(await listPlaceOptions(session.actorId));
}
