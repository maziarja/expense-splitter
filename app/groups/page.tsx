"use client";

import { redirect } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { useGuestGroups } from "@/lib/data/guest-hooks";

export default function GroupsIndexPage() {
  const groups = useGuestGroups();

  if (groups.length > 0) {
    redirect(`/groups/${groups[0].id}`);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-bg-primary p-8">
      <Spinner className="size-6 text-text-tertiary" />
    </main>
  );
}
