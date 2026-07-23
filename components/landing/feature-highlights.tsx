import {
  ArrowLeftRight,
  Globe,
  HandCoins,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: SlidersHorizontal,
    title: "Split it your way",
    description:
      "Equal, exact amounts, percentages, or shares — fair splits for real situations, not just even ones.",
  },
  {
    icon: Globe,
    title: "Built for multi-currency trips",
    description:
      "Log an expense in any currency; balances convert automatically with live exchange rates.",
  },
  {
    icon: ArrowLeftRight,
    title: "Balances, always current",
    description:
      "Every expense updates who-owes-who instantly, with the math handled for you.",
  },
  {
    icon: HandCoins,
    title: "Settle up with confidence",
    description:
      "Clear pairwise settlement suggestions make paying back friends simple — and settled means settled.",
  },
];

function FeatureCard({ icon: Icon, title, description }: Feature) {
  return (
    <Card>
      <CardHeader>
        <div className="flex size-9 items-center justify-center rounded-md bg-accent-subtle">
          <Icon className="size-5 text-accent" aria-hidden="true" />
        </div>
        <CardTitle className="mt-2 text-lg font-semibold text-text-primary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">{description}</p>
      </CardContent>
    </Card>
  );
}

export function FeatureHighlights() {
  return (
    <section className="mx-auto max-w-page px-4 pb-20 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold text-text-primary">
        Everything you need to split fairly
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}
