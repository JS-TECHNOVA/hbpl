"use client";

import { useCallback, useEffect, useState } from "react";
import { token } from "../layout";
import {
  assignStaffApplicationCentre, autoAssignStaffApplicationCentres, ExamCentre, fetchStaffApplications,
  fetchStaffExamCentres, fetchStaffExams, ManagedExam, StudentApplication, transitionStaffApplication,
} from "@/src/lib/exams-api";

const transitions = [
  { status: "under_review", label: "Start review" },
  { status: "correction_required", label: "Request correction" },
  { status: "approved", label: "Approve" },
  { status: "rejected", label: "Reject" },
];

export default function StaffApplicationsPage() {
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [centres, setCentres] = useState<ExamCentre[]>([]);
  const [exams, setExams] = useState<ManagedExam[]>([]);
  const [centreExamId, setCentreExamId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const reviewable = applications.filter((application) => application.status === "under_review");
  const readyForReview = applications.filter((application) => ["submitted", "resubmitted", "correction_required"].includes(application.status));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (status) query.set("status", status);
      if (search) query.set("search", search);
      const items = await fetchStaffApplications(token(), query.toString() ? `?${query}` : "");
      setError("");
      setApplications(items);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load applications."); }
    finally { setLoading(false); }
  }, [status, search]);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (search) query.set("search", search);
    fetchStaffApplications(token(), query.toString() ? `?${query}` : "")
      .then((items) => { if (active) { setApplications(items); setError(""); } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Unable to load applications."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, search]);
  useEffect(() => { fetchStaffExamCentres(token()).then(setCentres).catch(() => setCentres([])); }, []);
  useEffect(() => { fetchStaffExams(token()).then(setExams).catch(() => setExams([])); }, []);

  async function transition(application: StudentApplication, nextStatus: string) {
    if (bulkBusy) return;
    const note = window.prompt(nextStatus === "correction_required" ? "Tell the student what to correct:" : "Optional review note:", "");
    if (note === null) return;
    setBusy(application.id); setError("");
    try { await transitionStaffApplication(token(), application.id, nextStatus, note); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to update application."); }
    finally { setBusy(null); }
  }

  async function assignCentre(application: StudentApplication, centreId: string) {
    if (bulkBusy) return;
    setBusy(application.id); setError("");
    try {
      const updated = await assignStaffApplicationCentre(token(), application.id, centreId ? Number(centreId) : null);
      setApplications((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to assign centre."); }
    finally { setBusy(null); }
  }

  async function bulkTransition(items: StudentApplication[], nextStatus: string, label: string) {
    if (!items.length || bulkBusy) return;
    if (!window.confirm(`${label} ${items.length} application${items.length === 1 ? "" : "s"}?`)) return;
    setBulkBusy(true); setError(""); setNotice("");
    let succeeded = 0;
    let failed = 0;
    for (const application of items) {
      try { await transitionStaffApplication(token(), application.id, nextStatus); succeeded += 1; }
      catch { failed += 1; }
    }
    await load();
    setBulkBusy(false);
    if (failed) setError(`${succeeded} updated; ${failed} could not be updated. Check the remaining application statuses and try again.`);
    else setNotice(`${succeeded} application${succeeded === 1 ? "" : "s"} ${nextStatus === "approved" ? "approved" : "moved to review"}.`);
  }

  async function autoAssignCentres() {
    const examId = Number(centreExamId);
    const exam = exams.find((item) => item.id === examId);
    if (!examId || !exam || bulkBusy) return;
    if (!window.confirm(`Auto-assign approved, unassigned students for ${exam.name}? Only this exam’s active centres will be used; capacity will be respected and current assignments will stay unchanged.`)) return;
    setBulkBusy(true); setError(""); setNotice("");
    try {
      const result = await autoAssignStaffApplicationCentres(token(), examId);
      setNotice(`${result.assigned} student${result.assigned === 1 ? "" : "s"} assigned to a centre.${result.unassigned ? ` ${result.unassigned} remain unassigned because centre capacity is full.` : ""}`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to auto-assign centres."); }
    finally { setBulkBusy(false); }
  }

  function exportCsv() {
    const columns = ["Application number", "Student", "Email", "Exam", "Session", "School", "Class", "Centre", "Status"];
    const rows = applications.map((application) => [
      application.application_number ?? `Draft #${application.id}`, application.full_name, application.email,
      application.exam.name, application.exam.session?.name ?? "", application.school_name,
      application.class_name, application.centre?.name ?? "", application.status.replaceAll("_", " "),
    ]);
    const csv = [columns, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "hbpl-exam-applications.csv"; link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="mx-auto max-w-7xl">
    <div className="mb-8 flex items-start justify-between gap-4"><div><h1 className="font-heading text-[26px] font-extrabold text-primary">Applications</h1><p className="mt-1 text-[13px] text-text-muted">Review documents and student details, request corrections, approve, and allocate exam centres.</p></div><button onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-700">Refresh</button></div>
    <div className="mb-5 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4"><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(); }} placeholder="Search application, name, email, school" className="min-w-[240px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[12px]" /><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px]"><option value="">All statuses</option><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="correction_required">Correction required</option><option value="resubmitted">Resubmitted</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><button onClick={() => void load()} className="rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white">Search</button></div>
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
      <button disabled={bulkBusy || !reviewable.length} onClick={() => void bulkTransition(reviewable, "approved", "Approve all applications currently under review")}
        className="rounded-lg bg-emerald-700 px-3.5 py-2.5 text-[11px] font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-45">
        {bulkBusy ? "Updating…" : `Approve all under review (${reviewable.length})`}
      </button>
      <button disabled={bulkBusy || !readyForReview.length} onClick={() => void bulkTransition(readyForReview, "under_review", "Start review for all pending applications")}
        className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45">
        Start review all ({readyForReview.length})
      </button>
      <button disabled={!applications.length} onClick={exportCsv}
        className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45">
        Export current list
      </button>
      <span className="hidden h-8 border-l border-slate-200 sm:block" />
      <select aria-label="Select exam for centre auto-assignment" value={centreExamId} onChange={(event) => setCentreExamId(event.target.value)} className="min-w-48 rounded-lg border border-slate-200 px-3 py-2.5 text-[11px]">
        <option value="">Select exam for auto-assign</option>
        {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} · {exam.session?.name ?? "No session"}</option>)}
      </select>
      <button disabled={bulkBusy || !centreExamId} onClick={() => void autoAssignCentres()}
        className="rounded-lg bg-primary px-3.5 py-2.5 text-[11px] font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-45">
        {bulkBusy ? "Working…" : "Auto-assign centres"}
      </button>
      <span className="ml-auto text-[10px] text-slate-400">Bulk review actions apply to the current search/status results.</span>
    </div>
    {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-800">{notice}</div>}
    {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{loading ? <div className="p-10 text-center text-[13px] text-slate-400">Loading applications…</div> : applications.length === 0 ? <div className="p-10 text-center text-[13px] text-slate-400">No applications found.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Enrollment</th><th className="px-4 py-3">Candidate / documents</th><th className="px-4 py-3">Exam</th><th className="px-4 py-3">Assigned centre</th><th className="px-4 py-3">Exam documents</th><th className="px-4 py-3">Status / review</th></tr></thead><tbody className="divide-y divide-slate-100">{applications.map((application) => { const availableActions = application.status === "under_review" ? transitions.slice(1) : ["submitted", "resubmitted", "correction_required"].includes(application.status) ? transitions.filter((action) => action.status === "under_review" || action.status === "rejected") : []; return <tr key={application.id} className="align-top"><td className="px-4 py-4 text-[12px] font-semibold text-slate-900">{application.application_number ?? `Draft #${application.id}`}<span className="mt-1 block text-[10px] font-normal text-slate-400">{application.email}</span></td><td className="px-4 py-4 text-[12px] text-slate-700">{application.full_name}<span className="mt-1 block text-[10px] text-slate-400">{application.school_name || "No school"} · Class {application.class_name || "—"}</span>{application.documents.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{application.documents.map((document) => <a key={document.id} href={document.file_url} target="_blank" rel="noreferrer" className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-blue-700">View {document.document_type.replaceAll("_", " ")}</a>)}</div>}</td><td className="px-4 py-4 text-[12px] text-slate-700">{application.exam.name}<span className="mt-1 block text-[10px] text-slate-400">{application.exam.session?.name ?? "Unassigned session"}</span></td><td className="px-4 py-4"><select aria-label={`Exam centre for ${application.full_name} · ${application.exam.name}`} disabled={busy === application.id} value={application.centre?.id ?? ""} onChange={(event) => void assignCentre(application, event.target.value)} className="max-w-48 rounded-lg border border-slate-200 px-2 py-2 text-[11px]"><option value="">Unassigned</option>{centres.filter((centre) => centre.is_active || centre.id === application.centre?.id).filter((centre) => application.exam.centre_ids?.includes(centre.id)).map((centre) => <option key={centre.id} value={centre.id}>{centre.name} · {centre.capacity || "—"}</option>)}</select>{application.centre && <span className="mt-1 block max-w-48 text-[10px] text-slate-400">Saved to this exam enrollment</span>}</td><td className="px-4 py-4 text-[11px]">{application.admit_card_url ? <a href={application.admit_card_url} target="_blank" rel="noreferrer" className="font-semibold text-blue-700">View admit card</a> : <span className="text-slate-400">{application.exam.status === "admit_card_out" ? "Being prepared" : "Not issued"}</span>}{application.admit_card_issued_at && <span className="mt-1 block text-[10px] text-slate-400">Issued {new Date(application.admit_card_issued_at).toLocaleDateString()}</span>}</td><td className="px-4 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] text-blue-700">{application.status.replaceAll("_", " ")}</span>{application.review_notes && <span className="mt-2 block max-w-[180px] text-[10px] text-slate-500">{application.review_notes}</span>}<div className="mt-2 flex max-w-[180px] flex-wrap gap-1.5">{availableActions.map((action) => <button key={action.status} disabled={busy === application.id} onClick={() => void transition(application, action.status)} className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:border-primary hover:text-primary disabled:opacity-50">{action.label}</button>)}</div></td></tr>; })}</tbody></table></div>}</section>
  </div>;
}
