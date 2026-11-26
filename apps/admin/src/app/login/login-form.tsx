"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/shared/spinner";
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
  const [showPassword, setShowPassword] = useState(false);

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
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-10"
          />
          {/* type="button" so it never submits the form; aria-pressed announces the on/off state. */}
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? copy.login.hidePassword : copy.login.showPassword}
            aria-pressed={showPassword}
            aria-controls="password"
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="mt-1">
        {isPending ? <Spinner size="sm" className="mr-1.5" /> : null}
        {isPending ? copy.login.signingIn : copy.login.submit}
      </Button>
    </form>
  );
}
