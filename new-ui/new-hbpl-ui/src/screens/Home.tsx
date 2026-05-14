import Link from "next/link";
import LiveCricketWidget from "../components/LiveCricketWidget";

/* ─── DATA ─────────────────────────────────────────────────────── */
const stats = [
  { value: "2000+", label: "Active Students" },
  { value: "50+",   label: "Partner Schools" },
  { value: "10+",   label: "Annual Events" },
];

const testimonials = [
  {
    quote:
      "The Aptitude Exam was a turning point for my confidence. The community support is unlike anything I've seen in other student platforms.",
    name: "Aditi Sharma",
    role: "Student, Model High School",
    avatarBg: "bg-primary-light",
    avatarText: "AS",
  },
  {
    quote:
      "HBPL Community provides our students with practical challenges that standard curriculum often misses. Their events are impeccably managed.",
    name: "Dr. Rajesh Kumar",
    role: "Principal, St. Xavier's Academy",
    avatarBg: "bg-accent-peach",
    avatarText: "RK",
  },
  {
    quote:
      "From cricket fields to social causes, HBPL is truly building the future leaders of our society. Proud to be a volunteer here.",
    name: "Vikram Mehra",
    role: "Volunteer & Alumni",
    avatarBg: "bg-primary",
    avatarText: "VM",
  },
];

