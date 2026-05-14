import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-[0px_10px_15px_-3px_rgba(0,63,135,0.2),0px_4px_6px_-4px_rgba(0,63,135,0.2)] hover:bg-primary-dark",
  secondary:
    "bg-[#e8e8e8] border border-border/20 text-primary hover:bg-[#ddd]",
  ghost: "text-primary hover:bg-primary-light/30",
  accent:
    "bg-accent-cta text-white shadow-[0px_10px_15px_-3px_rgba(144,77,0,0.2)] hover:bg-accent-dark",
  outline: "border border-primary text-primary hover:bg-primary-light/20",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm rounded-lg",
  md: "px-6 py-3 text-base rounded-xl",
  lg: "px-8 py-4 text-lg rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-colors cursor-pointer",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
