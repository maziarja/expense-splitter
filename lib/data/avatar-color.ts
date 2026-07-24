// Same hue family as data/sample-groups.json's hand-picked member colors.
export const AVATAR_COLOR_PALETTE = [
  "#6366F1",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
  "#8B5CF6",
  "#F97316",
  "#06B6D4",
  "#10B981",
  "#F43F5E",
  "#A855F7",
  "#EF4444",
  "#3B82F6",
] as const;

// Random rather than deterministic, but still avoids an obvious collision
// with an already-visible member's color when the palette allows it. This
// is only a starting suggestion — the add-member form lets the user
// override it via a swatch picker.
export function pickAvatarColor(
  activeMembers: { avatarColor: string }[],
): string {
  const used = new Set(activeMembers.map((m) => m.avatarColor));
  const available = AVATAR_COLOR_PALETTE.filter((c) => !used.has(c));
  const pool = available.length > 0 ? available : AVATAR_COLOR_PALETTE;
  return pool[Math.floor(Math.random() * pool.length)];
}
