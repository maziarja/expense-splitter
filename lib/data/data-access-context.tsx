"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DataAccess } from "./data-access";

const DataAccessContext = createContext<DataAccess | null>(null);

export function DataAccessProvider({
  dataAccess,
  children,
}: {
  dataAccess: DataAccess;
  children: ReactNode;
}) {
  return (
    <DataAccessContext.Provider value={dataAccess}>
      {children}
    </DataAccessContext.Provider>
  );
}

export function useDataAccessContext(): DataAccess {
  const context = useContext(DataAccessContext);
  if (!context) {
    throw new Error(
      "useDataAccessContext must be used within a DataAccessProvider.",
    );
  }
  return context;
}
