"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { signOut } from "@/app/login/actions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

// Calls the Server Action directly. A <form> + render={<button type="submit">} trips Base UI's
// nativeButton warning, and setting nativeButton forces type="button", which silently stops sign-out.
export function SignOutItem({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenuItem
      variant="destructive"
      disabled={pending}
      closeOnClick={false}
      onClick={() => startTransition(() => signOut())}
    >
      <LogOut />
      {label}
    </DropdownMenuItem>
  );
}
