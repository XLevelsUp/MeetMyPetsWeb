"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PetsTable } from "@/components/users/pets-table";
import { UsersTable } from "@/components/users/users-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copy } from "@/config/admin";
import type { AdminRole } from "@/lib/roles";
import type { AccountsQuery, PetsQuery } from "@/lib/users-contract";

export type UsersTab = "users" | "pets";

// Set when a pet count opened the owner view, so "Back to users" can return to the exact list left behind.
let openedFromUsersList = false;

// Switching tabs changes ?tab=, which remounts this from the URL: the tab you open always starts unfiltered.
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
  const router = useRouter();
  // Keyed on initialTab by the page, so a link to ?tab=pets remounts here and
  // picks it up — syncing in an effect would cascade an extra render instead.
  const [tab, setTab] = useState<UsersTab>(initialTab);

  // A real navigation (push), so the browser's Back button also returns to the users list.
  const handleViewUserPets = (ownerId: string) => {
    openedFromUsersList = true;
    router.push(`/users?tab=pets&ownerId=${encodeURIComponent(ownerId)}`, { scroll: false });
  };

  const handleBackToUsers = () => {
    if (openedFromUsersList) {
      openedFromUsersList = false;
      router.back();
    } else {
      setTab("users");
    }
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        openedFromUsersList = false;
        setTab((value as UsersTab) ?? "users");
      }}
    >
      <TabsList>
        <TabsTrigger value="users">{copy.users.tabs.users}</TabsTrigger>
        <TabsTrigger value="pets">{copy.users.tabs.pets}</TabsTrigger>
      </TabsList>
      <TabsContent value="users">
        <UsersTable
          initialQuery={initialAccountsQuery}
          active={tab === "users"}
          onViewUserPets={handleViewUserPets}
        />
      </TabsContent>
      <TabsContent value="pets">
        <PetsTable
          role={role}
          initialQuery={initialPetsQuery}
          active={tab === "pets"}
          onBackToUsers={handleBackToUsers}
        />
      </TabsContent>
    </Tabs>
  );
}
