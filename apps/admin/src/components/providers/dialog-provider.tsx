"use client";

import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy } from "@/config/admin";

// One app-wide modal for confirm / prompt / "leave without saving?", so no screen ever shows a browser pop-up.

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export type PromptOptions = {
  title: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
};

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  setDirty: (id: string, dirty: boolean) => void;
  confirmLeave: () => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

type Pending =
  | { type: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { type: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

const d = copy.common.dialog;

// Internal links only: same origin, no new tab, no modifier keys, not a download, not just a hash on this page.
export function shouldGuardLink(anchor: HTMLAnchorElement, event: MouseEvent, origin: string, current: string): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const url = new URL(anchor.href, origin);
  if (url.origin !== origin) return false;
  const here = new URL(current, origin);
  return !(url.pathname === here.pathname && url.search === here.search);
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const dirty = useRef(new Set<string>());
  const [anyDirty, setAnyDirty] = useState(false);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ type: "confirm", options, resolve })),
    [],
  );

  const prompt = useCallback((options: PromptOptions) => {
    setPromptValue(options.defaultValue ?? "");
    return new Promise<string | null>((resolve) => setPending({ type: "prompt", options, resolve }));
  }, []);

  const setDirty = useCallback((id: string, isDirty: boolean) => {
    if (isDirty) dirty.current.add(id);
    else dirty.current.delete(id);
    setAnyDirty(dirty.current.size > 0);
  }, []);

  const confirmLeave = useCallback(async () => {
    if (dirty.current.size === 0) return true;
    const ok = await confirm({
      title: d.unsavedTitle,
      description: d.unsavedDescription,
      confirmLabel: d.unsavedLeave,
      cancelLabel: d.unsavedStay,
      destructive: true,
    });
    if (ok) {
      dirty.current.clear();
      setAnyDirty(false);
    }
    return ok;
  }, [confirm]);

  // In-app links: intercept in the capture phase, before Next's <Link> handler sees the click.
  useEffect(() => {
    if (!anyDirty) return;
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || !shouldGuardLink(anchor, event, window.location.origin, window.location.href)) return;
      event.preventDefault();
      event.stopPropagation();
      const href = anchor.getAttribute("href") ?? "/";
      void confirmLeave().then((ok) => ok && router.push(href));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [anyDirty, confirmLeave, router]);

  // Reload / close tab: browsers only allow their own built-in box here, so this is the one place it remains.
  useEffect(() => {
    if (!anyDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);

  function close(result: boolean | string | null) {
    if (!pending) return;
    if (pending.type === "confirm") pending.resolve(result === true);
    else pending.resolve(typeof result === "string" ? result : null);
    setPending(null);
  }

  const value = useMemo(() => ({ confirm, prompt, setDirty, confirmLeave }), [confirm, prompt, setDirty, confirmLeave]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {pending ? (
        <AlertDialog open onOpenChange={(open) => (open ? null : close(pending.type === "confirm" ? false : null))}>
          <AlertDialogContent className="data-[size=default]:sm:max-w-md">
            {pending.type === "confirm" ? (
              <>
                <AlertDialogHeader>
                  {pending.options.destructive ? (
                    <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 sm:mx-0 dark:bg-amber-950/60 dark:text-amber-300" aria-hidden="true">
                      <TriangleAlert className="size-5" />
                    </span>
                  ) : null}
                  <AlertDialogTitle>{pending.options.title}</AlertDialogTitle>
                  {pending.options.description ? (
                    <AlertDialogDescription>{pending.options.description}</AlertDialogDescription>
                  ) : null}
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => close(false)}>{pending.options.cancelLabel ?? d.cancel}</AlertDialogCancel>
                  <AlertDialogAction variant={pending.options.destructive ? "destructive" : "default"} onClick={() => close(true)}>
                    {pending.options.confirmLabel ?? d.confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            ) : (
              <form
                className="contents"
                onSubmit={(event) => {
                  event.preventDefault();
                  close(promptValue);
                }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>{pending.options.title}</AlertDialogTitle>
                </AlertDialogHeader>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="app-prompt-input">{pending.options.label}</Label>
                  <Input
                    id="app-prompt-input"
                    autoFocus
                    value={promptValue}
                    placeholder={pending.options.placeholder}
                    onChange={(event) => setPromptValue(event.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button" onClick={() => close(null)}>
                    {d.cancel}
                  </AlertDialogCancel>
                  <AlertDialogAction type="submit">{pending.options.confirmLabel ?? d.ok}</AlertDialogAction>
                </AlertDialogFooter>
              </form>
            )}
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </DialogContext.Provider>
  );
}

function useDialogContext() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("Dialog hooks need <DialogProvider> (mounted in app/layout.tsx).");
  return ctx;
}

export const useConfirm = () => useDialogContext().confirm;
export const usePrompt = () => useDialogContext().prompt;
export const useConfirmLeave = () => useDialogContext().confirmLeave;

// Mark this screen as holding unsaved work; links and reloads then ask first.
export function useUnsavedChanges(isDirty: boolean) {
  const { setDirty } = useDialogContext();
  const id = useId();
  useEffect(() => {
    setDirty(id, isDirty);
    return () => setDirty(id, false);
  }, [id, isDirty, setDirty]);
}
