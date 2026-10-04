"use client";

import { FormEvent, useState } from "react";
import { token } from "../layout";
import { sendStaffEmailTest } from "@/src/lib/exams-api";

export default function StaffEmailTestPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: boolean; detail: string } | null>(null);

  async function sendTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      setResult(await sendStaffEmailTest(token(), email.trim()));
    } catch (error) {
      setResult({
        success: false,
        detail: error instanceof Error ? error.message : "The test email could not be sent.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-7">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-amber-700">System tools</p>
        <h1 className="font-heading text-[26px] font-extrabold text-primary">SMTP test</h1>
        <p className="mt-1 text-[13px] text-text-muted">Send a test message through the active email service and see any connection error.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <p className="text-[13px] font-bold text-slate-800">Check email delivery</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-500">The message is sent immediately using the active Django email configuration.</p>
        </div>

        <form onSubmit={sendTest} className="space-y-4 p-6">
          <div>
            <label htmlFor="test-email" className="mb-1.5 block text-[12px] font-semibold text-slate-700">Send test to</label>
            <input
              id="test-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/15"
            />
          </div>

          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0f172a] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#1e293b] disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Sending test email…" : "Send test email"}
          </button>

          {result && (
            <div
              role={result.success ? "status" : "alert"}
              aria-live="polite"
              className={`rounded-xl border px-4 py-3 text-[12px] leading-5 ${result.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
            >
              <span className="font-bold">{result.success ? "Email service responded successfully" : "Email send failed"}</span>
              <p className="mt-0.5 break-words">{result.detail}</p>
            </div>
          )}

          <p className="text-[10px] leading-4 text-slate-400">Success means the configured mail server accepted the message; it does not guarantee inbox delivery.</p>
        </form>
      </section>
    </div>
  );
}
