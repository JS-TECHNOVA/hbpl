"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchStaffApplications, fetchStaffExamCentres, fetchStaffExams, fetchStaffSessions, ManagedExam, StudentApplication } from "@/src/lib/exams-api";
import { token } from "./layout";

export default function StaffDashboard() {
  const [exams, setExams] = useState<ManagedExam[]>([]);
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [centreCount, setCentreCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const adminToken = token();
    Promise.all([
      fetchStaffExams(adminToken),
      fetchStaffSessions(adminToken),
      fetchStaffApplications(adminToken),
      fetchStaffExamCentres(adminToken),
    ]).then(([nextExams, sessions, nextApplications, centres]) => {
      setExams(nextExams);
      setSessionCount(sessions.length);
      setApplications(nextApplications.filter((application) => application.status !== "draft"));
      setCentreCount(centres.filter((centre) => centre.is_active).length);
    }).catch((err) => setError(err instanceof Error ? err.message : "Could not load the exam dashboard."))
      .finally(() => setLoading(false));
  }, []);

  const needsReview = applications.filter((application) => ["submitted", "resubmitted", "under_review"].includes(application.status));
  const approved = applications.filter((application) => application.status === "approved");
  const cards = [
    { label: "Sessions", value: sessionCount, note: "Academic cycles", href: "/staff/exams" },
    { label: "Examinations", value: exams.length, note: `${exams.filter((exam) => exam.is_published).length} published`, href: "/staff/exams" },
    { label: "Need review", value: needsReview.length, note: "Submitted enrollments", href: "/staff/applications" },
    { label: "Exam centres", value: centreCount, note: "Active locations", href: "/staff/exam-centres" },
  ];

  return <div className="mx-auto max-w-7xl space-y-7 text-[#172438]">
    <header className="overflow-hidden rounded-2xl bg-[#172438] text-white">
      <div className="grid gap-7 px-6 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#dfb75f]">HBPL · Examination operations</p><h1 className="mt-3 font-heading text-3xl font-extrabold tracking-tight sm:text-[38px]">Staff workspace</h1><p className="mt-2 max-w-xl text-[13px] leading-6 text-white/65">Manage a session from exam setup through enrollment review, centre allocation, admit cards, and results.</p></div>
        <div className="flex gap-2"><Link href="/staff/exams" className="rounded-lg bg-[#d6a443] px-4 py-3 text-[11px] font-bold text-[#172438] transition hover:bg-[#e4b653]">Create an exam <span aria-hidden="true">→</span></Link><Link href="/staff/applications" className="rounded-lg border border-white/20 px-4 py-3 text-[11px] font-bold text-white transition hover:bg-white/10">Review enrollments</Link></div>
      </div>
      <div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4">{cards.map((card, index) => <Link key={card.label} href={card.href} className={`px-5 py-4 transition hover:bg-white/5 sm:px-7 ${index > 0 ? "border-l border-white/10" : ""}`}><p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/50">{card.label}</p><div className="mt-2 flex items-baseline gap-2"><span className="font-heading text-[25px] font-extrabold">{loading ? "—" : card.value}</span><span className="text-[10px] text-white/55">{card.note}</span></div></Link>)}</div>
    </header>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</div>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
      <section className="overflow-hidden rounded-2xl border border-[#e0e0d9] bg-white">
        <div className="flex items-end justify-between gap-4 border-b border-[#ecece7] px-5 py-5 sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#a36d17]">Review queue</p><h2 className="mt-1 font-heading text-[19px] font-extrabold">Recent enrollments</h2></div><Link href="/staff/applications" className="text-[10px] font-bold text-[#8c5b10]">Open full queue →</Link></div>
        {loading ? <div className="px-6 py-10 text-center text-[12px] text-[#778293]">Loading exam records…</div> : needsReview.length === 0 ? <div className="px-6 py-10 text-center"><p className="text-[12px] font-semibold">Nothing waiting for review</p><p className="mt-1 text-[10px] text-[#778293]">New student submissions will appear here.</p></div> : <div className="divide-y divide-[#efefeb]">{needsReview.slice(0, 6).map((application) => <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"><div className="min-w-0"><p className="truncate text-[12px] font-bold">{application.full_name}<span className="ml-2 font-normal text-[#8791a0]">{application.application_number ?? "Draft"}</span></p><p className="mt-1 truncate text-[10px] text-[#778293]">{application.exam.name} · {application.exam.session?.name ?? "No session"}</p></div><span className="rounded-full bg-[#fbf4e7] px-2.5 py-1 text-[9px] font-bold capitalize text-[#8c5b10]">{application.status.replaceAll("_", " ")}</span></div>)}</div>}
      </section>

      <section className="rounded-2xl border border-[#e0e0d9] bg-white p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#a36d17]">Workflow shortcuts</p><h2 className="mt-1 font-heading text-[19px] font-extrabold">Move an exam forward</h2>
        <div className="mt-4 divide-y divide-[#efefeb]">
          {[
            { number: "01", title: "Set up a session & exam", note: "Dates, eligibility, templates, venues", href: "/staff/exams" },
            { number: "02", title: "Allocate exam centres", note: "Assign each centre on the enrollment", href: "/staff/applications" },
            { number: "03", title: "Issue admit cards", note: `${approved.length} approved enrollments`, href: "/staff/exams" },
            { number: "04", title: "Enter and release results", note: "Results stay tied to an exam enrollment", href: "/staff/results" },
          ].map((step) => <Link key={step.number} href={step.href} className="flex gap-3 py-3.5 first:pt-4 last:pb-0"><span className="font-heading text-[12px] font-extrabold text-[#bd9a55]">{step.number}</span><span><span className="block text-[11px] font-bold">{step.title}</span><span className="mt-1 block text-[10px] text-[#778293]">{step.note}</span></span><span className="ml-auto text-[#a8adb1]">→</span></Link>)}
        </div>
      </section>
    </div>

    <section className="rounded-2xl border border-[#e0e0d9] bg-[#eeece4] px-5 py-4 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#697586]">Enrollment model</p><p className="mt-1 text-[11px] text-[#435166]">A student may enroll in multiple exams. Centre assignment, admit card, certificate, and result are stored per exam enrollment.</p></div><div className="flex gap-2"><Link href="/staff/exam-centres" className="rounded-lg border border-[#d0d1ca] bg-white px-3 py-2 text-[10px] font-bold">Manage centres</Link><Link href="/staff/results" className="rounded-lg border border-[#d0d1ca] bg-white px-3 py-2 text-[10px] font-bold">Exam results</Link></div></div></section>
  </div>;
}
