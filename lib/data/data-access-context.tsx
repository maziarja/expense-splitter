"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DataAccess } from "./data-access";

type DataAccessContextValue = {
  dataAccess: DataAccess;
  refresh: () => void;
};

const DataAccessContext = createContext<DataAccessContextValue | null>(null);

export function DataAccessProvider({
  dataAccess,
  refresh = () => {},
  children,
}: {
  dataAccess: DataAccess;
  refresh?: () => void;
  children: ReactNode;
}) {
  return (
    <DataAccessContext.Provider value={{ dataAccess, refresh }}>
      {children}
    </DataAccessContext.Provider>
  );
}

function useDataAccessContextValue(): DataAccessContextValue {
  const context = useContext(DataAccessContext);
  if (!context) {
    throw new Error(
      "useDataAccessContext must be used within a DataAccessProvider.",
    );
  }
  return context;
}

export function useDataAccessContext(): DataAccess {
  return useDataAccessContextValue().dataAccess;
}

// No-op in guest mode (the Zustand store is already reactive). In
// authenticated mode this is router.refresh() — imperative Server Action
// calls don't trigger Next's automatic post-action refresh, so callers must
// request one explicitly after a successful mutation.
export function useDataAccessRefresh(): () => void {
  return useDataAccessContextValue().refresh;
}
