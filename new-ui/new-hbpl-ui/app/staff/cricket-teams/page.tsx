"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { token } from "../layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";
const V1 = `${API}/api/v1/cricket`;

interface Tournament { id: string; title: string }
interface PlayerBrief { id: string; name: string; role: string; jersey_number: number | null; photo_url: string }
interface Team {
  id: string; name: string; short_name: string; logo_url: string;
  home_city: string; tournament: string | null;
  registration_status: string; is_visible: boolean;
  captain: PlayerBrief | null;
  vice_captain: PlayerBrief | null;
  wicket_keeper: PlayerBrief | null;
}
interface Player {
  id: string; name: string; role: string;
  batting_style: string; bowling_style: string;
  jersey_number: number | null; photo_url: string;
}

const EMPTY_TEAM = (): Omit<Team, "id" | "logo_url" | "captain" | "vice_captain" | "wicket_keeper"> => ({
  name: "", short_name: "", home_city: "",
  tournament: null, registration_status: "pending", is_visible: true,
});

const EMPTY_PLAYER = (): Omit<Player, "id" | "photo_url"> => ({
  name: "", role: "batsman", batting_style: "right_hand",
  bowling_style: "none", jersey_number: null,
});

const ROLES = ["batsman", "bowler", "all_rounder", "wicket_keeper", "wicket_keeper_batsman"];
const BAT_STYLES = [
  { value: "right_hand", label: "Right Hand" },
  { value: "left_hand", label: "Left Hand" },
];
const BOWL_STYLES = [
  { value: "none", label: "None" },
  { value: "right_arm_fast", label: "RA Fast" },
  { value: "right_arm_medium", label: "RA Medium" },
  { value: "right_arm_off_spin", label: "RA Off-spin" },
  { value: "right_arm_leg_spin", label: "RA Leg-spin" },
  { value: "left_arm_fast", label: "LA Fast" },
  { value: "left_arm_medium", label: "LA Medium" },
  { value: "left_arm_spin", label: "LA Spin" },
];

const ROLE_COLORS: Record<string, string> = {
  batsman: "bg-blue-50 text-blue-700",
  bowler: "bg-green-50 text-green-700",
  all_rounder: "bg-orange-50 text-orange-700",
  wicket_keeper: "bg-purple-50 text-purple-700",
  wicket_keeper_batsman: "bg-purple-50 text-purple-700",
};

const REG_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

