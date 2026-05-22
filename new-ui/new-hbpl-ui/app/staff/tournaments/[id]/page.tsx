"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { mediaUrl } from "@/src/lib/api";
import { token } from "../../layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";
const V1 = `${API}/api/v1/cricket`;

interface Tournament {
  id: string;
  title: string;
  format: string;
  status: string;
  max_overs: number;
  start_date: string;
  end_date: string;
  venue: string;
  city: string;
  description: string;
}

interface TeamBrief {
  id: string;
  name: string;
  short_name: string;
  logo_url: string;
}

interface Team {
  id: string;
  name: string;
  short_name: string;
  logo_url: string;
  home_city: string;
  registration_status: string;
  is_visible: boolean;
  tournament: string;
}

interface Match {
  id: string;
  match_number: number;
  title: string;
  team1: TeamBrief;
  team2: TeamBrief;
  venue: string;
  match_date: string;
  format: string;
  total_overs: number;
  status: string;
  innings1_score: number;
  innings1_wickets: number;
  innings1_overs: string;
  innings1_team: string | null;
  innings2_score: number;
  innings2_wickets: number;
  innings2_overs: string;
  innings2_team: string | null;
  result_text: string;
  winner: string | null;
  youtube_live_id: string;
}

const LIVE_STATUSES = new Set(["innings1", "innings2", "toss_done"]);
const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  toss_done: "Toss Done",
  innings1: "Live",
  innings2: "Live",
  completed: "Completed",
  abandoned: "Abandoned",
  rain_delay: "Rain Delay",
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  toss_done: "bg-yellow-50 text-yellow-700",
  innings1: "bg-red-50 text-red-600",
  innings2: "bg-red-50 text-red-600",
  completed: "bg-green-50 text-green-700",
  abandoned: "bg-gray-100 text-gray-500",
  rain_delay: "bg-sky-50 text-sky-700",
};
const REG_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

const EMPTY_MATCH = (tournamentId: string): Partial<Match> => ({
  match_number: 1,
  title: "",
  venue: "",
  match_date: new Date().toISOString().slice(0, 16),
  format: "T20",
  total_overs: 20,
  status: "scheduled",
  innings1_score: 0,
  innings1_wickets: 0,
  innings2_score: 0,
  innings2_wickets: 0,
  result_text: "",
  youtube_live_id: "",
});

