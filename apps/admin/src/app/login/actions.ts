"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { copy } from "@/config/admin";
import { isAdminRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

/**
 * Login/logout Server Actions. Cookie writes are legal here (unlike Server
 * Component renders), which is why sign-in lives in an action rather than a
 * route handler.
 *
 * Result shape follows the house adapter pattern — the form renders
 * `message` inline; the action never throws (except Next's own redirect()).
 */

export type LoginState =
  | { ok: true }
  | { ok: false; reason: "invalid-credentials" | "not-admin" | "unknown"; message: string }
  | null;

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid-credentials",
      message: copy.login.errors["invalid-credentials"],
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    // Auth errors are deliberately collapsed to one message — do not reveal
    // whether the email exists on an admin login form.
    return {
      ok: false,
      reason: "invalid-credentials",
      message: copy.login.errors["invalid-credentials"],
    };
  }

  // Valid credentials but no admin role: an ordinary app user. End the
  // session immediately so the admin origin never holds their cookie.
  if (!isAdminRole(data.user.app_metadata?.role)) {
    await supabase.auth.signOut();
    return {
      ok: false,
      reason: "not-admin",
      message: copy.login.errors["not-admin"],
    };
  }

  // redirect() throws NEXT_REDIRECT — must not be inside a try/catch.
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