/* ─── PAGE ─────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="bg-page">

      {/* ══════════════════════════════════════════════
          1. HERO
          — Left: badge + H1 + description + 2 CTAs
          — Right: student photo
      ══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div className="flex flex-col gap-7">
            {/* Badge */}
            <span className="inline-flex items-center gap-2 bg-primary/8 text-primary border border-primary/15 text-[11px] font-semibold tracking-[0.14em] uppercase px-4 py-1.5 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-accent inline-block" />
              Empowering Next Gen
            </span>

            {/* H1 */}
            <h1 className="font-heading font-extrabold text-[56px] leading-[1.05] tracking-tight text-primary">
              Empowering
              <br />
              Students,
              <br />
              Building{" "}
              <span className="text-accent">Future</span>
              <br />
              <span className="text-accent">Leaders</span>
            </h1>

            {/* Description */}
            <p className="text-text-body text-[16px] leading-[1.7] max-w-md">
              Join the fastest growing academic community where excellence meets
              opportunity. We foster growth through competitive exams, sports,
              and social initiatives.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/exams"
                className="bg-primary text-white font-semibold text-[15px] px-8 py-3.5 rounded-xl shadow-[0px_20px_25px_-5px_rgba(0,63,135,0.30)] hover:bg-primary-dark transition-colors"
              >
                Register for Exam
              </Link>
              <Link
                href="/community"
                className="bg-[#e8e8e8] text-primary font-semibold text-[15px] px-8 py-3.5 rounded-xl hover:bg-[#ddd] transition-colors"
              >
                Join Community
              </Link>
            </div>
          </div>

          {/* Right: hero image */}
          <div className="relative">
            {/* Glow blobs */}
            <div className="absolute -top-10 -left-10 w-56 h-56 bg-accent-peach rounded-full blur-3xl opacity-35 pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-primary-light rounded-full blur-3xl opacity-35 pointer-events-none" />
            <div className="relative rounded-[40px] overflow-hidden shadow-[0px_32px_64px_-12px_rgba(0,0,0,0.28)] aspect-square">
              <img
                src="https://images.unsplash.com/photo-1529390079861-591de354faf5?w=800&q=80"
                alt="Students collaborating"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          2. STATS STRIP
          — Dark blue bg, 3 stats with orange numbers
      ══════════════════════════════════════════════ */}
      <section className="bg-primary">
        <div className="max-w-7xl mx-auto px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1.5 text-center">
                <span className="font-heading font-extrabold text-[48px] leading-none text-accent">
                  {s.value}
                </span>
                <span className="text-primary-light text-[12px] font-semibold tracking-[0.14em] uppercase opacity-80">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3. COMMUNITY HIGHLIGHTS
          — Section header with orange underline
          — 2-row bento grid: 4 cards
      ══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        {/* Section header */}
        <div className="flex flex-col gap-3 mb-12">
          <h2 className="font-heading font-extrabold text-[38px] text-primary tracking-tight">
            Community Highlights
          </h2>
          <div className="w-14 h-1.5 rounded-full bg-accent" />
        </div>

        {/* Bento grid — Row 1: col-span-8 | col-span-4 */}
        <div
          className="grid grid-cols-12 gap-6"
          style={{ gridTemplateRows: "318px 258px" }}
        >
          {/* ── Card A: Aptitude Exam 2024 (large, 8/12) ── */}
          <div className="col-span-12 md:col-span-8 bg-white rounded-4xl shadow-[0px_4px_20px_rgba(0,0,0,0.07)] overflow-hidden flex flex-col justify-between p-8 relative">
            {/* Background image (right half overlay) */}
            <div className="absolute inset-0 left-[45%] overflow-hidden pointer-events-none">
              <img
                src="https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80"
                alt="Exam hall"
                className="w-full h-full object-cover opacity-25"
              />
              {/* Gradient fade to white */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/60 to-transparent" />
            </div>

            {/* Foreground content */}
            <div className="relative flex flex-col gap-3">
              <span className="inline-flex items-center gap-2 bg-accent/10 text-accent border border-accent/20 text-[11px] font-semibold tracking-[0.12em] uppercase px-3.5 py-1.5 rounded-full w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Upcoming Event
              </span>
              <h3 className="font-heading font-extrabold text-[30px] text-primary leading-tight">
                Aptitude Exam 2024
              </h3>
              <p className="text-text-body text-[15px] leading-relaxed max-w-sm">
                Test your logical reasoning and analytical skills across various
                age groups.
              </p>
            </div>

            <div className="relative">
              <Link
                href="/exams"
                className="inline-flex items-center gap-2 bg-accent text-white font-semibold text-[14px] px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Learn More
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* ── Card B: HBPL Cricket Cup (small, 4/12) ── */}
          <div className="col-span-12 md:col-span-4 bg-primary rounded-4xl shadow-[0px_4px_20px_rgba(0,63,135,0.20)] overflow-hidden flex flex-col justify-between p-8">
            <div className="flex flex-col gap-4">
              <span className="inline-flex bg-white/15 text-white text-[11px] font-semibold tracking-[0.12em] uppercase px-3.5 py-1.5 rounded-full w-fit border border-white/10">
                Sports League
              </span>
              <h3 className="font-heading font-extrabold text-[28px] text-white leading-tight">
                HBPL Cricket Cup
              </h3>
            </div>

            <div className="flex flex-col gap-5">
              <p className="text-primary-light text-[14px] leading-relaxed">
                Unleashing local talent on the pitch.
                <br />
                Season starts this November.
              </p>
              {/* Cricket ball SVG */}
              <svg className="w-12 h-12 text-white/30" fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="24" cy="24" r="20" />
                <path strokeLinecap="round" d="M10 16c4 2 8 2 12 0s8-2 12 0" />
                <path strokeLinecap="round" d="M10 32c4-2 8-2 12 0s8 2 12 0" />
                <path strokeLinecap="round" d="M16 10c2 4 2 8 0 12s-2 8 0 12" />
                <path strokeLinecap="round" d="M32 10c-2 4-2 8 0 12s2 8 0 12" />
              </svg>
            </div>
          </div>

          {/* ── Card C: Social Work Initiatives (5/12) ── */}
          <div className="col-span-12 md:col-span-5 bg-accent-peach rounded-4xl flex flex-col justify-between p-8">
            <div className="flex flex-col gap-3">
              <h3 className="font-heading font-extrabold text-[24px] text-accent-dark">
                Social Work Initiatives
              </h3>
              <p className="text-accent-dark/70 text-[14px] leading-relaxed">
                Building character through community service and environmental
                awareness programs.
              </p>
            </div>

            {/* Avatar stack */}
            <div className="flex items-center gap-1">
              <div className="flex -space-x-3">
                {["bg-[#bfdbfe]", "bg-[#93c5fd]", "bg-[#60a5fa]"].map((c, i) => (
                  <div key={i} className={`w-10 h-10 rounded-full border-2 border-white ${c} flex items-center justify-center`} />
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-white bg-primary flex items-center justify-center">
                  <span className="text-white text-[10px] font-extrabold">+82</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Card D: Be part of the legacy (7/12) ── */}
          <div className="col-span-12 md:col-span-7 bg-white border-2 border-dashed border-border rounded-4xl flex items-center justify-between p-8 gap-6">
            <div className="flex flex-col gap-2 max-w-xs">
              <h3 className="font-heading font-extrabold text-[24px] text-primary">
                Be part of the legacy
              </h3>
              <p className="text-text-body text-[14px] leading-relaxed">
                Access exclusive resources, mentorship, and event invites.
              </p>
            </div>
            <Link
              href="/community"
              aria-label="Join community"
              className="shrink-0 w-14 h-14 rounded-full bg-white shadow-[0px_10px_20px_-4px_rgba(0,0,0,0.12)] flex items-center justify-center hover:scale-105 transition-transform"
            >
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4. VOICES OF HBPL — testimonials
          — Light gray bg, 3 quote cards
      ══════════════════════════════════════════════ */}
      <section className="bg-section py-20">
        <div className="max-w-7xl mx-auto px-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 mb-14 text-center">
            <h2 className="font-heading font-extrabold text-[38px] text-primary tracking-tight">
              Voices of HBPL
            </h2>
            <p className="text-text-muted text-[15px]">
              What our students and educational partners have to say
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className={`bg-white rounded-3xl p-8 shadow-[0px_1px_3px_rgba(0,0,0,0.06),0px_4px_16px_rgba(0,0,0,0.05)] relative flex flex-col gap-7 ${
                  i === 1 ? "md:mt-10" : ""
                }`}
              >
                {/* Large quote mark */}
                <svg
                  className="absolute top-5 right-7 w-9 h-7 text-primary-light opacity-60"
                  fill="currentColor"
                  viewBox="0 0 36 28"
                >
                  <path d="M0 28V16.8C0 7.56 5.46 1.82 16.38 0l1.68 2.8c-6.16 1.4-9.24 4.62-10.22 9.8H14V28H0zm20 0V16.8C20 7.56 25.46 1.82 36.38 0l1.68 2.8c-6.16 1.4-9.24 4.62-10.22 9.8H34V28H20z" />
                </svg>

                <p className="italic text-text-primary text-[15px] leading-[1.75]">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full shrink-0 ${t.avatarBg} flex items-center justify-center`}>
                    <span className={`font-heading font-extrabold text-[13px] ${t.avatarBg === "bg-primary" ? "text-white" : t.avatarBg === "bg-primary-light" ? "text-primary" : "text-accent-dark"}`}>
                      {t.avatarText}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-primary text-[15px]">{t.name}</p>
                    <p className="text-text-muted text-[12px] mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          5. READY TO MAKE A DIFFERENCE — centered CTA
      ══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-8 py-20 text-center">
        <h2 className="font-heading font-extrabold text-[38px] text-primary mb-4 tracking-tight">
          Ready to make a difference?
        </h2>
        <p className="text-text-body text-[16px] mb-10 max-w-xl mx-auto leading-[1.7]">
          Whether you are a student, educator, or volunteer — HBPL Community
          has a place for you.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/exams"
            className="bg-primary text-white font-semibold text-[15px] px-9 py-4 rounded-xl shadow-[0px_20px_25px_-5px_rgba(0,63,135,0.28)] hover:bg-primary-dark transition-colors"
          >
            Register for Exam
          </Link>
          <Link
            href="/community"
            className="bg-accent text-white font-semibold text-[15px] px-9 py-4 rounded-xl hover:opacity-90 transition-opacity"
          >
            Become a Volunteer
          </Link>
        </div>
      </section>
      {/* Live cricket floating widget */}
      <LiveCricketWidget />
    </div>
  );
}
