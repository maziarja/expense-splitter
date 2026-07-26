import * as React from "react";

import { cn } from "@/lib/utils";

// Safari renders these with native OS chrome (the day/month/year field
// segments plus a calendar/clock icon) that carries its own intrinsic
// min-width and padding our height/padding utilities can't reach — that
// native box, not font-size, is what was pushing the field wider than its
// container. `appearance-none` (Tailwind's documented reset for native
// form-control styling) hands sizing back to our own CSS instead of Safari's.
const NATIVE_PICKER_TYPES = new Set([
  "date",
  "time",
  "month",
  "week",
  "datetime-local",
]);

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const isNativePicker = type ? NATIVE_PICKER_TYPES.has(type) : false;

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // text-base (16px) below md, not text-sm: iOS Safari force-zooms the
        // page on focus for any keyboard text input rendered under 16px, and
        // md:text-xs is unaffected since that breakpoint only applies to
        // non-touch/desktop viewports where Safari doesn't have this behavior.
        "h-8 w-full max-w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        isNativePicker && [
          "appearance-none",
          // The icon's own default padding was contributing to the overflow
          // independent of the input box's width.
          "[&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:p-0",
        ],
        className,
      )}
      {...props}
    />
  );
}

export { Input };
