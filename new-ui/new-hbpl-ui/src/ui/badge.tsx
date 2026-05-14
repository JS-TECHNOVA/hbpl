import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

type Variant = "primary" | "accent" | "ghost" | "white";

const variants: Record<Variant, string> = {
  primary: "bg-primary-light text-primary",
  accent: "bg-accent-peach text-accent-dark",
  ghost: "bg-white/20 text-white",
  white: "bg-white/10 text-white",
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
        "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
