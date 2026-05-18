"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";
const V1 = `${API}/api/v1/cricket`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Tournament {
  id: string;
  title: string;
  format: string;
  status: string;
  start_date: string | null;
  city: string;
}

interface PlayerForm {
  name: string;
  role: string;
  jersey_number: string;
  batting_style: string;
  bowling_style: string;
}

interface TeamForm {
  tournament_id: string;
  name: string;
  short_name: string;
  home_city: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
}

const EMPTY_TEAM: TeamForm = {
  tournament_id: "",
  name: "",
  short_name: "",
  home_city: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
};

const emptyPlayer = (): PlayerForm => ({
  name: "",
  role: "batsman",
  jersey_number: "",
  batting_style: "right_hand",
  bowling_style: "none",
});

const ROLES = [
  { value: "batsman", label: "Batter" },
  { value: "bowler", label: "Bowler" },
  { value: "all_rounder", label: "All-Rounder" },
  { value: "wicket_keeper", label: "Wicket-Keeper" },
  { value: "wicket_keeper_batsman", label: "WK-Batter" },
];

const BAT_STYLES = [
  { value: "right_hand", label: "Right-hand bat" },
  { value: "left_hand", label: "Left-hand bat" },
];

const BOWL_STYLES = [
  { value: "none", label: "N/A (non-bowler)" },
  { value: "right_arm_fast", label: "Right-arm fast" },
  { value: "right_arm_medium", label: "Right-arm medium" },
  { value: "right_arm_off_spin", label: "Right-arm off-spin" },
  { value: "right_arm_leg_spin", label: "Right-arm leg-spin" },
  { value: "left_arm_fast", label: "Left-arm fast" },
  { value: "left_arm_medium", label: "Left-arm medium" },
  { value: "left_arm_spin", label: "Left-arm spin" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CricketRegisterPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teamForm, setTeamForm] = useState<TeamForm>(EMPTY_TEAM);
  const [players, setPlayers] = useState<PlayerForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ team_name: string; player_count: number; team_id: string } | null>(null);

  useEffect(() => {
    fetch(`${V1}/tournaments/?status=registration_open`)
      .then(r => r.json())
      .then(d => setTournaments(Array.isArray(d) ? d : d.results ?? []))
      .catch(() => {});
  }, []);

  function setField(field: keyof TeamForm, value: string) {
    setTeamForm(p => ({ ...p, [field]: value }));
  }

  function addPlayer() {
    setPlayers(p => [...p, emptyPlayer()]);
  }

  function removePlayer(idx: number) {
    setPlayers(p => p.filter((_, i) => i !== idx));
  }

  function updatePlayer<K extends keyof PlayerForm>(idx: number, field: K, value: PlayerForm[K]) {
    setPlayers(p => p.map((pl, i) => (i === idx ? { ...pl, [field]: value } : pl)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!teamForm.tournament_id) {
      setError("Please select a tournament.");
      return;
    }
    if (!teamForm.name.trim()) {
      setError("Team name is required.");
      return;
    }
    const namedPlayers = players.filter(p => p.name.trim());
    if (namedPlayers.length > 0 && namedPlayers.length < 11) {
      setError(`Please add at least 11 players (you have ${namedPlayers.length}). You can also leave players empty and add them later.`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tournament: teamForm.tournament_id,
        name: teamForm.name.trim(),
        short_name: teamForm.short_name.trim(),
        home_city: teamForm.home_city.trim(),
        contact_name: teamForm.contact_name.trim(),
        contact_email: teamForm.contact_email.trim(),
        contact_phone: teamForm.contact_phone.trim(),
        players: namedPlayers.map(p => ({
          name: p.name.trim(),
          role: p.role,
          jersey_number: p.jersey_number ? parseInt(p.jersey_number) : null,
          batting_style: p.batting_style,
          bowling_style: p.bowling_style,
        })),
      };

      const res = await fetch(`${V1}/teams/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const first = Object.values(body)[0];
        throw new Error(Array.isArray(first) ? first[0] : String(first || "Registration failed"));
      }
      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success ──────────────────────────────────────────────────────────────────

  if (result) {
    return (
      <div className="bg-page min-h-screen">
        <div className="max-w-2xl mx-auto px-8 py-24 flex flex-col items-center gap-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="font-heading font-extrabold text-[38px] text-primary tracking-tight">Team Registered!</h1>
            <p className="text-text-body text-[16px] leading-[1.7]">
              Your registration has been submitted. Our team will review and approve it shortly. You will be contacted on your registered phone number.
            </p>
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.08)] w-full flex flex-col gap-2 items-center">
            <span className="text-text-muted text-[12px] font-semibold tracking-widest uppercase">Team Name</span>
            <span className="font-heading font-extrabold text-[28px] text-primary leading-none">{result.team_name}</span>
            {result.player_count > 0 && (
              <p className="text-text-muted text-[13px] mt-1">{result.player_count} player{result.player_count !== 1 ? "s" : ""} added</p>
            )}
          </div>
          <Link href="/cricket" className="bg-primary text-white font-semibold text-[14px] px-7 py-3.5 rounded-xl hover:bg-primary-dark transition-colors cursor-pointer">
            Back to Cricket
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-page">
      <section className="bg-primary-darker">
        <div className="max-w-7xl mx-auto px-8 py-14">
          <div className="flex flex-col gap-4 max-w-2xl">
            <Link href="/cricket" className="inline-flex items-center gap-2 text-white/50 text-[13px] hover:text-white transition-colors w-fit cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Cricket
            </Link>
            <h1 className="font-heading font-extrabold text-[42px] leading-tight text-white tracking-tight">Team Registration</h1>
            <p className="text-white/60 text-[15px] leading-[1.7]">
              Register your team for HBPL Cricket. Fill in team details, add your squad, and submit for review.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-8 py-16">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Card 1 – Tournament Selection */}
          <FormCard title="Select Tournament" number={1}>
            <Field label="Tournament" required>
              {tournaments.length === 0 ? (
                <div className="w-full border border-border rounded-xl px-3 py-2.5 text-text-muted text-[13px] bg-page">
                  No open registrations at the moment
                </div>
              ) : (
                <select
                  value={teamForm.tournament_id}
                  onChange={e => setField("tournament_id", e.target.value)}
                  required
                  className={inp}
                >
                  <option value="">— Choose a tournament —</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.format}{t.city ? ` · ${t.city}` : ""})
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </FormCard>

          {/* Card 2 – Team Information */}
          <FormCard title="Team Information" number={2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Team Name" required className="md:col-span-2">
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={e => setField("name", e.target.value)}
                  required
                  placeholder="e.g. Harpur Warriors"
                  className={inp}
                />
              </Field>
              <Field label="Short Name" hint="Up to 10 characters (e.g. HW)">
                <input
                  type="text"
                  maxLength={10}
                  value={teamForm.short_name}
                  onChange={e => setField("short_name", e.target.value)}
                  placeholder="HW"
                  className={inp}
                />
              </Field>
              <Field label="Home City">
                <input
                  type="text"
                  value={teamForm.home_city}
                  onChange={e => setField("home_city", e.target.value)}
                  placeholder="Lucknow"
                  className={inp}
                />
              </Field>
            </div>
          </FormCard>

          {/* Card 3 – Contact Details */}
          <FormCard title="Contact Details" number={3}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Contact Person" required>
                <input
                  type="text"
                  value={teamForm.contact_name}
                  onChange={e => setField("contact_name", e.target.value)}
                  required
                  placeholder="Manager name"
                  className={inp}
                />
              </Field>
              <Field label="Mobile Number" required>
                <input
                  type="tel"
                  value={teamForm.contact_phone}
                  onChange={e => setField("contact_phone", e.target.value)}
                  required
                  placeholder="10-digit"
                  className={inp}
                />
              </Field>
              <Field label="Email" className="md:col-span-2">
                <input
                  type="email"
                  value={teamForm.contact_email}
                  onChange={e => setField("contact_email", e.target.value)}
                  placeholder="team@example.com"
                  className={inp}
                />
              </Field>
            </div>
          </FormCard>

          {/* Card 4 – Players */}
          <div className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] overflow-hidden">
            <div className="px-8 py-5 border-b border-border/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-primary text-white text-[12px] font-extrabold flex items-center justify-center shrink-0">4</span>
                <h2 className="font-heading font-extrabold text-[18px] text-primary">Squad / Players</h2>
              </div>
              <div className="flex items-center gap-3">
                {players.length > 0 && (
                  <span className="text-text-muted text-[12px] font-medium">{players.length} added</span>
                )}
                <button
                  type="button"
                  onClick={addPlayer}
                  className="inline-flex items-center gap-1.5 bg-primary text-white text-[13px] font-semibold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Player
                </button>
              </div>
            </div>

            <div className="px-8 py-7">
              {players.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-page flex items-center justify-center">
                    <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-text-muted text-[14px]">No players added yet. Click <strong>Add Player</strong> to build your squad.</p>
                  <p className="text-text-muted text-[12px]">You can also submit without players and add them later via admin.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {players.map((player, idx) => (
                    <PlayerCard
                      key={idx}
                      index={idx}
                      player={player}
                      onUpdate={(field, value) => updatePlayer(idx, field, value)}
                      onRemove={() => removePlayer(idx)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addPlayer}
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl py-4 text-text-muted text-[14px] font-medium hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add another player
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="bg-white rounded-3xl p-7 shadow-[0px_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-4">
            <p className="text-text-body text-[13px] leading-relaxed">
              By submitting, you confirm that all details are accurate and your team will comply with HBPL tournament rules. Registration is subject to admin approval.
            </p>
            {error && (
              <div className="bg-red-50 text-red-700 text-[13px] px-4 py-3 rounded-xl border border-red-200">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white font-semibold text-[15px] px-10 py-4 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 w-fit flex items-center gap-2 cursor-pointer"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? "Submitting…" : "Submit Registration"}
            </button>
          </div>

        </form>
      </section>
    </div>
  );
}

// ── PlayerCard ─────────────────────────────────────────────────────────────────

function PlayerCard({
  index,
  player,
  onUpdate,
  onRemove,
}: {
  index: number;
  player: PlayerForm;
  onUpdate: <K extends keyof PlayerForm>(field: K, value: PlayerForm[K]) => void;
  onRemove: () => void;
}) {
  const roleColor: Record<string, string> = {
    batsman: "bg-blue-50 text-blue-600 border-blue-200",
    bowler: "bg-green-50 text-green-600 border-green-200",
    all_rounder: "bg-purple-50 text-purple-600 border-purple-200",
    wicket_keeper: "bg-amber-50 text-amber-600 border-amber-200",
    wicket_keeper_batsman: "bg-orange-50 text-orange-600 border-orange-200",
  };

  return (
    <div className="rounded-2xl border border-border bg-page">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold flex items-center justify-center">{index + 1}</span>
          <span className="text-text-primary text-[14px] font-semibold">
            {player.name || <span className="text-text-muted font-normal">Player {index + 1}</span>}
          </span>
          {player.role && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${roleColor[player.role] ?? "bg-page text-text-muted border-border"}`}>
              {ROLES.find(r => r.value === player.role)?.label}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-5 py-5 grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={lbl}>Name <span className="text-accent">*</span></label>
          <input type="text" required placeholder="Full name" value={player.name}
            onChange={e => onUpdate("name", e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Role</label>
          <select value={player.role} onChange={e => onUpdate("role", e.target.value)} className={inp}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Jersey No.</label>
          <input type="number" min={1} max={99} placeholder="e.g. 7" value={player.jersey_number}
            onChange={e => onUpdate("jersey_number", e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Batting Style</label>
          <select value={player.batting_style} onChange={e => onUpdate("batting_style", e.target.value)} className={inp}>
            {BAT_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Bowling Style</label>
          <select value={player.bowling_style} onChange={e => onUpdate("bowling_style", e.target.value)} className={inp}>
            {BOWL_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const inp =
  "w-full bg-white border border-border rounded-xl px-3 py-2.5 text-text-primary text-[13px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";

const lbl = "block text-[11px] font-semibold text-text-primary mb-1";

function FormCard({ title, number, children }: { title: string; number: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-8 py-5 border-b border-border/60 flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-primary text-white text-[12px] font-extrabold flex items-center justify-center shrink-0">{number}</span>
        <h2 className="font-heading font-extrabold text-[18px] text-primary">{title}</h2>
      </div>
      <div className="px-8 py-7">{children}</div>
    </div>
  );
}

function Field({
  label, required, hint, className, children,
}: {
  label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-[13px] font-semibold text-text-primary">
        {label}{required && <span className="text-accent ml-1">*</span>}
      </label>
      {children}
      {hint && <span className="text-text-muted text-[11px]">{hint}</span>}
    </div>
  );
}
