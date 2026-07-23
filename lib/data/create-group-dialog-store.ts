"use client";

import { create } from "zustand";

// The mobile sidebar is itself a Sheet (Radix Dialog under the hood), and
// the trigger for this dialog lives inside it. If the dialog's open state
// lived alongside the trigger, closing the Sheet on open (to avoid stacking
// two Radix dialogs at once) would unmount the trigger's own subtree before
// the dialog could render. Lifting the open state into a store lets the
// dialog itself be rendered once, outside the sidebar's Sheet, while the
// trigger stays in place.
type CreateGroupDialogState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useCreateGroupDialogStore = create<CreateGroupDialogState>(
  (set) => ({
    open: false,
    setOpen: (open) => set({ open }),
  }),
);
