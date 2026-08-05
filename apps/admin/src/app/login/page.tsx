import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { copy } from "@/config/admin";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Next 16: searchParams is a Promise.
  const params = await searchParams;
  const errorCode = typeof params.error === "string" ? params.error : undefined;

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{copy.login.title}</CardTitle>
          <CardDescription>{copy.login.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm errorCode={errorCode} />
        </CardContent>
      </Card>
    </main>
  );
}
