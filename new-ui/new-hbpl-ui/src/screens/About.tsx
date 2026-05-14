import Link from "next/link";

const stats = [
  { value: "5,000+", label: "All-Time Members" },
  { value: "120+", label: "Major Events" },
  { value: "94%", label: "Participant Satisfaction" },
  { value: "500+", label: "Village Impact" },
];

const pills = ["Excellence", "Community", "Integrity"];

const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    alt: "Annual gathering",
  },
  {
    src: "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=600&q=80",
    alt: "Students collaborating",
  },
  {
    src: "https://images.unsplash.com/photo-1491975474562-1f4e30bc9468?w=600&q=80",
    alt: "Community workshop",
  },
];

export default function About() {
  return (
    <div className="bg-page">

      {/* ══════════════════════════════════════════════
          1. HERO — dark navy split, text left / image right
      ══════════════════════════════════════════════ */}
      <section className="bg-primary-darker">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

            {/* Left: text */}
            <div className="flex flex-col gap-6">
              {/* Badge */}
              <span className="inline-flex items-center gap-2 w-fit bg-accent/15 text-accent border border-accent/30 text-[11px] font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full">
                HBPL Community
              </span>

              {/* H1 */}
              <h1 className="font-heading font-extrabold text-[52px] leading-[1.05] text-white tracking-tight">
                Nurturing the{" "}
                <span className="text-accent">Next</span>
                <br />
                Generation of
                <br />
                Scholars.
              </h1>

              {/* Description */}
              <p className="text-white/60 text-[15px] leading-[1.7] max-w-md">
                HBPL Community exists to advance of academic excellence,
                personal heritage, bridging the gap between traditional learning and
                modern innovation.
              </p>
            </div>

            {/* Right: image */}
            <div className="rounded-3xl overflow-hidden aspect-4/3 shadow-[0px_30px_60px_rgba(0,0,0,0.4)]">
              <img
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80"
                alt="Students in community"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          2. MISSION & VISION — two equal cards
      ══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Our Mission — light blue card */}
          <div className="bg-[#dbeafe] rounded-3xl p-10 flex flex-col gap-6">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#fbbf24]/20 flex items-center justify-center shrink-0">
              <svg className="w-7 h-7 text-[#d97706]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>

            <div>
              <h2 className="font-heading font-extrabold text-[28px] text-primary-darker mb-3">
                Our Mission
              </h2>
              <p className="text-[#1e3a8a]/70 text-[15px] leading-[1.7]">
                To advance a dynamic ecosystem where academic rigor comes
                alongside community values. We nurture students through
                scholarships, mentorship, programs, and a collaborative environment
                that creates measurable growth in academic excellence.
              </p>
            </div>

            {/* Pill tags */}
            <div className="flex flex-wrap gap-2 mt-auto">
              {pills.map((p) => (
                <span
                  key={p}
                  className="bg-primary/10 text-primary text-[12px] font-semibold px-4 py-1.5 rounded-full"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Our Vision — dark navy card */}
          <div className="bg-primary-darker rounded-3xl p-10 flex flex-col gap-6 relative overflow-hidden">
            {/* Decorative glow */}
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-15"
              style={{ background: "radial-gradient(circle, #003f87 0%, transparent 70%)", transform: "translate(30%, -30%)" }}
            />

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="relative">
              <h2 className="font-heading font-extrabold text-[28px] text-white mb-3">
                Our Vision
              </h2>
              <p className="text-white/60 text-[15px] leading-[1.7]">
                To become the definitive academic force in the region by the
                end of the decade, creating a self-sustaining cycle of
                excellence that elevates every student, regardless of their
                background or circumstances.
              </p>
            </div>

            {/* Dark pills */}
            <div className="flex flex-wrap gap-2 mt-auto relative">
              {["Innovation", "Leadership", "Growth"].map((p) => (
                <span
                  key={p}
                  className="bg-white/10 text-white/70 text-[12px] font-semibold px-4 py-1.5 rounded-full border border-white/10"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3. "10+" STAT + "THE STORY OF A DECADE"
      ══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">

          {/* Left: stat callout + image — 2/5 */}
          <div className="md:col-span-2 flex flex-col gap-5">
            {/* Stat callout */}
            <div className="bg-primary rounded-3xl p-7 flex flex-col gap-1">
              <span className="font-heading font-extrabold text-[56px] leading-none text-white">
                10+
              </span>
              <span className="text-primary-light text-[14px] font-medium">
                Years of dedicated service to the academic community
              </span>
            </div>

            {/* Image */}
            <div className="rounded-3xl overflow-hidden aspect-4/3 shadow-[0px_4px_20px_rgba(0,0,0,0.1)]">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80"
                alt="Community gathering"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right: story text — 3/5 */}
          <div className="md:col-span-3 flex flex-col gap-6 pt-2">
            <span className="text-[11px] font-semibold text-text-muted tracking-widest uppercase inline-flex items-center gap-2">
              <span className="w-4 h-px bg-text-muted inline-block" />
              Our History
            </span>

            <h2 className="font-heading font-extrabold text-[40px] leading-[1.1] text-primary tracking-tight">
              The Story of
              <br />a Decade
            </h2>

            <p className="text-text-body text-[15px] leading-[1.7]">
              What began as a small gathering of 12 individuals in 2014 has
              blossomed into a vibrant community of thousands. We were inspired
              by the milestone of those around who actively step toward
              positive change, and we have chosen to share it with our local
              region.
            </p>

            <p className="text-text-body text-[15px] leading-[1.7]">
              A chapter of HBPL Community is a journey like no other. We
              embrace the power of our members. We've built on personal
              development at every level, nurtured the pivotal connections that
              grow leaders, and celebrated the joy of giving — regardless of
              size.
            </p>

            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-primary font-semibold text-[14px] hover:gap-3 transition-all mt-2 w-fit group"
            >
              More Information
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4. A LEGACY OF IMPACT — dark stats strip
      ══════════════════════════════════════════════ */}
      <section className="bg-primary-darker py-16">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="font-heading font-extrabold text-[36px] text-white text-center tracking-tight mb-12">
            A Legacy of Impact
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2 text-center">
                <span className="font-heading font-extrabold text-[48px] leading-none text-accent">
                  {s.value}
                </span>
                <span className="text-white/50 text-[13px] font-medium tracking-wide">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          5. TESTIMONIAL — quote with avatar photo
      ══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <div className="bg-white rounded-4xl p-10 md:p-14 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col md:flex-row gap-10 items-start md:items-center">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80"
                  alt="Testimonial"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Quote */}
            <div className="flex flex-col gap-4">
              {/* Quote mark */}
              <svg className="w-8 h-6 text-primary-light" fill="currentColor" viewBox="0 0 32 24">
                <path d="M0 24V14.4C0 6.48 4.68 1.56 14.04 0l1.44 2.4C10.2 3.6 7.56 6.36 6.72 10.8H12V24H0zm18 0V14.4C18 6.48 22.68 1.56 32.04 0l1.44 2.4c-5.28 1.2-7.92 3.96-8.76 8.4H30V24H18z" />
              </svg>
              <p className="text-text-primary text-[18px] leading-[1.7] font-medium italic">
                &ldquo;HBPL isn&apos;t just a community; it&apos;s a blueprint. The resources they
                provide are unparalleled. The mentorship I got completely
                changed my career trajectory.&rdquo;
              </p>
              <div>
                <p className="font-semibold text-primary text-[15px]">
                  — James Morris, Secretary &amp; Senior Counselor
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          6. MOMENTS IN MOTION — horizontal gallery
      ══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        {/* Section header */}
        <div className="flex items-end justify-between mb-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading font-extrabold text-[36px] leading-tight text-primary tracking-tight">
              Moments in Motion
            </h2>
            <p className="text-text-muted text-[14px]">
              Discover our highlights across the gallery
            </p>
          </div>
          <Link
            href="/events"
            className="hidden md:inline-flex items-center gap-2 text-primary font-semibold text-[13px] hover:gap-3 transition-all group"
          >
            View Gallery
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* 3-photo gallery grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {galleryImages.map((img) => (
            <div
              key={img.alt}
              className="rounded-3xl overflow-hidden aspect-4/3 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] group"
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
