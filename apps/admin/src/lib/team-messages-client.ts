import type { z } from "zod";

import { copy } from "@/config/admin";
import { apiErrorSchema, SESSION_EXPIRED_MESSAGE } from "@/lib/api-contract";

const errors = copy.teamMessages.errors;

// Words for a reply that isn't one of our {error, message} bodies, e.g. Next's own 404 page.
export function fallbackMessage(status: number): string {
  if (status === 401) return SESSION_EXPIRED_MESSAGE;
  if (status === 403) return errors.not_allowed;
  if (status === 404) return errors.notFound;
  if (status === 429) return errors.busy;
  if (status >= 500) return errors.server;
  return `${errors.unknown} (${status})`;
}

// Status 0 = never reached the server. Kept on the error so callers can decide whether a retry could help.
export class TeamRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TeamRequestError";
  }
}

// Only a dropped connection or a server fault can succeed on retry; a 4xx will answer the same way again.
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (failureCount >= 2) return false;
  if (!(error instanceof TeamRequestError)) return false;
  return error.status === 0 || error.status >= 500;
}

// Every Team-messages fetch goes through here, so no screen ever shows a raw status code.
export async function teamRequest<S extends z.ZodType>(url: string, schema: S, init?: RequestInit): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new TeamRequestError(errors.network, 0);
  }

  if (!res.ok) {
    if (res.status === 401) throw new TeamRequestError(SESSION_EXPIRED_MESSAGE, 401);
    const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
    throw new TeamRequestError(parsed.success ? parsed.data.message : fallbackMessage(res.status), res.status);
  }

  const body: unknown = await res.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new TeamRequestError(errors.badResponse, res.status);
  return parsed.data;
}

export function postJson<S extends z.ZodType>(url: string, schema: S, body: unknown) {
  return teamRequest(url, schema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
