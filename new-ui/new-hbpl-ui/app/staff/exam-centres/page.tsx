"use client";

import { useCallback, useEffect, useState } from "react";
import { token } from "../layout";
import {
  createStaffExamCentre,
  deleteStaffExamCentre,
  ExamCentre,
  fetchStaffExamCentres,
  updateStaffExamCentre,
} from "@/src/lib/exams-api";

type CentreForm = Omit<ExamCentre, "id" | "created_at" | "updated_at">;
const emptyForm: CentreForm = {
  name: "", code: "", address: "", city: "", district: "", state: "", postal_code: "", capacity: 0,
  contact_person: "", contact_phone: "", contact_email: "", facilities: "", internal_notes: "", is_active: true,
};
const input = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-800 outline-none focus:border-blue-400";

export default function ExamCentresPage() {
  const [centres, setCentres] = useState<ExamCentre[]>([]);
  const [editing, setEditing] = useState<ExamCentre | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CentreForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setCentres(await fetchStaffExamCentres(token())); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load centres."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function beginCreate() {
    setEditing(null); setForm(emptyForm); setShowForm(true); setError(""); setNotice("");
  }
  function beginEdit(centre: ExamCentre) {
    setEditing(centre);
    setForm({
      name: centre.name, code: centre.code, address: centre.address, city: centre.city,
      district: centre.district, state: centre.state, postal_code: centre.postal_code,
      capacity: centre.capacity, contact_person: centre.contact_person, contact_phone: centre.contact_phone,
      contact_email: centre.contact_email, facilities: centre.facilities, internal_notes: centre.internal_notes,
      is_active: centre.is_active,
    });
    setShowForm(true); setError(""); setNotice("");
  }
  function setField<K extends keyof CentreForm>(key: K, value: CentreForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      if (editing) await updateStaffExamCentre(token(), editing.id, form);
      else await createStaffExamCentre(token(), form);
      setNotice(editing ? "Centre updated." : "Centre added."); setEditing(null); setShowForm(false); setForm(emptyForm); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save centre."); }
    finally { setSaving(false); }
  }
  async function remove(centre: ExamCentre) {
    if (!window.confirm(`Delete ${centre.name}? Centres assigned to exams must be deactivated instead.`)) return;
    setError("");
    try { await deleteStaffExamCentre(token(), centre.id); setNotice("Centre deleted."); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete centre."); }
  }

  return <div className="mx-auto max-w-6xl px-6 py-8">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">Internal setup</p><h1 className="mt-1 font-heading text-[28px] font-extrabold text-slate-900">Exam centre directory</h1><p className="mt-1 text-[13px] text-slate-500">Maintain school venues and their capacity. Select centres on each exam; this directory is staff-only.</p></div>
      <button onClick={beginCreate} className="rounded-xl bg-primary px-4 py-2.5 text-[12px] font-semibold text-white">Add centre</button>
    </div>
    {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</div>}
    {notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">{notice}</div>}

    {showForm && <form onSubmit={save} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 font-heading text-[16px] font-bold text-slate-900">{editing ? "Edit centre" : "New centre"}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-[11px] text-slate-500">School / centre name<input required value={form.name} onChange={(e) => setField("name", e.target.value)} className={input} /></label>
        <label className="text-[11px] text-slate-500">Internal code<input value={form.code} onChange={(e) => setField("code", e.target.value)} className={input} /></label>
        <label className="text-[11px] text-slate-500">Seating capacity<input type="number" min="0" value={form.capacity} onChange={(e) => setField("capacity", Number(e.target.value))} className={input} /></label>
        <label className="sm:col-span-2 lg:col-span-3 text-[11px] text-slate-500">Full address<textarea required rows={2} value={form.address} onChange={(e) => setField("address", e.target.value)} className={input} /></label>
        <label className="text-[11px] text-slate-500">City / town<input value={form.city} onChange={(e) => setField("city", e.target.value)} className={input} /></label>
        <label className="text-[11px] text-slate-500">District<input value={form.district} onChange={(e) => setField("district", e.target.value)} className={input} /></label>
        <label className="text-[11px] text-slate-500">State<input value={form.state} onChange={(e) => setField("state", e.target.value)} className={input} /></label>
        <label className="text-[11px] text-slate-500">PIN / postal code<input value={form.postal_code} onChange={(e) => setField("postal_code", e.target.value)} className={input} /></label>
        <label className="text-[11px] text-slate-500">Contact person<input value={form.contact_person} onChange={(e) => setField("contact_person", e.target.value)} className={input} /></label>
        <label className="text-[11px] text-slate-500">Contact phone<input value={form.contact_phone} onChange={(e) => setField("contact_phone", e.target.value)} className={input} /></label>
        <label className="text-[11px] text-slate-500">Contact email<input type="email" value={form.contact_email} onChange={(e) => setField("contact_email", e.target.value)} className={input} /></label>
        <label className="sm:col-span-2 lg:col-span-3 text-[11px] text-slate-500">Facilities / accessibility<textarea rows={2} value={form.facilities} onChange={(e) => setField("facilities", e.target.value)} className={input} placeholder="Rooms, seating, accessible entry, parking, etc." /></label>
        <label className="sm:col-span-2 lg:col-span-3 text-[11px] text-slate-500">Internal notes<textarea rows={2} value={form.internal_notes} onChange={(e) => setField("internal_notes", e.target.value)} className={input} /></label>
        <label className="flex items-center gap-2 text-[12px] text-slate-700"><input type="checkbox" checked={form.is_active} onChange={(e) => setField("is_active", e.target.checked)} />Active and available for exam assignment</label>
      </div>
      <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={beginCreate} className="rounded-lg border border-slate-200 px-4 py-2 text-[12px] text-slate-600">Cancel</button><button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editing ? "Save centre" : "Add centre"}</button></div>
    </form>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {loading ? <p className="p-8 text-center text-[13px] text-slate-400">Loading centres…</p> : centres.length === 0 ? <p className="p-8 text-center text-[13px] text-slate-400">No centres yet. Add schools to make them available during exam setup.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">School / centre</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Capacity</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{centres.map((centre) => <tr key={centre.id} className="text-[12px]"><td className="px-4 py-3 font-semibold text-slate-800">{centre.name}{centre.code && <span className="block text-[10px] font-normal text-slate-400">{centre.code}</span>}</td><td className="max-w-xs px-4 py-3 text-slate-500">{[centre.address, centre.city, centre.district, centre.state, centre.postal_code].filter(Boolean).join(", ")}</td><td className="px-4 py-3 text-slate-600">{centre.capacity || "—"}</td><td className="px-4 py-3 text-slate-500">{centre.contact_person || "—"}<span className="block text-[10px]">{centre.contact_phone}</span></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] ${centre.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{centre.is_active ? "Active" : "Inactive"}</span></td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => beginEdit(centre)} className="text-blue-600">Edit</button><button onClick={() => void remove(centre)} className="text-red-500">Delete</button></div></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
