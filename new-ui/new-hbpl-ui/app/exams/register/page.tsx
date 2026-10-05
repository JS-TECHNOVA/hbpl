"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  createCashfreePaymentOrder, createStudentApplication, fetchApplicationHistory, fetchEligibleExams,
  fetchSchoolSuggestions, fetchStudentProfile, ManagedExam, SchoolSuggestion, StudentApplication,
  StudentApplicationInput, submitStudentApplication, updateStudentApplication,
  validateStudentApplicationInput,
} from "@/src/lib/exams-api";
import { openCashfreeCheckout } from "@/src/lib/cashfree-checkout";

type Candidate = StudentApplicationInput & { email: string };
type FieldErrors = Partial<Record<keyof StudentApplicationInput | "exam_id", string>>;

const emptyCandidate: Candidate = {
  full_name: "", father_name: "", mother_name: "", date_of_birth: "", phone: "", email: "",
  school_name: "", class_name: "", address: "",
};
const inputClass = "mt-1.5 w-full rounded-xl border border-[#d9dcd9] bg-white px-3.5 py-3 text-[13px] text-[#243247] outline-none focus:border-[#a36d17] focus:ring-2 focus:ring-[#a36d17]/15";
const labelClass = "block text-[11px] font-bold uppercase tracking-wide text-[#778293]";

export default function ExamRegisterPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#f4f3ee]" />}><ExamRegister /></Suspense>;
}

