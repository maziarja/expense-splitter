import { cn } from "@/lib/utils";

type Step = {
  number: string;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    number: "01",
    title: "Create a group",
    description:
      "Add your roommates, trip crew, or dinner squad. Guests can jump in with a single click — no account required.",
  },
  {
    number: "02",
    title: "Log an expense",
    description:
      "Enter the amount and pick who's splitting it — equal, exact, percentage, or shares, whichever fits.",
  },
  {
    number: "03",
    title: "Settle up",
    description:
      "See exactly who owes who at a glance, then record the payment. Balances update the instant it's done.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-page px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="text-xl font-bold text-text-primary">How it works</h2>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.number}
            className={cn(
              i > 0 &&
                "border-t border-border pt-6 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6",
            )}
          >
            <p className="font-mono text-xs font-semibold text-accent">
              {step.number}
            </p>
            <h3 className="mt-3 text-base font-semibold text-text-primary">
              {step.title}
            </h3>
            <p className="mt-2 text-xs text-text-secondary">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
