"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { token } from "../layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";
const V1 = `${API}/api/v1/cricket`;

interface Tournament {
  id: string; title: string; slug: string;
  format: string; status: string;
  start_date: string | null; end_date: string | null;
  city: string; venue: string;
}

const EMPTY: Omit<Tournament, "id"> = {
  title: "", slug: "", format: "T20",
  status: "upcoming", start_date: null, end_date: null,
  city: "", venue: "",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-gray-100 text-gray-600",
  ongoing: "bg-green-50 text-green-700",
  completed: "bg-slate-100 text-slate-500",
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Tournament> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const h = { Authorization: `Token ${token()}`, "Content-Type": "application/json" };

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${V1}/admin/tournaments/`, { headers: h })
      .then(r => r.json())
      .then(d => setTournaments(Array.isArray(d) ? d : d.results ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setError("");
    try {
      const isNew = !editing?.id;
      const body = { ...editing };
      if (!body.start_date) delete body.start_date;
      if (!body.end_date) delete body.end_date;
      if (!body.city) delete body.city;
      if (!body.venue) delete body.venue;
      if (!body.slug) delete body.slug;

      const url = isNew ? `${V1}/admin/tournaments/` : `${V1}/admin/tournaments/${editing!.id}/`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: h, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditing(null); load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete tournament? This will not delete associated matches.")) return;
    await fetch(`${V1}/admin/tournaments/${id}/`, { method: "DELETE", headers: h });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-[26px] text-primary">Tournaments</h1>
          <p className="text-text-muted text-[13px]">{tournaments.length} total</p>
        </div>
        <button
          onClick={() => { setEditing({ ...EMPTY }); setError(""); }}
          className="bg-primary text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:bg-primary-dark transition-colors"
        >
          + New Tournament
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-text-muted">Loading…</div>
        ) : tournaments.length === 0 ? (
          <div className="py-20 text-center text-text-muted">No tournaments yet.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-section text-text-muted text-[11px] uppercase tracking-wider border-b border-border/30">
                {["Title", "Format", "Status", "Dates", "Location", "Actions"].map(col => (
                  <th key={col} className="px-5 py-3 text-left font-semibold">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tournaments.map(t => (
                <tr key={t.id} className="border-b border-border/20 last:border-0 hover:bg-section/40 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-text-primary">{t.title}</p>
                    {t.slug && <p className="text-text-muted text-[11px]">{t.slug}</p>}
                  </td>
                  <td className="px-5 py-3 text-text-muted">{t.format}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text-muted text-[12px]">
                    {t.start_date ?? "—"}{t.end_date ? ` → ${t.end_date}` : ""}
                  </td>
                  <td className="px-5 py-3 text-text-muted">{[t.city, t.venue].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => { setEditing({ ...t }); setError(""); }}
                        className="text-primary hover:underline text-[12px] font-semibold">Edit</button>
                      <button onClick={() => del(t.id)}
                        className="text-red-500 hover:underline text-[12px] font-semibold">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit Tournament" : "New Tournament"} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Title" wide>
              <input value={editing.title ?? ""} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))}
                className={inp} placeholder="HBPL Premier League 2026" />
            </Field>
            <Field label="Slug">
              <input value={editing.slug ?? ""} onChange={e => setEditing(p => ({ ...p, slug: e.target.value }))}
                className={inp} placeholder="hbpl-2026" />
            </Field>
            <Field label="Format">
              <select value={editing.format ?? "T20"} onChange={e => setEditing(p => ({ ...p, format: e.target.value }))} className={inp}>
                {["T20", "ODI", "Test", "T10"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={editing.status ?? "upcoming"} onChange={e => setEditing(p => ({ ...p, status: e.target.value }))} className={inp}>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
            <Field label="Start Date">
              <input type="date" value={editing.start_date ?? ""} onChange={e => setEditing(p => ({ ...p, start_date: e.target.value || null }))} className={inp} />
            </Field>
            <Field label="End Date">
              <input type="date" value={editing.end_date ?? ""} onChange={e => setEditing(p => ({ ...p, end_date: e.target.value || null }))} className={inp} />
            </Field>
            <Field label="City">
              <input value={editing.city ?? ""} onChange={e => setEditing(p => ({ ...p, city: e.target.value }))} className={inp} placeholder="Lucknow" />
            </Field>
            <Field label="Venue">
              <input value={editing.venue ?? ""} onChange={e => setEditing(p => ({ ...p, venue: e.target.value }))} className={inp} placeholder="Stadium name" />
            </Field>
          </div>
          {error && <p className="text-red-600 text-[13px] mt-3">{error}</p>}
          <div className="flex gap-3 mt-5">
            <button onClick={save} disabled={saving || !editing.title}
              className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(null)} className="flex-1 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border transition-colors">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inp = "w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? "col-span-2" : ""}`}>
      <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-7 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading font-extrabold text-[20px] text-primary">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-[22px] leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
