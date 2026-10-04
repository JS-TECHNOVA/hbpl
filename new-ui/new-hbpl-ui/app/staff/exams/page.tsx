"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { token } from "../layout";
import ExamDescriptionEditor from "@/src/components/ExamDescriptionEditor";
import {
  createStaffExam,
  ExamCentre,
  fetchStaffExamCentres,
  createStaffSession,
  deleteStaffExam,
  deleteStaffSession,
  ExamFormData,
  ExaminationSession,
  fetchStaffExams,
  fetchStaffSessions,
  ManagedExam,
  updateStaffExam,
  updateStaffSession,
} from "@/src/lib/exams-api";

const statuses = ["upcoming", "registration_open", "registration_closed", "admit_card_out", "ongoing", "result_pending", "result_out", "completed"];
const classOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const fieldClass = "mt-1.5 w-full rounded-xl border border-[#d7d9d8] bg-white px-3.5 py-3 text-[13px] text-[#213147] outline-none transition placeholder:text-[#9aa2ac] focus:border-[#a36d17] focus:ring-2 focus:ring-[#a36d17]/15";
const labelClass = "block text-[11px] font-semibold text-[#586679]";

const emptyExam: ExamFormData = {
  session_id: 0, code: "", name: "", short_name: "", slug: "", status: "upcoming", centre_ids: [],
  description: "", subtitle: "",
  application_prefix: "", allowed_classes: [], is_published: false, fee: "0", max_registrations: "", exam_date: "", result_date: "",
  registration_start: "", registration_end: "", admit_card_template: null, certificate_template: null,
};

function toInputDate(value: string | null): string {
  return value ? value.slice(0, 16) : "";
}

