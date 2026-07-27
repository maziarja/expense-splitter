"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
  }

  return (
    <Button
      variant="outline"
      onClick={handleSignOut}
      disabled={signingOut}
      className="w-full"
    >
      {signingOut ? "Signing out…" : "Sign out"}
    </Button>
  );
}
