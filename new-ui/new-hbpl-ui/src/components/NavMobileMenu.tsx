"use client";

import { useState } from "react";
import Link from "next/link";

const links = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Management", href: "/management" },
  { label: "Community Volunteer", href: "/community" },
  { label: "Exams", href: "/exams" },
  { label: "Cricket Portal", href: "/cricket" },
  { label: "Gallery", href: "/gallery" },
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
        <span className={`block w-6 h-0.5 bg-black transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
        <span className={`block w-6 h-0.5 bg-black transition-opacity ${open ? "opacity-0" : ""}`} />
        <span className={`block w-6 h-0.5 bg-black transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
      </button>

      {open && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-ds-border py-5 px-6 flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[14px] font-medium text-black hover:text-ds-text py-2.5 border-b border-ds-border last:border-0 transition-colors"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/exams"
            className="mt-3 bg-linear-to-r from-ds-purple to-ds-purple-500 text-white text-[14px] font-semibold text-center px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(109,40,217,0.3)]"
            onClick={() => setOpen(false)}
          >
            Exam Portal
          </Link>
        </div>
      )}
    </>
  );
}
