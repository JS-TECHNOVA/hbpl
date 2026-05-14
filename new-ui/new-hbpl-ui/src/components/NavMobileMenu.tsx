"use client";

import { useState } from "react";
import Link from "next/link";

const links = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Management", href: "/management" },
  { label: "Community", href: "/community" },
  { label: "Exams", href: "/exams" },
  { label: "Cricket", href: "/cricket" },
];

export function NavMobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="md:hidden flex flex-col gap-1.5 p-2 cursor-pointer"
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <span
          className={`block w-6 h-0.5 bg-primary transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
        />
        <span
          className={`block w-6 h-0.5 bg-primary transition-opacity ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`block w-6 h-0.5 bg-primary transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
        />
      </button>

      {open && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border/20 shadow-lg py-4 px-6 flex flex-col gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-text-body hover:text-primary py-2 border-b border-border/10 last:border-0"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/exams"
            className="mt-2 bg-primary text-white text-sm font-semibold text-center px-6 py-3 rounded-lg"
            onClick={() => setOpen(false)}
          >
            Exam Portal
          </Link>
        </div>
      )}
    </>
  );
}
