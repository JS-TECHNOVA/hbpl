"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { loginStudentAccount, resendStudentVerification, verifyStudentEmail } from "@/src/lib/exams-api";

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
  const [notice, setNotice] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"login" | "verify">("login");
  const [loading, setLoading] = useState(false);

  function finishLogin(result: Awaited<ReturnType<typeof loginStudentAccount>>) {
    localStorage.setItem("student_token", result.token);
    window.location.href = returnPath || `/exams/dashboard${exam ? `?exam=${encodeURIComponent(exam)}` : ""}`;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setNotice("");
    try {
      const result = await loginStudentAccount({ email, password });
      finishLogin(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to log in.";
      if (message.includes("Please verify your email before logging in.")) {
        try {
          await resendStudentVerification(email.trim());
          setStep("verify");
          setNotice(`Your email isn't verified yet. We sent a new 6-digit code to ${email.trim()}.`);
        } catch (resendError) {
          setError(readableError(resendError, "We couldn't send a verification code. Please try again."));
        }
      } else {
        setError(readableError(err, "Unable to log in."));
      }
    }
    finally { setLoading(false); }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      await verifyStudentEmail({ email: email.trim(), code });
      const result = await loginStudentAccount({ email: email.trim(), password });
      finishLogin(result);
    } catch (err) {
      setError(readableError(err, "Unable to verify your email."));
    } finally { setLoading(false); }
  }

  async function resendCode() {
    setLoading(true); setError("");
    try {
      await resendStudentVerification(email.trim());
      setNotice(`A new verification code has been sent to ${email.trim()}.`);
    } catch (err) {
      setError(readableError(err, "We couldn't send a verification code. Please try again."));
    } finally { setLoading(false); }
  }

  return <div className="bg-page min-h-screen"><div className="max-w-xl mx-auto px-8 py-20"><Link href="/exams" className="text-text-muted text-[13px]">&larr; Back to examinations</Link><div className="bg-white rounded-3xl shadow p-8 mt-6"><p className="text-[11px] uppercase tracking-wider text-accent font-semibold">Student account</p><h1 className="font-heading font-extrabold text-[34px] text-primary mt-2">{step === "login" ? "Log in to continue" : "Verify your email"}</h1><p className="text-text-muted text-[14px] mt-3">{step === "login" ? "Use the same account to apply for new examinations and view results from earlier sessions." : "Enter the 6-digit verification code. Once verified, you'll be signed in automatically."}</p>{step === "login" ? <form onSubmit={handleSubmit} className="space-y-5 mt-8"><label className="flex flex-col gap-1.5 text-[13px] font-semibold">Email<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></label><label className="flex flex-col gap-1.5 text-[13px] font-semibold">Password<input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} /></label>{error && <div role="alert" className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-[13px]">{error}</div>}<button disabled={loading} className="w-full bg-primary text-white font-semibold text-[15px] px-6 py-4 rounded-xl disabled:opacity-60">{loading ? "Checking account..." : "Log in"}</button></form> : <form onSubmit={handleVerify} className="space-y-5 mt-8">{notice && <div role="status" className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-4 py-3 text-[13px]">{notice}</div>}<label className="flex flex-col gap-1.5 text-[13px] font-semibold">Verification code<input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={`${inputCls} text-center text-xl tracking-[.35em]`} /></label>{error && <div role="alert" className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-[13px]">{error}</div>}<button disabled={loading} className="w-full bg-primary text-white font-semibold text-[15px] px-6 py-4 rounded-xl disabled:opacity-60">{loading ? "Verifying and signing in..." : "Verify & continue"}</button><button type="button" onClick={resendCode} disabled={loading} className="w-full text-primary text-[13px] font-semibold disabled:opacity-60">Resend verification code</button><button type="button" onClick={() => { setStep("login"); setError(""); setNotice(""); }} className="w-full text-text-muted text-[12px]">Back to login</button></form>}{step === "login" && <div className="mt-5 flex flex-wrap justify-between gap-3 text-[13px]"><Link href={`/exams/password-reset${authQuery}`} className="text-primary font-semibold">Forgot password?</Link><span className="text-text-muted">New student? <Link href={`/exams/account/register${authQuery}`} className="text-primary font-semibold">Create an account</Link></span></div>}</div></div></div>;
}

function readableError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  try {
    const body = JSON.parse(err.message) as Record<string, unknown>;
    if (typeof body.detail === "string") return body.detail;
    const messages = Object.values(body).flatMap((value) => Array.isArray(value) ? value : [value]).filter((value): value is string => typeof value === "string");
    if (messages.length) return messages.join(" ");
  } catch {
    return err.message || fallback;
  }
  return err.message || fallback;
}
