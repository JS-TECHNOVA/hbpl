import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

type Variant = "default" | "elevated" | "outlined" | "dark" | "peach";

const variants: Record<Variant, string> = {
  default: "bg-white shadow-[0px_20px_25px_-5px_#e2e8f0,0px_8px_10px_-6px_#e2e8f0]",
  elevated: "bg-white shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.15)]",
  outlined: "bg-[#e8e8e8] border-2 border-border border-dashed",
  dark: "bg-primary text-white shadow-[0px_20px_25px_-5px_rgba(0,63,135,0.2),0px_8px_10px_-6px_rgba(0,63,135,0.2)]",
  peach: "bg-accent-peach text-accent-dark",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export function Card({
  variant = "default",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn("rounded-3xl p-8 overflow-hidden", variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
