import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";

export default async function AccountPage() {
  const session = await requireAuth();

  return (
    <main className="flex flex-1 items-center justify-center bg-bg-primary p-8">
      <Card className="w-full max-w-sm">
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
    </main>
  );
}
