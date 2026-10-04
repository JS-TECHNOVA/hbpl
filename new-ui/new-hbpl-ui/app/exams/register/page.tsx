"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { createCashfreePaymentOrder, createStudentApplication, fetchApplicationHistory, fetchEligibleExams, fetchSchoolSuggestions, fetchStudentProfile, ManagedExam, SchoolSuggestion, submitStudentApplication, StudentApplication, updateStudentApplication, uploadStudentApplicationDocument } from "@/src/lib/exams-api";
import { openCashfreeCheckout } from "@/src/lib/cashfree-checkout";

const inputCls = "w-full bg-page border border-border rounded-xl px-4 py-3 text-text-primary text-[14px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
type CandidateForm = { full_name: string; father_name: string; mother_name: string; date_of_birth: string; phone: string; email: string; school_name: string; class_name: string; address: string };
type DocumentKind = "photo" | "signature" | "id_proof";
const emptyCandidate: CandidateForm = { full_name: "", father_name: "", mother_name: "", date_of_birth: "", phone: "", email: "", school_name: "", class_name: "", address: "" };

export default function ExamRegisterPage() {
  return <Suspense fallback={<div className="bg-page min-h-screen" />}><ExamRegisterContent /></Suspense>;
}

function ExamRegisterContent() {
  const searchParams = useSearchParams();
  const requestedExam = Number(searchParams.get("exam") ?? 0);
  const requestedApplication = Number(searchParams.get("application") ?? 0);
  const [exams, setExams] = useState<ManagedExam[]>([]);
  const [schools, setSchools] = useState<SchoolSuggestion[]>([]);
  const [examId, setExamId] = useState(requestedExam);
  const [candidate, setCandidate] = useState<CandidateForm>(emptyCandidate);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<"saving" | "checkout">("saving");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<Record<DocumentKind, File | null>>({ photo: null, signature: null, id_proof: null });
  const [savedDocuments, setSavedDocuments] = useState<Partial<Record<DocumentKind, string>>>({});

  useEffect(() => {
    const token = localStorage.getItem("student_token") ?? "";
    if (!token) { window.location.href = `/exams/login?exam=${requestedExam}`; return; }
    Promise.all([fetchEligibleExams(token), fetchStudentProfile(token), fetchApplicationHistory(token), fetchSchoolSuggestions()])
      .then(([eligible, profile, history, schoolSuggestions]) => {
        setExams(eligible);
        setSchools(schoolSuggestions);
        const resumable = history.applications.find((application) => application.id === requestedApplication && ["draft", "correction_required"].includes(application.status))
          ?? history.applications.find((application) => (!requestedExam || application.exam.id === requestedExam) && ["draft", "correction_required"].includes(application.status));
        const initialExamId = requestedExam || resumable?.exam.id || eligible[0]?.id || 0;
        if (!requestedExam && initialExamId) setExamId(initialExamId);
        if (requestedExam && !eligible.some((exam) => exam.id === requestedExam)) setError("This examination is not available for your profile.");
        setCandidate(resumable ? {
          full_name: resumable.full_name, father_name: resumable.father_name, mother_name: resumable.mother_name,
          date_of_birth: resumable.date_of_birth ?? "", phone: resumable.phone, email: resumable.email,
          school_name: resumable.school_name, class_name: resumable.class_name, address: resumable.address,
        } : {
          full_name: profile.full_name || "", father_name: profile.father_name,
          mother_name: profile.mother_name, date_of_birth: profile.date_of_birth ?? "", phone: profile.phone,
          email: profile.email, school_name: profile.school_name, class_name: profile.class_name, address: profile.address,
        });
        setApplicationId(resumable?.id ?? null);
        setSavedDocuments(Object.fromEntries((resumable?.documents ?? []).map((document) => [document.document_type, document.file_url])));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load your eligible examinations."))
      .finally(() => setLoading(false));
  }, [requestedExam, requestedApplication]);

  function setField(key: keyof CandidateForm, value: string) { setCandidate((current) => ({ ...current, [key]: value })); }

  function applicationPayload() {
    return { ...candidate };
  }

  async function saveApplication(token: string, submit: boolean) {
    let application: StudentApplication;
    if (applicationId) application = await updateStudentApplication(token, applicationId, applicationPayload());
    else application = await createStudentApplication(token, { exam_id: examId, ...applicationPayload() });
    setApplicationId(application.id);
    for (const [type, file] of Object.entries(documents)) if (file) {
      const uploaded = await uploadStudentApplicationDocument(token, application.id, type, file);
      setSavedDocuments((current) => ({ ...current, [type]: uploaded.file_url }));
      setDocuments((current) => ({ ...current, [type]: null }));
    }
    if (submit) return submitStudentApplication(token, application.id);
    return application;
  }

  async function handleSaveDraft() {
    const token = localStorage.getItem("student_token") ?? "";
    if (!token) { window.location.href = `/exams/login?exam=${examId}`; return; }
    setSubmitting(true); setSubmitProgress("saving"); setError("");
    try { await saveApplication(token, false); setSuccess("draft-saved"); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to save your draft."); }
    finally { setSubmitting(false); }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const token = localStorage.getItem("student_token") ?? "";
    if (!token) { window.location.href = `/exams/login?exam=${examId}`; return; }
    setSubmitting(true); setSubmitProgress("saving"); setError("");
    try {
      const selectedExam = exams.find((exam) => exam.id === examId);
      const requiresPayment = Number(selectedExam?.fee ?? 0) > 0;
      const saved = await saveApplication(token, false);
      if (requiresPayment && saved.payment_status !== "paid") {
        setSubmitProgress("checkout");
        const order = await createCashfreePaymentOrder(token, saved.id);
        if (order.already_paid) {
          window.location.href = "/exams/dashboard?section=enrollments";
          return;
        }
        await openCashfreeCheckout(order);
        setError("Checkout closed before payment confirmation. You can resume payment from your dashboard.");
        return;
      }
      const submitted = await submitStudentApplication(token, saved.id);
      setSuccess(submitted.application_number ?? "Submitted");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to submit your application."); }
    finally { setSubmitting(false); }
  }

  if (success) return <div className="bg-page min-h-screen"><div className="max-w-2xl mx-auto px-8 py-24 text-center"><div className="bg-white rounded-3xl p-10 shadow"><div className="text-emerald-600 text-5xl">&#10003;</div><h1 className="font-heading font-extrabold text-[34px] text-primary mt-4">{success === "draft-saved" ? "Draft saved" : "Application submitted"}</h1><p className="text-text-muted mt-3">{success === "draft-saved" ? "You can continue your application from your dashboard." : "Your application number is"}</p>{success !== "draft-saved" && <p className="font-heading font-extrabold text-[34px] text-accent mt-2">{success}</p>}<Link href="/exams/dashboard" className="inline-flex mt-8 bg-primary text-white font-semibold text-[14px] px-7 py-3.5 rounded-xl">Open dashboard</Link></div></div></div>;

  return <div className="min-h-screen bg-[#f4f3ee] text-[#172438]">
    <header className="border-b border-[#deded7] bg-[#f8f7f2]">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <Link href="/exams/dashboard" className="text-[12px] font-semibold uppercase tracking-[.14em] text-[#687486]">← Student dashboard</Link>
        <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
          <div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#a36d17]">HBPL · Examination entry</p><h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight sm:text-[40px]">Your exam application</h1><p className="mt-2 max-w-xl text-[14px] leading-6 text-[#667184]">Your student profile carries forward. This enrollment is saved separately for the selected exam.</p></div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#687486]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#172438] text-white">1</span><span>Details</span><span className="mx-1 h-px w-8 bg-[#d1d1ca]"/><span className="grid h-7 w-7 place-items-center rounded-full border border-[#c5c6c2]">2</span><span>Review</span></div>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      {loading ? <div className="rounded-2xl border border-[#e0e0d9] bg-white p-12 text-center text-[13px] text-[#687486]">Loading your eligible examinations…</div> : <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-hidden rounded-2xl border border-[#e0e0d9] bg-white">
          <section className="border-b border-[#ecece7] p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f3ead8] text-[12px] font-bold text-[#9b6815]">01</span><div><h2 className="text-[16px] font-bold">Choose examination</h2><p className="mt-0.5 text-[12px] text-[#778293]">Each exam has its own application and admit card.</p></div></div>
            <label className="block text-[12px] font-semibold text-[#526074]">Examination<select value={examId} onChange={(e) => setExamId(Number(e.target.value))} required className={`${inputCls} mt-1.5`}><option value={0}>Select an eligible exam</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} · {exam.session?.name ?? "Session not set"}</option>)}</select></label>
          </section>
          <section className="border-b border-[#ecece7] p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eef1f4] text-[12px] font-bold text-[#34465e]">02</span><div><h2 className="text-[16px] font-bold">Student details</h2><p className="mt-0.5 text-[12px] text-[#778293]">Enter the details that should appear on this exam record.</p></div></div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <label className="text-[12px] font-semibold text-[#526074]">Student’s full name<input required value={candidate.full_name} onChange={(e) => setField("full_name", e.target.value)} className={`${inputCls} mt-1.5`} autoComplete="name" /></label>
              <label className="text-[12px] font-semibold text-[#526074]">Date of birth<input type="date" required value={candidate.date_of_birth} onChange={(e) => setField("date_of_birth", e.target.value)} className={`${inputCls} mt-1.5`} /></label>
              <label className="text-[12px] font-semibold text-[#526074]">Father’s name<input value={candidate.father_name} onChange={(e) => setField("father_name", e.target.value)} className={`${inputCls} mt-1.5`} autoComplete="off" /></label>
              <label className="text-[12px] font-semibold text-[#526074]">Mother’s name<input value={candidate.mother_name} onChange={(e) => setField("mother_name", e.target.value)} className={`${inputCls} mt-1.5`} autoComplete="off" /></label>
              <label className="text-[12px] font-semibold text-[#526074]">Mobile number<input required value={candidate.phone} onChange={(e) => setField("phone", e.target.value)} className={`${inputCls} mt-1.5`} autoComplete="tel" /></label>
              <label className="text-[12px] font-semibold text-[#526074]">Account email<input type="email" required value={candidate.email} readOnly className={`${inputCls} mt-1.5 bg-[#f5f5f1] text-[#788394]`} /></label>
              <label className="text-[12px] font-semibold text-[#526074]">School name<span className="mt-1 block font-normal text-[#8791a0]">Type freely; suggestions appear as you enter a name.</span><input list="school-suggestions" value={candidate.school_name} onChange={(e) => setField("school_name", e.target.value)} className={`${inputCls} mt-1.5`} autoComplete="organization" /><datalist id="school-suggestions">{schools.map((school) => <option key={school.id} value={school.name} />)}</datalist></label>
              <label className="text-[12px] font-semibold text-[#526074]">Current class<input required value={candidate.class_name} onChange={(e) => setField("class_name", e.target.value)} className={`${inputCls} mt-1.5`} placeholder="For example, Class 10" /></label>
              <label className="text-[12px] font-semibold text-[#526074] sm:col-span-2">Address<textarea rows={3} value={candidate.address} onChange={(e) => setField("address", e.target.value)} className={`${inputCls} mt-1.5 resize-y`} autoComplete="street-address" /></label>
            </div>
          </section>
          <section className="p-5 sm:p-7">
            <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#a36d17]">02 · Your uploads</p><h2 className="mt-1 text-[17px] font-bold">Photo and signature</h2><p className="mt-1 max-w-2xl text-[12px] leading-5 text-[#778293]">Use clear, recent images on a plain background. These uploads are optional unless the exam instructions require them. File size is checked before upload, and you can preview each file here.</p></div>
            <div className="grid gap-4 lg:grid-cols-2">
              <DocumentUpload kind="photo" title="Passport-size photo" hint="Recent, front-facing photo · JPG, PNG or WebP" maxBytes={2 * 1024 * 1024} accept="image/jpeg,image/png,image/webp" file={documents.photo} savedUrl={savedDocuments.photo} onChange={(file) => setDocuments((current) => ({ ...current, photo: file }))}/>
              <DocumentUpload kind="signature" title="Your signature" hint="Sign on plain white paper · JPG, PNG or WebP" maxBytes={1 * 1024 * 1024} accept="image/jpeg,image/png,image/webp" file={documents.signature} savedUrl={savedDocuments.signature} onChange={(file) => setDocuments((current) => ({ ...current, signature: file }))}/>
              <DocumentUpload kind="id_proof" title="Identity proof" hint="A clear scan or photo · JPG, PNG, WebP or PDF" maxBytes={5 * 1024 * 1024} accept="image/jpeg,image/png,image/webp,application/pdf" file={documents.id_proof} savedUrl={savedDocuments.id_proof} onChange={(file) => setDocuments((current) => ({ ...current, id_proof: file }))}/>
            </div>
            <p className="mt-4 text-[10px] text-[#818b97]">Photo up to 2 MB · Signature up to 1 MB · Identity proof up to 5 MB. Documents are attached to this exam enrollment.</p>
          </section>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-6">
          <section className="rounded-2xl bg-[#172438] p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#dfb75f]">Before submitting</p><h2 className="mt-3 font-heading text-[18px] font-bold">One exam, one record</h2><p className="mt-2 text-[12px] leading-5 text-white/70">Your profile stays on your account. This form creates or updates only the enrollment for the selected examination.</p><div className="mt-4 border-t border-white/15 pt-4 text-[11px] leading-5 text-white/65">After submission, staff review the enrollment. If approved, your exam-specific centre and admit card appear here.</div></section>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</div>}
          <section className="rounded-2xl border border-[#e0e0d9] bg-white p-4"><button type="button" onClick={() => void handleSaveDraft()} disabled={submitting || !examId} className="w-full rounded-xl border border-[#c9cdd1] px-4 py-3 text-[12px] font-bold text-[#34465e] transition hover:bg-[#f5f6f6] disabled:opacity-50">{submitting && submitProgress === "saving" ? "Saving…" : "Save and finish later"}</button><button disabled={submitting || !examId || exams.length === 0} className="mt-2 w-full rounded-xl bg-[#a36d17] px-4 py-3 text-[12px] font-bold text-white transition hover:bg-[#8c5b10] disabled:opacity-50">{submitting ? submitProgress === "checkout" ? "Opening payment…" : "Submitting…" : "Submit application"}</button><p className="mt-3 text-center text-[10px] leading-4 text-[#8791a0]">You can review your application status from your dashboard.</p></section>
        </aside>
      </form>}
    </main>
    {submitting && <div className="fixed inset-0 z-[100] grid place-items-center bg-[#101c2e]/70 px-4 py-8 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="submit-progress-title" className="w-full max-w-md rounded-3xl border border-[#e8e5dc] bg-[#fffefa] p-8 text-center shadow-2xl"><div className="mx-auto h-12 w-12 animate-spin rounded-full border-[3px] border-[#e6dfd0] border-t-[#a36d17]" aria-hidden="true"/><p className="mt-5 text-[9px] font-bold uppercase tracking-[.18em] text-[#9b6d20]">HBPL · Examination entry</p><h2 id="submit-progress-title" className="mt-2 font-heading text-[22px] font-extrabold">{submitProgress === "checkout" ? "Opening secure payment" : "Submitting your application"}</h2><p className="mt-2 text-[12px] leading-6 text-[#687486]">{submitProgress === "checkout" ? "Your details are saved. Please complete payment in Cashfree; we’ll confirm your seat when you return." : "We’re saving your details and documents. Please keep this page open while we prepare your enrollment."}</p></section></div>}
  </div>;
}

function DocumentUpload({ kind, title, hint, maxBytes, accept, file, savedUrl, onChange }: {
  kind: DocumentKind;
  title: string;
  hint: string;
  maxBytes: number;
  accept: string;
  file: File | null;
  savedUrl?: string;
  onChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const displayedFile = file;
  const isImage = displayedFile ? displayedFile.type.startsWith("image/") : Boolean(savedUrl && /\.(png|jpe?g|webp)(?:[?#]|$)/i.test(savedUrl));
  const previewSource = displayedFile ? preview : savedUrl;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;
    if (selected.size > maxBytes) {
      setValidationError(`Choose a file smaller than ${formatSize(maxBytes)}.`);
      return;
    }
    const allowedTypes = accept.split(",");
    if (!allowedTypes.includes(selected.type)) {
      setValidationError(`This file type isn’t supported. ${hint}`);
      return;
    }
    setValidationError("");
    setPreview(null);
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
      reader.readAsDataURL(selected);
    }
    onChange(selected);
  }

  function removeSelectedFile() {
    setPreview(null);
    setValidationError("");
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  }

  const inputId = `application-document-${kind}`;
  return <article className="overflow-hidden rounded-2xl border border-[#e1e1da] bg-[#fbfbf8]">
    <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4"><div><h3 className="text-[12px] font-bold text-[#344258]">{title}</h3><p className="mt-1 text-[10px] leading-4 text-[#7b8793]">{hint}</p></div><span className="shrink-0 rounded-full bg-[#f0eee7] px-2.5 py-1 text-[9px] font-bold text-[#806126]">Max {formatSize(maxBytes)}</span></div>
    {previewSource ? <div className="mx-4 mb-3 flex min-h-28 items-center gap-4 rounded-xl border border-[#e5e3db] bg-white p-3">
      {isImage ? <Image unoptimized width={kind === "signature" ? 256 : 192} height={kind === "signature" ? 160 : 224} src={previewSource} alt={`${title} preview`} className={`shrink-0 rounded-lg bg-[#f4f3ee] object-contain ${kind === "signature" ? "h-20 w-32" : "h-28 w-24"}`}/> : <div className="grid h-20 w-16 shrink-0 place-items-center rounded-lg bg-[#f5f0e3] text-[10px] font-black tracking-wide text-[#89651f]">PDF</div>}
      <div className="min-w-0"><p className="truncate text-[10px] font-bold text-[#35465c]">{file?.name ?? (savedUrl ? "Previously uploaded file" : "Selected file")}</p><p className="mt-1 text-[9px] text-emerald-700">{file ? formatSize(file.size) : "Saved to this application"}</p><div className="mt-3 flex flex-wrap gap-3"><label htmlFor={inputId} className="cursor-pointer text-[10px] font-bold text-[#8c5b10] hover:underline">Replace file</label>{file && <button type="button" onClick={removeSelectedFile} className="text-[10px] font-semibold text-[#778293] hover:text-red-600">Remove</button>}{savedUrl && !file && <a href={savedUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#315b82] hover:underline">Open saved file</a>}</div></div>
    </div> : <label htmlFor={inputId} className="mx-4 mb-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#d2d4d1] bg-white px-4 py-5 text-center transition hover:border-[#a36d17] hover:bg-[#fffdf8] focus-within:ring-2 focus-within:ring-[#a36d17]/20"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f3ead8] text-[17px] font-semibold text-[#9b6815]">+</span><span className="mt-2 text-[10px] font-bold text-[#46566a]">Choose {kind === "id_proof" ? "a file" : "an image"}</span><span className="mt-1 text-[9px] text-[#9299a1]">or drop it here · {formatSize(maxBytes)} max</span></label>}
    <input ref={inputRef} id={inputId} type="file" accept={accept} onChange={handleFileChange} className="sr-only" aria-label={`Upload ${title}`}/>
    {validationError && <p role="alert" className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-[10px] text-red-700">{validationError}</p>}
  </article>;
}

function formatSize(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
