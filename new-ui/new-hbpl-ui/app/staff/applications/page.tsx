"use client";

import { useEffect, useState } from "react";
import { token } from "../layout";
import { assignStaffApplicationCentre, autoAssignStaffApplicationCentres, ExamCentre, fetchStaffApplications, fetchStaffExamCentres, fetchStaffExams, ManagedExam, publishStaffApplications, StudentApplication, transitionStaffApplication } from "@/src/lib/exams-api";

const transitions = [
  { status: "under_review", label: "Start review" }, { status: "correction_required", label: "Request correction" },
  { status: "approved", label: "Approve" }, { status: "rejected", label: "Reject" },
];

export default function StaffApplicationsPage() {
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [centres, setCentres] = useState<ExamCentre[]>([]);
  const [exams, setExams] = useState<ManagedExam[]>([]);
  const [examId, setExamId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (examId) query.set("exam", examId);
      if (status) query.set("status", status);
      if (search) query.set("search", search);
      setApplications(await fetchStaffApplications(token(), query.size ? `?${query}` : ""));
      setSelected(new Set()); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load applications."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { void Promise.all([fetchStaffExamCentres(token()), fetchStaffExams(token())]).then(([items, availableExams]) => { setCentres(items); setExams(availableExams); }).catch(() => setError("Unable to load exam setup.")); }, []);

  const approved = applications.filter((item) => item.status === "approved");
  const selectedApplications = approved.filter((item) => selected.has(item.id));
  const toggle = (id: number) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });

  async function transition(application: StudentApplication, nextStatus: string) {
    const note = window.prompt(nextStatus === "correction_required" ? "Tell the student what to correct:" : "Optional review note:", "");
    if (note === null) return;
    setBusy(application.id); setError("");
    try { await transitionStaffApplication(token(), application.id, nextStatus, note); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to update application."); }
    finally { setBusy(null); }
  }
  async function assignCentre(application: StudentApplication, centreId: string) {
    setBusy(application.id); setError("");
    try { const updated = await assignStaffApplicationCentre(token(), application.id, centreId ? Number(centreId) : null); setApplications((items) => items.map((item) => item.id === updated.id ? updated : item)); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to assign centre."); }
    finally { setBusy(null); }
  }
  async function publish(document: "admit_card" | "results", applicationIds?: number[]) {
    if (!applicationIds?.length && !examId) { setError("Select an exam before publishing for all students."); return; }
    const target = applicationIds?.length ? `${applicationIds.length} selected student(s)` : "all eligible students for this exam";
    if (!window.confirm(`Publish ${document.replace("_", " ")} for ${target}?`)) return;
    setPublishing(true); setError(""); setNotice("");
    try {
      const result = await publishStaffApplications(token(), { document, ...(applicationIds?.length ? { application_ids: applicationIds } : { exam_id: Number(examId) }) });
      setNotice(`${result.published} ${document.replace("_", " ")}${result.published === 1 ? "" : "s"} published.${result.skipped ? ` ${result.skipped} skipped (missing centre or result).` : ""}`); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to publish."); }
    finally { setPublishing(false); }
  }
  async function autoAssign() {
    if (!examId) { setError("Select an exam before auto-assigning centres."); return; }
    setPublishing(true); setError("");
    try { const result = await autoAssignStaffApplicationCentres(token(), Number(examId)); setNotice(`${result.assigned} assigned. ${result.unassigned} remain unassigned.`); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to auto-assign centres."); }
    finally { setPublishing(false); }
  }

  return <div className="mx-auto max-w-7xl">
    <div className="mb-6"><h1 className="font-heading text-[26px] font-extrabold text-primary">Applications</h1><p className="mt-1 text-[13px] text-text-muted">Approve students, assign centres, then publish documents per enrollment.</p></div>
    {(error || notice) && <div className={`mb-4 rounded-xl px-4 py-3 text-[12px] ${error ? "border border-red-200 bg-red-50 text-red-700" : "border border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || notice}</div>}
    <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4"><select value={examId} onChange={(event) => setExamId(event.target.value)} className="min-w-52 rounded-lg border border-slate-200 px-3 py-2 text-[12px]"><option value="">All exams</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px]"><option value="">All statuses</option>{["submitted", "under_review", "correction_required", "resubmitted", "approved", "rejected"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} placeholder="Search student, enrollment, email" className="min-w-56 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[12px]"/><button onClick={() => void load()} className="rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white">Search</button></div>
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3"><button disabled={publishing || !examId} onClick={() => void publish("admit_card")} className="rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">Publish all admit cards</button><button disabled={publishing || !examId} onClick={() => void publish("results")} className="rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">Publish all results</button><button disabled={publishing || !selectedApplications.length} onClick={() => void publish("admit_card", selectedApplications.map((item) => item.id))} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold disabled:opacity-40">Publish selected cards ({selectedApplications.length})</button><button disabled={publishing || !selectedApplications.length} onClick={() => void publish("results", selectedApplications.map((item) => item.id))} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold disabled:opacity-40">Publish selected results</button><button disabled={publishing || !examId} onClick={() => void autoAssign()} className="ml-auto rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold disabled:opacity-40">Auto-assign centres</button></div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{loading ? <div className="p-10 text-center text-[13px] text-slate-400">Loading applications…</div> : !applications.length ? <div className="p-10 text-center text-[13px] text-slate-400">No applications found.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-[11px]"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-3"><input type="checkbox" aria-label="Select all approved applications" checked={approved.length > 0 && selectedApplications.length === approved.length} onChange={() => setSelected(selectedApplications.length === approved.length ? new Set() : new Set(approved.map((item) => item.id)))}/></th><th className="px-3 py-3">Enrollment / student</th><th className="px-3 py-3">Exam</th><th className="px-3 py-3">Centre</th><th className="px-3 py-3">Publication</th><th className="px-3 py-3">Review</th></tr></thead><tbody className="divide-y divide-slate-100">{applications.map((application) => { const actions = application.status === "under_review" ? transitions.slice(1) : ["submitted", "resubmitted", "correction_required"].includes(application.status) ? transitions.filter((item) => item.status === "under_review" || item.status === "rejected") : []; return <tr key={application.id} className="align-top"><td className="px-3 py-4"><input type="checkbox" aria-label={`Select ${application.full_name}`} disabled={application.status !== "approved"} checked={selected.has(application.id)} onChange={() => toggle(application.id)}/></td><td className="px-3 py-4"><strong>{application.full_name}</strong><span className="mt-1 block text-slate-400">{application.application_number ?? `Draft #${application.id}`} · {application.email}</span></td><td className="px-3 py-4">{application.exam.name}<span className="mt-1 block text-slate-400">{application.exam.session?.name ?? "No session"}</span></td><td className="px-3 py-4"><select disabled={busy === application.id} value={application.centre?.id ?? ""} onChange={(event) => void assignCentre(application, event.target.value)} className="max-w-48 rounded-lg border border-slate-200 px-2 py-2"><option value="">Unassigned</option>{centres.filter((centre) => centre.is_active || centre.id === application.centre?.id).filter((centre) => application.exam.centre_ids.includes(centre.id)).map((centre) => <option key={centre.id} value={centre.id}>{centre.name}</option>)}</select></td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 ${application.admit_card_published ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>Card {application.admit_card_published ? "published" : "hidden"}</span><span className={`ml-1 rounded-full px-2 py-1 ${application.results_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>Result {application.results_published ? "published" : "hidden"}</span></td><td className="px-3 py-4"><span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">{application.status.replaceAll("_", " ")}</span><div className="mt-2 flex flex-wrap gap-1">{actions.map((action) => <button key={action.status} disabled={busy === application.id} onClick={() => void transition(application, action.status)} className="rounded border border-slate-200 px-2 py-1 text-[10px] text-slate-600 disabled:opacity-50">{action.label}</button>)}</div></td></tr>; })}</tbody></table></div>}</section>
  </div>;
}
