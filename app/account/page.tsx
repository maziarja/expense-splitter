import type { Metadata } from "next";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { PreferencesForm } from "@/components/account/preferences-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getUserPreference } from "@/lib/data/user-preferences";

export const metadata: Metadata = {
  title: "Preferences - Expense Splitter",
};

export default async function AccountPage() {
  const session = await requireAuth();
  const preference = await getUserPreference(session.user.id);

  return (
    <main
      id="main-content"
      className="flex flex-1 items-center justify-center bg-bg-primary p-8"
    >
      <div className="w-full max-w-sm space-y-4">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/dashboard">
            <ArrowLeftIcon aria-hidden="true" />
            Back to dashboard
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-base" asChild>
              <h1>Preferences</h1>
            </CardTitle>
            <CardDescription>
              Defaults applied across your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PreferencesForm
              defaultCurrency={preference.defaultCurrency}
              notificationsEnabled={preference.notificationsEnabled}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
