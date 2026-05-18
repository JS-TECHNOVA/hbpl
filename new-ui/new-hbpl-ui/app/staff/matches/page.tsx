"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { token } from "../layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";
const V1 = `${API}/api/v1/cricket`;

interface TeamBrief { id: string; name: string; short_name: string; logo_url: string }
interface TournamentBrief { id: string; title: string; format: string; status: string }
interface Match {
  id: string; title: string; match_number: number;
  team1: TeamBrief; team2: TeamBrief;
  tournament: TournamentBrief | null;
  match_date: string; venue: string; format: string; total_overs: number;
  status: string; youtube_live_id: string; result_text: string;
  innings1_score: number; innings1_wickets: number; innings1_overs: string;
  innings2_score: number; innings2_wickets: number; innings2_overs: string;
}
interface TeamList { id: string; name: string; short_name: string; city: string }

const EMPTY_FORM = {
  team1: "", team2: "", tournament: "",
  match_number: 1, title: "", format: "T20", total_overs: 20,
  match_date: "", venue: "", youtube_live_id: "",
};

const STATUS_META: Record<string, { label: string; cls: string; dot?: boolean }> = {
  scheduled: { label: "Scheduled", cls: "bg-blue-50 text-blue-700" },
  toss_done: { label: "Toss Done", cls: "bg-amber-50 text-amber-700" },
  innings1: { label: "LIVE", cls: "bg-red-50 text-red-700", dot: true },
  innings2: { label: "LIVE", cls: "bg-red-50 text-red-700", dot: true },
  completed: { label: "Completed", cls: "bg-green-50 text-green-700" },
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<TeamList[]>([]);
  const [tournaments, setTournaments] = useState<TournamentBrief[]>([]);
  const [filterTournament, setFilterTournament] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof EMPTY_FORM | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const h = { Authorization: `Token ${token()}`, "Content-Type": "application/json" };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterTournament) params.set("tournament", filterTournament);
    if (filterStatus) params.set("status", filterStatus);
    Promise.all([
      fetch(`${V1}/admin/matches/?${params}`, { headers: h }).then(r => r.json()),
      fetch(`${V1}/admin/teams/`, { headers: h }).then(r => r.json()).catch(() => []),
      fetch(`${V1}/admin/tournaments/`, { headers: h }).then(r => r.json()).catch(() => []),
    ]).then(([m, t, tr]) => {
      setMatches(Array.isArray(m) ? m : m.results ?? []);
      setTeams(Array.isArray(t) ? t : t.results ?? []);
      setTournaments(Array.isArray(tr) ? tr : tr.results ?? []);
    }).finally(() => setLoading(false));
  }, [filterTournament, filterStatus]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
  }

  function openEdit(m: Match) {
    setEditId(m.id);
    setForm({
      team1: m.team1.id, team2: m.team2.id,
      tournament: m.tournament?.id ?? "",
      match_number: m.match_number, title: m.title, format: m.format,
      total_overs: m.total_overs, match_date: m.match_date?.slice(0, 16) ?? "",
      venue: m.venue, youtube_live_id: m.youtube_live_id,
    });
    setError("");
  }

  async function save() {
    if (!form) return;
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = { ...form };
      if (!body.tournament) delete body.tournament;
      if (!body.title) delete body.title;
      if (!body.youtube_live_id) delete body.youtube_live_id;

      const url = editId ? `${V1}/admin/matches/${editId}/` : `${V1}/admin/matches/`;
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: h, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setForm(null); setEditId(null); load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this match?")) return;
    await fetch(`${V1}/admin/matches/${id}/`, { method: "DELETE", headers: h });
    load();
  }

  function scoreDisplay(m: Match) {
    if (!["innings1", "innings2", "completed"].includes(m.status)) return null;
    const s1 = m.innings1_score > 0 || m.status !== "scheduled"
      ? `${m.team1.short_name} ${m.innings1_score}/${m.innings1_wickets} (${m.innings1_overs})`
      : null;
    const s2 = m.innings2_score > 0
      ? `${m.team2.short_name} ${m.innings2_score}/${m.innings2_wickets} (${m.innings2_overs})`
      : null;
    return [s1, s2].filter(Boolean).join(" · ") || null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-[26px] text-primary">All Matches</h1>
          <p className="text-text-muted text-[13px]">{matches.length} total</p>
        </div>
        <button onClick={openNew} className="bg-primary text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:bg-primary-dark transition-colors">
          + New Match
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterTournament} onChange={e => setFilterTournament(e.target.value)} className={sel}>
          <option value="">All Tournaments</option>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={sel}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(filterTournament || filterStatus) && (
          <button onClick={() => { setFilterTournament(""); setFilterStatus(""); }} className="px-3 py-2 text-[13px] text-text-muted hover:text-text-primary underline">
            Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-text-muted">Loading…</div>
        ) : matches.length === 0 ? (
          <div className="py-20 text-center text-text-muted">No matches yet.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-section text-text-muted text-[11px] uppercase tracking-wider border-b border-border/30">
                {["Date / Venue", "Teams", "Format", "Status", "Score", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matches.map(m => {
                const meta = STATUS_META[m.status] ?? { label: m.status, cls: "bg-gray-100 text-gray-500" };
                const score = scoreDisplay(m);
                return (
                  <tr key={m.id} className="border-b border-border/20 last:border-0 hover:bg-section/40 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="font-semibold text-text-primary">
                        {m.match_date ? new Date(m.match_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                      </p>
                      <p className="text-text-muted text-[11px] truncate max-w-32">{m.venue || "—"}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary">{m.team1.short_name}</span>
                        <span className="text-text-muted text-[11px]">vs</span>
                        <span className="font-semibold text-text-primary">{m.team2.short_name}</span>
                      </div>
                      {m.title && <p className="text-text-muted text-[11px]">{m.title}</p>}
                    </td>
                    <td className="px-5 py-3 text-text-muted">{m.format} · {m.total_overs} ov</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${meta.cls}`}>
                        {meta.dot && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-text-muted text-[12px] max-w-40">
                      {score ?? (m.result_text || "—")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => openEdit(m)} className="text-primary hover:underline text-[12px] font-semibold">Edit</button>
                        {(m.status === "scheduled" || m.status === "toss_done") && (
                          <Link href={`/staff/matches/${m.id}/setup`} className="text-orange-600 hover:underline text-[12px] font-semibold">Setup</Link>
                        )}
                        {(m.status === "innings1" || m.status === "innings2") && (
                          <Link href={`/staff/matches/${m.id}/live`} className="text-red-600 hover:underline text-[12px] font-semibold">Score</Link>
                        )}
                        {m.status === "completed" && (
                          <Link href={`/match/${m.id}`} className="text-green-700 hover:underline text-[12px] font-semibold" target="_blank">View</Link>
                        )}
                        <button onClick={() => del(m.id)} className="text-red-500 hover:underline text-[12px] font-semibold">Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {form && (
        <Modal title={editId ? "Edit Match" : "New Match"} onClose={() => setForm(null)}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Team 1">
              <select value={form.team1} onChange={e => setForm(p => ({ ...p!, team1: e.target.value }))} className={inp}>
                <option value="">— Select team —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}{t.city ? ` · ${t.city}` : ""}</option>)}
              </select>
            </Field>
            <Field label="Team 2">
              <select value={form.team2} onChange={e => setForm(p => ({ ...p!, team2: e.target.value }))} className={inp}>
                <option value="">— Select team —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}{t.city ? ` · ${t.city}` : ""}</option>)}
              </select>
            </Field>
            <Field label="Tournament">
              <select value={form.tournament} onChange={e => setForm(p => ({ ...p!, tournament: e.target.value }))} className={inp}>
                <option value="">— None —</option>
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </Field>
            <Field label="Format">
              <select value={form.format} onChange={e => setForm(p => ({ ...p!, format: e.target.value }))} className={inp}>
                {["T20", "ODI", "Test", "T10"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Total Overs">
              <input type="number" min={1} value={form.total_overs} onChange={e => setForm(p => ({ ...p!, total_overs: Number(e.target.value) }))} className={inp} />
            </Field>
            <Field label="Match #">
              <input type="number" min={1} value={form.match_number} onChange={e => setForm(p => ({ ...p!, match_number: Number(e.target.value) }))} className={inp} />
            </Field>
            <Field label="Date & Time" wide>
              <input type="datetime-local" value={form.match_date} onChange={e => setForm(p => ({ ...p!, match_date: e.target.value }))} className={inp} />
            </Field>
            <Field label="Venue" wide>
              <input value={form.venue} onChange={e => setForm(p => ({ ...p!, venue: e.target.value }))} className={inp} placeholder="Stadium, City" />
            </Field>
            <Field label="Title (optional)" wide>
              <input value={form.title} onChange={e => setForm(p => ({ ...p!, title: e.target.value }))} className={inp} placeholder="e.g. Semi Final" />
            </Field>
            <Field label="YouTube Live ID (optional)" wide>
              <input value={form.youtube_live_id} onChange={e => setForm(p => ({ ...p!, youtube_live_id: e.target.value }))} className={inp} placeholder="dQw4w9WgXcQ" />
            </Field>
          </div>
          {error && <p className="text-red-600 text-[13px] mt-3 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
          <div className="flex gap-3 mt-5">
            <button onClick={save} disabled={saving || !form.team1 || !form.team2} className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setForm(null)} className="flex-1 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border transition-colors">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inp = "w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
const sel = "border border-border rounded-xl px-3 py-2 text-[13px] text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20";

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
