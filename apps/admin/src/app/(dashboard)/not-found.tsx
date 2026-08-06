import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-start gap-3">
        <h1 className="font-heading text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          That page doesn&apos;t exist, or the record it pointed at has been removed.
        </p>
        <Button variant="outline" render={<Link href="/" />}>
          Back to dashboard
        </Button>
      </div>
    </main>
  );
}
