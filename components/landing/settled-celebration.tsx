import { PartyPopperIcon } from "lucide-react";
import type { CSSProperties } from "react";

type Confetti = { tx: string; ty: string; rot: string; color: string };

const CONFETTI: Confetti[] = [
  { tx: "-48px", ty: "-52px", rot: "-60deg", color: "#6366f1" },
  { tx: "10px", ty: "-64px", rot: "40deg", color: "#f59e0b" },
  { tx: "52px", ty: "-40px", rot: "80deg", color: "#ec4899" },
  { tx: "58px", ty: "12px", rot: "-30deg", color: "var(--color-success)" },
  { tx: "30px", ty: "50px", rot: "50deg", color: "var(--color-accent)" },
  { tx: "-20px", ty: "56px", rot: "-70deg", color: "#f59e0b" },
  { tx: "-56px", ty: "20px", rot: "20deg", color: "#ec4899" },
  { tx: "-40px", ty: "-10px", rot: "-40deg", color: "var(--color-success)" },
];

export function SettledCelebration() {
  return (
    <div className="relative flex flex-col items-center gap-2 py-4 text-center motion-safe:animate-in motion-safe:duration-500 motion-safe:zoom-in-95 motion-safe:fade-in">
      {CONFETTI.map((piece, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute top-8 left-1/2 size-2 rounded-full motion-safe:animate-[confetti-burst_0.7s_ease-out_forwards] motion-reduce:hidden"
          style={
            {
              "--tx": piece.tx,
              "--ty": piece.ty,
              "--rot": piece.rot,
              backgroundColor: piece.color,
              animationDelay: `${i * 25}ms`,
            } as CSSProperties
          }
        />
      ))}
      <div className="flex size-12 items-center justify-center rounded-full bg-success/15">
        <PartyPopperIcon className="size-6 text-success" aria-hidden="true" />
      </div>
      <p className="text-base font-bold text-text-primary">All settled up!</p>
      <p className="text-xs text-text-secondary">
        Nice — every balance is at zero.
      </p>
    </div>
  );
}
