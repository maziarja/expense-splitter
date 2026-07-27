import Link from "next/link";

import { SignUpForm } from "@/components/auth/sign-up-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignUpPage() {
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
