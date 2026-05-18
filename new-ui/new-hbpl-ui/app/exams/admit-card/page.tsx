"use client";

import { useState } from "react";
import Link from "next/link";
import { downloadAdmitCard, triggerDownload } from "@/src/lib/api";

export default function AdmitCardPage() {
  const [rollNumber, setRollNumber] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const blob = await downloadAdmitCard({
        roll_number: rollNumber.trim().toUpperCase(),
        date_of_birth: dob,
      });
      triggerDownload(blob, `admit-card-${rollNumber.toUpperCase()}.pdf`);
      setDownloaded(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Admit card is not available yet or credentials are incorrect.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-page min-h-screen">
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
            Download Admit Card
          </h1>
          <p className="text-text-body text-[15px] max-w-xl leading-[1.7]">
            Enter your roll number and date of birth to download your hall ticket.
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-8 pb-20">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] p-10 flex flex-col gap-6"
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
            </svg>
          </div>

          <div className="flex flex-col gap-5">
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

          {downloaded && !error && (
            <div className="bg-green-50 text-green-700 text-[13px] px-4 py-3 rounded-xl border border-green-200 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Admit card downloaded successfully. Check your downloads folder.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white font-semibold text-[15px] px-8 py-4 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center gap-2 w-fit"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Downloading…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Admit Card
              </>
            )}
          </button>

          <p className="text-text-muted text-[12px]">
            Admit cards are available only after official release. Contact us at{" "}
            <Link href="/exams/grievance" className="text-primary hover:underline">
              grievance
            </Link>{" "}
            if you face any issues.
          </p>
        </form>
      </section>
    </div>
  );
}
