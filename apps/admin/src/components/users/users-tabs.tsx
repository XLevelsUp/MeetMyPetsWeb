"use client";

import { useState } from "react";

import { PetsTable } from "@/components/users/pets-table";
import { UsersTable } from "@/components/users/users-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copy } from "@/config/admin";
import type { AdminRole } from "@/lib/roles";
import type { AccountsQuery, PetsQuery } from "@/lib/users-contract";

export type UsersTab = "users" | "pets";

/**
 * `role` comes from the DAL-verified session in the page, never the client.
 *
 * The tab is part of the URL too, so a link can point at the Pets tab. Each
 * table keeps its own state across a tab switch and republishes it to the URL
 * when it becomes visible — see `useUrlSyncedQuery`, which is also why only one
 * of them writes at a time.
 */
export function UsersTabs({
  role,
  initialTab,
  initialAccountsQuery,
  initialPetsQuery,
}: {
  role: AdminRole;
  initialTab: UsersTab;
  initialAccountsQuery: AccountsQuery;
  initialPetsQuery: PetsQuery;
}) {
  const [tab, setTab] = useState<UsersTab>(initialTab);

  return (
    <Tabs value={tab} onValueChange={(value) => setTab((value as UsersTab) ?? "users")}>
      <TabsList>
        <TabsTrigger value="users">{copy.users.tabs.users}</TabsTrigger>
        <TabsTrigger value="pets">{copy.users.tabs.pets}</TabsTrigger>
      </TabsList>
      <TabsContent value="users">
        <UsersTable initialQuery={initialAccountsQuery} active={tab === "users"} />
      </TabsContent>
      <TabsContent value="pets">
        <PetsTable role={role} initialQuery={initialPetsQuery} active={tab === "pets"} />
      </TabsContent>
    </Tabs>
  );
}
