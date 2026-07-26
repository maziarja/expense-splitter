import * as React from "react";

import { cn } from "@/lib/utils";

// These open the OS's native wheel/calendar picker instead of the keyboard,
// so they never trigger iOS Safari's zoom-on-focus (that only fires for
// fields expecting keyboard text entry) — keeping them at the same compact
// size as everything else avoids a mismatched giant date/time field.
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
        "h-8 w-full max-w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        // text-base (16px) below md, not text-sm: iOS Safari force-zooms the
        // page on focus for any keyboard text input rendered under 16px, and
        // md:text-xs is unaffected since that breakpoint only applies to
        // non-touch/desktop viewports where Safari doesn't have this behavior.
        isNativePicker ? "text-xs" : "text-base md:text-xs",
        // Safari's calendar/clock icon carries its own generous default
        // padding that our px-2.5 doesn't reach, which is what let a native
        // date input's rendered content push past its own box on narrow
        // (mobile Sheet) widths — trimming it keeps the icon from adding
        // width beyond what we've actually sized the field for.
        isNativePicker &&
          "[&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:p-0",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
