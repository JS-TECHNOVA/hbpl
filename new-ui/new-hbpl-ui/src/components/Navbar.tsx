import Link from "next/link";
import { NavMobileMenu } from "./NavMobileMenu";
import { NavProfileMenu } from "./NavProfileMenu";

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Management", href: "/management" },
  { label: "Community Volunteer", href: "/community" },
  { label: "Cricket Portal", href: "/cricket" },
  { label: "Examinations", href: "/exams" },
  { label: "Gallery", href: "/gallery" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
      <nav className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="shrink-0 flex items-center gap-2">
          <img src="/hbpl_logo-removebg-preview.png" alt="HBPL" className="h-10 w-auto object-contain" />
          <span className="font-heading font-extrabold text-[18px] text-primary tracking-tight">HBPL</span>
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-[13px] font-medium text-text-primary hover:text-primary transition-colors tracking-tight relative group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-accent group-hover:w-full transition-all duration-300" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Account actions */}
        <div className="flex shrink-0 items-center gap-2">
          <NavProfileMenu />
          <NavMobileMenu />
        </div>
      </nav>
    </header>
  );
}
