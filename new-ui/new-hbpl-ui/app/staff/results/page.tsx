"use client";

import { useEffect, useState } from "react";
import { token } from "../layout";
import { fetchStaffApplications, fetchStaffExamResults, fetchStaffExams, ManagedExam, saveStaffExamResult, StaffExamResult, StudentApplication } from "@/src/lib/exams-api";

type ResultForm = { total_marks: string; obtained_marks: string; rank: string; grade: string; is_pass: string; remarks: string };
const blank: ResultForm = { total_marks: "", obtained_marks: "", rank: "", grade: "", is_pass: "", remarks: "" };
const input = "w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] text-slate-700";

export default function StaffResultsPage() {
  const [exams, setExams] = useState<ManagedExam[]>([]);
  const [examId, setExamId] = useState(0);
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [results, setResults] = useState<StaffExamResult[]>([]);
  const [forms, setForms] = useState<Record<number, ResultForm>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { fetchStaffExams(token()).then(setExams).catch((err) => setError(err.message)); }, []);
  useEffect(() => {
    if (!examId) return;

    let active = true;
    Promise.all([
      fetchStaffApplications(token(), `?exam=${examId}&status=approved`),
      fetchStaffExamResults(token(), examId),
    ]).then(([apps, saved]) => {
      if (!active) return;
      setApplications(apps); setResults(saved);
      const byApplication = new Map(saved.map((result) => [result.application_id, result]));
      setForms(Object.fromEntries(apps.map((application) => {
        const result = byApplication.get(application.id);
        return [application.id, result ? {
          total_marks: result.total_marks ?? "", obtained_marks: result.obtained_marks ?? "", rank: result.rank?.toString() ?? "",
          grade: result.grade ?? "", is_pass: result.is_pass === null ? "" : String(result.is_pass), remarks: result.remarks ?? "",
        } : blank];
      })));
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load results.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [examId]);

  function setField(applicationId: number, key: keyof ResultForm, value: string) {
    setForms((current) => ({ ...current, [applicationId]: { ...current[applicationId], [key]: value } }));
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
      if (application.exam.id === examId) {
        setResults((items) => [...items.filter((item) => item.id !== saved.id), saved]);
        setNotice(`Saved result for ${application.full_name}.`);
      }
    } catch (err) {
      if (application.exam.id === examId) setError(err instanceof Error ? err.message : "Could not save result.");
    }
    finally { setBusy(null); }
  }

  const selectedExam = exams.find((exam) => exam.id === examId);
  return <div className="mx-auto max-w-7xl">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-heading text-[26px] font-extrabold text-primary">Exam results</h1><p className="mt-1 text-[13px] text-text-muted">Enter marks for approved students. Results become visible when the exam status is set to “result_out”.</p></div><label className="text-[11px] font-semibold text-slate-500">Exam<select value={examId} onChange={(e) => { const selectedId = Number(e.target.value); setExamId(selectedId); setApplications([]); setResults([]); setForms({}); setError(""); setNotice(""); setLoading(selectedId !== 0); }} className="mt-1 block min-w-64 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px]"><option value={0}>Select exam</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} · {exam.session?.name ?? "Unassigned session"}</option>)}</select></label></div>
    {selectedExam && <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] text-blue-800">Publication state: <strong>{selectedExam.status.replaceAll("_", " ")}</strong>. Change the exam status on the Exams page to publish or hide these results.</div>}
    {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</div>}{notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">{notice}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{!examId ? <div className="p-10 text-center text-[13px] text-slate-400">Select an exam to view or enter its results.</div> : loading ? <div className="p-10 text-center text-[13px] text-slate-400">Loading…</div> : applications.length === 0 ? <div className="p-10 text-center text-[13px] text-slate-400">No approved applications for this exam.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Student</th><th className="px-2 py-3">Total marks</th><th className="px-2 py-3">Marks obtained</th><th className="px-2 py-3">Rank</th><th className="px-2 py-3">Grade</th><th className="px-2 py-3">Pass?</th><th className="px-2 py-3">Remarks</th><th className="px-3 py-3">Save</th></tr></thead><tbody className="divide-y divide-slate-100">{applications.map((application) => { const form = forms[application.id] ?? blank; return <tr key={application.id} className="align-top"><td className="px-4 py-3 text-[11px] text-slate-700"><strong>{application.full_name}</strong><span className="mt-1 block text-[10px] text-slate-400">{application.application_number}</span></td><td className="w-24 px-2 py-3"><input type="number" min="0" step="0.01" value={form.total_marks} onChange={(e) => setField(application.id, "total_marks", e.target.value)} className={input} /></td><td className="w-24 px-2 py-3"><input type="number" min="0" step="0.01" value={form.obtained_marks} onChange={(e) => setField(application.id, "obtained_marks", e.target.value)} className={input} /></td><td className="w-20 px-2 py-3"><input type="number" min="1" value={form.rank} onChange={(e) => setField(application.id, "rank", e.target.value)} className={input} /></td><td className="w-20 px-2 py-3"><input value={form.grade} onChange={(e) => setField(application.id, "grade", e.target.value)} className={input} /></td><td className="w-24 px-2 py-3"><select value={form.is_pass} onChange={(e) => setField(application.id, "is_pass", e.target.value)} className={input}><option value="">—</option><option value="true">Pass</option><option value="false">Fail</option></select></td><td className="w-44 px-2 py-3"><input value={form.remarks} onChange={(e) => setField(application.id, "remarks", e.target.value)} className={input} /></td><td className="px-3 py-3"><button disabled={busy === application.id} onClick={() => void save(application)} className="rounded-lg bg-primary px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50">{busy === application.id ? "…" : "Save"}</button></td></tr>; })}</tbody></table></div>}</section>
  </div>;
}