type Tab = "teams" | "fixtures" | "bracket";

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("teams");
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingTournament, setEditingTournament] = useState(false);
  const [tForm, setTForm] = useState<Partial<Tournament>>({});
  const [savingT, setSavingT] = useState(false);
  const [togglingReg, setTogglingReg] = useState(false);

  const h = { Authorization: `Token ${token()}`, "Content-Type": "application/json" };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${V1}/admin/tournaments/${id}/`, { headers: h }).then(r => r.json()),
      fetch(`${V1}/admin/teams/?tournament=${id}`, { headers: h }).then(r => r.json()),
      fetch(`${V1}/admin/matches/?tournament=${id}`, { headers: h }).then(r => r.json()),
    ]).then(([t, tm, m]) => {
      setTournament(t);
      setTeams(Array.isArray(tm) ? tm : tm.results ?? []);
      setMatches(Array.isArray(m) ? m : m.results ?? []);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveTournament() {
    setSavingT(true);
    try {
      const res = await fetch(`${V1}/admin/tournaments/${id}/`, {
        method: "PATCH", headers: h, body: JSON.stringify(tForm),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditingTournament(false);
      load();
    } finally { setSavingT(false); }
  }

  async function approveTeam(teamId: string, action: "approve" | "reject") {
    await fetch(`${V1}/admin/teams/${teamId}/approve/`, {
      method: "POST", headers: h, body: JSON.stringify({ action }),
    });
    load();
  }

  async function toggleRegistration() {
    if (!tournament) return;
    const next = tournament.status === "registration_open" ? "registration_closed" : "registration_open";
    setTogglingReg(true);
    try {
      const res = await fetch(`${V1}/admin/tournaments/${id}/`, {
        method: "PATCH", headers: h, body: JSON.stringify({ status: next }),
      });
      if (res.ok) { const updated = await res.json(); setTournament(updated); }
    } finally { setTogglingReg(false); }
  }

  async function saveMatch() {
    setSaving(true); setError("");
    try {
      const isNew = !editingMatch?.id;
      const payload: Record<string, unknown> = {
        tournament: id,
        match_number: editingMatch?.match_number,
        title: editingMatch?.title ?? "",
        team1: typeof editingMatch?.team1 === "object" ? editingMatch.team1?.id : editingMatch?.team1,
        team2: typeof editingMatch?.team2 === "object" ? editingMatch.team2?.id : editingMatch?.team2,
        venue: editingMatch?.venue ?? "",
        match_date: editingMatch?.match_date ?? "",
        format: editingMatch?.format ?? "T20",
        total_overs: editingMatch?.total_overs ?? 20,
        status: editingMatch?.status ?? "scheduled",
        result_text: editingMatch?.result_text ?? "",
        youtube_live_id: editingMatch?.youtube_live_id ?? "",
      };
      const url = isNew ? `${V1}/admin/matches/` : `${V1}/admin/matches/${editingMatch!.id}/`;
      const res = await fetch(url, { method: isNew ? "POST" : "PUT", headers: h, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      setEditingMatch(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  }

  async function deleteMatch(matchId: string) {
    if (!confirm("Delete this match?")) return;
    await fetch(`${V1}/admin/matches/${matchId}/`, { method: "DELETE", headers: h });
    load();
  }

  const approvedTeams = teams.filter(t => t.registration_status === "approved");
  const grouped = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.title || `Match #${m.match_number}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  if (loading) {
    return <div className="py-20 text-center text-text-muted">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/staff/tournaments" className="text-text-muted hover:text-primary text-[13px]">← Tournaments</Link>
          <h1 className="font-heading font-extrabold text-[26px] text-primary mt-1">{tournament?.title}</h1>
          <p className="text-text-muted text-[13px]">
            {tournament?.format} · {tournament?.max_overs} overs · {tournament?.city} ·
            <span className={`ml-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
              tournament?.status === "registration_open" ? "bg-green-50 text-green-700" :
              tournament?.status === "registration_closed" ? "bg-red-50 text-red-600" :
              tournament?.status === "ongoing" ? "bg-blue-50 text-blue-700" :
              "bg-gray-100 text-gray-500"
            }`}>
              {tournament?.status?.replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Registration toggle */}
          {tournament && (tournament.status === "registration_open" || tournament.status === "registration_closed") && (
            <button
              onClick={toggleRegistration}
              disabled={togglingReg}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-50 border ${
                tournament.status === "registration_open"
                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              }`}
            >
              {togglingReg ? "Saving…" : tournament.status === "registration_open" ? "Close Registrations" : "Open Registrations"}
            </button>
          )}
          <button onClick={() => { setTForm({ title: tournament?.title, format: tournament?.format, status: tournament?.status, venue: tournament?.venue, city: tournament?.city, max_overs: tournament?.max_overs }); setEditingTournament(true); }}
            className="bg-section text-text-primary px-4 py-2 rounded-xl text-[13px] font-semibold hover:bg-border transition-colors border border-border/50">
            Edit Tournament
          </button>
          {tab === "fixtures" && (
            <button onClick={() => setEditingMatch({ ...EMPTY_MATCH(id), match_number: matches.length + 1 })}
              className="bg-primary text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-primary-dark transition-colors">
              + Add Match
            </button>
          )}
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Teams", value: approvedTeams.length },
          { label: "Pending", value: teams.filter(t => t.registration_status === "pending").length },
          { label: "Matches", value: matches.length },
          { label: "Completed", value: matches.filter(m => m.status === "completed").length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-border/50 px-5 py-4 text-center">
            <p className="font-heading font-extrabold text-[22px] text-primary">{s.value}</p>
            <p className="text-text-muted text-[12px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-section rounded-xl p-1 w-fit">
        {(["teams", "fixtures", "bracket"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors capitalize ${tab === t ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-primary"}`}>
            {t === "fixtures" ? `Fixtures (${matches.length})` : t === "teams" ? `Teams (${teams.length})` : "Bracket"}
          </button>
        ))}
      </div>

      {/* Teams Tab */}
      {tab === "teams" && (
        <div className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden">
          {teams.length === 0 ? (
            <div className="py-20 text-center text-text-muted">No team registrations yet.</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-section text-text-muted text-[11px] uppercase tracking-wider border-b border-border/30">
                  {["Team", "City", "Contact", "Status", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map(team => (
                  <tr key={team.id} className="border-b border-border/20 last:border-0 hover:bg-section/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {team.logo_url
                            ? <img src={mediaUrl(team.logo_url)} alt={team.name} className="w-full h-full object-cover" />
                            : <span className="font-heading font-extrabold text-primary text-[11px]">{(team.short_name || team.name).slice(0,2).toUpperCase()}</span>}
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">{team.name}</p>
                          <p className="text-text-muted text-[11px]">{team.short_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-text-muted">{team.home_city || "—"}</td>
                    <td className="px-5 py-3 text-text-muted text-[12px]">—</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${REG_COLORS[team.registration_status] ?? "bg-gray-100 text-gray-500"}`}>
                        {team.registration_status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        {team.registration_status !== "approved" && (
                          <button onClick={() => approveTeam(team.id, "approve")} className="text-green-600 hover:underline text-[12px] font-semibold">Approve</button>
                        )}
                        {team.registration_status !== "rejected" && (
                          <button onClick={() => approveTeam(team.id, "reject")} className="text-red-500 hover:underline text-[12px] font-semibold">Reject</button>
                        )}
                        <Link href={`/staff/cricket-teams`} className="text-primary hover:underline text-[12px] font-semibold">Manage</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Fixtures Tab */}
      {tab === "fixtures" && (
        <div className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden">
          {matches.length === 0 ? (
            <div className="py-20 text-center text-text-muted">No fixtures yet. Click "+ Add Match" to create one.</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-section text-text-muted text-[11px] uppercase tracking-wider border-b border-border/30">
                  {["#", "Teams", "Date", "Venue", "Status", "Score", "Actions"].map(col => (
                    <th key={col} className="px-4 py-3 text-left font-semibold">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matches.map(m => {
                  const isLive = LIVE_STATUSES.has(m.status);
                  return (
                    <tr key={m.id} className="border-b border-border/20 last:border-0 hover:bg-section/40 transition-colors">
                      <td className="px-4 py-3 text-text-muted font-medium">{m.match_number}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-text-primary">{m.team1?.short_name || m.team1?.name || "TBD"}</span>
                        <span className="text-text-muted text-[11px] mx-1.5">vs</span>
                        <span className="font-semibold text-text-primary">{m.team2?.short_name || m.team2?.name || "TBD"}</span>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-[12px]">
                        {new Date(m.match_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        <p className="text-[11px]">{new Date(m.match_date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                      </td>
                      <td className="px-4 py-3 text-text-muted max-w-25 truncate">{m.venue || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[m.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {isLive && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                          {STATUS_LABEL[m.status] ?? m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-[12px]">
                        {m.status !== "scheduled" ? (
                          <span>{m.innings1_score}/{m.innings1_wickets} · {m.innings2_score}/{m.innings2_wickets}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setEditingMatch({ ...m, match_date: m.match_date?.slice(0, 16) })} className="text-primary hover:underline text-[12px] font-semibold">Edit</button>
                          {m.status === "scheduled" && (
                            <Link href={`/staff/matches/${m.id}/setup`} className="text-orange-600 hover:underline text-[12px] font-semibold">Setup</Link>
                          )}
                          {LIVE_STATUSES.has(m.status) && (
                            <Link href={`/staff/matches/${m.id}/live`} className="text-red-600 hover:underline text-[12px] font-semibold">Score</Link>
                          )}
                          <button onClick={() => deleteMatch(m.id)} className="text-red-500 hover:underline text-[12px] font-semibold">Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Bracket Tab */}
      {tab === "bracket" && (
        <div className="flex gap-5 overflow-x-auto pb-4">
          {matches.length === 0 ? (
            <div className="bg-white rounded-3xl py-20 text-center text-text-muted border border-border/50 w-full">
              No fixtures yet.
            </div>
          ) : (
            matches.map(m => {
              const isLive = LIVE_STATUSES.has(m.status);
              return (
                <div key={m.id} className="shrink-0 w-60 bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                  <div className={`h-1 w-full ${isLive ? "bg-red-500" : m.status === "completed" ? "bg-green-500" : "bg-blue-300"}`} />
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-2">Match #{m.match_number}</p>
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-[13px] truncate flex-1 ${m.winner === m.team1?.id ? "font-bold text-green-700" : "font-medium text-text-primary"}`}>
                        {m.team1?.short_name || m.team1?.name || "TBD"}
                      </p>
                      {m.status !== "scheduled" && (
                        <p className="text-[12px] font-semibold ml-2 shrink-0">{m.innings1_score}/{m.innings1_wickets}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-[13px] truncate flex-1 ${m.winner === m.team2?.id ? "font-bold text-green-700" : "font-medium text-text-primary"}`}>
                        {m.team2?.short_name || m.team2?.name || "TBD"}
                      </p>
                      {m.status !== "scheduled" && (
                        <p className="text-[12px] font-semibold ml-2 shrink-0">{m.innings2_score}/{m.innings2_wickets}</p>
                      )}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {STATUS_LABEL[m.status] ?? m.status}
                      </span>
                      <div className="flex gap-2">
                        {m.status === "scheduled" && (
                          <Link href={`/staff/matches/${m.id}/setup`} className="text-orange-600 text-[11px] font-semibold hover:underline">Setup</Link>
                        )}
                        {LIVE_STATUSES.has(m.status) && (
                          <Link href={`/staff/matches/${m.id}/live`} className="text-red-600 text-[11px] font-semibold hover:underline">Score</Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tournament Edit Modal */}
      {editingTournament && (
        <Modal title="Edit Tournament" onClose={() => setEditingTournament(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Title" wide>
              <input value={tForm.title ?? ""} onChange={e => setTForm(p => ({ ...p, title: e.target.value }))} className={inp} />
            </Field>
            <Field label="Format">
              <select value={tForm.format ?? "T20"} onChange={e => setTForm(p => ({ ...p, format: e.target.value }))} className={inp}>
                {["T20", "ODI", "T10", "TEST"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Max Overs">
              <input type="number" value={tForm.max_overs ?? 20} onChange={e => setTForm(p => ({ ...p, max_overs: Number(e.target.value) }))} className={inp} />
            </Field>
            <Field label="Status">
              <select value={tForm.status ?? "registration_open"} onChange={e => setTForm(p => ({ ...p, status: e.target.value }))} className={inp}>
                {["registration_open", "registration_closed", "ongoing", "completed"].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </Field>
            <Field label="Venue" wide>
              <input value={tForm.venue ?? ""} onChange={e => setTForm(p => ({ ...p, venue: e.target.value }))} className={inp} />
            </Field>
            <Field label="City">
              <input value={tForm.city ?? ""} onChange={e => setTForm(p => ({ ...p, city: e.target.value }))} className={inp} />
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={saveTournament} disabled={savingT}
              className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {savingT ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditingTournament(false)} className="flex-1 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Match Edit Modal */}
      {editingMatch && (
        <Modal title={editingMatch.id ? "Edit Match" : "New Match"} onClose={() => { setEditingMatch(null); setError(""); }}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Match #">
              <input type="number" value={editingMatch.match_number ?? ""} onChange={e => setEditingMatch(p => ({ ...p, match_number: Number(e.target.value) }))} className={inp} />
            </Field>
            <Field label="Title">
              <input value={editingMatch.title ?? ""} onChange={e => setEditingMatch(p => ({ ...p, title: e.target.value }))} className={inp} placeholder="e.g. Semi Final 1" />
            </Field>
            <Field label="Team 1">
              <select
                value={typeof editingMatch.team1 === "object" ? editingMatch.team1?.id ?? "" : editingMatch.team1 ?? ""}
                onChange={e => setEditingMatch(p => ({ ...p, team1: e.target.value as unknown as TeamBrief }))}
                className={inp}
              >
                <option value="">— Select team</option>
                {approvedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Team 2">
              <select
                value={typeof editingMatch.team2 === "object" ? editingMatch.team2?.id ?? "" : editingMatch.team2 ?? ""}
                onChange={e => setEditingMatch(p => ({ ...p, team2: e.target.value as unknown as TeamBrief }))}
                className={inp}
              >
                <option value="">— Select team</option>
                {approvedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Date & Time" wide>
              <input type="datetime-local" value={editingMatch.match_date ?? ""} onChange={e => setEditingMatch(p => ({ ...p, match_date: e.target.value }))} className={inp} />
            </Field>
            <Field label="Venue" wide>
              <input value={editingMatch.venue ?? ""} onChange={e => setEditingMatch(p => ({ ...p, venue: e.target.value }))} className={inp} />
            </Field>
            <Field label="Format">
              <select value={editingMatch.format ?? "T20"} onChange={e => setEditingMatch(p => ({ ...p, format: e.target.value }))} className={inp}>
                {["T20", "ODI", "T10", "TEST"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Total Overs">
              <input type="number" value={editingMatch.total_overs ?? 20} onChange={e => setEditingMatch(p => ({ ...p, total_overs: Number(e.target.value) }))} className={inp} />
            </Field>
            <Field label="Status">
              <select value={editingMatch.status ?? "scheduled"} onChange={e => setEditingMatch(p => ({ ...p, status: e.target.value }))} className={inp}>
                {["scheduled", "toss_done", "innings1", "innings2", "completed", "abandoned", "rain_delay"].map(s => (
                  <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                ))}
              </select>
            </Field>
            <Field label="YouTube Live ID">
              <input value={editingMatch.youtube_live_id ?? ""} onChange={e => setEditingMatch(p => ({ ...p, youtube_live_id: e.target.value }))} className={inp} placeholder="e.g. dQw4w9WgXcQ" />
            </Field>
            <Field label="Result Text" wide>
              <input value={editingMatch.result_text ?? ""} onChange={e => setEditingMatch(p => ({ ...p, result_text: e.target.value }))} className={inp} placeholder="e.g. Lucknow Lions won by 23 runs" />
            </Field>
          </div>
          {error && <p className="text-red-600 text-[13px] mt-3">{error}</p>}
          <div className="flex gap-3 mt-5">
            <button onClick={saveMatch} disabled={saving}
              className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Save Match"}
            </button>
            <button onClick={() => { setEditingMatch(null); setError(""); }}
              className="flex-1 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border transition-colors">Cancel</button>
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
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-[22px] leading-none cursor-pointer">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
