/**
 * Authenticated shell for everything except /login.
 *
 * Phase 1 scaffold: renders children directly. The DAL session gate
 * (verifySession → redirect) and the sidebar/header shell land in the auth
 * and layout-shell commits.
 */
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return <div className="flex min-h-svh w-full">{children}</div>;
}
