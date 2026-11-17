"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * One toast lifecycle for any mutation: pending, then success or error.
 *
 * Takes an existing mutation rather than creating one, so a surface keeps its
 * own cache invalidation and optimistic updates and only borrows the toast.
 * `toast.promise` swaps the spinner for the result in place, so a slow save
 * never leaves two toasts stacked.
 *
 * Messages come from `copy` at the call site, never hardcoded here.
 */
export function useActionToast<TData, TError extends Error, TVariables>(
  mutation: UseMutationResult<TData, TError, TVariables>,
  messages: {
    loading: string;
    success: (data: TData) => string;
    error?: (error: TError) => string;
    /** A 2xx that only half-landed; returns the message, or null when all is well. */
    warning?: (data: TData) => string | null;
  },
) {
  const run = (variables: TVariables, onSuccess?: (data: TData) => void) => {
    const promise = mutation.mutateAsync(variables);
    // Set during the toast's own success callback, read by the .then below.
    let halfLanded: string | null = null;

    toast.promise(promise, {
      loading: messages.loading,
      success: (data) => {
        halfLanded = messages.warning?.(data as TData) ?? null;
        return messages.success(data as TData);
      },
      error: (error) =>
        messages.error?.(error as TError) ?? (error as TError).message,
    });

    // Swallowed: toast.promise already surfaced it, and an unhandled rejection
    // here would reach the console as a crash the user has already been told about.
    return promise
      .then((data) => {
        // Raised beside the success toast, and left up until dismissed: a save
        // that only half-landed needs someone to act, not a message that fades.
        if (halfLanded) toast.warning(halfLanded, { duration: Infinity, closeButton: true });
        return onSuccess?.(data as TData);
      })
      .catch(() => undefined);
  };

  return { run, isPending: mutation.isPending };
}
