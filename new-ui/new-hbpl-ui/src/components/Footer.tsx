import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";

const mainLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Management", href: "/management" },
];

const programmes = [
  { label: "Exam Portal", href: "/exams" },
  { label: "Cricket Cup", href: "/cricket" },
  { label: "Volunteer", href: "/community" },
  { label: "Gallery", href: "/gallery" },
];

const social = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61589448878699",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/hbpl_3?igsh=Z3Y3NmY1MnI4ejVo",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@hbpl-t7d?si=gu0mvyFJYdbj6FY_",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/916388735208",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
];


export default function Footer() {
  return (
		<footer className="relative bg-ds-base border-t border-ds-border overflow-hidden">
			{/* Ambient glow */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-50 bg-ds-purple/10 blur-[100px] pointer-events-none" />

			<div className="relative max-w-7xl mx-auto px-6 md:px-8 pt-16 pb-8">
				{/* Top grid */}
				<div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-10 border-b border-ds-border">
					{/* Brand */}
					<div className="md:col-span-1 flex flex-col gap-5">
						<Link href="/" className="inline-block">
							<img
								src="/hbpl_logo-removebg-preview.png"
								alt="HBPL Community"
								className="h-12 w-auto object-contain brightness-0 invert"
							/>
						</Link>
						<p className="text-ds-text-muted text-[13px] leading-[1.8]">
							Harpur Belahi Premier League — where cricket passion
							meets excellence. Join us for the most exciting
							tournament of the year.
						</p>
						<div className="flex gap-2.5 mt-1 flex-wrap">
							{social.map((s) => (
								<a
									key={s.label}
									href={s.href}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={s.label}
									className="w-9 h-9 rounded-xl glass flex items-center justify-center text-ds-text-muted hover:text-ds-lavender hover:border-ds-border-soft transition-colors"
								>
									{s.icon}
								</a>
							))}
						</div>
					</div>

					{/* Quick Links */}
					<div className="flex flex-col gap-4">
						<h4 className="text-[11px] font-semibold tracking-widest uppercase text-ds-text-subtle">
							Navigation
						</h4>
						<ul className="flex flex-col gap-3">
							{mainLinks.map((l) => (
								<li key={l.href}>
									<Link
										href={l.href}
										className="text-ds-text-muted text-[13px] hover:text-ds-text transition-colors"
									>
										{l.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Programmes */}
					<div className="flex flex-col gap-4">
						<h4 className="text-[11px] font-semibold tracking-widest uppercase text-ds-text-subtle">
							Programmes
						</h4>
						<ul className="flex flex-col gap-3">
							{programmes.map((l) => (
								<li key={l.href}>
									<Link
										href={l.href}
										className="text-ds-text-muted text-[13px] hover:text-ds-text transition-colors"
									>
										{l.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Contact */}
					<div className="flex flex-col gap-4">
						<h4 className="text-[11px] font-semibold tracking-widest uppercase text-ds-text-subtle">
							Contact Us
						</h4>
						<ul className="flex flex-col gap-4">
							{/* Address */}
							<li className="flex items-start gap-2.5">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={1.8}
									className="w-4 h-4 text-ds-lavender shrink-0 mt-0.5"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
									/>
								</svg>
								<span className="text-ds-text-muted text-[13px] leading-relaxed">
									Harpur Belahi, near Panchayat Bhawan,
									<br />
									Kushinagar U.P.
								</span>
							</li>
							{/* Phone */}
							<li className="flex items-start gap-2.5">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={1.8}
									className="w-4 h-4 text-ds-lavender shrink-0 mt-0.5"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
									/>
								</svg>
								<div className="flex flex-col gap-0.5">
									<a
										href="tel:+916388735208"
										className="text-ds-text-muted text-[13px] hover:text-ds-text transition-colors tabular-nums"
									>
										+91 6388 735 208
									</a>
									{/* <a href="tel:+918543042960" className="text-ds-text-muted text-[13px] hover:text-ds-text transition-colors tabular-nums">85430 42960, 97921 57285</a> */}
									{/* <a href="tel:+916392843291" className="text-ds-text-muted text-[13px] hover:text-ds-text transition-colors tabular-nums">63928 43291, 88741 02613</a> */}
								</div>
							</li>
							{/* Email */}
							<li className="flex items-center gap-2.5">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={1.8}
									className="w-4 h-4 text-ds-lavender shrink-0"
								>
									<rect
										x="2"
										y="4"
										width="20"
										height="16"
										rx="2"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"
									/>
								</svg>
								<a
									href="mailto:myhbpl@gmail.com"
									className="text-ds-text-muted text-[13px] hover:text-ds-text transition-colors"
								>
									myhbpl@gmail.com
								</a>
							</li>
						</ul>
					</div>

					{/* Newsletter */}
					<div className="flex flex-col gap-4">
						<h4 className="text-[11px] font-semibold tracking-widest uppercase text-ds-text-subtle">
							Newsletter
						</h4>
						<p className="text-ds-text-muted text-[13px] leading-relaxed">
							Get updates on upcoming exams and community events.
						</p>
						<NewsletterForm />
					</div>
				</div>

				{/* Bottom bar */}
				<div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6">
					<p className="text-ds-text-subtle text-[12px]">
						© 2026 HBPL Community.
					</p>
					<p className="text-ds-text-subtle text-[12px] hover:text-ds-text-muted transition-colors">
						Crafted with ❤️ by{" "}
						<a
							href="https://www.jstechnova.in"
							target="_blank"
							rel="noopener noreferrer"
							className="underline"
						>
							JS Technova
						</a>
					</p>
					<div className="flex items-center gap-5">
						<a
							href="https://wa.me/916388735208"
							target="_blank"
							rel="noopener noreferrer"
							className="text-ds-text-subtle text-[12px] hover:text-ds-text-muted transition-colors"
						>
							WhatsApp
						</a>
						{["Privacy Policy", "Terms of Service"].map((t) => (
							<a
								key={t}
								href="#"
								className="text-ds-text-subtle text-[12px] hover:text-ds-text-muted transition-colors"
							>
								{t}
							</a>
						))}
					</div>
				</div>
			</div>
		</footer>
  );
}
