import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { verifySession } from "@/lib/dal";
import { signOut } from "@/app/login/actions";

/**
 * Authenticated shell for everything except /login.
 *
 * The DAL gate here is the authoritative check (proxy.ts is optimistic
 * only). `forbidden` renders in place rather than redirecting: the visitor
 * DOES have a valid session, just no admin role — bouncing them to /login
 * would invite a confusing retry loop.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const session = await verifySession();

  if (!session.ok) {
    if (session.reason === "unauthenticated") {
      redirect("/login?error=session-expired");
    }

    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">No admin access</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{session.message}</p>
        <form action={signOut}>
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </main>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar role={session.role} />
      <SidebarInset>
        <AppHeader email={session.email} role={session.role} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
