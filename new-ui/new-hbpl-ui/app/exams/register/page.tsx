"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { submitExamRegistration } from "@/src/lib/api";

const CLASS_OPTIONS = ["6", "7", "8", "9", "10", "11", "12"];

type FormState = {
  full_name: string;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  phone: string;
  email: string;
  school_name: string;
  class_name: string;
  address: string;
};

const EMPTY: FormState = {
  full_name: "",
  father_name: "",
  mother_name: "",
  date_of_birth: "",
  phone: "",
  email: "",
  school_name: "",
  class_name: "",
  address: "",
};

export default function ExamRegisterPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [studentImage, setStudentImage] = useState<File | null>(null);
  const [signatureImage, setSignatureImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rollNumber, setRollNumber] = useState<string | null>(null);
  const studentRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await submitExamRegistration({
        ...form,
        student_image: studentImage,
        signature_image: signatureImage,
      });
      setRollNumber(result.roll_number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (rollNumber) {
    return (
      <div className="bg-page min-h-screen">
        <div className="max-w-2xl mx-auto px-8 py-24 flex flex-col items-center gap-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="font-heading font-extrabold text-[38px] text-primary tracking-tight">
              Registration Successful!
            </h1>
            <p className="text-text-body text-[16px] leading-[1.7]">
              Your application has been submitted. Please note your roll number carefully.
            </p>
          </div>
          <div className="bg-white rounded-3xl p-10 shadow-[0px_4px_20px_rgba(0,0,0,0.08)] w-full flex flex-col gap-2 items-center">
            <span className="text-text-muted text-[12px] font-semibold tracking-widest uppercase">
              Your Roll Number
            </span>
            <span className="font-heading font-extrabold text-[48px] text-accent leading-none tracking-tight">
              {rollNumber}
            </span>
            <p className="text-text-muted text-[13px] mt-2">
              Keep this safe — you will need it to check results and download your admit card.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/exams/admit-card"
              className="bg-primary text-white font-semibold text-[14px] px-7 py-3.5 rounded-xl hover:bg-primary-dark transition-colors"
            >
              Download Admit Card
            </Link>
            <Link
              href="/exams"
              className="bg-white border border-border text-primary font-semibold text-[14px] px-7 py-3.5 rounded-xl hover:bg-page transition-colors"
            >
              Back to Exam Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <div className="bg-page">
      {/* Header */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-10">
        <div className="flex flex-col gap-3">
          <Link
            href="/exams"
            className="inline-flex items-center gap-2 text-text-muted text-[13px] hover:text-primary transition-colors w-fit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Exam Portal
          </Link>
          <h1 className="font-heading font-extrabold text-[42px] leading-tight text-primary tracking-tight">
            Exam Registration
          </h1>
          <p className="text-text-body text-[15px] max-w-xl leading-[1.7]">
            Fill in your details carefully. Your roll number will be generated automatically.
          </p>
        </div>
      </section>

      {/* Form card */}
      <section className="max-w-3xl mx-auto px-8 pb-20">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] overflow-hidden"
        >
          {/* Section: Personal */}
          <FormSection title="Personal Information" index={1}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Full Name" required>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder="As per school records"
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Date of Birth" required>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => set("date_of_birth", e.target.value)}
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Father's Name">
                <input
                  type="text"
                  value={form.father_name}
                  onChange={(e) => set("father_name", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Mother's Name">
                <input
                  type="text"
                  value={form.mother_name}
                  onChange={(e) => set("mother_name", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </FormSection>

          {/* Section: Contact */}
          <FormSection title="Contact Details" index={2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Mobile Number" required>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="10-digit number"
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Email Address">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="Optional"
                  className={inputCls}
                />
              </Field>
              <Field label="Address" className="md:col-span-2">
                <textarea
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  rows={2}
                  placeholder="Full residential address"
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>
          </FormSection>

          {/* Section: Academic */}
          <FormSection title="Academic Information" index={3}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="School Name" className="md:col-span-2">
                <input
                  type="text"
                  value={form.school_name}
                  onChange={(e) => set("school_name", e.target.value)}
                  placeholder="Full school name"
                  className={inputCls}
                />
              </Field>
              <Field label="Class">
                <select
                  value={form.class_name}
                  onChange={(e) => set("class_name", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select class</option>
                  {CLASS_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </FormSection>

          {/* Section: Documents */}
          <FormSection title="Documents" index={4}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Student Photo" hint="JPG/PNG, max 2MB">
                <FileInput
                  accept="image/*"
                  file={studentImage}
                  ref={studentRef}
                  onChange={setStudentImage}
                  placeholder="Upload photo"
                />
              </Field>
              <Field label="Signature" hint="JPG/PNG on white background">
                <FileInput
                  accept="image/*"
                  file={signatureImage}
                  ref={signatureRef}
                  onChange={setSignatureImage}
                  placeholder="Upload signature"
                />
              </Field>
            </div>
          </FormSection>

          {/* Footer */}
          <div className="px-8 py-7 border-t border-border/60 flex flex-col gap-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-[13px] px-4 py-3 rounded-xl border border-red-200">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white font-semibold text-[15px] px-10 py-4 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed w-fit"
            >
              {loading ? "Submitting…" : "Submit Registration"}
            </button>
            <p className="text-text-muted text-[12px]">
              By submitting you agree that all information provided is accurate and complete.
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-page border border-border rounded-xl px-4 py-3 text-text-primary text-[14px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";

function FormSection({
  title,
  index,
  children,
}: {
  title: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <div className="px-8 py-7 border-b border-border/60">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-7 h-7 rounded-full bg-primary text-white text-[12px] font-extrabold flex items-center justify-center shrink-0">
          {index}
        </span>
        <h2 className="font-heading font-extrabold text-[18px] text-primary">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-[13px] font-semibold text-text-primary">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </label>
      {children}
      {hint && <span className="text-text-muted text-[11px]">{hint}</span>}
    </div>
  );
}

import { forwardRef } from "react";

const FileInput = forwardRef<
  HTMLInputElement,
  {
    accept: string;
    file: File | null;
    placeholder: string;
    onChange: (f: File | null) => void;
  }
>(function FileInput({ accept, file, placeholder, onChange }, ref) {
  return (
    <div
      className="relative border-2 border-dashed border-border rounded-xl px-4 py-5 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 transition-colors bg-page"
      onClick={() => (ref as React.RefObject<HTMLInputElement>).current?.click()}
    >
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      {file ? (
        <span className="text-primary text-[13px] font-medium text-center truncate max-w-full">
          {file.name}
        </span>
      ) : (
        <span className="text-text-muted text-[13px]">{placeholder}</span>
      )}
    </div>
  );
});
