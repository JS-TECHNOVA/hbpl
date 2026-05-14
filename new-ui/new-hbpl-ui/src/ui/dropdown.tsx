"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/src/lib/cn";

export interface DropdownItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  className?: string;
}

export function Dropdown({ trigger, items, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 cursor-pointer"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger}
        <svg
          className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1)] border border-border/20 py-1 z-50">
          {items.map((item) =>
            item.href ? (
              <a
                key={item.label}
                href={item.href}
                className="block px-4 py-2.5 text-sm text-text-body hover:bg-primary-light/30 hover:text-primary transition-colors"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ) : (
              <button
                key={item.label}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-text-body hover:bg-primary-light/30 hover:text-primary transition-colors"
              >
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