export default function StaffExamsPage() {
  const [sessions, setSessions] = useState<ExaminationSession[]>([]);
  const [exams, setExams] = useState<ManagedExam[]>([]);
  const [centres, setCentres] = useState<ExamCentre[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | "all">("all");
  const [editingExam, setEditingExam] = useState<ManagedExam | null>(null);
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);
  const [examForm, setExamForm] = useState<ExamFormData>(emptyExam);
  const [sessionName, setSessionName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const adminToken = token();

  async function load() {
    try {
      const [nextSessions, nextExams, nextCentres] = await Promise.all([
        fetchStaffSessions(adminToken), fetchStaffExams(adminToken), fetchStaffExamCentres(adminToken),
      ]);
      setError("");
      setSessions(nextSessions);
      setExams(nextExams);
      setCentres(nextCentres);
      if (nextSessions.length && !examForm.session_id) setExamForm((current) => ({ ...current, session_id: nextSessions[0].id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load examinations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([fetchStaffSessions(adminToken), fetchStaffExams(adminToken), fetchStaffExamCentres(adminToken)])
      .then(([nextSessions, nextExams, nextCentres]) => {
        setSessions(nextSessions);
        setExams(nextExams);
        setCentres(nextCentres);
        setError("");
        if (nextSessions.length) setExamForm((current) => current.session_id ? current : ({ ...current, session_id: nextSessions[0].id }));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load examinations."))
      .finally(() => setLoading(false));
  }, [adminToken]);

  const visibleExams = useMemo(
    () => selectedSessionId === "all" ? exams : exams.filter((exam) => exam.session?.id === selectedSessionId),
    [exams, selectedSessionId],
  );
  const eligibleClassOptions = [...new Set([...classOptions, ...examForm.allowed_classes])]
    .sort((a, b) => Number(a) - Number(b));

  function setField<K extends keyof ExamFormData>(key: K, value: ExamFormData[K]) {
    setExamForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCentre(id: number) {
    setExamForm((current) => ({
      ...current,
      centre_ids: current.centre_ids.includes(id)
        ? current.centre_ids.filter((centreId) => centreId !== id)
        : [...current.centre_ids, id],
    }));
  }

  function toggleAllowedClass(className: string) {
    setExamForm((current) => ({
      ...current,
      allowed_classes: current.allowed_classes.includes(className)
        ? current.allowed_classes.filter((value) => value !== className)
        : [...current.allowed_classes, className].sort((a, b) => Number(a) - Number(b)),
    }));
  }

  function beginCreate() {
    setEditingExam(null);
    setDescriptionEditorKey((key) => key + 1);
    setExamForm({ ...emptyExam, session_id: sessions[0]?.id ?? 0 });
    setMessage("");
  }

  function beginEdit(exam: ManagedExam) {
    setEditingExam(exam);
    setDescriptionEditorKey((key) => key + 1);
    setExamForm({
      session_id: exam.session?.id ?? 0, code: exam.code ?? "", name: exam.name, short_name: exam.short_name,
      slug: exam.slug, status: exam.status,
      subtitle: exam.subtitle, application_prefix: exam.application_prefix, allowed_classes: exam.allowed_classes,
      is_published: exam.is_published, fee: exam.fee, max_registrations: exam.max_registrations?.toString() ?? "",
      exam_date: exam.exam_date ?? "", result_date: exam.result_date ?? "",
      description: exam.description,
      centre_ids: exam.centre_ids ?? [],
      registration_start: toInputDate(exam.registration_start), registration_end: toInputDate(exam.registration_end),
      admit_card_template: null, certificate_template: null,
    });
    setMessage("");
  }

  async function saveSession(event: FormEvent) {
    event.preventDefault();
    if (!sessionName.trim()) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await createStaffSession(adminToken, { name: sessionName.trim(), is_active: true, is_published: true });
      setSessionName("");
      setMessage("Session created."); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create session."); }
    finally { setSaving(false); }
  }

  async function toggleSession(session: ExaminationSession) {
    setSaving(true); setError(""); setMessage("");
    try {
      const updated = await updateStaffSession(adminToken, session.id, { is_active: !session.is_active });
      setSessions((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(`${session.name} ${updated.is_active ? "activated" : "deactivated"}.`);
    }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to update session."); }
    finally { setSaving(false); }
  }

  async function removeSession(session: ExaminationSession) {
    if (!window.confirm(`Delete session “${session.name}”? It must have no exams.`)) return;
    setSaving(true); setError("");
    try { await deleteStaffSession(adminToken, session.id); setMessage("Session deleted."); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to delete session."); }
    finally { setSaving(false); }
  }

  async function saveExam(event: FormEvent) {
    event.preventDefault();
    if (!examForm.name.trim() || !examForm.session_id) { setError("Select a session and enter an exam name."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      if (editingExam) await updateStaffExam(adminToken, editingExam.id, examForm);
      else await createStaffExam(adminToken, examForm);
      setMessage(editingExam ? "Exam updated." : "Exam created."); beginCreate(); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save exam."); }
    finally { setSaving(false); }
  }

  async function removeExam(exam: ManagedExam) {
    if (!window.confirm(`Delete “${exam.name}”?`)) return;
    setSaving(true); setError("");
    try { await deleteStaffExam(adminToken, exam.id); setMessage("Exam deleted."); if (editingExam?.id === exam.id) beginCreate(); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to delete exam."); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div><h1 className="font-heading font-extrabold text-[26px] text-primary">Examinations</h1><p className="text-text-muted text-[13px] mt-1">Create sessions, configure exams, and publish registration windows.</p></div>
        <button onClick={beginCreate} className="bg-primary text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold">+ New exam</button>
      </div>
      {(message || error) && <div className={`mb-5 rounded-xl px-4 py-3 text-[13px] ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
        <section className="bg-white border border-slate-200 rounded-2xl p-5 h-fit">
          <h2 className="font-heading font-bold text-[16px] text-slate-900">Sessions</h2>
          <form onSubmit={saveSession} className="mt-4 space-y-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Session<input required value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="e.g. 2026–27" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[12px] normal-case tracking-normal" /></label>
            <button disabled={saving} className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-[12px] font-semibold">Add session</button>
          </form>
          <div className="mt-5 space-y-1">
            <button onClick={() => setSelectedSessionId("all")} className={`w-full text-left rounded-lg px-3 py-2 text-[12px] ${selectedSessionId === "all" ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600"}`}>All exams <span className="float-right">{exams.length}</span></button>
            {sessions.map((session) => <div key={session.id} className={`flex min-w-0 items-center gap-1 rounded-lg ${selectedSessionId === session.id ? "bg-blue-50" : ""}`}>
              <button onClick={() => setSelectedSessionId(session.id)} className="min-w-0 flex-1 truncate px-3 py-2 text-left text-[12px] text-slate-700">{session.name}<span className="block truncate text-[10px] text-slate-400">{session.code}</span></button>
              <span className={`w-9 shrink-0 text-right text-[9px] font-semibold ${session.is_active ? "text-emerald-700" : "text-slate-400"}`}>{session.is_active ? "Active" : "Off"}</span>
              <button type="button" role="switch" aria-checked={session.is_active} aria-label={`${session.is_active ? "Deactivate" : "Activate"} ${session.name}`} title={`${session.is_active ? "Deactivate" : "Activate"} ${session.name}`} disabled={saving} onClick={() => void toggleSession(session)} className="group inline-flex h-8 w-10 shrink-0 items-center justify-center rounded-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-wait disabled:opacity-50"><span aria-hidden="true" className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${session.is_active ? "bg-emerald-600" : "bg-slate-300"}`}><span className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${session.is_active ? "translate-x-4" : "translate-x-0"}`} /></span></button>
              <button type="button" title={`Delete ${session.name}`} aria-label={`Delete ${session.name}`} disabled={saving} onClick={() => void removeSession(session)} className="h-8 w-6 shrink-0 text-center text-[12px] text-red-400 hover:text-red-600 disabled:opacity-50">×</button>
            </div>)}
          </div>
        </section>

        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#ecece7] pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#a36d17]">Exam setup</p><h2 className="mt-1 font-heading text-[19px] font-extrabold text-[#172438]">{editingExam ? "Edit examination" : "Create examination"}</h2><p className="mt-1 text-[11px] text-[#778293]">Internal exam settings and public registration details.</p></div>{editingExam && <button type="button" onClick={beginCreate} className="rounded-lg border border-[#d9dcd9] px-3 py-2 text-[10px] font-semibold text-[#586679]">Cancel edit</button>}</div>
            <form onSubmit={saveExam} className="space-y-6">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 flex items-baseline gap-2 border-b border-[#f0f0ec] pb-2"><span className="text-[10px] font-bold text-[#b28a43]">01</span><h3 className="text-[12px] font-bold text-[#344258]">Identity & session</h3><span className="text-[10px] text-[#8a94a1]">The session is the academic year.</span></div>
                <label className={labelClass}>Session<select required value={examForm.session_id} onChange={(e) => setField("session_id", Number(e.target.value))} className={fieldClass}><option value={0}>Choose a session</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                <label className={labelClass}>Exam name<input required value={examForm.name} onChange={(e) => setField("name", e.target.value)} className={fieldClass} placeholder="e.g. HBPL Scholars Examination" /></label>
                <label className={labelClass}>Short description<input value={examForm.subtitle} onChange={(e) => setField("subtitle", e.target.value)} className={fieldClass} placeholder="A short line shown with the exam title" /></label>
                <label className={labelClass}>Application number prefix<input value={examForm.application_prefix} onChange={(e) => setField("application_prefix", e.target.value)} className={fieldClass} placeholder="Optional, e.g. HBPL26" /></label>
              </section>

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 flex items-baseline gap-2 border-b border-[#f0f0ec] pb-2"><span className="text-[10px] font-bold text-[#b28a43]">02</span><h3 className="text-[12px] font-bold text-[#344258]">Eligibility & centres</h3><span className="text-[10px] text-[#8a94a1]">Centre choice is later stored on each student’s enrollment.</span></div>
                <fieldset className="sm:col-span-2"><legend className={labelClass}>Eligible classes</legend><p className="mt-1 text-[10px] text-[#8a94a1]">Choose one or more classes. Leave all unchecked to allow every class.</p><div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">{eligibleClassOptions.map((className) => { const checked = examForm.allowed_classes.includes(className); return <label key={className} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-[12px] transition ${checked ? "border-[#a36d17] bg-[#fbf6eb] text-[#77500e]" : "border-[#e5e6e2] bg-white text-[#586679] hover:border-[#c7b07c]"}`}><input type="checkbox" checked={checked} onChange={() => toggleAllowedClass(className)} className="accent-[#a36d17]"/><span>Class {className}</span></label>; })}</div></fieldset>
                <div className="rounded-xl border border-[#e0e2df] bg-[#fafaf7] p-4 sm:col-span-2">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[12px] font-bold text-[#344258]">Available exam centres <span className="ml-1 font-normal text-[#8a94a1]">{examForm.centre_ids.length} selected</span></p><p className="mt-1 text-[10px] text-[#8a94a1]">These centres become options for allocation to individual enrollments.</p></div><Link href="/staff/exam-centres" className="text-[10px] font-bold text-[#8c5b10]">Centre directory →</Link></div>
                  {centres.filter((centre) => centre.is_active || examForm.centre_ids.includes(centre.id)).length === 0 ? <p className="rounded-lg bg-white px-3 py-4 text-[11px] text-[#778293]">No active centres. Add a centre before publishing applications.</p> : <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">{centres.filter((centre) => centre.is_active || examForm.centre_ids.includes(centre.id)).map((centre) => <label key={centre.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#ecece7] bg-white p-3 text-[11px]"><input type="checkbox" checked={examForm.centre_ids.includes(centre.id)} onChange={() => toggleCentre(centre.id)} className="mt-0.5 accent-[#a36d17]"/><span className="min-w-0"><span className="block font-bold text-[#344258]">{centre.name}{!centre.is_active && <span className="ml-1 font-normal text-amber-700">Inactive</span>}</span><span className="mt-1 block truncate text-[10px] text-[#8791a0]">{[centre.city, centre.district].filter(Boolean).join(", ")} · Capacity {centre.capacity || "not set"}</span></span></label>)}</div>}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 flex items-baseline gap-2 border-b border-[#f0f0ec] pb-2"><span className="text-[10px] font-bold text-[#b28a43]">03</span><h3 className="text-[12px] font-bold text-[#344258]">Schedule & registration</h3></div>
                <label className={labelClass}>Registration status<select value={examForm.status} onChange={(e) => setField("status", e.target.value)} className={fieldClass}>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ").replace(/^./, (char) => char.toUpperCase())}</option>)}</select></label>
                <label className={labelClass}>Application fee<input type="number" min="0" step="0.01" value={examForm.fee} onChange={(e) => setField("fee", e.target.value)} className={fieldClass} /></label>
                <label className={labelClass}>Maximum enrollments<input type="number" min="0" value={examForm.max_registrations} onChange={(e) => setField("max_registrations", e.target.value)} placeholder="No limit" className={fieldClass} /></label>
                <label className={labelClass}>Exam date<input type="date" value={examForm.exam_date} onChange={(e) => setField("exam_date", e.target.value)} className={fieldClass} /></label>
                <label className={labelClass}>Result target date<input type="date" value={examForm.result_date} onChange={(e) => setField("result_date", e.target.value)} className={fieldClass} /></label>
                <label className={labelClass}>Registration opens<input type="datetime-local" value={examForm.registration_start} onChange={(e) => setField("registration_start", e.target.value)} className={fieldClass} /></label>
                <label className={labelClass}>Registration closes<input type="datetime-local" value={examForm.registration_end} onChange={(e) => setField("registration_end", e.target.value)} className={fieldClass} /></label>
              </section>

              <section className="space-y-4">
                <div className="flex items-baseline gap-2 border-b border-[#f0f0ec] pb-2"><span className="text-[10px] font-bold text-[#b28a43]">04</span><h3 className="text-[12px] font-bold text-[#344258]">Student-facing details</h3><span className="text-[10px] text-[#8a94a1]">Write requirements, instructions, and syllabus together in the editor.</span></div>
                <ExamDescriptionEditor key={descriptionEditorKey} title="Exam description & information" value={examForm.description} onChange={(value) => setField("description", value)} />
              </section>

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 flex items-baseline gap-2 border-b border-[#f0f0ec] pb-2"><span className="text-[10px] font-bold text-[#b28a43]">05</span><h3 className="text-[12px] font-bold text-[#344258]">Documents & publication</h3></div>
                <label className={`${labelClass} rounded-xl border border-dashed border-[#d7d9d8] bg-[#fafaf7] p-4`}>Admit card template<input type="file" accept="application/pdf,.pdf,text/html,.html,.htm" onChange={(e) => setField("admit_card_template", e.target.files?.[0] ?? null)} className="mt-3 block w-full text-[11px] font-normal" /><span className="mt-1 block text-[10px] font-normal text-[#778293]">PDF or HTML. HTML placeholders: {'{{ student_name }}'}, {'{{ application_number }}'}, {'{{ student_class }}'}, {'{{ student_dob }}'}, {'{{ school_name }}'}, {'{{ exam_name }}'}, {'{{ exam_session }}'}, {'{{ exam_date }}'}, {'{{ exam_weekday }}'}, {'{{ reporting_time }}'}, {'{{ exam_time }}'}, {'{{ exam_duration }}'}, {'{{ centre_name }}'}, {'{{ centre_address }}'}, {'{{ student_photo_data_uri }}'}, {'{{ student_signature_data_uri }}'}.</span>{editingExam?.admit_card_template && <a href={editingExam.admit_card_template} target="_blank" rel="noreferrer" className="mt-2 block text-[10px] font-semibold text-[#07538d] underline">View current template</a>}{examForm.admit_card_template && <span className="mt-2 block truncate text-[10px] text-emerald-700">Selected: {examForm.admit_card_template.name}</span>}</label>
                <label className={`${labelClass} rounded-xl border border-dashed border-[#d7d9d8] bg-[#fafaf7] p-4`}>Certificate template<input type="file" accept="application/pdf,.pdf,text/html,.html,.htm" onChange={(e) => setField("certificate_template", e.target.files?.[0] ?? null)} className="mt-3 block w-full text-[11px] font-normal" /><span className="mt-1 block text-[10px] font-normal text-[#778293]">PDF or HTML. HTML placeholders: {'{{ student_name }}'}, {'{{ student_class }}'}, {'{{ position_rank }}'}, {'{{ exam_name }}'}, {'{{ exam_session }}'}, {'{{ certificate_number }}'}.</span>{editingExam?.certificate_template && <a href={editingExam.certificate_template} target="_blank" rel="noreferrer" className="mt-2 block text-[10px] font-semibold text-[#07538d] underline">View current template</a>}{examForm.certificate_template && <span className="mt-2 block truncate text-[10px] text-emerald-700">Selected: {examForm.certificate_template.name}</span>}</label>
                <label className="flex items-center gap-3 rounded-xl bg-[#f5f4ef] p-4 text-[11px] font-semibold text-[#344258] sm:col-span-2"><input type="checkbox" checked={examForm.is_published} onChange={(e) => setField("is_published", e.target.checked)} className="h-4 w-4 accent-[#a36d17]"/><span><span className="block">Publish this exam</span><span className="mt-0.5 block font-normal text-[#778293]">When published, it becomes visible to eligible students in the selected session.</span></span></label>
              </section>
              <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#ecece7] bg-white/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6"><p className="text-[10px] text-[#778293]">Exam codes and slugs are generated from the name.</p><button disabled={saving || loading || !sessions.length} className="rounded-xl bg-[#172438] px-5 py-3 text-[11px] font-bold text-white transition hover:bg-[#253954] disabled:opacity-50">{saving ? "Saving…" : editingExam ? "Save examination" : "Create examination"}</button></div>
            </form>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><h2 className="font-heading font-bold text-[16px] text-slate-900">Examination list</h2><span className="text-[12px] text-slate-400">{visibleExams.length} exams</span></div>
            {loading ? <div className="p-8 text-center text-[13px] text-slate-400">Loading…</div> : visibleExams.length === 0 ? <div className="p-8 text-center text-[13px] text-slate-400">No exams yet. Create the first one above.</div> : <div className="divide-y divide-slate-100">{visibleExams.map((exam) => <div key={exam.id} className="px-5 py-4 flex items-center justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-semibold text-[13px] text-slate-900 truncate">{exam.name}</p><span className={`text-[10px] rounded-full px-2 py-0.5 ${exam.is_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{exam.is_published ? "Published" : "Draft"}</span></div><p className="text-[11px] text-slate-400 mt-1">{exam.session?.name ?? "No session"} · {exam.status} · {exam.application_count} applications</p></div><div className="flex items-center gap-2 shrink-0"><button onClick={() => beginEdit(exam)} className="text-[12px] text-blue-600 px-2 py-1">Edit</button><button onClick={() => void removeExam(exam)} className="text-[12px] text-red-500 px-2 py-1">Delete</button></div></div>)}</div>}
          </section>
        </div>
      </div>
    </div>
  );
}
