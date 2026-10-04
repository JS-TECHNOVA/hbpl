"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  deleteStaffSamplePaper,
  ExamSamplePaper,
  fetchStaffExams,
  fetchStaffSamplePapers,
  ManagedExam,
  uploadStaffSamplePaper,
} from "@/src/lib/exams-api";
import { token } from "@/app/staff/layout";

const inputClass = "mt-1.5 w-full rounded-xl border border-[#d7d9d8] bg-white px-3.5 py-3 text-[13px] text-[#213147] outline-none transition placeholder:text-[#9aa2ac] focus:border-[#a36d17] focus:ring-2 focus:ring-[#a36d17]/15";
const labelClass = "block text-[11px] font-semibold text-[#586679]";

export default function StaffSamplePapers() {
  const adminToken = token();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exams, setExams] = useState<ManagedExam[]>([]);
  const [examId, setExamId] = useState<number | "">("");
  const [papers, setPapers] = useState<ExamSamplePaper[]>([]);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadedExamId, setLoadedExamId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetchStaffExams(adminToken)
      .then((result) => {
        if (!active) return;
        setExams(result);
        setExamId((current) => current || result[0]?.id || "");
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Unable to load exams."); })
      .finally(() => { if (active) setLoadingExams(false); });
    return () => { active = false; };
  }, [adminToken]);

  useEffect(() => {
    if (!examId) return;
    let active = true;
    fetchStaffSamplePapers(adminToken, examId)
      .then((result) => { if (active) { setPapers(result); setLoadedExamId(examId); } })
      .catch((err) => { if (active) { setError(err instanceof Error ? err.message : "Unable to load sample papers."); setLoadedExamId(examId); } });
    return () => { active = false; };
  }, [adminToken, examId]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!examId || !file) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await uploadStaffSamplePaper(adminToken, { exam_id: examId, title: title.trim(), caption: caption.trim(), file });
      setTitle(""); setCaption(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setPapers(await fetchStaffSamplePapers(adminToken, examId));
      setNotice("Sample paper uploaded.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to upload this sample paper."); }
    finally { setSaving(false); }
  }

  async function remove(paper: ExamSamplePaper) {
    if (!window.confirm(`Delete “${paper.title}”? This also removes its uploaded PDF.`)) return;
    setError(""); setNotice("");
    try {
      await deleteStaffSamplePaper(adminToken, paper.id);
      setPapers((current) => current.filter((item) => item.id !== paper.id));
      setNotice("Sample paper deleted.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to delete this sample paper."); }
  }

  const selectedExam = exams.find((exam) => exam.id === examId);
  const loadingPapers = Boolean(examId) && loadedExamId !== examId;
  const visiblePapers = loadedExamId === examId ? papers : [];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#a36d17]">Exam materials</p>
          <h2 className="mt-1 font-heading text-[20px] font-extrabold text-[#172438]">Sample Papers</h2>
          <p className="mt-1 text-[12px] text-[#778293]">Choose an examination to manage its practice papers.</p>
        </div>
        <label className={`${labelClass} w-full max-w-md`}>
          Examination
          <select
            value={examId}
            disabled={loadingExams || saving}
            onChange={(event) => { setExamId(Number(event.target.value) || ""); setNotice(""); setError(""); }}
            className={inputClass}
          >
            <option value="">Select an exam</option>
            {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}{exam.session?.name ? ` · ${exam.session.name}` : ""}</option>)}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">{notice}</p>}

      {!examId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-[13px] text-[#778293]">
          {loadingExams ? "Loading exams…" : exams.length ? "Select an exam to see its sample papers." : "Create an exam first, then you can upload sample papers here."}
        </div>
      ) : <>
        <form onSubmit={upload} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
          <div className="md:col-span-2">
            <h3 className="font-heading text-[15px] font-bold text-[#172438]">Upload a sample paper</h3>
            <p className="mt-1 text-[11px] text-[#778293]">PDF format · up to 20 MB</p>
          </div>
          <label className={labelClass}>Title
            <input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="e.g. Mathematics practice paper" />
          </label>
          <label className={labelClass}>PDF file
            <input ref={fileRef} required type="file" accept=".pdf,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#172438] file:px-3 file:py-2 file:text-[11px] file:font-semibold file:text-white`} />
          </label>
          <label className={`${labelClass} md:col-span-2`}>Caption
            <textarea maxLength={2000} rows={3} value={caption} onChange={(event) => setCaption(event.target.value)} className={inputClass} placeholder="A short note about this paper" />
          </label>
          <div className="flex items-center justify-between gap-3 md:col-span-2">
            <p className="truncate text-[11px] text-[#778293]">{file?.name ?? "Choose a PDF to upload"}</p>
            <button disabled={saving || !file} className="shrink-0 rounded-lg bg-[#172438] px-5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#24364f] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Uploading…" : "Upload paper"}</button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h3 className="font-heading text-[15px] font-bold text-[#172438]">Uploaded papers</h3><p className="mt-1 text-[11px] text-[#778293]">{visiblePapers.length} {visiblePapers.length === 1 ? "paper" : "papers"} for {selectedExam?.name}</p></div>
          </div>
          {loadingPapers ? <p className="px-5 py-10 text-center text-[12px] text-[#778293]">Loading sample papers…</p> : visiblePapers.length === 0 ? <p className="px-5 py-10 text-center text-[12px] text-[#778293]">No sample papers uploaded for this exam yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {visiblePapers.map((paper) => <li key={paper.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0"><p className="text-[13px] font-semibold text-[#213147]">{paper.title}</p>{paper.caption && <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-[#778293]">{paper.caption}</p>}{paper.file_url && <a href={paper.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[11px] font-semibold text-[#064488] hover:underline">View PDF ↗</a>}</div>
                <button type="button" onClick={() => void remove(paper)} className="rounded-lg border border-red-200 px-3 py-2 text-[11px] font-semibold text-red-700 transition hover:bg-red-50">Delete</button>
              </li>)}
            </ul>
          )}
        </div>
      </>}
    </section>
  );
}
