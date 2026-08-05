import { copy } from "@/config/admin";

/**
 * Analytics overview — placeholder. Metric cards, charts and live data
 * arrive with the analytics commit.
 */
export default function DashboardPage() {
  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-semibold">{copy.dashboard.title}</h1>
      <p className="mt-2 text-muted-foreground">{admin_placeholder}</p>
    </main>
  );
}

const admin_placeholder = "Analytics dashboard coming online in the next commits.";
