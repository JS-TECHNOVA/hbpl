"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ExamDescriptionRenderer, { parseExamDescription } from "@/src/components/ExamDescriptionRenderer";
import { createCashfreePaymentOrder, fetchPublicExam, fetchStudentProfile, ManagedExam, normalizeAllowedClasses, quickApplyStudent } from "@/src/lib/exams-api";
import { openCashfreeCheckout } from "@/src/lib/cashfree-checkout";

export default function PublicExamDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [exam, setExam] = useState<ManagedExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState<"idle" | "preparing" | "checkout" | "success">("idle");
  const [successApplicationNumber, setSuccessApplicationNumber] = useState("");
  const [applicationNotice, setApplicationNotice] = useState("");
  const [applicationError, setApplicationError] = useState("");

  useEffect(() => {
    let active = true;
    fetchPublicExam(slug)
      .then((item) => { if (active) setExam(item); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Unable to load examination details."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  if (loading) return <div className="grid min-h-[60vh] place-items-center bg-[#f4f3ee] text-[12px] text-[#687486]">Loading examination details…</div>;
  if (error || !exam) return <main className="min-h-[60vh] bg-[#f4f3ee] px-5 py-16"><div className="mx-auto max-w-2xl rounded-2xl border border-[#e3e2dc] bg-white p-7"><p role="alert" className="text-[13px] text-red-700">{error || "This examination could not be found."}</p><Link href="/exams" className="mt-5 inline-flex text-[11px] font-bold text-[#8c5b10] hover:underline">← All examinations</Link></div></main>;

  const currentExam = exam;
  const description = parseExamDescription(exam.description);
  const allowedClasses = normalizeAllowedClasses(exam.allowed_classes);
  const registrationOpen = exam.status === "registration_open";
  const dates = [
    { label: "Registration opens", value: formatDate(exam.registration_start, true) },
    { label: "Registration closes", value: formatDate(exam.registration_end, true) },
    { label: "Examination date", value: formatDate(exam.exam_date) },
    { label: "Reporting time", value: formatTime(exam.reporting_time) },
    { label: "Exam begins", value: formatTime(exam.exam_start_time) },
    { label: "Exam ends", value: formatTime(exam.exam_end_time) },
    { label: "Results expected", value: formatDate(exam.result_date) },
  ];
  const remainingSeats = exam.max_registrations === null ? null : Math.max(0, exam.max_registrations - exam.application_count);

  async function applyNow() {
    setApplicationError(""); setApplicationNotice("");
    const token = localStorage.getItem("student_token") ?? "";
    const returnPath = `/exams/${currentExam.slug}`;
    if (!token) {
      window.location.href = `/exams/login?next=${encodeURIComponent(returnPath)}`;
      return;
    }
    setApplying(true);
    setProgress("preparing");
    try {
      const profile = await fetchStudentProfile(token);
      const complete = Boolean(profile.full_name.trim() && profile.gender && profile.phone && profile.date_of_birth && profile.father_name && profile.school_name && profile.class_name && profile.address && profile.photo_url && profile.signature_url);
      if (!complete) {
        window.location.href = `/exams/dashboard?section=profile&return_to=${encodeURIComponent(returnPath)}`;
        return;
      }
      const application = await quickApplyStudent(token, currentExam.id);
      if (application.status !== "draft") {
        setApplicationNotice(`You are already enrolled. Application number: ${application.application_number ?? "pending"}.`);
        setSuccessApplicationNumber(application.application_number ?? "");
        setProgress("success");
        return;
      }
      if (Number(currentExam.fee) > 0) {
        const order = await createCashfreePaymentOrder(token, application.id);
        if (order.already_paid) {
          window.location.href = "/exams/dashboard?section=enrollments";
          return;
        }
        setProgress("checkout");
        await openCashfreeCheckout(order);
        setProgress("idle");
        setApplicationError("Checkout closed before confirmation. You can resume payment from your student dashboard.");
        return;
      }
      setApplicationNotice(`You’re enrolled. Application number: ${application.application_number ?? "pending"}.`);
      setSuccessApplicationNumber(application.application_number ?? "");
      setProgress("success");
    } catch (err) {
      setProgress("idle");
      setApplicationError(err instanceof Error ? err.message : "Unable to submit your enrollment.");
    } finally { setApplying(false); }
  }

  return <div className="min-h-screen bg-[#f4f3ee] text-[#172438]">
    <section className="relative isolate overflow-hidden bg-[#172438] text-white">
      <div aria-hidden="true" className="absolute -right-20 -top-32 -z-10 h-[32rem] w-[32rem] rounded-full border border-white/[.08]"/><div aria-hidden="true" className="absolute -right-4 -top-20 -z-10 h-[23rem] w-[23rem] rounded-full border border-[#dfb75f]/20"/>
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-7 sm:px-8 sm:pb-14">
        <Link href="/exams" className="inline-flex items-center gap-2 text-[10px] font-semibold text-white/55 transition hover:text-white">← All examinations</Link>
        <div className="mt-10 flex flex-wrap items-start justify-between gap-5"><div className="max-w-3xl"><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-bold uppercase tracking-[.18em] text-[#dfb75f]">{exam.session?.name ?? "HBPL examination"}</span><span className="text-white/25">/</span><StatusBadge status={exam.status}/></div><h1 className="mt-4 font-heading text-[32px] font-extrabold leading-tight tracking-tight sm:text-[46px]">{exam.name}</h1>{exam.subtitle && <p className="mt-3 max-w-2xl text-[13px] leading-6 text-white/65">{exam.subtitle}</p>}</div><div className="min-w-36 rounded-2xl border border-white/10 bg-white/[.05] px-5 py-4"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-white/45">Examination fee</p><p className="mt-1 font-heading text-[23px] font-extrabold text-[#dfb75f]">{formatFee(exam.fee)}</p></div></div>
        <div className="mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3"><HeroFact label="Exam date" value={formatDate(exam.exam_date)}/><HeroFact label="Registration closes" value={formatDate(exam.registration_end, true)}/><HeroFact label="Result date" value={formatDate(exam.result_date)}/></div>
      </div>
    </section>

    <main className="mx-auto grid max-w-7xl items-start gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-2xl border border-[#e2e1da] bg-white p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#efeee9] pb-4"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9b6d20]">Exam information</p><h2 className="mt-1 font-heading text-[19px] font-extrabold">Overview, instructions & updates</h2></div><p className="text-[9px] text-[#9299a1]">Updated {formatDate(exam.updated_at)}</p></div>{description.blocks.length ? <div className="mt-5"><ExamDescriptionRenderer data={description} /></div> : <p className="mt-5 text-[12px] leading-6 text-[#778293]">Detailed instructions will be added by the examination office.</p>}</section>
        <section className="rounded-2xl border border-[#e2e1da] bg-white p-5 sm:p-7"><div className="mb-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9b6d20]">Important schedule</p><h2 className="mt-1 font-heading text-[19px] font-extrabold">Dates & timings</h2></div><div className="grid gap-x-8 sm:grid-cols-2">{dates.map((date, index) => <div key={date.label} className="flex gap-3 border-t border-[#efeee9] py-3.5"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${index === 2 ? "bg-[#a36d17]" : "bg-[#c6c9c7]"}`}/><div><p className="text-[9px] font-bold uppercase tracking-wide text-[#8a949f]">{date.label}</p><p className="mt-1 text-[11px] font-semibold text-[#344258]">{date.value}</p></div></div>)}</div></section>
        <section className="grid gap-4 sm:grid-cols-2"><InfoCard label="Who can apply" value={allowedClasses.length ? allowedClasses.join(", ") : "Open to all classes"} detail={allowedClasses.length ? "Eligible classes" : "No class restriction specified"}/><InfoCard label="Applications" value={exam.max_registrations ? `${exam.application_count} of ${exam.max_registrations}` : `${exam.application_count} received`} detail={remainingSeats === null ? "Applications received" : `${remainingSeats} places remaining`}/></section>
      </div>

        <aside className="space-y-4 lg:sticky lg:top-6"><section className="overflow-hidden rounded-2xl border border-[#e2e1da] bg-white"><div className="bg-[#ebe9e1] px-5 py-4"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#8c5b10]">Application window</p><p className="mt-1 font-heading text-[16px] font-extrabold">{registrationOpen ? "Applications are open" : statusText(exam.status)}</p></div><div className="space-y-3 p-5"><DateLine label="Opens" value={formatDate(exam.registration_start, true)}/><DateLine label="Closes" value={formatDate(exam.registration_end, true)}/><DateLine label="Exam day" value={formatDate(exam.exam_date)}/><div className="border-t border-[#efeee9] pt-4">{registrationOpen ? <button type="button" onClick={applyNow} disabled={applying || Boolean(applicationNotice)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a36d17] px-4 py-3.5 text-[12px] font-extrabold text-white transition hover:bg-[#8c5b10] disabled:cursor-wait disabled:opacity-70">{applying ? "Checking your profile…" : applicationNotice ? "Application submitted" : "Apply now →"}</button> : <button type="button" disabled className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#e6e5e0] px-4 py-3.5 text-[12px] font-extrabold text-[#8b9198]">{exam.status === "registration_closed" ? "Registration closed" : "Applications not open"}</button>}{applicationNotice && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-[10px] leading-5 text-emerald-800">{applicationNotice} <Link href="/exams/dashboard" className="font-bold underline">View enrollments</Link></p>}{applicationError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-[10px] leading-5 text-red-700">{applicationError}</p>}<p className="mt-3 text-center text-[9px] leading-4 text-[#89929c]">Sign in or create your student account to apply. Your profile and documents are saved once and reused for future exams.</p></div></div></section>
        <section className="rounded-2xl bg-[#1b2b43] p-5 text-white"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#dfb75f]">Your student account</p><h2 className="mt-2 font-heading text-[14px] font-bold">One account for every session</h2><p className="mt-2 text-[10px] leading-5 text-white/60">Track this application, your exam centre, admit card, and result from your dashboard.</p><Link href="/exams/dashboard" className="mt-4 inline-flex text-[10px] font-bold text-[#dfb75f] hover:underline">Go to student dashboard →</Link></section>
      </aside>
    </main>
    {exam.sample_papers && exam.sample_papers.length > 0 && <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-8 sm:pb-12"><div className="rounded-2xl border border-[#e2e1da] bg-white p-5 sm:p-7"><div className="mb-4 border-b border-[#efeee9] pb-4"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9b6d20]">Preparation material</p><h2 className="mt-1 font-heading text-[19px] font-extrabold">Sample papers</h2><p className="mt-1 text-[11px] text-[#778293]">Practice with papers shared for this examination.</p></div><ul className="divide-y divide-[#efeee9]">{exam.sample_papers.map((paper) => <li key={paper.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-1 last:pb-1"><div className="flex min-w-0 items-start gap-3"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f7f1e5] text-[10px] font-extrabold tracking-wide text-[#8c5b10]">PDF</span><div className="min-w-0"><h3 className="text-[12px] font-bold text-[#344258]">{paper.title}</h3>{paper.caption && <p className="mt-1 whitespace-pre-wrap text-[10px] leading-5 text-[#778293]">{paper.caption}</p>}</div></div>{paper.file_url && <a href={paper.file_url} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-[#d8e1ec] bg-[#f7f9fb] px-3 py-2.5 text-[10px] font-bold text-[#315b82] transition hover:bg-[#edf3f8]">View paper <span aria-hidden="true">↗</span></a>}</li>)}</ul></div></section>}
    {progress !== "idle" && <div className="fixed inset-0 z-[100] grid place-items-center bg-[#101c2e]/70 px-4 py-8 backdrop-blur-sm" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="application-progress-title" className="w-full max-w-md rounded-3xl border border-[#e8e5dc] bg-[#fffefa] p-7 text-center shadow-2xl sm:p-9">
      {progress === "success" ? <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-700" aria-hidden="true">✓</div> : <div className="mx-auto h-12 w-12 animate-spin rounded-full border-[3px] border-[#e6dfd0] border-t-[#a36d17]" aria-hidden="true" />}
      <p className="mt-5 text-[9px] font-bold uppercase tracking-[.18em] text-[#9b6d20]">HBPL · Examination entry</p>
      <h2 id="application-progress-title" className="mt-2 font-heading text-[22px] font-extrabold text-[#172438]">{progress === "success" ? "Your seat is confirmed" : progress === "checkout" ? "Opening secure payment" : "Preparing your application"}</h2>
      <p className="mt-2 text-[12px] leading-6 text-[#687486]">{progress === "success" ? "Your enrollment has been submitted successfully." : progress === "checkout" ? "Your application is saved. Complete payment in the secure Cashfree window; we’ll confirm your seat when you return." : "We’re checking your profile and saving your exam enrollment. Please keep this page open."}</p>
      {progress === "success" && successApplicationNumber && <p className="mt-5 rounded-xl border border-[#eee8db] bg-[#f8f5ed] px-4 py-3 text-[11px] font-bold text-[#344258]">Application number · {successApplicationNumber}</p>}
      {progress === "success" && <div className="mt-6 flex flex-wrap justify-center gap-2"><Link href="/exams/dashboard?section=enrollments" className="rounded-xl bg-[#172438] px-4 py-3 text-[11px] font-bold text-white">View my enrollment</Link><button type="button" onClick={() => setProgress("idle")} className="rounded-xl border border-[#deded7] px-4 py-3 text-[11px] font-semibold text-[#687486]">Close</button></div>}
    </section></div>}
  </div>;
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.05] px-3.5 py-3"><p className="text-[8px] font-bold uppercase tracking-[.12em] text-white/45">{label}</p><p className="mt-1.5 text-[10px] font-semibold text-white">{value}</p></div>;
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-[#e2e1da] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#9b6d20]">{label}</p><p className="mt-2 font-heading text-[15px] font-extrabold">{value}</p><p className="mt-1 text-[9px] text-[#8a949f]">{detail}</p></article>;
}

function DateLine({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 text-[10px]"><span className="text-[#818b97]">{label}</span><span className="text-right font-semibold text-[#344258]">{value}</span></div>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${status === "registration_open" ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-white/70"}`}>{statusText(status)}</span>;
}

function statusText(status: string) { return status.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "To be announced";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

function formatTime(value: string | null) {
  if (!value) return "To be announced";
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hours, minutes));
}

function formatFee(value: string) {
  const fee = Number(value);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number.isFinite(fee) ? fee : 0);
}
