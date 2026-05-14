import Link from "next/link";

const examLinks = [
  {
    label: "Register",
    href: "/exams/register",
    desc: "Register for the upcoming aptitude exam",
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    label: "Admit Card",
    href: "/exams/admit-card",
    desc: "Download your hall ticket",
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
      </svg>
    ),
  },
  {
    label: "Results",
    href: "/exams/results",
    desc: "Check your exam results",
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: "Grievance",
    href: "/exams/grievance",
    desc: "Raise a query or grievance",
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const highlights = [
  "Open to all students classes 6–12",
  "Prizes worth ₹1,00,000",
  "Certificates for all participants",
  "Top scorers meet district leaders",
];

export default function ExamPortal() {
  return (
    <div className="bg-page">

      {/* ── Page Header ── */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-12">
        <div className="flex flex-col gap-4 max-w-2xl">
          <span className="text-[11px] font-semibold text-text-muted tracking-widest uppercase inline-flex items-center gap-2">
            <span className="w-4 h-px bg-text-muted inline-block" />
            Academic Excellence
          </span>
          <h1 className="font-heading font-extrabold text-[48px] leading-[1.05] text-primary tracking-tight">
            Guiding Academic
            <br />
            <span className="text-accent">Excellence</span>
          </h1>
          <div className="w-12 h-1 rounded-full bg-accent" />
          <p className="text-text-body text-[15px] leading-[1.7] mt-2 max-w-xl">
            Everything you need for the General Aptitude Competition — from
            registration to results, all in one place.
          </p>
        </div>
      </section>

      {/* ── Quick access cards ── */}
      <section className="max-w-7xl mx-auto px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {examLinks.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="bg-white rounded-3xl p-7 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] flex items-center gap-6 hover:shadow-[0px_8px_30px_rgba(0,63,135,0.12)] transition-shadow group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                <div className="group-hover:[&_svg]:text-white transition-colors">
                  {l.icon}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-heading font-extrabold text-[20px] text-primary group-hover:text-accent transition-colors">
                  {l.label}
                </h3>
                <p className="text-text-body text-[14px]">{l.desc}</p>
              </div>
              <svg className="w-5 h-5 text-text-muted ml-auto shrink-0 group-hover:text-primary group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Exam info banner ── */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        <div className="bg-primary rounded-4xl overflow-hidden relative">
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{ background: "radial-gradient(circle at 80% 50%, white 0%, transparent 60%)" }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Left content */}
            <div className="p-12 md:p-16 flex flex-col gap-6">
              <div>
                <span className="text-[11px] font-semibold text-primary-light tracking-widest uppercase">
                  Flagship Programme
                </span>
                <h2 className="font-heading font-extrabold text-[32px] leading-tight text-white tracking-tight mt-3">
                  General Aptitude
                  <br />Competition 2024
                </h2>
              </div>
              <p className="text-primary-light text-[15px] leading-[1.7]">
                Our flagship annual exam tests logical reasoning, mathematical
                ability, and general knowledge for students in classes 6–12.
              </p>
              <ul className="flex flex-col gap-3">
                {highlights.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-primary-light text-[14px]">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/exams/register"
                className="inline-flex items-center gap-2 w-fit bg-accent text-white font-semibold text-[14px] px-8 py-4 rounded-xl hover:opacity-90 transition-opacity mt-2"
              >
                Register Now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Right image */}
            <div className="relative min-h-64 md:min-h-0">
              <img
                src="https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80"
                alt="Exam hall"
                className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
