import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "accent"
  | "outline"
  | "ds-primary"
  | "ds-ghost"
  | "ds-outline"
  | "ds-glass";

type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  // Light / staff theme
  primary:
    "bg-primary text-white shadow-[0px_10px_15px_-3px_rgba(0,63,135,0.2),0px_4px_6px_-4px_rgba(0,63,135,0.2)] hover:bg-primary-dark",
  secondary:
    "bg-[#e8e8e8] border border-border/20 text-primary hover:bg-[#ddd]",
  ghost: "text-primary hover:bg-primary-light/30",
  accent:
    "bg-accent-cta text-white shadow-[0px_10px_15px_-3px_rgba(144,77,0,0.2)] hover:bg-accent-dark",
  outline: "border border-primary text-primary hover:bg-primary-light/20",

  // Dark design-system theme
  "ds-primary":
    "bg-linear-to-r from-ds-purple to-ds-purple-500 text-white font-semibold shadow-[0_0_24px_rgba(109,40,217,0.35)] hover:shadow-[0_0_32px_rgba(109,40,217,0.5)] hover:from-ds-purple-500 hover:to-ds-purple transition-all",
  "ds-ghost":
    "text-ds-text-muted hover:text-ds-text hover:bg-ds-overlay transition-colors",
  "ds-outline":
    "border border-ds-border-soft text-ds-text hover:border-ds-purple/50 hover:bg-ds-overlay transition-colors",
  "ds-glass":
    "glass text-ds-text hover:border-ds-border-soft transition-colors",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-[13px] rounded-lg",
  md: "px-6 py-3 text-[14px] rounded-xl",
  lg: "px-8 py-4 text-[15px] rounded-xl",
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
        "inline-flex items-center justify-center font-semibold transition-all cursor-pointer",
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
