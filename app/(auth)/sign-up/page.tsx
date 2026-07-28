import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/account");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create your account</CardTitle>
        <CardDescription>
          Save your groups and expenses beyond a single session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignUpForm />
        <p className="text-center text-xs text-text-tertiary">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-accent underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
