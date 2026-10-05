"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchSchoolSuggestions, registerStudentAccount, resendStudentVerification, SchoolSuggestion, verifyStudentEmail } from "@/src/lib/exams-api";

const inputCls = "w-full rounded-xl border border-[#d9dcd9] bg-white px-3.5 py-3 text-[12px] text-[#243247] outline-none transition placeholder:text-[#a0a7af] focus:border-[#a36d17] focus:ring-2 focus:ring-[#a36d17]/15";
const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-[#778293]";
const classOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
type PersonalDetails = {
  full_name: string;
  email: string;
  gender: string;
  date_of_birth: string;
  class_name: string;
  address: string;
  school_name: string;
  father_name: string;
  mother_name: string;
  phone: string;
};

export default function StudentAccountRegisterPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#f3f2ed]" />}><StudentAccountRegisterContent /></Suspense>;
}

function StudentAccountRegisterContent() {
  const params = useSearchParams();
  const exam = params.get("exam") ?? "";
  const requestedNext = params.get("next") ?? "";
  const next = requestedNext.startsWith("/exams/") && !requestedNext.startsWith("//") ? requestedNext : "";
  const authQuery = next ? `?next=${encodeURIComponent(next)}` : exam ? `?exam=${encodeURIComponent(exam)}` : "";
  const [details, setDetails] = useState<PersonalDetails>({
    full_name: "", email: "", gender: "", date_of_birth: "", class_name: "", address: "", school_name: "",
    father_name: "", mother_name: "", phone: "",
  });
  const [schools, setSchools] = useState<SchoolSuggestion[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"register" | "verify">("register");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchSchoolSuggestions().then(setSchools).catch(() => setSchools([])); }, []);

  function setField(key: keyof PersonalDetails, value: string) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  async function register(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (!photo || !signature) {
      setError("Upload both your photo and signature to continue.");
      setLoading(false);
      return;
    }
    try {
      const result = await registerStudentAccount({ ...details, password, photo, signature });
      setNotice(result.detail);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await verifyStudentEmail({ email: details.email, code });
      window.location.href = `/exams/login${authQuery}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify your email.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setLoading(true);
    setError("");
    try {
      const result = await resendStudentVerification(details.email);
      setNotice(result.detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend the code.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="min-h-screen bg-[#f3f2ed] px-4 py-8 text-[#172438] sm:px-6 sm:py-12">
    <main className="mx-auto max-w-3xl">
      <Link href={`/exams/login${authQuery}`} className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#687486] hover:text-[#172438]">&larr; Back to login</Link>
      <div className="mt-5 overflow-hidden rounded-[24px] border border-[#e3e2dc] bg-white shadow-[0_18px_55px_rgba(23,36,56,.07)]">
        <header className="border-b border-[#efeee9] px-6 py-7 sm:px-9 sm:py-8">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a36d17]">One-time student registration</p>
          <h1 className="mt-2 font-heading text-[28px] font-extrabold tracking-tight sm:text-[34px]">Create your student account</h1>
          <p className="mt-2 max-w-xl text-[12px] leading-5 text-[#778293]">Your profile and exam history stay together in one account across future sessions.</p>
        </header>

        {step === "register" ? <form onSubmit={register} className="divide-y divide-[#efeee9]">
          <section className="px-6 py-6 sm:px-9 sm:py-7">
            <SectionHeading number="01" title="Personal details" detail="These details will be saved to your reusable student profile." />
            <div className="mt-5 grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <label className={labelCls}>Student name<input required maxLength={200} autoComplete="name" value={details.full_name} onChange={(event) => setField("full_name", event.target.value)} className={`${inputCls} mt-1.5 normal-case tracking-normal`} /></label>
              <label className={labelCls}>Email address<input required type="email" autoComplete="email" value={details.email} onChange={(event) => setField("email", event.target.value)} className={`${inputCls} mt-1.5 normal-case tracking-normal`} /></label>
              <label className={labelCls}>Date of birth<input required type="date" autoComplete="bday" value={details.date_of_birth} onChange={(event) => setField("date_of_birth", event.target.value)} className={`${inputCls} mt-1.5 normal-case tracking-normal`} /></label>
              <label className={labelCls}>Gender<select required value={details.gender} onChange={(event) => setField("gender", event.target.value)} className={`${inputCls} mt-1.5 normal-case tracking-normal`}><option value="" disabled>Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
              <label className={labelCls}>Class<select required value={details.class_name} onChange={(event) => setField("class_name", event.target.value)} className={`${inputCls} mt-1.5 normal-case tracking-normal`}><option value="" disabled>Select your class</option>{classOptions.map((className) => <option key={className} value={className}>Class {className}</option>)}</select></label>
              <label className={labelCls}>School name<input required list="registration-school-suggestions" autoComplete="organization" value={details.school_name} onChange={(event) => setField("school_name", event.target.value)} className={`${inputCls} mt-1.5 normal-case tracking-normal`} /><datalist id="registration-school-suggestions">{schools.map((school) => <option key={school.id} value={school.name} />)}</datalist></label>
              <label className={labelCls}>Phone number<input required type="tel" inputMode="tel" autoComplete="tel" value={details.phone} onChange={(event) => setField("phone", event.target.value)} className={`${inputCls} mt-1.5 normal-case tracking-normal`} /></label>
              <label className={labelCls}>Father&apos;s name<input required maxLength={200} autoComplete="off" value={details.father_name} onChange={(event) => setField("father_name", event.target.value)} className={`${inputCls} mt-1.5 normal-case tracking-normal`} /></label>
              <label className={labelCls}>Mother&apos;s name<input required maxLength={200} autoComplete="off" value={details.mother_name} onChange={(event) => setField("mother_name", event.target.value)} className={`${inputCls} mt-1.5 normal-case tracking-normal`} /></label>
              <label className={`${labelCls} sm:col-span-2`}>Address<textarea required rows={3} autoComplete="street-address" value={details.address} onChange={(event) => setField("address", event.target.value)} className={`${inputCls} mt-1.5 resize-y normal-case tracking-normal`} placeholder="House, street, locality, city" /></label>
              <ProfileImageUpload label="Student photo" maxBytes={2 * 1024 * 1024} onChange={setPhoto} />
              <ProfileImageUpload label="Signature" maxBytes={1024 * 1024} onChange={setSignature} />
            </div>
          </section>

          <section className="px-6 py-6 sm:px-9 sm:py-7">
            <SectionHeading number="02" title="Password" detail="Choose a password of at least 8 characters." />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${inputCls} mt-1.5 normal-case tracking-normal`} /></label>
              <label className={labelCls}>Retype password<input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={`${inputCls} mt-1.5 normal-case tracking-normal`} /></label>
            </div>
          </section>

          <footer className="px-6 py-6 sm:px-9">
            {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</div>}
            <button disabled={loading} className="w-full rounded-xl bg-[#172438] px-6 py-3.5 text-[12px] font-bold text-white transition hover:bg-[#273d5c] disabled:opacity-60">{loading ? "Creating account…" : "Create account & send verification code"}</button>
            <p className="mt-3 text-center text-[10px] text-[#8791a0]">You&apos;ll verify your email before signing in.</p>
          </footer>
        </form> : <form onSubmit={verify} className="space-y-5 px-6 py-6 sm:px-9 sm:py-8">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] leading-5 text-emerald-800">{notice || `A verification code was sent to ${details.email}.`}</div>
          <label className={labelCls}>Email address<input type="email" value={details.email} readOnly className={`${inputCls} mt-1.5 normal-case tracking-normal opacity-70`} /></label>
          <label className={labelCls}>Verification code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={`${inputCls} mt-1.5 normal-case tracking-normal`} /></label>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</div>}
          <button disabled={loading} className="w-full rounded-xl bg-[#172438] px-6 py-3.5 text-[12px] font-bold text-white disabled:opacity-60">{loading ? "Verifying…" : "Verify email"}</button>
          <button type="button" onClick={resend} disabled={loading} className="w-full text-[11px] font-bold text-[#8c5b10] disabled:opacity-60">Resend code</button>
        </form>}
      </div>
    </main>
  </div>;
}

