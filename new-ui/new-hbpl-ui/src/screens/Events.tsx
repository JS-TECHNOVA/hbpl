import Link from "next/link";

const events = [
  {
    date: { month: "Nov", day: "15", year: "2024" },
    title: "General Aptitude Competition 2024",
    category: "Exam",
    location: "District School, Harpur",
    desc: "Annual aptitude test for students of classes 6–12. Prizes worth ₹1,00,000. Certificates for all participants.",
    href: "/exams",
    tag: "bg-primary-light text-primary",
  },
  {
    date: { month: "Dec", day: "01", year: "2024" },
    title: "HBPL Cricket Cup — Season 3",
    category: "Cricket",
    location: "HBPL Ground",
    desc: "Inter-village cricket tournament. 16 teams compete over 4 weeks for the Beacon Trophy.",
    href: "/cricket",
    tag: "bg-primary text-white",
  },
  {
    date: { month: "Dec", day: "15", year: "2024" },
    title: "Study Strategy Seminar",
    category: "Academic",
    location: "Community Hall",
    desc: "Master high-performance learning techniques with our senior faculty mentors.",
    href: "/events",
    tag: "bg-primary-light text-primary",
  },
  {
    date: { month: "Jan", day: "05", year: "2025" },
    title: "Leadership Workshop",
    category: "Community",
    location: "Community Hall",
    desc: "A one-day workshop on leadership, public speaking, and career guidance for students.",
    href: "/community",
    tag: "bg-accent-peach text-accent-dark",
  },
  {
    date: { month: "Jan", day: "10", year: "2025" },
    title: "Volunteer Orientation",
    category: "Volunteer",
    location: "HBPL Office",
    desc: "Learn how you can contribute to our community outreach programs this winter.",
    href: "/community",
    tag: "bg-accent-peach text-accent-dark",
  },
];

export default function Events() {
  return (
    <div className="bg-page">

      {/* ── Page Header ── */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-12">
        <div className="flex flex-col gap-4 max-w-2xl">
          <span className="text-[11px] font-semibold text-text-muted tracking-[0.12em] uppercase inline-flex items-center gap-2">
            <span className="w-4 h-px bg-text-muted inline-block" />
            Calendar
          </span>
          <h1 className="font-heading font-extrabold text-[48px] leading-[1.05] text-primary tracking-tight">
            Upcoming Events
          </h1>
          <div className="w-12 h-1 rounded-full bg-accent" />
          <p className="text-text-body text-[15px] leading-[1.7] mt-2">
            Stay up to date with all HBPL activities — exams, cricket
            tournaments, workshops, and community programmes.
          </p>
        </div>
      </section>

      {/* ── Event list ── */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        <div className="flex flex-col gap-5">
          {events.map((e) => (
            <div
              key={e.title}
              className="bg-white rounded-3xl shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-0 overflow-hidden"
            >
              {/* Date column */}
              <div className="shrink-0 bg-primary-light flex flex-col items-center justify-center px-8 py-6 min-w-30">
                <span className="text-[11px] font-semibold text-primary tracking-widest uppercase">
                  {e.date.month}
                </span>
                <span className="font-heading font-extrabold text-[40px] leading-none text-primary">
                  {e.date.day}
                </span>
                <span className="text-[12px] text-text-muted font-medium">{e.date.year}</span>
              </div>

              {/* Content */}
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center flex-1 p-8">
                <div className="flex flex-col gap-2.5 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${e.tag}`}>
                      {e.category}
                    </span>
                    <span className="flex items-center gap-1.5 text-text-muted text-[13px]">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {e.location}
                    </span>
                  </div>
                  <h3 className="font-heading font-extrabold text-[20px] text-primary">
                    {e.title}
                  </h3>
                  <p className="text-text-body text-[14px] leading-[1.6]">{e.desc}</p>
                </div>

                <Link
                  href={e.href}
                  className="shrink-0 bg-primary text-white font-semibold text-[13px] px-6 py-3 rounded-xl hover:bg-primary-dark transition-colors"
                >
                  Register
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Newsletter CTA ── */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        <div className="bg-white rounded-4xl p-12 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading font-extrabold text-[28px] text-primary tracking-tight">
              Never miss an event
            </h2>
            <p className="text-text-body text-[14px] leading-relaxed">
              Subscribe to our newsletter and stay informed about every upcoming activity.
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 md:w-64 bg-page border border-border rounded-xl px-5 py-3 text-[14px] text-text-body placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
            />
            <button
              type="button"
              className="shrink-0 bg-primary text-white font-semibold text-[13px] px-6 py-3 rounded-xl shadow-[0px_4px_12px_rgba(0,63,135,0.25)] hover:bg-primary-dark transition-colors whitespace-nowrap"
            >
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
