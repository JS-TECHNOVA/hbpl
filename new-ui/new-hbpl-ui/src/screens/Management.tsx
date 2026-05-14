const team = [
  {
    name: "Dr. Arun Kumar Singh",
    role: "President",
    bio: "Visionary leader with 20+ years of community service and policy experience.",
    initials: "AK",
    accent: "bg-primary text-white",
  },
  {
    name: "Priya Sharma",
    role: "Secretary General",
    bio: "Overseeing operations, events, and community outreach across 50+ partner schools.",
    initials: "PS",
    accent: "bg-accent-peach text-accent-dark",
  },
  {
    name: "Rajiv Mehta",
    role: "Cricket Director",
    bio: "Former state cricketer leading the HBPL Cricket League into its third season.",
    initials: "RM",
    accent: "bg-primary-light text-primary",
  },
  {
    name: "Dr. Sunita Gupta",
    role: "Exam Director",
    bio: "Designing and overseeing the annual aptitude competition for 2000+ students.",
    initials: "SG",
    accent: "bg-accent-peach text-accent-dark",
  },
  {
    name: "Amit Verma",
    role: "Treasurer",
    bio: "Managing finances, scholarship distribution, and annual budgeting.",
    initials: "AV",
    accent: "bg-primary-light text-primary",
  },
  {
    name: "Kavya Nair",
    role: "Social Media Manager",
    bio: "Building HBPL's digital presence and fostering the online community.",
    initials: "KN",
    accent: "bg-accent-peach text-accent-dark",
  },
];

export default function Management() {
  return (
    <div className="bg-page">

      {/* ── Page Header ── */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-12">
        <div className="flex flex-col gap-4 max-w-2xl">
          <span className="text-[11px] font-semibold text-text-muted tracking-widest uppercase inline-flex items-center gap-2">
            <span className="w-4 h-px bg-text-muted inline-block" />
            The House Behind HBPL
          </span>
          <h1 className="font-heading font-extrabold text-[48px] leading-[1.05] text-primary tracking-tight">
            Management
            <br />
            <span className="text-accent">Team</span>
          </h1>
          <div className="w-12 h-1 rounded-full bg-accent" />
          <p className="text-text-body text-[15px] leading-[1.7] mt-2">
            Meet the dedicated people who power HBPL Community every day —
            from strategy to on-ground execution.
          </p>
        </div>
      </section>

      {/* ── Team grid ── */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map((m) => (
            <div
              key={m.name}
              className="bg-white rounded-3xl p-8 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] flex flex-col gap-6"
            >
              {/* Avatar */}
              <div className={`w-16 h-16 rounded-2xl ${m.accent} flex items-center justify-center shrink-0`}>
                <span className="font-heading font-extrabold text-[22px]">
                  {m.initials}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="font-heading font-extrabold text-[20px] text-primary">
                  {m.name}
                </h3>
                <p className="text-accent text-[13px] font-semibold tracking-wide">{m.role}</p>
              </div>

              <p className="text-text-body text-[14px] leading-[1.65]">{m.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact CTA ── */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        <div className="bg-primary rounded-4xl p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
            style={{ background: "white", filter: "blur(60px)", transform: "translate(30%, -30%)" }}
          />
          <div className="flex flex-col gap-3">
            <h2 className="font-heading font-extrabold text-[32px] leading-tight text-white tracking-tight">
              Want to reach out?
            </h2>
            <p className="text-primary-light text-[15px] leading-relaxed">
              For partnerships, media inquiries, or general questions about
              HBPL Community.
            </p>
          </div>
          <a
            href="mailto:contact@hbplcommunity.org"
            className="shrink-0 bg-white text-primary font-semibold text-[14px] px-8 py-4 rounded-xl hover:bg-primary-light transition-colors whitespace-nowrap"
          >
            Contact Management
          </a>
        </div>
      </section>
    </div>
  );
}