export default function CricketTeamsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filterTournament, setFilterTournament] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTeam, setEditTeam] = useState<Partial<Team> | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamError, setTeamError] = useState("");

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [editPlayer, setEditPlayer] = useState<Partial<Player> | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [savingPlayer, setSavingPlayer] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [savingDesignation, setSavingDesignation] = useState(false);

  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const h = { Authorization: `Token ${token()}` };

  const loadTeams = useCallback(() => {
    setLoading(true);
    const params = filterTournament ? `?tournament=${filterTournament}` : "";
    fetch(`${V1}/admin/teams/${params}`, { headers: h })
      .then(r => r.json())
      .then(d => setTeams(Array.isArray(d) ? d : d.results ?? []))
      .finally(() => setLoading(false));
  }, [filterTournament]);

  useEffect(() => {
    fetch(`${V1}/admin/tournaments/`, { headers: h })
      .then(r => r.json())
      .then(d => setTournaments(Array.isArray(d) ? d : d.results ?? []));
  }, []);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  function loadPlayers(teamId: string) {
    setPlayersLoading(true);
    fetch(`${V1}/players/?team=${teamId}`, { headers: h })
      .then(r => r.json())
      .then(d => setPlayers(Array.isArray(d) ? d : d.results ?? []))
      .finally(() => setPlayersLoading(false));
  }

  function openTeam(team: Team) {
    setSelectedTeam(team);
    loadPlayers(team.id);
    setEditPlayer(null);
  }

  // ── Designation helpers ─────────────────────────────────────────────────────

  function isCapt(p: Player) { return selectedTeam?.captain?.id === p.id; }
  function isVC(p: Player) { return selectedTeam?.vice_captain?.id === p.id; }
  function isWK(p: Player) { return selectedTeam?.wicket_keeper?.id === p.id; }

  async function setDesignation(field: "captain_id" | "vice_captain_id" | "wicket_keeper_id", playerId: string | null) {
    if (!selectedTeam) return;
    setSavingDesignation(true);
    try {
      const res = await fetch(`${V1}/admin/teams/${selectedTeam.id}/set-designations/`, {
        method: "POST",
        headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: playerId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: Team = await res.json();
      setSelectedTeam(updated);
      setTeams(ts => ts.map(t => t.id === updated.id ? updated : t));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to set designation");
    } finally {
      setSavingDesignation(false);
    }
  }

  // ── Team CRUD ───────────────────────────────────────────────────────────────

  async function saveTeam() {
    setSavingTeam(true); setTeamError("");
    try {
      const isNew = !editTeam?.id;
      const fd = new FormData();
      const fields = ["name", "short_name", "home_city", "registration_status"] as const;
      fields.forEach(f => { if (editTeam?.[f] !== undefined) fd.append(f, String(editTeam[f])); });
      if (editTeam?.tournament) fd.append("tournament", editTeam.tournament);
      fd.append("is_visible", editTeam?.is_visible ? "true" : "false");
      if (logoFile) fd.append("logo_url", logoFile);

      const url = isNew ? `${V1}/admin/teams/` : `${V1}/admin/teams/${editTeam!.id}/`;
      const res = await fetch(url, { method: isNew ? "POST" : "PATCH", headers: h, body: fd });
      if (!res.ok) throw new Error(await res.text());
      setEditTeam(null); setLogoFile(null); loadTeams();
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingTeam(false);
    }
  }

  async function deleteTeam(id: string) {
    if (!confirm("Delete this team and all its players?")) return;
    await fetch(`${V1}/admin/teams/${id}/`, { method: "DELETE", headers: h });
    if (selectedTeam?.id === id) setSelectedTeam(null);
    loadTeams();
  }

  async function approveTeam(id: string, action: "approve" | "reject") {
    await fetch(`${V1}/admin/teams/${id}/approve/`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadTeams();
  }

  // ── Player CRUD ─────────────────────────────────────────────────────────────

  async function savePlayer() {
    if (!selectedTeam) return;
    setSavingPlayer(true); setPlayerError("");
    try {
      const isNew = !editPlayer?.id;
      const fd = new FormData();
      const fields = ["name", "role", "batting_style", "bowling_style"] as const;
      fields.forEach(f => { if (editPlayer?.[f] !== undefined) fd.append(f, String(editPlayer[f])); });
      if (editPlayer?.jersey_number != null) fd.append("jersey_number", String(editPlayer.jersey_number));
      fd.append("team", selectedTeam.id);
      if (selectedTeam.tournament) fd.append("tournament", selectedTeam.tournament);
      if (photoFile) fd.append("photo_url", photoFile);

      const url = isNew ? `${V1}/admin/players/` : `${V1}/admin/players/${editPlayer!.id}/`;
      const res = await fetch(url, { method: isNew ? "POST" : "PATCH", headers: h, body: fd });
      if (!res.ok) throw new Error(await res.text());
      setEditPlayer(null); setPhotoFile(null); loadPlayers(selectedTeam.id);
    } catch (e) {
      setPlayerError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingPlayer(false);
    }
  }

  async function deletePlayer(pid: string) {
    if (!selectedTeam || !confirm("Remove this player?")) return;
    await fetch(`${V1}/admin/players/${pid}/`, { method: "DELETE", headers: h });
    loadPlayers(selectedTeam.id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-extrabold text-[26px] text-primary">Cricket Teams</h1>
          <p className="text-text-muted text-[13px]">{teams.length} teams</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterTournament} onChange={e => setFilterTournament(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">All Tournaments</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button onClick={() => { setEditTeam(EMPTY_TEAM()); setLogoFile(null); setTeamError(""); }}
            className="bg-primary text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:bg-primary-dark transition-colors">
            + New Team
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teams list */}
        <div className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-text-muted">Loading…</div>
          ) : teams.length === 0 ? (
            <div className="py-16 text-center text-text-muted">No teams yet.</div>
          ) : (
            <div className="divide-y divide-border/20">
              {teams.map(team => (
                <div key={team.id} onClick={() => openTeam(team)}
                  className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-section/60 ${selectedTeam?.id === team.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-primary/10">
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-heading font-extrabold text-primary text-[14px]">
                        {(team.short_name || team.name).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading font-extrabold text-text-primary text-[14px] truncate">{team.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${REG_STATUS_COLORS[team.registration_status] ?? "bg-gray-100 text-gray-500"}`}>
                        {team.registration_status}
                      </span>
                    </div>
                    <p className="text-text-muted text-[12px]">
                      {[team.short_name, team.home_city].filter(Boolean).join(" · ")}
                    </p>
                    {/* designation badges */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {team.captain && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">C: {team.captain.name}</span>}
                      {team.vice_captain && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">VC: {team.vice_captain.name}</span>}
                      {team.wicket_keeper && <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">WK: {team.wicket_keeper.name}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {team.registration_status === "pending" && (
                      <>
                        <button onClick={() => approveTeam(team.id, "approve")} className="text-green-600 text-[11px] font-semibold hover:underline">Approve</button>
                        <button onClick={() => approveTeam(team.id, "reject")} className="text-red-500 text-[11px] font-semibold hover:underline">Reject</button>
                      </>
                    )}
                    <button onClick={() => { setEditTeam({ ...team }); setLogoFile(null); setTeamError(""); }} className="text-primary text-[12px] font-semibold hover:underline">Edit</button>
                    <button onClick={() => deleteTeam(team.id)} className="text-red-500 text-[12px] font-semibold hover:underline">Del</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Squad panel */}
        {selectedTeam ? (
          <div className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
              <div>
                <p className="font-heading font-extrabold text-[15px] text-primary">{selectedTeam.name}</p>
                <p className="text-text-muted text-[12px]">{players.length} players · click row to set C/VC/WK</p>
              </div>
              <button onClick={() => { setEditPlayer(EMPTY_PLAYER()); setPhotoFile(null); setPlayerError(""); }}
                className="bg-primary text-white px-4 py-2 rounded-xl text-[13px] font-semibold hover:bg-primary-dark transition-colors">
                + Add Player
              </button>
            </div>

            {/* Designation legend */}
            <div className="flex items-center gap-3 px-5 py-2.5 bg-section/30 border-b border-border/15 text-[11px]">
              <span className="flex items-center gap-1"><span className="bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full text-[9px]">C</span> Captain</span>
              <span className="flex items-center gap-1"><span className="bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full text-[9px]">VC</span> Vice-Captain</span>
              <span className="flex items-center gap-1"><span className="bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full text-[9px]">WK</span> Wicket-Keeper</span>
            </div>

            {playersLoading ? (
              <div className="py-12 text-center text-text-muted">Loading squad…</div>
            ) : players.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-[13px]">No players yet.</div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {players.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/15 last:border-0 hover:bg-section/40 transition-colors">
                    <span className="w-6 text-center text-text-muted text-[12px] font-semibold shrink-0">{i + 1}</span>
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="font-heading font-extrabold text-primary text-[12px]">{p.name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-text-primary text-[13px] truncate">{p.name}</p>
                        {p.jersey_number != null && <span className="text-[10px] text-text-muted">#{p.jersey_number}</span>}
                        {isCapt(p) && <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">C</span>}
                        {isVC(p) && <span className="bg-orange-100 text-orange-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">VC</span>}
                        {isWK(p) && <span className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">WK</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[p.role] ?? "bg-gray-100 text-gray-600"}`}>{p.role.replace(/_/g, " ")}</span>
                        <span className="text-text-muted text-[11px]">{BAT_STYLES.find(s => s.value === p.batting_style)?.label}</span>
                      </div>
                    </div>

                    {/* Designation quick-set */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        disabled={savingDesignation}
                        onClick={() => setDesignation("captain_id", isCapt(p) ? null : p.id)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors border ${isCapt(p) ? "bg-blue-100 border-blue-300 text-blue-700" : "border-border text-text-muted hover:border-blue-300 hover:text-blue-600"}`}
                        title={isCapt(p) ? "Remove as Captain" : "Set as Captain"}
                      >C</button>
                      <button
                        disabled={savingDesignation}
                        onClick={() => setDesignation("vice_captain_id", isVC(p) ? null : p.id)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors border ${isVC(p) ? "bg-orange-100 border-orange-300 text-orange-700" : "border-border text-text-muted hover:border-orange-300 hover:text-orange-600"}`}
                        title={isVC(p) ? "Remove as Vice-Captain" : "Set as Vice-Captain"}
                      >VC</button>
                      <button
                        disabled={savingDesignation}
                        onClick={() => setDesignation("wicket_keeper_id", isWK(p) ? null : p.id)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors border ${isWK(p) ? "bg-purple-100 border-purple-300 text-purple-700" : "border-border text-text-muted hover:border-purple-300 hover:text-purple-600"}`}
                        title={isWK(p) ? "Remove as Wicket-Keeper" : "Set as Wicket-Keeper"}
                      >WK</button>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { setEditPlayer({ ...p }); setPhotoFile(null); setPlayerError(""); }} className="text-primary text-[11px] font-semibold hover:underline">Edit</button>
                      <button onClick={() => deletePlayer(p.id)} className="text-red-500 text-[11px] font-semibold hover:underline">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-border/50 flex items-center justify-center py-20">
            <p className="text-text-muted text-[14px]">Select a team to manage its squad</p>
          </div>
        )}
      </div>

      {/* Team Edit Modal */}
      {editTeam && (
        <Modal title={editTeam.id ? "Edit Team" : "New Cricket Team"} onClose={() => setEditTeam(null)}>
          <div className="grid grid-cols-2 gap-4">
            <F label="Team Name" wide>
              <input value={editTeam.name ?? ""} onChange={e => setEditTeam(p => ({ ...p, name: e.target.value }))} className={inp} placeholder="Lucknow Cricket Club" />
            </F>
            <F label="Short Name">
              <input value={editTeam.short_name ?? ""} onChange={e => setEditTeam(p => ({ ...p, short_name: e.target.value }))} className={inp} placeholder="LCC" maxLength={10} />
            </F>
            <F label="Home City">
              <input value={editTeam.home_city ?? ""} onChange={e => setEditTeam(p => ({ ...p, home_city: e.target.value }))} className={inp} />
            </F>
            <F label="Tournament">
              <select value={editTeam.tournament ?? ""} onChange={e => setEditTeam(p => ({ ...p, tournament: e.target.value || null }))} className={inp}>
                <option value="">— None —</option>
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </F>
            <F label="Registration Status">
              <select value={editTeam.registration_status ?? "pending"} onChange={e => setEditTeam(p => ({ ...p, registration_status: e.target.value }))} className={inp}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </F>
            <F label="Logo" wide>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => logoRef.current?.click()}
                className="border border-dashed border-border rounded-xl px-3 py-2.5 text-[13px] text-text-muted hover:border-primary hover:text-primary transition-colors text-left w-full">
                {logoFile ? logoFile.name : (editTeam.logo_url ? "Replace logo" : "Upload logo")}
              </button>
            </F>
            <F label="Visible to public" wide>
              <button type="button" onClick={() => setEditTeam(p => ({ ...p, is_visible: !p?.is_visible }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${editTeam.is_visible ? "bg-primary" : "bg-border"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editTeam.is_visible ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </F>
          </div>
          {teamError && <p className="text-red-600 text-[13px] mt-3">{teamError}</p>}
          <div className="flex gap-3 mt-5">
            <button onClick={saveTeam} disabled={savingTeam || !editTeam.name}
              className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {savingTeam ? "Saving…" : "Save Team"}
            </button>
            <button onClick={() => setEditTeam(null)} className="flex-1 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Player Edit Modal */}
      {editPlayer && selectedTeam && (
        <Modal title={editPlayer.id ? "Edit Player" : "Add Player"} onClose={() => setEditPlayer(null)}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-primary/10">
                {photoFile ? (
                  <img src={URL.createObjectURL(photoFile)} alt="" className="w-full h-full object-cover" />
                ) : editPlayer.photo_url ? (
                  <img src={editPlayer.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-heading font-extrabold text-primary text-[22px]">
                    {(editPlayer.name || "?")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => setPhotoFile(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => photoRef.current?.click()} className="text-primary text-[13px] font-semibold hover:underline">
                  {photoFile ? "Change photo" : "Upload photo"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <F label="Full Name" wide>
                <input value={editPlayer.name ?? ""} onChange={e => setEditPlayer(p => ({ ...p, name: e.target.value }))} className={inp} />
              </F>
              <F label="Role">
                <select value={editPlayer.role ?? "batsman"} onChange={e => setEditPlayer(p => ({ ...p, role: e.target.value }))} className={inp}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                </select>
              </F>
              <F label="Jersey #">
                <input type="number" value={editPlayer.jersey_number ?? ""} onChange={e => setEditPlayer(p => ({ ...p, jersey_number: e.target.value ? Number(e.target.value) : null }))} className={inp} placeholder="10" />
              </F>
              <F label="Batting Style">
                <select value={editPlayer.batting_style ?? "right_hand"} onChange={e => setEditPlayer(p => ({ ...p, batting_style: e.target.value }))} className={inp}>
                  {BAT_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </F>
              <F label="Bowling Style" wide>
                <select value={editPlayer.bowling_style ?? "none"} onChange={e => setEditPlayer(p => ({ ...p, bowling_style: e.target.value }))} className={inp}>
                  {BOWL_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </F>
            </div>

            {playerError && <p className="text-red-600 text-[13px]">{playerError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={savePlayer} disabled={savingPlayer || !editPlayer.name}
                className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {savingPlayer ? "Saving…" : "Save Player"}
              </button>
              <button onClick={() => setEditPlayer(null)} className="flex-1 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inp = "w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
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
      <div className="bg-white rounded-3xl p-7 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-extrabold text-[20px] text-primary">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-[22px] leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
