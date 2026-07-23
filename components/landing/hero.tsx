import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BalanceCardMockup } from "@/components/landing/balance-card-mockup";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-page grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div>
        <p className="text-sm font-medium text-accent">
          For roommates, trips, and everyone in between
        </p>
        <h1 className="mt-3 text-2xl font-extrabold text-text-primary sm:text-3xl">
          Split expenses. Settle up. Stay friends.
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          No more Venmo requests, group texts, or mental math. Track shared
          costs, split them fairly, and know exactly who owes who — down to the
          cent.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-12 gap-2 px-7 text-base font-semibold"
          >
            <Link href="/groups">
              Try as Guest
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 px-7 text-base font-semibold"
          >
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </div>
      </div>
      <div className="flex justify-center lg:justify-end">
        <BalanceCardMockup />
      </div>
    </section>
  );
}
