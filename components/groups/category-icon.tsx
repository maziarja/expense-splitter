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
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category] ?? TagIcon;
  return (
    <Icon
      className={cn("size-3.5 text-text-tertiary", className)}
      aria-hidden="true"
    />
  );
}
