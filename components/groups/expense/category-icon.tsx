import {
  BedDoubleIcon,
  CarIcon,
  ClapperboardIcon,
  HomeIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  TagIcon,
  UtensilsIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

import { PREDEFINED_CATEGORY_COLORS } from "@/lib/splits/constants";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Food & Drink": UtensilsIcon,
  Transport: CarIcon,
  Accommodation: BedDoubleIcon,
  Housing: HomeIcon,
  Entertainment: ClapperboardIcon,
  Shopping: ShoppingBagIcon,
  Utilities: ZapIcon,
  Groceries: ShoppingCartIcon,
  Other: TagIcon,
};

export function CategoryIcon({
  category,
  color,
  className,
}: {
  category: string;
  color?: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category] ?? TagIcon;
  const resolvedColor =
    color ??
    PREDEFINED_CATEGORY_COLORS[
      category as keyof typeof PREDEFINED_CATEGORY_COLORS
    ];
  return (
    <Icon
      className={cn(
        "size-3.5",
        !resolvedColor && "text-text-tertiary",
        className,
      )}
      style={resolvedColor ? { color: resolvedColor } : undefined}
      aria-hidden="true"
    />
  );
}
