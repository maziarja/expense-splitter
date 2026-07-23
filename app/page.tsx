import { FeatureHighlights } from "@/components/landing/feature-highlights";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";

export default function Home() {
  return (
    <main className="flex-1 bg-bg-primary">
      <Hero />
      <HowItWorks />
      <FeatureHighlights />
    </main>
  );
}
