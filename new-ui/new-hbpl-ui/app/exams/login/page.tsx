"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { loginStudentAccount } from "@/src/lib/exams-api";

const inputCls = "w-full bg-page border border-border rounded-xl px-4 py-3 text-text-primary text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

export default function StudentLoginPage() {
  return <Suspense fallback={<div className="bg-page min-h-screen" />}><StudentLoginContent /></Suspense>;
}

function StudentLoginContent() {
  const params = useSearchParams();
  const exam = params.get("exam") ?? "";
  const next = params.get("next") ?? "";
  const returnPath = next.startsWith("/exams/") && !next.startsWith("//") ? next : "";
  const authQuery = returnPath ? `?next=${encodeURIComponent(returnPath)}` : exam ? `?exam=${encodeURIComponent(exam)}` : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const result = await loginStudentAccount({ email, password });
      localStorage.setItem("student_token", result.token);
      window.location.href = returnPath || `/exams/dashboard${exam ? `?exam=${encodeURIComponent(exam)}` : ""}`;
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to log in."); }
    finally { setLoading(false); }
  }

  return <div className="bg-page min-h-screen"><div className="max-w-xl mx-auto px-8 py-20"><Link href="/exams" className="text-text-muted text-[13px]">&larr; Back to examinations</Link><div className="bg-white rounded-3xl shadow p-8 mt-6"><p className="text-[11px] uppercase tracking-wider text-accent font-semibold">Student account</p><h1 className="font-heading font-extrabold text-[34px] text-primary mt-2">Log in to continue</h1><p className="text-text-muted text-[14px] mt-3">Use the same account to apply for new examinations and view results from earlier sessions.</p><form onSubmit={handleSubmit} className="space-y-5 mt-8"><label className="flex flex-col gap-1.5 text-[13px] font-semibold">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></label><label className="flex flex-col gap-1.5 text-[13px] font-semibold">Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} /></label>{error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-[13px]">{error}</div>}<button disabled={loading} className="w-full bg-primary text-white font-semibold text-[15px] px-6 py-4 rounded-xl disabled:opacity-60">{loading ? "Logging in..." : "Log in"}</button></form><div className="mt-5 flex flex-wrap justify-between gap-3 text-[13px]"><Link href={`/exams/password-reset${authQuery}`} className="text-primary font-semibold">Forgot password?</Link><span className="text-text-muted">New student? <Link href={`/exams/account/register${authQuery}`} className="text-primary font-semibold">Create an account</Link></span></div></div></div></div>;
}
