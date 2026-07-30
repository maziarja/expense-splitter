import { redirect } from "next/navigation";

import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { requireAuth } from "@/lib/auth";
import { prismaDataAccess } from "@/lib/data/prisma-data-access";

export default async function DashboardIndexPage() {
  await requireAuth();
  const groups = await prismaDataAccess.listGroups();

  if (groups.length > 0) {
    redirect(`/dashboard/${groups[0].id}`);
  }

  return <DashboardEmptyState />;
}
