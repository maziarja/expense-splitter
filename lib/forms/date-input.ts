import { format, isSameDay, parseISO } from "date-fns";

export function todayDateValue(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function dateInputToIso(dateValue: string): string {
  const parsed = parseISO(dateValue);
  const now = new Date();
  return (isSameDay(parsed, now) ? now : parsed).toISOString();
}
