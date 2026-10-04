"use client";

import Link from "next/link";
import { Suspense, FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { confirmStudentPasswordReset } from "@/src/lib/exams-api";

const inputCls = "w-full rounded-xl border border-border bg-page px-4 py-3 text-[14px] text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function ConfirmPasswordResetPage() {
  return <Suspense fallback={<main className="min-h-screen bg-page"/>}><ConfirmPasswordResetContent/></Suspense>;
}

function ConfirmPasswordResetContent() {
  const params = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setLoading(true);
    try {
      const response = await confirmStudentPasswordReset({ uid, token, password });
      setNotice(response.detail);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update the password."); }
    finally { setLoading(false); }
  }

  return <main className="min-h-screen bg-page px-5 py-16"><div className="mx-auto max-w-lg"><Link href="/exams/login" className="text-[13px] text-text-muted">&larr; Back to login</Link><section className="mt-6 rounded-3xl bg-white p-7 shadow sm:p-9"><p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Account security</p><h1 className="mt-2 font-heading text-[32px] font-extrabold text-primary">Choose a new password</h1>{!uid || !token ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">This reset link is incomplete. Request a new one to continue.</p> : <form onSubmit={submit} className="mt-7 space-y-5"><label className="flex flex-col gap-2 text-[13px] font-semibold">New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls}/></label><label className="flex flex-col gap-2 text-[13px] font-semibold">Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls}/></label>{notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{notice} <Link href="/exams/login" className="font-bold underline">Log in</Link></p>}{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>}<button disabled={loading || !!notice} className="w-full rounded-xl bg-primary px-5 py-4 text-[14px] font-semibold text-white disabled:opacity-60">{loading ? "Updating…" : "Update password"}</button></form>}</section></div></main>;
}
