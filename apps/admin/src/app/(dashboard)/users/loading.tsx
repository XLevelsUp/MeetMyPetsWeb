import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    </main>
  );
}
