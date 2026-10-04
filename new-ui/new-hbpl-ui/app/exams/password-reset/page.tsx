"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestStudentPasswordReset } from "@/src/lib/exams-api";

const inputCls = "w-full rounded-xl border border-border bg-page px-4 py-3 text-[14px] text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setNotice("");
    try {
      const response = await requestStudentPasswordReset(email);
      setNotice(response.detail);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to request a reset link."); }
    finally { setLoading(false); }
  }

  return <main className="min-h-screen bg-page px-5 py-16"><div className="mx-auto max-w-lg"><Link href="/exams/login" className="text-[13px] text-text-muted">&larr; Back to login</Link><section className="mt-6 rounded-3xl bg-white p-7 shadow sm:p-9"><p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Account security</p><h1 className="mt-2 font-heading text-[32px] font-extrabold text-primary">Reset your password</h1><p className="mt-3 text-[14px] leading-6 text-text-muted">Enter the email on your verified student account. If it matches, we’ll send a secure reset link.</p><form onSubmit={submit} className="mt-7 space-y-5"><label className="flex flex-col gap-2 text-[13px] font-semibold">Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls}/></label>{notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] leading-5 text-emerald-800">{notice}</p>}{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>}<button disabled={loading} className="w-full rounded-xl bg-primary px-5 py-4 text-[14px] font-semibold text-white disabled:opacity-60">{loading ? "Sending…" : "Send reset link"}</button></form></section></div></main>;
}
