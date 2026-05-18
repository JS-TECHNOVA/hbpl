"use client";

import { useState } from "react";
import Link from "next/link";
import {
  lookupExamResult,
  downloadAdmitCard,
  downloadCertificate,
  triggerDownload,
  type ExamResult,
} from "@/src/lib/api";

export default function ExamResultsPage() {
  const [rollNumber, setRollNumber] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [dlLoading, setDlLoading] = useState<string | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await lookupExamResult({ roll_number: rollNumber.trim().toUpperCase(), date_of_birth: dob });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No record found. Check your roll number and date of birth.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(type: "admit" | "certificate") {
    if (!result) return;
    setDlLoading(type);
    try {
      const blob =
        type === "admit"
          ? await downloadAdmitCard({ roll_number: result.roll_number, date_of_birth: result.date_of_birth })
          : await downloadCertificate({ roll_number: result.roll_number, date_of_birth: result.date_of_birth });
      triggerDownload(blob, `${type === "admit" ? "admit-card" : "certificate"}-${result.roll_number}.pdf`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDlLoading(null);
    }
  }

  return (
    <div className="bg-page">
      {/* Header */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-10">
        <div className="flex flex-col gap-3">
          <Link href="/exams" className="inline-flex items-center gap-2 text-text-muted text-[13px] hover:text-primary transition-colors w-fit">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Exam Portal
          </Link>
          <h1 className="font-heading font-extrabold text-[42px] leading-tight text-primary tracking-tight">
            Exam Results
          </h1>
          <p className="text-text-body text-[15px] max-w-xl leading-[1.7]">
            Enter your roll number and date of birth to view your result and download documents.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-20 flex flex-col gap-6">
        {/* Lookup form */}
        <form onSubmit={handleLookup} className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] p-8 flex flex-col gap-5">
          <h2 className="font-heading font-extrabold text-[20px] text-primary">Find Your Result</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-text-primary">
                Roll Number <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. HBPL2026001"
                required
                className="w-full bg-page border border-border rounded-xl px-4 py-3 text-text-primary text-[14px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors uppercase"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-text-primary">
                Date of Birth <span className="text-accent">*</span>
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                className="w-full bg-page border border-border rounded-xl px-4 py-3 text-text-primary text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
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
            {loading ? "Searching…" : "Check Result"}
          </button>
        </form>

        {/* Result card */}
        {result && <ResultCard result={result} dlLoading={dlLoading} onDownload={handleDownload} />}
      </section>
    </div>
  );
}

function ResultCard({
  result,
  dlLoading,
  onDownload,
}: {
  result: ExamResult;
  dlLoading: string | null;
  onDownload: (type: "admit" | "certificate") => void;
}) {
  const isPublished = result.result_status === "published";

  return (
    <div className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] overflow-hidden">
      {/* Top banner */}
      <div className="bg-primary px-8 py-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-primary-light text-[12px] font-semibold tracking-widest uppercase mb-1">
            Roll Number
          </p>
          <p className="font-heading font-extrabold text-[28px] text-white leading-none">
            {result.roll_number}
          </p>
        </div>
        <StatusBadge published={isPublished} />
      </div>

      {/* Student info */}
      <div className="px-8 py-6 border-b border-border/60">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <InfoItem label="Student Name" value={result.full_name} />
          <InfoItem label="School" value={result.school_name || "—"} />
          <InfoItem label="Class" value={result.class_name ? `Class ${result.class_name}` : "—"} />
          <InfoItem label="Date of Birth" value={result.date_of_birth} />
        </div>
      </div>

      {/* Result */}
      {isPublished ? (
        <div className="px-8 py-6 border-b border-border/60">
          <h3 className="font-heading font-extrabold text-[16px] text-primary mb-5">Score & Rank</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-primary/5 rounded-2xl p-5 flex flex-col gap-1 text-center">
              <span className="text-text-muted text-[11px] font-semibold tracking-widest uppercase">Marks</span>
              <span className="font-heading font-extrabold text-[32px] text-primary leading-none">
                {result.marks_obtained ?? "—"}
              </span>
              <span className="text-text-muted text-[12px]">/ {result.total_marks ?? "—"}</span>
            </div>
            <div className="bg-accent/8 rounded-2xl p-5 flex flex-col gap-1 text-center">
              <span className="text-text-muted text-[11px] font-semibold tracking-widest uppercase">Rank</span>
              <span className="font-heading font-extrabold text-[32px] text-accent leading-none">
                #{result.rank ?? "—"}
              </span>
            </div>
            <div className="bg-page rounded-2xl p-5 flex flex-col gap-1 text-center">
              <span className="text-text-muted text-[11px] font-semibold tracking-widest uppercase">Remarks</span>
              <span className="font-semibold text-[15px] text-text-primary mt-1">
                {result.remarks || "—"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-8 py-6 border-b border-border/60">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-amber-800 text-[14px]">
            Results have not been published yet. Please check back later.
          </div>
        </div>
      )}

      {/* Downloads */}
      <div className="px-8 py-6">
        <h3 className="font-heading font-extrabold text-[16px] text-primary mb-4">Downloads</h3>
        <div className="flex flex-wrap gap-3">
          <DownloadButton
            label="Admit Card"
            available={result.publish_admit_card}
            loading={dlLoading === "admit"}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
              </svg>
            }
            onClick={() => onDownload("admit")}
          />
          <DownloadButton
            label="Certificate"
            available={isPublished}
            loading={dlLoading === "certificate"}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            }
            onClick={() => onDownload("certificate")}
          />
          {result.test_copy_url && (
            <a
              href={result.test_copy_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-page border border-border text-primary font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-primary-light/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Test Copy
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex items-center gap-1.5 bg-green-500/20 text-green-300 border border-green-500/30 text-[11px] font-extrabold tracking-widest uppercase px-3 py-1.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
      Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-extrabold tracking-widest uppercase px-3 py-1.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      Pending
    </span>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">{label}</span>
      <span className="text-text-primary text-[14px] font-medium">{value}</span>
    </div>
  );
}

function DownloadButton({
  label,
  available,
  loading,
  icon,
  onClick,
}: {
  label: string;
  available: boolean;
  loading: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  if (!available) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 bg-page border border-border text-text-muted font-semibold text-[14px] px-5 py-3 rounded-xl cursor-not-allowed opacity-50"
      >
        {icon}
        {label}
        <span className="text-[11px] normal-case font-normal ml-1">(not yet available)</span>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 bg-primary text-white font-semibold text-[14px] px-5 py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        icon
      )}
      {loading ? "Downloading…" : label}
    </button>
  );
}
