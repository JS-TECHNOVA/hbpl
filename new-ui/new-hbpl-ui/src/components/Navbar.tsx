import Link from "next/link";
import { NavMobileMenu } from "./NavMobileMenu";

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Management", href: "/management" },
  { label: "Community", href: "/community" },
  { label: "Cricket", href: "/cricket" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-border/30 shadow-[0px_1px_0px_rgba(0,0,0,0.06)]">
      <nav className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          className="font-heading text-[20px] font-extrabold text-primary tracking-tight shrink-0"
        >
          HBPL Community
        </Link>

        {/* Desktop nav links — centered */}
        <ul className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-[13px] font-semibold text-text-body hover:text-primary transition-colors tracking-tight"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop right: search + CTA */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <button
            aria-label="Search"
            className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-primary transition-colors cursor-pointer"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          <Link
            href="/exams"
            className="bg-primary text-white text-[13px] font-semibold px-5 py-2.25 rounded-lg shadow-[0px_4px_12px_rgba(0,63,135,0.25)] hover:bg-primary-dark transition-colors"
          >
            Exam Portal
          </Link>
        </div>

        {/* Mobile menu */}
        <NavMobileMenu />
      </nav>
    </header>
  );
}
