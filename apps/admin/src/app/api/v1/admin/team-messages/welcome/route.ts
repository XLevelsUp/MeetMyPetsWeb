import { actOnWelcome, listWelcomes } from "@/lib/team-messages";
import { welcomeActionBodySchema } from "@/lib/team-messages-contract";
import { badRequest, readJson, teamResponse, teamSession } from "@/lib/team-messages-http";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await teamSession();
  if (!session.ok) return session.response;
  return teamResponse(await listWelcomes(session.actorId));
}

// Save a new welcome text or stop one; POST like every other mutation in this panel.
export async function POST(request: Request) {
  const session = await teamSession();
  if (!session.ok) return session.response;
  const json = await readJson(request);
  if (!json.ok) return badRequest("Expected a JSON body.");
  const parsed = welcomeActionBodySchema.safeParse(json.body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid welcome message.");
  return teamResponse(await actOnWelcome(parsed.data, session.actorId));
}
