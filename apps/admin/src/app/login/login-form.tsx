"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy } from "@/config/admin";
import { signIn, type LoginState } from "./actions";

/**
 * Email/password form. `errorCode` arrives from the URL (?error=…) — the
 * proxy can only redirect, not toast, so the toast fires here on mount.
 */
export function LoginForm({ errorCode }: { errorCode?: string }) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(signIn, null);

  useEffect(() => {
    if (!errorCode) return;
    const known = copy.login.errors as Record<string, string>;
    toast.error(known[errorCode] ?? known.unknown);
    // Strip the code so a reload doesn't re-toast.
    window.history.replaceState(null, "", "/login");
  }, [errorCode]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{copy.login.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="you@meetmypets.app"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{copy.login.passwordLabel}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="mt-1">
        {isPending ? "Signing in…" : copy.login.submit}
      </Button>
    </form>
  );
}
