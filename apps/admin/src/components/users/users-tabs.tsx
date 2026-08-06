"use client";

import { PetsTable } from "@/components/users/pets-table";
import { UsersTable } from "@/components/users/users-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copy } from "@/config/admin";
import type { AdminRole } from "@/lib/roles";

/** `role` comes from the DAL-verified session in the page, never the client. */
export function UsersTabs({ role }: { role: AdminRole }) {
  return (
    <Tabs defaultValue="users">
      <TabsList>
        <TabsTrigger value="users">{copy.users.tabs.users}</TabsTrigger>
        <TabsTrigger value="pets">{copy.users.tabs.pets}</TabsTrigger>
      </TabsList>
      <TabsContent value="users">
        <UsersTable />
      </TabsContent>
      <TabsContent value="pets">
        <PetsTable role={role} />
      </TabsContent>
    </Tabs>
  );
}
