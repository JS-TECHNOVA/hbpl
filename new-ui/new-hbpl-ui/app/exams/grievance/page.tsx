"use client";

import { useState } from "react";
import Link from "next/link";
import { submitComplaint, checkComplaintStatus } from "@/src/lib/api";

type Tab = "submit" | "status";

export default function GrievancePage() {
  const [tab, setTab] = useState<Tab>("submit");

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
            Grievance Portal
          </h1>
          <p className="text-text-body text-[15px] max-w-xl leading-[1.7]">
            Raise a query or complaint regarding your exam registration, result, or documents.
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-8 pb-20 flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-white rounded-2xl shadow-[0px_1px_3px_rgba(0,0,0,0.06)] border border-border/60 w-fit">
          <TabButton active={tab === "submit"} onClick={() => setTab("submit")}>
            Submit Grievance
          </TabButton>
          <TabButton active={tab === "status"} onClick={() => setTab("status")}>
            Check Status
          </TabButton>
        </div>

        {tab === "submit" ? <SubmitForm /> : <StatusCheck />}
      </section>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
        active
          ? "bg-primary text-white shadow-sm"
          : "text-text-muted hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function SubmitForm() {
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await submitComplaint({ name, roll_number: rollNumber.trim().toUpperCase(), message, screenshot });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] p-10 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="font-heading font-extrabold text-[24px] text-primary mb-2">Grievance Submitted</h2>
          <p className="text-text-body text-[15px] leading-[1.7]">
            Your complaint has been received. Use the <strong>Check Status</strong> tab to track its progress.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] p-8 flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-text-primary">
          Your Name <span className="text-accent">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-text-primary">
          Roll Number <span className="text-accent">*</span>
        </label>
        <input
          type="text"
          value={rollNumber}
          onChange={(e) => setRollNumber(e.target.value)}
          placeholder="HBPL2026001"
          required
          className={`${inputCls} uppercase`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-text-primary">
          Message <span className="text-accent">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Describe your issue clearly…"
          required
          className={`${inputCls} resize-none`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-text-primary">
          Screenshot <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <label className="relative border-2 border-dashed border-border rounded-xl px-4 py-5 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 transition-colors bg-page">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
          />
          <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className={`text-[13px] ${screenshot ? "text-primary font-medium" : "text-text-muted"}`}>
            {screenshot ? screenshot.name : "Upload screenshot"}
          </span>
        </label>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-[13px] px-4 py-3 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-primary text-white font-semibold text-[15px] px-8 py-4 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 w-fit"
      >
        {loading ? "Submitting…" : "Submit Grievance"}
      </button>
    </form>
  );
}

function StatusCheck() {
  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    status: string;
    admin_note: string;
    message: string;
  } | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      const result = await checkComplaintStatus(rollNumber.trim().toUpperCase());
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No complaint found for this roll number.");
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-50 border-amber-200 text-amber-800",
    under_review: "bg-blue-50 border-blue-200 text-blue-800",
    resolved: "bg-green-50 border-green-200 text-green-800",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    under_review: "Under Review",
    resolved: "Resolved",
  };

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={handleCheck}
        className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] p-8 flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-text-primary">
            Roll Number <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="HBPL2026001"
            required
            className={`${inputCls} uppercase`}
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-[13px] px-4 py-3 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white font-semibold text-[15px] px-8 py-3.5 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 w-fit"
        >
          {loading ? "Checking…" : "Check Status"}
        </button>
      </form>

      {status && (
        <div className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] p-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-extrabold text-[18px] text-primary">Complaint Status</h3>
            <span
              className={`text-[12px] font-extrabold tracking-wider uppercase px-3 py-1.5 rounded-full border ${
                statusColors[status.status] ?? "bg-page border-border text-text-muted"
              }`}
            >
              {statusLabels[status.status] ?? status.status}
            </span>
          </div>
          {status.message && (
            <p className="text-text-body text-[14px] leading-relaxed">{status.message}</p>
          )}
          {status.admin_note && (
            <div className="bg-primary-light/30 border border-primary/15 rounded-2xl px-5 py-4">
              <p className="text-[12px] font-semibold text-primary mb-1 uppercase tracking-wider">Admin Note</p>
              <p className="text-text-primary text-[14px]">{status.admin_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full bg-page border border-border rounded-xl px-4 py-3 text-text-primary text-[14px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";
