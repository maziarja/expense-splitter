"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authenticatedDataAccess } from "@/lib/data/authenticated-data-access";
import { DataAccessProvider } from "@/lib/data/data-access-context";

// Server Components can't import authenticatedDataAccess directly and pass
// it as a prop into DataAccessProvider — a "use client" module's non-
// component exports don't cross the server->client boundary as real values.
// This wrapper keeps both imports inside the client bundle.
export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <DataAccessProvider
      dataAccess={authenticatedDataAccess}
      refresh={() => router.refresh()}
    >
      {children}
    </DataAccessProvider>
  );
}
