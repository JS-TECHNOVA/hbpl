"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  dark?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, dark, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "text-sm font-medium",
              dark ? "text-text-subtle" : "text-text-body"
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors",
            dark
              ? "bg-primary-darker text-white placeholder:text-text-muted border border-white/10 focus:border-primary-light"
              : "bg-white border border-border text-text-primary placeholder:text-text-muted focus:border-primary",
            error && "border-red-400",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