function ExamRegister() {
  const query = useSearchParams();
  const requestedExam = Number(query.get("exam") ?? 0);
  const requestedApplication = Number(query.get("application") ?? 0);
  const [exams, setExams] = useState<ManagedExam[]>([]);
  const [schools, setSchools] = useState<SchoolSuggestion[]>([]);
  const [examId, setExamId] = useState(requestedExam);
  const [applicationId, setApplicationId] = useState<number | null>(requestedApplication || null);
  const [candidate, setCandidate] = useState<Candidate>(emptyCandidate);
  const [profileReady, setProfileReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const token = localStorage.getItem("student_token") ?? "";
    if (!token) {
      window.location.href = `/exams/login?exam=${requestedExam}`;
      return;
    }
    Promise.all([fetchEligibleExams(token), fetchApplicationHistory(token), fetchStudentProfile(token), fetchSchoolSuggestions()])
      .then(([eligible, history, profile, schoolList]) => {
        const existing = history.applications.find((item) => item.id === requestedApplication)
          ?? history.applications.find((item) => item.exam.id === requestedExam && ["draft", "correction_required", "resubmitted"].includes(item.status));
        setExams(eligible);
        setSchools(schoolList);
        setApplicationId(existing?.id ?? null);
        setExamId(existing?.exam.id ?? (requestedExam || eligible[0]?.id || 0));
        setProfileReady(Boolean(profile.photo_url && profile.signature_url));
        setCandidate(existing ? toCandidate(existing) : {
          full_name: profile.full_name, father_name: profile.father_name, mother_name: profile.mother_name,
          date_of_birth: profile.date_of_birth ?? "", phone: profile.phone, email: profile.email,
          school_name: profile.school_name, class_name: profile.class_name, address: profile.address,
        });
      })
      .catch((reason) => setError(readableError(reason, "Unable to load your enrollment.")))
      .finally(() => setLoading(false));
  }, [requestedApplication, requestedExam]);

  function update(field: keyof Candidate, value: string) {
    setCandidate((current) => ({ ...current, [field]: value }));
    if (field in fieldErrors) setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function applicationInput(): StudentApplicationInput {
    const { email, ...input } = candidate;
    void email;
    return input;
  }

  function validate(): boolean {
    const input = applicationInput();
    const next: FieldErrors = {};
    if (!examId) next.exam_id = "Select the examination you want to apply for.";
    const required: Array<[keyof StudentApplicationInput, string]> = [
      ["full_name", "Enter your full name."], ["date_of_birth", "Enter your date of birth."],
      ["phone", "Enter your mobile number."], ["father_name", "Enter your father's name."],
      ["school_name", "Enter your school name."], ["class_name", "Select your class."], ["address", "Enter your residential address."],
    ];
    required.forEach(([field, message]) => { if (!input[field].trim()) next[field] = message; });
    if (input.phone.trim() && !/^\+?[0-9 ()-]{10,20}$/.test(input.phone)) next.phone = "Enter a valid mobile number.";
    if (input.date_of_birth && new Date(`${input.date_of_birth}T00:00:00`).getTime() > Date.now()) next.date_of_birth = "Date of birth cannot be in the future.";
    setFieldErrors(next);
    if (Object.keys(next).length || validateStudentApplicationInput(input).length) {
      setError("Please correct the highlighted details before continuing.");
      return false;
    }
    return true;
  }

  async function saveDraft(token: string) {
    const input = applicationInput();
    const application = applicationId
      ? await updateStudentApplication(token, applicationId, input)
      : await createStudentApplication(token, { exam_id: examId, ...input });
    setApplicationId(application.id);
    return application;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const token = localStorage.getItem("student_token") ?? "";
    if (!token) { window.location.href = `/exams/login?exam=${examId}`; return; }
    setError("");
    if (!profileReady) {
      setError("Add your photo and signature in your student profile before submitting an exam enrollment.");
      return;
    }
    if (!validate()) return;
    setSaving(true);
    try {
      const application = await saveDraft(token);
      if (application.payment_status === "paid" && application.status === "draft" && application.payment_order_id) {
        window.location.href = `/exams/payment/return?order_id=${encodeURIComponent(application.payment_order_id)}`;
        return;
      }
      if (Number(application.exam.fee) > 0) {
        const order = await createCashfreePaymentOrder(token, application.id);
        if (order.already_paid) { window.location.href = "/exams/dashboard?section=enrollments"; return; }
        await openCashfreeCheckout(order);
        return;
      }
      const complete = await submitStudentApplication(token, application.id);
      window.location.href = `/exams/dashboard?section=enrollments&application=${complete.id}`;
    } catch (reason) {
      setError(readableError(reason, "Unable to submit your enrollment. Your details have not been charged."));
    } finally {
      setSaving(false);
    }
  }

  const profileUrl = `/exams/dashboard?section=profile&return_to=${encodeURIComponent(`/exams/register?exam=${examId || requestedExam}`)}`;
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f4f3ee] text-[13px] text-[#687486]">Loading your enrollment…</main>;

  return <main className="min-h-screen bg-[#f4f3ee] px-4 py-8 text-[#172438] sm:px-8 sm:py-12"><div className="mx-auto max-w-3xl">
    <Link href="/exams/dashboard?section=enrollments" className="text-[11px] font-bold uppercase tracking-[.12em] text-[#687486]">← Student dashboard</Link>
    <form noValidate onSubmit={submit} className="mt-5 overflow-hidden rounded-3xl border border-[#e3e2dc] bg-white shadow-[0_18px_55px_rgba(23,36,56,.07)]">
      <header className="border-b border-[#efeee9] px-6 py-7 sm:px-9"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#a36d17]">HBPL examination entry</p><h1 className="mt-2 font-heading text-[29px] font-extrabold tracking-tight">Confirm your enrollment details</h1><p className="mt-2 text-[12px] leading-5 text-[#778293]">Your saved photo and signature are used on this enrollment. Identity proof is not required.</p></header>
      <section className="space-y-5 px-6 py-6 sm:px-9">
        {!profileReady && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-5 text-amber-900">Your profile still needs a photo and signature. <Link href={profileUrl} className="font-bold underline">Complete profile</Link></div>}
        <label className={labelClass}>Examination<select required aria-invalid={Boolean(fieldErrors.exam_id)} value={examId} onChange={(event) => { setExamId(Number(event.target.value)); setFieldErrors((current) => ({ ...current, exam_id: undefined })); }} className={`${inputClass} ${fieldErrors.exam_id ? "border-red-400" : ""}`}><option value={0}>Select an examination</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} · {exam.session?.name}</option>)}</select>{fieldErrors.exam_id && <FieldError message={fieldErrors.exam_id}/>}</label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Student name" value={candidate.full_name} onChange={(value) => update("full_name", value)} error={fieldErrors.full_name} required autoComplete="name"/>
          <Field label="Date of birth" type="date" value={candidate.date_of_birth} onChange={(value) => update("date_of_birth", value)} error={fieldErrors.date_of_birth} required/>
          <Field label="Father's name" value={candidate.father_name} onChange={(value) => update("father_name", value)} error={fieldErrors.father_name} required/>
          <Field label="Mother's name (optional)" value={candidate.mother_name} onChange={(value) => update("mother_name", value)}/>
          <Field label="Mobile number" value={candidate.phone} onChange={(value) => update("phone", value)} error={fieldErrors.phone} required inputMode="tel" autoComplete="tel"/>
          <Field label="Email" type="email" value={candidate.email} onChange={() => {}} readOnly/>
          <label className={labelClass}>School name<input required aria-invalid={Boolean(fieldErrors.school_name)} list="school-suggestions" value={candidate.school_name} onChange={(event) => update("school_name", event.target.value)} className={`${inputClass} ${fieldErrors.school_name ? "border-red-400" : ""}`}/><datalist id="school-suggestions">{schools.map((school) => <option key={school.id} value={school.name}/>)}</datalist>{fieldErrors.school_name && <FieldError message={fieldErrors.school_name}/>}</label>
          <label className={labelClass}>Class<select required aria-invalid={Boolean(fieldErrors.class_name)} value={candidate.class_name} onChange={(event) => update("class_name", event.target.value)} className={`${inputClass} ${fieldErrors.class_name ? "border-red-400" : ""}`}><option value="">Select class</option>{Array.from({ length: 12 }, (_, index) => String(index + 1)).map((value) => <option key={value} value={value}>Class {value}</option>)}</select>{fieldErrors.class_name && <FieldError message={fieldErrors.class_name}/>}</label>
          <label className={`${labelClass} sm:col-span-2`}>Address<textarea required aria-invalid={Boolean(fieldErrors.address)} rows={3} value={candidate.address} onChange={(event) => update("address", event.target.value)} className={`${inputClass} resize-y ${fieldErrors.address ? "border-red-400" : ""}`}/>{fieldErrors.address && <FieldError message={fieldErrors.address}/>}</label>
        </div>
      </section>
      <footer className="border-t border-[#efeee9] px-6 py-6 sm:px-9">{error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</p>}<button disabled={saving || !examId || !profileReady} className="w-full rounded-xl bg-[#172438] px-5 py-3.5 text-[12px] font-bold text-white disabled:opacity-60">{saving ? "Preparing secure payment…" : "Submit & continue"}</button><p className="mt-3 text-center text-[10px] text-[#8791a0]">Free exams submit immediately. Paid exams open Cashfree securely. If checkout is interrupted, you can continue payment from your dashboard.</p></footer>
    </form>
  </div></main>;
}

function Field({ label, value, onChange, type = "text", required = false, readOnly = false, error, inputMode, autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; readOnly?: boolean; error?: string; inputMode?: "tel"; autoComplete?: string }) {
  return <label className={labelClass}>{label}<input type={type} inputMode={inputMode} autoComplete={autoComplete} required={required} aria-invalid={Boolean(error)} readOnly={readOnly} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} ${readOnly ? "bg-[#f4f3ee] text-[#778293]" : ""} ${error ? "border-red-400" : ""}`}/>{error && <FieldError message={error}/>}</label>;
}

function FieldError({ message }: { message: string }) { return <p role="alert" className="mt-1 normal-case text-[10px] font-semibold tracking-normal text-red-700">{message}</p>; }

function toCandidate(application: StudentApplication): Candidate {
  return { full_name: application.full_name, father_name: application.father_name, mother_name: application.mother_name, date_of_birth: application.date_of_birth ?? "", phone: application.phone, email: application.email, school_name: application.school_name, class_name: application.class_name, address: application.address };
}

function readableError(reason: unknown, fallback: string) { return reason instanceof Error && reason.message ? reason.message : fallback; }
