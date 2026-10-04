"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyCashfreePayment } from "@/src/lib/exams-api";

type PaymentProgress = "checking" | "success" | "pending" | "error";

export default function ExamPaymentReturnPage() {
  return <Suspense fallback={<PaymentMessage state="checking" detail="Please wait while we confirm your payment and secure your exam seat." />}><PaymentReturn /></Suspense>;
}

function PaymentReturn() {
  const params = useSearchParams();
  const orderId = params.get("order_id") ?? "";
  const [state, setState] = useState<PaymentProgress>("checking");
  const [detail, setDetail] = useState("Confirming your payment and reserving your exam seat. Please keep this page open.");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("student_token") ?? "";
    if (!token || !orderId) {
      Promise.resolve().then(() => {
        if (active) {
          setState("error");
          setDetail("Sign in to verify this payment from your student dashboard.");
        }
      });
      return () => { active = false; };
    }

    async function confirmPayment() {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        if (!active) return;
        try {
          const result = await verifyCashfreePayment(token, orderId);
          if (result.paid) {
            if (active) {
              setApplicationNumber(result.application.application_number ?? "");
              setDetail(`${result.application.exam.name} enrollment is confirmed. Your seat is secured.`);
              setState("success");
            }
            return;
          }
        } catch (error) {
          if (attempt === 4) {
            if (active) {
              setDetail(error instanceof Error
                ? `${error.message} You can check again from here; do not start a second payment.`
                : "We’re still waiting for payment confirmation. Please check again shortly.");
              setState("pending");
            }
            return;
          }
        }
        if (attempt < 4) await new Promise((resolve) => window.setTimeout(resolve, 2500));
      }
      if (active) {
        setDetail("Cashfree has not confirmed the transaction yet. We’ll keep your enrollment here—please check again shortly and do not pay again.");
        setState("pending");
      }
    }

    void confirmPayment();
    return () => { active = false; };
  }, [orderId, retryKey]);

  return <PaymentMessage state={state} detail={detail} applicationNumber={applicationNumber} onRetry={() => {
    setState("checking");
    setDetail("Checking the payment again and confirming your exam seat. Please do not pay again.");
    setRetryKey((value) => value + 1);
  }} />;
}

function PaymentMessage({ state, detail, applicationNumber, onRetry }: {
  state: PaymentProgress;
  detail: string;
  applicationNumber?: string;
  onRetry?: () => void;
}) {
  const completed = state === "success";
  return <main className="grid min-h-screen place-items-center bg-[#f4f3ee] px-5 py-12 text-[#172438]">
    <section aria-live="polite" className="w-full max-w-lg rounded-3xl border border-[#e3e2dc] bg-[#fffefa] p-8 text-center shadow-xl sm:p-10">
      {completed ? <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-700" aria-hidden="true">✓</div> : state === "checking" ? <div className="mx-auto h-12 w-12 animate-spin rounded-full border-[3px] border-[#e6dfd0] border-t-[#a36d17]" aria-hidden="true" /> : <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-2xl font-bold text-amber-800" aria-hidden="true">!</div>}
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#9b6d20]">HBPL examination portal</p>
      <h1 className="mt-3 font-heading text-2xl font-extrabold">{completed ? "Enrollment confirmed" : state === "checking" ? "Confirming your seat" : state === "pending" ? "Payment is still processing" : "Payment needs checking"}</h1>
      <p className="mt-3 text-[13px] leading-6 text-[#687486]">{detail}</p>
      <ol className="mt-7 space-y-3 rounded-2xl border border-[#ece9e0] bg-white p-4 text-left text-[11px]">
        <ProgressStep done={state !== "error"} label="Payment submitted" />
        <ProgressStep done={completed} active={state === "checking"} label="Payment confirmed with Cashfree" />
        <ProgressStep done={completed} label="Exam seat secured" />
      </ol>
      {applicationNumber && <p className="mt-5 rounded-xl bg-[#f7f5ef] px-4 py-3 text-[12px] font-bold">Application number · {applicationNumber}</p>}
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {(state === "pending" || state === "error") && <button type="button" onClick={onRetry} className="rounded-xl bg-[#a36d17] px-5 py-3 text-[12px] font-bold text-white">Check payment again</button>}
        <Link href="/exams/dashboard?section=enrollments" className="rounded-xl bg-[#172438] px-5 py-3 text-[12px] font-bold text-white">Open student dashboard</Link>
      </div>
    </section>
  </main>;
}

function ProgressStep({ label, done = false, active = false }: { label: string; done?: boolean; active?: boolean }) {
  return <li className="flex items-center gap-3">
    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${done ? "bg-emerald-100 text-emerald-700" : active ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400"}`} aria-hidden="true">{done ? "✓" : active ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-700/25 border-t-amber-700" /> : "·"}</span>
    <span className={done ? "font-semibold text-slate-700" : active ? "font-semibold text-amber-800" : "text-slate-400"}>{label}</span>
  </li>;
}
