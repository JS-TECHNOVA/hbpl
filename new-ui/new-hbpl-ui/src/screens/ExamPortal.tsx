"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPublicExams, ManagedExam } from "@/src/lib/exams-api";

export default function ExamPortal() {
  const [exams, setExams] = useState<ManagedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPublicExams()
      .then(setExams)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load examinations."))
      .finally(() => setLoading(false));
  }, []);

  return <div className="min-h-screen bg-[#f4f3ee] text-[#172438]">
    <section className="relative isolate overflow-hidden bg-[#172438] text-white">
      <div aria-hidden="true" className="absolute -right-24 -top-36 -z-10 h-[34rem] w-[34rem] rounded-full border border-white/[.08]" />
      <div aria-hidden="true" className="absolute -right-8 -top-20 -z-10 h-[25rem] w-[25rem] rounded-full border border-[#dfb75f]/20" />
      <div className="mx-auto max-w-7xl px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
        <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#dfb75f]"><span className="h-px w-6 bg-[#dfb75f]" /> HBPL · Academic programmes</p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <div><h1 className="max-w-3xl font-heading text-[38px] font-extrabold leading-[1.04] tracking-tight sm:text-[54px]">Examinations that<br/><span className="text-[#dfb75f]">open new doors.</span></h1><p className="mt-5 max-w-xl text-[13px] leading-6 text-white/60">Explore current HBPL examinations, review important dates and instructions, then apply through your student account.</p></div>
          <Link href="/exams/dashboard" className="inline-flex items-center gap-3 rounded-xl border border-white/20 px-4 py-3 text-[11px] font-semibold text-white transition hover:border-[#dfb75f]/60 hover:bg-white/[.06]">Student dashboard <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>

    <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#9b6d20]">Browse & explore</p><h2 className="mt-1 font-heading text-[22px] font-extrabold">Published examinations</h2></div><p className="text-[11px] text-[#7c8793]">{exams.length} {exams.length === 1 ? "examination" : "examinations"}</p></div>
      {loading && <div className="rounded-2xl border border-[#e3e2dc] bg-white p-12 text-center text-[12px] text-[#7c8793]">Loading published examinations…</div>}
      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-[12px] text-red-700">{error}</div>}
      {!loading && !error && exams.length === 0 && <div className="rounded-2xl border border-dashed border-[#cfd2d0] bg-white px-6 py-14 text-center"><p className="font-heading text-[19px] font-bold">No examinations are published yet</p><p className="mt-2 text-[12px] text-[#778293]">Please check back soon for upcoming opportunities.</p></div>}
      {!loading && !error && exams.length > 0 && <div className="grid gap-4 lg:grid-cols-2">{exams.map((exam) => <article key={exam.id} className="group flex min-h-[270px] flex-col overflow-hidden rounded-2xl border border-[#e2e1da] bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[#c9b887] hover:shadow-[0_14px_35px_rgba(23,36,56,.08)]">
        <Link href={`/exams/${encodeURIComponent(exam.slug)}`} className="flex flex-1 flex-col p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a36d17] sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9b6d20]">{exam.session?.name ?? "HBPL examination"}</p><h3 className="mt-2 font-heading text-[19px] font-extrabold leading-snug text-[#172438] group-hover:text-[#8c5b10]">{exam.name}</h3>{exam.subtitle && <p className="mt-1.5 text-[11px] leading-5 text-[#778293]">{exam.subtitle}</p>}</div><ExamStatus status={exam.status}/></div>
          <p className="mt-5 line-clamp-2 text-[11px] leading-5 text-[#687486]">{exam.subtitle || "Open examination details for eligibility, schedule, application dates, and instructions."}</p>
          <div className="mt-auto grid grid-cols-2 gap-3 border-t border-[#efeee9] pt-4"><div><p className="text-[9px] font-bold uppercase tracking-wide text-[#9098a2]">Examination date</p><p className="mt-1 text-[11px] font-semibold text-[#344258]">{formatDate(exam.exam_date)}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wide text-[#9098a2]">Registration closes</p><p className="mt-1 text-[11px] font-semibold text-[#344258]">{formatDate(exam.registration_end, true)}</p></div></div>
          <div className="mt-4 flex items-center justify-between border-t border-[#efeee9] pt-4"><span className="text-[10px] font-semibold text-[#8c5b10]">View dates & exam details</span><span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-[#f4f1e9] text-[13px] text-[#8c5b10] transition group-hover:translate-x-1">→</span></div>
        </Link>
      </article>)}</div>}
    </main>
  </div>;
}

function ExamStatus({ status }: { status: string }) {
  const open = status === "registration_open";
  return <span className={`shrink-0 rounded-full px-2.5 py-1.5 text-[9px] font-bold ${open ? "bg-emerald-50 text-emerald-700" : "bg-[#f3f1eb] text-[#687486]"}`}>{status.replaceAll("_", " ")}</span>;
}

function formatDate(value: string | null, dateTime = false) {
  if (!value) return "To be announced";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", dateTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}
