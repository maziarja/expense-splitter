import { PreferencesForm } from "@/components/account/preferences-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { getUserPreference } from "@/lib/data/user-preferences";

export default async function AccountPage() {
  const session = await requireAuth();
  const preference = await getUserPreference(session.user.id);

  return (
    <main className="flex flex-1 items-center justify-center bg-bg-primary p-8">
      <div className="w-full max-w-sm space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Welcome back, {session.user.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-text-tertiary">{session.user.email}</p>
            <SignOutButton />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferences</CardTitle>
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
