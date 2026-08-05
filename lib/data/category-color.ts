import { PREDEFINED_CATEGORY_COLORS } from "../splits/constants";
import { AVATAR_COLOR_PALETTE } from "./avatar-color";

// Same palette members use, same "random but collision-avoiding" approach as
// pickAvatarColor — a starting suggestion the create-category form's swatch
// picker lets the user override. Avoids both the fixed predefined-category
// colors and any color an existing custom category in this group already
// has, so a freshly created category doesn't visually double up with
// something already on screen when the palette allows it.
export function pickCategoryColor(existingCustomColors: string[]): string {
  const used = new Set([
    ...Object.values(PREDEFINED_CATEGORY_COLORS),
    ...existingCustomColors,
  ]);
  const available = AVATAR_COLOR_PALETTE.filter((c) => !used.has(c));
  const pool = available.length > 0 ? available : AVATAR_COLOR_PALETTE;
  return pool[Math.floor(Math.random() * pool.length)];
}
