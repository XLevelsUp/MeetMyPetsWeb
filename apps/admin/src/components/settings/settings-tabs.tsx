"use client";

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
        <TabsTrigger value="species">{copy.settings.tabs.species}</TabsTrigger>
        <TabsTrigger value="breeds">{copy.settings.tabs.breeds}</TabsTrigger>
        <TabsTrigger value="schemas">{copy.settings.tabs.schemas}</TabsTrigger>
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
