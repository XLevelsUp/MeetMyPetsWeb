"use client";

import { FileCog, ListTree, PawPrint } from "lucide-react";

import { BreedsTable } from "@/components/settings/breeds-table";
import { SpeciesTable } from "@/components/settings/species-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copy } from "@/config/admin";

/**
 * The settings hub. Mirrors `components/users/users-tabs.tsx`.
 *
 * The third tab deliberately renders an explanation rather than being omitted:
 * "attribute schemas" is the headline of the brief this feature came from, and
 * a missing tab would read as an oversight instead of a decision.
 */
export function SettingsTabs() {
  return (
    <Tabs defaultValue="species">
      <TabsList>
        {/* Violet = a category (same as "Animal types" elsewhere); slate = not built yet. */}
        <TabsTrigger value="species" className="px-3">
          <PawPrint className="text-violet-600 dark:text-violet-400" aria-hidden="true" />
          {copy.settings.tabs.species}
        </TabsTrigger>
        <TabsTrigger value="breeds" className="px-3">
          <ListTree className="text-violet-600 dark:text-violet-400" aria-hidden="true" />
          {copy.settings.tabs.breeds}
        </TabsTrigger>
        <TabsTrigger value="schemas" className="px-3">
          <FileCog className="text-slate-500" aria-hidden="true" />
          {copy.settings.tabs.schemas}
          <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            {copy.settings.tabs.later}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="species">
        <SpeciesTable />
      </TabsContent>

      <TabsContent value="breeds">
        <BreedsTable />
      </TabsContent>

      <TabsContent value="schemas">
        <Card>
          <CardHeader>
            <CardTitle>{copy.settings.schemas.heading}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">{copy.settings.schemas.body}</p>
            <p className="text-xs text-muted-foreground">{copy.settings.schemas.docLink}</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
