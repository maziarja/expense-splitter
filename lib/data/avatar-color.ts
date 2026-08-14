// Same hue family as data/sample-groups.json's hand-picked member colors.
// Darkened from the original Tailwind 500-shade values to reach 4.5:1
// contrast against the white initials text rendered on top of them
// (Lighthouse accessibility audit flagged the originals as WCAG AA failures).
export const AVATAR_COLOR_PALETTE = [
  "#6063F1",
  "#A36907",
  "#E0177A",
  "#0E8477",
  "#8553F6",
  "#C35305",
  "#048196",
  "#0C865D",
  "#E90D33",
  "#9E42F6",
  "#E91414",
  "#1B6DF5",
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
