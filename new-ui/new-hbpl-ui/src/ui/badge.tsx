import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

type Variant =
  | "primary"
  | "accent"
  | "ghost"
  | "white"
  | "ds-live"
  | "ds-upcoming"
  | "ds-completed"
  | "ds-open"
  | "ds-purple"
  | "ds-cyan"
  | "ds-gold"
  | "ds-green";

const variants: Record<Variant, string> = {
  // Light theme
  primary: "bg-primary-light text-primary",
  accent: "bg-accent-peach text-accent-dark",
  ghost: "bg-white/20 text-white",
  white: "bg-white/10 text-white",

  // Dark design-system theme
  "ds-live":
    "bg-ds-red/15 text-ds-red border border-ds-red/30 animate-pulse-slow",
  "ds-upcoming":
    "bg-ds-cyan/10 text-ds-cyan border border-ds-cyan/25",
  "ds-completed":
    "bg-ds-green/10 text-ds-green border border-ds-green/25",
  "ds-open":
    "bg-ds-gold/10 text-ds-gold border border-ds-gold/25",
  "ds-purple":
    "bg-ds-purple/15 text-ds-lavender border border-ds-purple/30",
  "ds-cyan":
    "bg-ds-cyan/10 text-ds-cyan border border-ds-cyan/25",
  "ds-gold":
    "bg-ds-gold/10 text-ds-gold border border-ds-gold/25",
  "ds-green":
    "bg-ds-green/10 text-ds-green border border-ds-green/25",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({
  variant = "primary",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
