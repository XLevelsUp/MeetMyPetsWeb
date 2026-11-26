import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the composer's layout so the page doesn't jump when it arrives.
export default function NewTeamMessageLoading() {
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-36 w-full" />
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
            <Skeleton className="h-14 w-full" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </main>
  );
}
