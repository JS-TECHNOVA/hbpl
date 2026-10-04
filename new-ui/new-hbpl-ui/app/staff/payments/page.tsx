"use client";

import { useCallback, useEffect, useState } from "react";
import { token } from "../layout";
import { acceptStaffExamPayment, fetchStaffExamPayments, fetchStaffExams, ManagedExam, StaffExamPayment } from "@/src/lib/exams-api";

const statusLabel: Record<StaffExamPayment["status"], string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  user_dropped: "User dropped",
  expired: "Expired",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function StaffPaymentsPage() {
  const [payments, setPayments] = useState<StaffExamPayment[]>([]);
  const [exams, setExams] = useState<ManagedExam[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [examInput, setExamInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyPaymentId, setBusyPaymentId] = useState<number | null>(null);

  const load = useCallback(async (filters = { search: "", status: "", exam: "" }) => {
    setLoading(true);
    const query = new URLSearchParams();
    if (filters.search) query.set("search", filters.search);
    if (filters.status) query.set("status", filters.status);
    if (filters.exam) query.set("exam", filters.exam);
    try {
      const rows = await fetchStaffExamPayments(token(), query.size ? `?${query.toString()}` : "");
      setPayments(rows);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payment records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchStaffExamPayments(token())
      .then((rows) => { if (active) { setPayments(rows); setError(""); } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Unable to load payment records."); })
      .finally(() => { if (active) setLoading(false); });
    fetchStaffExams(token()).then((rows) => { if (active) setExams(rows); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  function search() {
    void load({ search: searchInput.trim(), status: statusInput, exam: examInput });
  }

  async function acceptPayment(payment: StaffExamPayment) {
    const reference = window.prompt("Enter the offline transaction ID or cash/cheque receipt details:")?.trim();
    if (!reference) return;
    const amount = `${payment.currency} ${Number(payment.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (!window.confirm(`Accept ${amount} as paid for ${payment.student_name} · ${payment.exam_name}? This will submit their enrollment and email them a receipt.`)) return;

    setBusyPaymentId(payment.id);
    setError("");
    setNotice("");
    try {
      await acceptStaffExamPayment(token(), payment.id, reference);
      setNotice(`Manual payment recorded for ${payment.student_name}. Their receipt email has been queued.`);
      await load({ search: searchInput.trim(), status: statusInput, exam: examInput });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept this payment.");
    } finally {
      setBusyPaymentId(null);
    }
  }

  function exportCsv() {
    const columns = ["Application", "Student", "Email", "Exam", "Session", "Amount", "Currency", "Status", "Method", "Order ID", "Payment reference", "Paid at", "Created at"];
    const rows = payments.map((payment) => [
      payment.application_number ?? "", payment.student_name, payment.student_email, payment.exam_name,
      payment.session_name ?? "", payment.amount, payment.currency, statusLabel[payment.status] ?? payment.status,
      payment.payment_method, payment.order_id, payment.manual_reference || payment.cf_payment_id, payment.paid_at ?? "", payment.created_at,
    ]);
    const csv = [columns, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "hbpl-exam-payments.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const paidTotal = payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const paidCount = payments.filter((payment) => payment.status === "paid").length;

  return <div className="mx-auto max-w-7xl">
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-amber-700">Exam operations</p>
        <h1 className="font-heading text-[26px] font-extrabold text-primary">Payments</h1>
        <p className="mt-1 text-[13px] text-text-muted">Track exam fees and Cashfree order outcomes against each student enrollment.</p>
      </div>
      <button onClick={() => void load({ search: searchInput.trim(), status: statusInput, exam: examInput })} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">Refresh</button>
    </div>

    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paid orders in current view</p>
        <p className="mt-1 text-[23px] font-bold text-slate-900">{paidCount}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Collected in current view</p>
        <p className="mt-1 text-[23px] font-bold text-slate-900">₹{paidTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
    </div>

    <div className="mb-5 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") search(); }} placeholder="Search student, email, application, order or payment ID" className="min-w-[240px] flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-[12px] outline-none focus:border-primary" />
      <select aria-label="Filter payment status" value={statusInput} onChange={(event) => setStatusInput(event.target.value)} className="min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px]">
        <option value="">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="user_dropped">User dropped</option><option value="expired">Expired</option>
      </select>
      <select aria-label="Filter by exam" value={examInput} onChange={(event) => setExamInput(event.target.value)} className="min-w-48 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px]">
        <option value="">All exams</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} · {exam.session?.name ?? "No session"}</option>)}
      </select>
      <button onClick={search} className="rounded-lg bg-slate-900 px-5 py-2.5 text-[12px] font-semibold text-white hover:bg-slate-800">Search</button>
      <button onClick={exportCsv} disabled={!payments.length} className="rounded-lg border border-slate-200 px-4 py-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45">Export CSV</button>
    </div>

    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</div>}
    {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-800">{notice}</div>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {loading ? <div className="p-12 text-center text-[13px] text-slate-400">Loading payment records…</div> : !payments.length ? <div className="p-12 text-center"><p className="text-[14px] font-semibold text-slate-700">No payment records found</p><p className="mt-1 text-[12px] text-slate-400">Payment orders will appear here as students pay exam fees.</p></div> :
        <div className="overflow-x-auto"><table className="w-full min-w-[1280px] text-left">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr>
            <th className="px-4 py-3">Student / enrollment</th><th className="px-4 py-3">Exam</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Order / payment reference</th><th className="px-4 py-3">Paid at</th><th className="px-4 py-3">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">{payments.map((payment) => <tr key={payment.id} className="align-top hover:bg-slate-50/60">
            <td className="px-4 py-4"><p className="text-[12px] font-semibold text-slate-800">{payment.student_name}</p><p className="mt-1 text-[11px] text-slate-500">{payment.student_email}</p><p className="mt-1 text-[10px] text-slate-400">{payment.application_number || "Enrollment pending"}</p></td>
            <td className="px-4 py-4"><p className="text-[12px] font-medium text-slate-700">{payment.exam_name}</p><p className="mt-1 text-[10px] text-slate-400">{payment.session_name || "No session"}</p></td>
            <td className="whitespace-nowrap px-4 py-4 text-[12px] font-semibold text-slate-800">{payment.currency} {Number(payment.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${payment.status === "paid" ? "bg-emerald-50 text-emerald-700" : payment.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{statusLabel[payment.status] ?? payment.status}</span><p className="mt-1.5 text-[10px] text-slate-400">Created {formatDate(payment.created_at)}</p></td>
            <td className="px-4 py-4"><p className="max-w-56 break-all font-mono text-[10px] text-slate-600">{payment.order_id}</p>{payment.payment_method === "manual" ? <><p className="mt-1 text-[10px] font-semibold text-amber-700">Manually accepted</p><p className="mt-1 max-w-56 break-words text-[10px] text-slate-500">{payment.manual_reference}</p>{payment.manually_accepted_by_name && <p className="mt-1 text-[10px] text-slate-400">By {payment.manually_accepted_by_name}</p>}</> : payment.payment_method === "no_charge" ? <p className="mt-1 text-[10px] font-semibold text-slate-500">No charge · no service used</p> : payment.cf_payment_id && <p className="mt-1 max-w-56 break-all font-mono text-[10px] text-slate-400">CF {payment.cf_payment_id}</p>}</td>
            <td className="whitespace-nowrap px-4 py-4 text-[11px] text-slate-500">{formatDate(payment.paid_at)}</td>
            <td className="px-4 py-4">{payment.status !== "paid" && <button disabled={busyPaymentId !== null} onClick={() => void acceptPayment(payment)} className="whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-50">{busyPaymentId === payment.id ? "Accepting…" : "Accept payment"}</button>}</td>
          </tr>)}</tbody>
        </table></div>}
    </section>
  </div>;
}