function SectionHeading({ number, title, detail }: { number: string; title: string; detail: string }) {
  return <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f3ead8] text-[10px] font-extrabold text-[#9b6815]">{number}</span><div><h2 className="text-[14px] font-extrabold">{title}</h2><p className="mt-0.5 text-[10px] text-[#778293]">{detail}</p></div></div>;
}

function ProfileImageUpload({ label, maxBytes, onChange }: { label: string; maxBytes: number; onChange: (file: File | null) => void }) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const id = `registration-${label.toLowerCase().replaceAll(" ", "-")}`;

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > maxBytes) {
      setError(`Choose an image no larger than ${Math.floor(maxBytes / (1024 * 1024))} MB.`);
      event.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    setError("");
    onChange(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  return <div className={labelCls}>
    <label htmlFor={id}>{label} <span className="font-medium normal-case tracking-normal text-[#9098a2]">· Required · Max {Math.floor(maxBytes / (1024 * 1024))} MB</span></label>
    <label htmlFor={id} className="mt-1.5 flex min-h-[92px] cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cfd2d0] bg-[#faf9f6] p-3 transition hover:border-[#a36d17]">
      {preview ? <Image src={preview} unoptimized width={64} height={64} alt={`${label} preview`} className="h-16 w-16 rounded-lg border border-[#e3e2dc] bg-white object-cover" /> : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-[#efeee9] text-xl text-[#8c5b10]">+</span>}
      <span className="min-w-0"><span className="block text-[10px] font-bold text-[#344258]">{preview ? "Replace image" : `Upload ${label.toLowerCase()}`}</span><span className="mt-1 block text-[9px] font-normal normal-case tracking-normal text-[#828c98]">JPG, PNG, or WebP</span></span>
      <input id={id} type="file" required accept="image/jpeg,image/png,image/webp" onChange={chooseFile} className="sr-only" />
    </label>
    {error && <p role="alert" className="mt-1.5 text-[9px] font-semibold normal-case tracking-normal text-red-700">{error}</p>}
  </div>;
}
