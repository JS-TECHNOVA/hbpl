"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { token } from "../layout";
import {
  fetchStaffApplications, fetchStaffExamResults, fetchStaffExams, importStaffExamCopies,
  ManagedExam, resendStaffResultEmails, saveStaffExamResult, StaffExamResult,
  StudentApplication, uploadStaffExamResultCopy,
} from "@/src/lib/exams-api";

type ResultForm = { total_marks: string; obtained_marks: string; rank: string; grade: string; is_pass: string; remarks: string };
const blank: ResultForm = { total_marks: "", obtained_marks: "", rank: "", grade: "", is_pass: "", remarks: "" };
const input = "w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] text-slate-700 outline-none focus:border-[#a36d17] focus:ring-2 focus:ring-[#a36d17]/15";

export default function StaffResultsPage() {
  const [exams, setExams] = useState<ManagedExam[]>([]);
  const [examId, setExamId] = useState(0);
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [results, setResults] = useState<StaffExamResult[]>([]);
  const [forms, setForms] = useState<Record<number, ResultForm>>({});
  const [selectedResultIds, setSelectedResultIds] = useState<Set<number>>(new Set());
  const [attachmentMode, setAttachmentMode] = useState<"all" | "certificate" | "copy">("all");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [copyBusy, setCopyBusy] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const folderInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => { fetchStaffExams(token()).then(setExams).catch((err) => setError(err.message)); }, []);
  useEffect(() => { if (examId) void loadResults(); else { setApplications([]); setResults([]); setForms({}); setSelectedResultIds(new Set()); } }, [examId]);

  async function loadResults() {
    setLoading(true);
    try {
      const [apps, saved] = await Promise.all([
        fetchStaffApplications(token(), `?exam=${examId}&status=approved`),
        fetchStaffExamResults(token(), examId),
      ]);
      const byApplication = new Map(saved.map((result) => [result.application_id, result]));
      setApplications(apps);
      setResults(saved);
      setForms(Object.fromEntries(apps.map((application) => {
        const result = byApplication.get(application.id);
        return [application.id, result ? {
          total_marks: result.total_marks ?? "", obtained_marks: result.obtained_marks ?? "", rank: result.rank?.toString() ?? "",
          grade: result.grade ?? "", is_pass: result.is_pass === null ? "" : String(result.is_pass), remarks: result.remarks ?? "",
        } : { ...blank }];
      })));
      setSelectedResultIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load results.");
    } finally { setLoading(false); }
  }

  function setField(applicationId: number, key: keyof ResultForm, value: string) {
    setForms((current) => ({ ...current, [applicationId]: { ...(current[applicationId] ?? blank), [key]: value } }));
  }

  async function save(application: StudentApplication) {
    const form = forms[application.id] ?? blank;
    setBusy(application.id); setError(""); setNotice("");
    try {
      const current = results.find((result) => result.application_id === application.id);
      const saved = await saveStaffExamResult(token(), {
        ...(current ? { id: current.id } : {}), application_id: application.id,
        total_marks: form.total_marks || null, obtained_marks: form.obtained_marks || null,
        rank: form.rank ? Number(form.rank) : null, grade: form.grade,
        is_pass: form.is_pass === "" ? null : form.is_pass === "true", remarks: form.remarks,
      });
      setResults((items) => [...items.filter((item) => item.id !== saved.id), saved]);
      setNotice(`Saved result for ${application.full_name}.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save result."); }
    finally { setBusy(null); }
  }

  async function uploadCopy(result: StaffExamResult, file: File) {
    setCopyBusy(result.id); setError(""); setNotice("");
    try {
      const saved = await uploadStaffExamResultCopy(token(), result.id, file);
      setResults((items) => items.map((item) => item.id === saved.id ? saved : item));
      setNotice(`Exam copy attached for ${saved.student_name}.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not upload the exam copy."); }
    finally { setCopyBusy(null); }
  }

  async function importCopies(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.name.toLowerCase().endsWith(".pdf"));
    event.target.value = "";
    if (!files.length) { setError("Choose a folder containing PDF exam copies."); return; }
    setImporting(true); setError(""); setNotice("");
    try {
      const result = await importStaffExamCopies(token(), examId, files);
      const missing = result.not_found.length ? ` ${result.not_found.length} filename(s) did not match an enrollment number.` : "";
      const rejected = result.rejected.length ? ` ${result.rejected.length} file(s) were rejected.` : "";
      setNotice(`${result.uploaded} exam copy/copies imported.${missing}${rejected}`);
      await loadResults();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not import exam copies."); }
    finally { setImporting(false); }
  }

  async function resendResults() {
    if (!selectedResultIds.size) return;
    setResending(true); setError(""); setNotice("");
    try {
      const result = await resendStaffResultEmails(token(), [...selectedResultIds], attachmentMode);
      setNotice(`${result.queued} result email(s) queued for delivery.`);
      setSelectedResultIds(new Set());
    } catch (err) { setError(err instanceof Error ? err.message : "Could not resend result emails."); }
    finally { setResending(false); }
  }

  const selectedExam = exams.find((exam) => exam.id === examId);
  const resultsByApplication = new Map(results.map((result) => [result.application_id, result]));
  const publishedResultIds = applications.flatMap((application) => {
    const result = resultsByApplication.get(application.id);
    return application.results_published && result ? [result.id] : [];
  });
  const allPublishedSelected = publishedResultIds.length > 0 && publishedResultIds.every((id) => selectedResultIds.has(id));
  const toggleResult = (id: number) => setSelectedResultIds((current) => {
    const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  return <div className="mx-auto max-w-7xl">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-heading text-[26px] font-extrabold text-primary">Exam results</h1><p className="mt-1 text-[13px] text-text-muted">Save scores, attach checked exam copies, then publish results from Applications.</p></div><label className="text-[11px] font-semibold text-slate-500">Exam<select value={examId} onChange={(event) => { setExamId(Number(event.target.value)); setError(""); setNotice(""); }} className="mt-1 block min-w-64 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px]"><option value={0}>Select exam</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} · {exam.session?.name ?? "Unassigned session"}</option>)}</select></label></div>
    {selectedExam && <section className="mb-4 rounded-2xl border border-[#e6dfd0] bg-[#fffdf8] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-bold text-[#172438]">Exam copies</p><p className="mt-1 text-[11px] text-[#687486]">Choose a folder of PDFs named exactly as the enrollment/roll number, for example <strong>HBPL27-00003.pdf</strong>.</p></div><div className="flex flex-wrap items-center gap-2"><input ref={(element) => { folderInput.current = element; element?.setAttribute("webkitdirectory", ""); }} type="file" multiple accept="application/pdf,.pdf" onChange={importCopies} className="sr-only"/><button type="button" disabled={importing} onClick={() => folderInput.current?.click()} className="rounded-lg border border-[#d8c18f] bg-white px-3 py-2 text-[11px] font-bold text-[#8c5b10] disabled:opacity-50">{importing ? "Importing…" : "Import exam copies"}</button></div></div></section>}
    {selectedExam && <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3"><div><p className="text-[11px] font-bold text-slate-700">Resend published result emails</p><p className="mt-0.5 text-[10px] text-slate-400">Select published students below, then choose attachments.</p></div><div className="flex flex-wrap items-center gap-2"><select value={attachmentMode} onChange={(event) => setAttachmentMode(event.target.value as "all" | "certificate" | "copy")} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px]"><option value="all">Certificate + exam copy</option><option value="certificate">Certificate only</option><option value="copy">Exam copy only</option></select><button type="button" disabled={resending || !selectedResultIds.size} onClick={() => void resendResults()} className="rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">{resending ? "Queuing…" : `Resend results (${selectedResultIds.size})`}</button></div></section>}
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</div>}{notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">{notice}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{!examId ? <div className="p-10 text-center text-[13px] text-slate-400">Select an exam to view or enter its results.</div> : loading ? <div className="p-10 text-center text-[13px] text-slate-400">Loading…</div> : applications.length === 0 ? <div className="p-10 text-center text-[13px] text-slate-400">No approved applications for this exam.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1190px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-3"><input type="checkbox" aria-label="Select all published results" disabled={!publishedResultIds.length} checked={allPublishedSelected} onChange={() => setSelectedResultIds(allPublishedSelected ? new Set() : new Set(publishedResultIds))}/></th><th className="px-4 py-3">Student</th><th className="px-2 py-3">Total</th><th className="px-2 py-3">Obtained</th><th className="px-2 py-3">Rank</th><th className="px-2 py-3">Grade</th><th className="px-2 py-3">Pass?</th><th className="px-2 py-3">Remarks</th><th className="px-3 py-3">Exam copy</th><th className="px-3 py-3">Save</th></tr></thead><tbody className="divide-y divide-slate-100">{applications.map((application) => { const form = forms[application.id] ?? blank; const result = resultsByApplication.get(application.id); return <tr key={application.id} className="align-top"><td className="px-3 py-3"><input type="checkbox" aria-label={`Select ${application.full_name} for result email`} disabled={!result || !application.results_published} checked={Boolean(result && selectedResultIds.has(result.id))} onChange={() => result && toggleResult(result.id)}/></td><td className="px-4 py-3 text-[11px] text-slate-700"><strong>{application.full_name}</strong><span className="mt-1 block text-[10px] text-slate-400">{application.application_number}</span>{application.results_published && <span className="mt-1 inline-block rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">Published</span>}</td><td className="w-24 px-2 py-3"><input type="number" min="0" step="0.01" value={form.total_marks} onChange={(event) => setField(application.id, "total_marks", event.target.value)} className={input}/></td><td className="w-24 px-2 py-3"><input type="number" min="0" step="0.01" value={form.obtained_marks} onChange={(event) => setField(application.id, "obtained_marks", event.target.value)} className={input}/></td><td className="w-20 px-2 py-3"><input type="number" min="1" value={form.rank} onChange={(event) => setField(application.id, "rank", event.target.value)} className={input}/></td><td className="w-20 px-2 py-3"><input value={form.grade} onChange={(event) => setField(application.id, "grade", event.target.value)} className={input}/></td><td className="w-24 px-2 py-3"><select value={form.is_pass} onChange={(event) => setField(application.id, "is_pass", event.target.value)} className={input}><option value="">—</option><option value="true">Pass</option><option value="false">Fail</option></select></td><td className="w-40 px-2 py-3"><input value={form.remarks} onChange={(event) => setField(application.id, "remarks", event.target.value)} className={input}/></td><td className="min-w-48 px-3 py-3">{result ? <><label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"><input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={copyBusy === result.id} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadCopy(result, file); }}/>{copyBusy === result.id ? "Uploading…" : result.copy_file_name ? "Replace PDF" : "Upload PDF"}</label>{result.copy_file_url ? <a href={result.copy_file_url} target="_blank" rel="noreferrer" className="ml-2 text-[10px] font-bold text-[#315b82] hover:underline">View</a> : null}<span className="mt-1 block max-w-44 truncate text-[9px] text-slate-400">{result.copy_file_name ?? "No exam copy"}</span></> : <span className="text-[10px] text-slate-400">Save result first</span>}</td><td className="px-3 py-3"><button disabled={busy === application.id} onClick={() => void save(application)} className="rounded-lg bg-primary px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50">{busy === application.id ? "…" : "Save"}</button></td></tr>; })}</tbody></table></div>}</section>
  </div>;
}
