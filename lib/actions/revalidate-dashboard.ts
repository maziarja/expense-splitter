import { revalidatePath } from "next/cache";

// Called after a successful mutation so the dashboard's Server Components
// refetch instead of the client silently sitting on stale data. Revalidates
// the specific group page (if given) plus the shared layout, since sidebar
// balance badges/group names can change from almost any mutation.
export function revalidateDashboard(groupId?: string) {
  if (groupId) revalidatePath(`/dashboard/${groupId}`);
  revalidatePath("/dashboard", "layout");
}
