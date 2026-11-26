import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the two welcome cards and the history list below them.
export default function WelcomeMessagesLoading() {
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    </main>
  );
}
