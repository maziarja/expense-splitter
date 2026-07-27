"use client";

import { SparklesIcon, XIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  dismissSignupPrompt,
  useGuestReady,
  useSignupPromptDismissed,
} from "@/lib/data/guest-hooks";

export function GuestSignupPrompt() {
  const ready = useGuestReady();
  const dismissed = useSignupPromptDismissed();

  if (!ready || dismissed) return null;

  return (
    <div className="relative flex flex-col gap-2 rounded-lg bg-accent-subtle p-3 group-data-[collapsible=icon]:hidden">
      <Button
        variant="ghost"
        size="icon-xs"
        className="absolute top-1.5 right-1.5 text-text-tertiary hover:text-text-primary"
        onClick={dismissSignupPrompt}
      >
        <XIcon aria-hidden="true" />
        <span className="sr-only">Dismiss</span>
      </Button>
      <SparklesIcon className="size-4 text-accent" aria-hidden="true" />
      <p className="pr-4 text-xs text-text-secondary">
        Sign up to keep this data beyond your session.
      </p>
      <Button asChild size="sm" variant="outline" className="w-full">
        <Link href="/sign-up">Sign Up</Link>
      </Button>
    </div>
  );
}
