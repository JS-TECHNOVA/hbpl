"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import imageCompression from "browser-image-compression";

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
  is_captain: boolean;
  is_vice_captain: boolean;
  photo: File | null;
  photoPreview: string | null;
  compressing: boolean;
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
  is_captain: false,
  is_vice_captain: false,
  photo: null,
  photoPreview: null,
  compressing: false,
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

type Phase = "form" | "payment";

export default function CricketRegisterPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  // team
  const [teamForm, setTeamForm] = useState<TeamForm>(EMPTY_TEAM);
  const [teamLogo, setTeamLogo] = useState<File | null>(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null);

  // squad
  const [players, setPlayers] = useState<PlayerForm[]>([]);

  // payment
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null);

  // ui
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [result, setResult] = useState<{ team_name: string; player_count: number; team_id: string } | null>(null);

  useEffect(() => {
    fetch(`${V1}/tournaments/?status=registration_open`)
      .then(r => r.json())
      .then(d => setTournaments(Array.isArray(d) ? d : d.results ?? []))
      .catch(() => {});
  }, []);

  // ── helpers ───────────────────────────────────────────────────────────────

  function setField(field: keyof TeamForm, value: string) {
    setTeamForm(p => ({ ...p, [field]: value }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTeamLogo(file);
    setTeamLogoPreview(URL.createObjectURL(file));
  }

  function addPlayer() { setPlayers(p => [...p, emptyPlayer()]); }
  function removePlayer(idx: number) { setPlayers(p => p.filter((_, i) => i !== idx)); }

  function updatePlayer<K extends keyof PlayerForm>(idx: number, field: K, value: PlayerForm[K]) {
    setPlayers(prev =>
      prev.map((pl, i) => {
        if (i !== idx) {
          if (field === "is_captain" && value) return { ...pl, is_captain: false };
          if (field === "is_vice_captain" && value) return { ...pl, is_vice_captain: false };
          return pl;
        }
        const updated = { ...pl, [field]: value };
        if (field === "is_captain" && value) updated.is_vice_captain = false;
        if (field === "is_vice_captain" && value) updated.is_captain = false;
        return updated;
      })
    );
  }

  async function handlePlayerPhoto(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, compressing: true } : p));
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 600, useWebWorker: true });
      setPlayers(prev => prev.map((p, i) =>
        i === idx ? { ...p, photo: compressed as File, photoPreview: URL.createObjectURL(compressed), compressing: false } : p
      ));
    } catch {
      setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, compressing: false } : p));
    }
  }

  function handlePaymentFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPaymentFile(file);
    setPaymentPreview(URL.createObjectURL(file));
  }

  // ── Phase 1 → 2 ───────────────────────────────────────────────────────────

  function handleProceedToPayment(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!teamForm.tournament_id) { setFormError("Please select a tournament."); return; }
    if (!teamForm.name.trim()) { setFormError("Team name is required."); return; }
    if (!teamForm.contact_name.trim()) { setFormError("Contact person name is required."); return; }
    if (!teamForm.contact_phone.trim()) { setFormError("Mobile number is required."); return; }

    const namedPlayers = players.filter(p => p.name.trim());
    if (namedPlayers.length > 0 && namedPlayers.length < 11) {
      setFormError(`Add at least 11 players (you have ${namedPlayers.length}), or leave squad empty to add later.`);
      return;
    }

    setPhase("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Phase 2 submit ────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPayError(null);

    if (!paymentFile) { setPayError("Please upload your payment screenshot."); return; }
    if (paymentFile.size > 8 * 1024 * 1024) { setPayError("Screenshot must be under 8 MB."); return; }

    setLoading(true);
    try {
      const namedPlayers = players.filter(p => p.name.trim());

      const fd = new FormData();
      fd.append("tournament", teamForm.tournament_id);
      fd.append("name", teamForm.name.trim());
      fd.append("short_name", teamForm.short_name.trim());
      fd.append("home_city", teamForm.home_city.trim());
      fd.append("contact_name", teamForm.contact_name.trim());
      fd.append("contact_email", teamForm.contact_email.trim());
      fd.append("contact_phone", teamForm.contact_phone.trim());
      fd.append("payment_screenshot", paymentFile, paymentFile.name);
      if (teamLogo) fd.append("logo", teamLogo, teamLogo.name);

      fd.append("players", JSON.stringify(namedPlayers.map(p => ({
        name: p.name.trim(),
        role: p.role,
        jersey_number: p.jersey_number ? parseInt(p.jersey_number) : null,
        batting_style: p.batting_style,
        bowling_style: p.bowling_style,
        is_captain: p.is_captain,
        is_vice_captain: p.is_vice_captain,
      }))));

      namedPlayers.forEach((p, i) => {
        if (p.photo) fd.append(`player_photo_${i}`, p.photo, p.photo.name);
      });

      const res = await fetch(`${V1}/teams/register/`, { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const first = Object.values(body)[0];
        throw new Error(Array.isArray(first) ? first[0] : String(first || "Registration failed"));
      }
      setResult(body);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success ───────────────────────────────────────────────────────────────

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
            <h1 className="font-heading font-extrabold text-[38px] text-primary tracking-tight">Registration Submitted!</h1>
            <p className="text-text-body text-[16px] leading-[1.7]">
              Your payment screenshot has been received. The HBPL team will verify payment and approve your registration. You will be contacted on your registered mobile number.
            </p>
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.08)] w-full flex flex-col gap-3 items-center">
            <span className="text-text-muted text-[12px] font-semibold tracking-widest uppercase">Team Name</span>
            <span className="font-heading font-extrabold text-[28px] text-primary leading-none">{result.team_name}</span>
            {result.team_id && (
              <div className="mt-1 px-5 py-2 rounded-xl bg-primary/8 border border-primary/20">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest block mb-0.5">Registration ID</span>
                <span className="font-heading font-extrabold text-[22px] text-primary tracking-wider">{result.team_id}</span>
              </div>
            )}
            {result.player_count > 0 && (
              <p className="text-text-muted text-[13px]">{result.player_count} player{result.player_count !== 1 ? "s" : ""} added</p>
            )}
          </div>
          <Link href="/cricket" className="bg-primary text-white font-semibold text-[14px] px-7 py-3.5 rounded-xl hover:bg-primary-dark transition-colors cursor-pointer">
            Back to Cricket
          </Link>
        </div>
      </div>
    );
  }

  // ── Phase indicator ───────────────────────────────────────────────────────

  const PhaseBar = () => (
    <div className="flex items-center gap-0 mb-8">
      {(["Team & Squad", "Pay & Submit"] as const).map((label, i) => {
        const active = (i === 0 && phase === "form") || (i === 1 && phase === "payment");
        const done = i === 0 && phase === "payment";
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-extrabold border-2 transition-colors ${
                done ? "bg-primary border-primary text-white" :
                active ? "border-primary text-primary bg-white" :
                "border-border text-text-muted bg-page"
              }`}>
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-[11px] font-semibold whitespace-nowrap ${active || done ? "text-primary" : "text-text-muted"}`}>{label}</span>
            </div>
            {i === 0 && (
              <div className={`flex-1 h-0.5 mx-3 mb-4 rounded ${phase === "payment" ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Phase 1: Team & Squad form ────────────────────────────────────────────

  if (phase === "form") {
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
                Fill in your team details and squad, then proceed to pay the registration fee.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-8 py-16">
          <PhaseBar />
          <form onSubmit={handleProceedToPayment} className="flex flex-col gap-6">

            {/* Card 1 – Tournament */}
            <FormCard title="Select Tournament" number={1}>
              <Field label="Tournament" required>
                {tournaments.length === 0 ? (
                  <div className="w-full border border-border rounded-xl px-3 py-2.5 text-text-muted text-[13px] bg-page">
                    No open registrations at the moment
                  </div>
                ) : (
                  <select value={teamForm.tournament_id} onChange={e => setField("tournament_id", e.target.value)} required className={inp}>
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

            {/* Card 2 – Team Info */}
            <FormCard title="Team Information" number={2}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Team Name" required className="md:col-span-2">
                  <input type="text" value={teamForm.name} onChange={e => setField("name", e.target.value)}
                    required placeholder="e.g. Harpur Warriors" className={inp} />
                </Field>
                <Field label="Short Name" hint="Up to 10 characters (e.g. HW)">
                  <input type="text" maxLength={10} value={teamForm.short_name}
                    onChange={e => setField("short_name", e.target.value)} placeholder="HW" className={inp} />
                </Field>
                <Field label="Home City">
                  <input type="text" value={teamForm.home_city}
                    onChange={e => setField("home_city", e.target.value)} placeholder="Lucknow" className={inp} />
                </Field>
                <Field label="Team Logo" className="md:col-span-2">
                  <label className="flex items-center gap-4 border border-dashed border-border rounded-xl px-4 py-3 bg-page hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer group">
                    <div className="w-14 h-14 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
                      {teamLogoPreview ? (
                        <Image src={teamLogoPreview} alt="logo" width={56} height={56} className="object-cover w-full h-full" />
                      ) : (
                        <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5M21 12V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[13px] font-semibold text-text-primary group-hover:text-primary transition-colors truncate">
                        {teamLogo ? teamLogo.name : "Upload team logo"}
                      </span>
                      <span className="text-[11px] text-text-muted">JPG, PNG, or WebP · Optional</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                </Field>
              </div>
            </FormCard>

            {/* Card 3 – Contact */}
            <FormCard title="Contact Details" number={3}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Contact Person" required>
                  <input type="text" value={teamForm.contact_name} onChange={e => setField("contact_name", e.target.value)}
                    required placeholder="Manager name" className={inp} />
                </Field>
                <Field label="Mobile Number" required>
                  <input type="tel" value={teamForm.contact_phone} onChange={e => setField("contact_phone", e.target.value)}
                    required placeholder="10-digit" className={inp} />
                </Field>
                <Field label="Email" className="md:col-span-2">
                  <input type="email" value={teamForm.contact_email} onChange={e => setField("contact_email", e.target.value)}
                    placeholder="team@example.com" className={inp} />
                </Field>
              </div>
            </FormCard>

            {/* Card 4 – Squad */}
            <div className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] overflow-hidden">
              <div className="px-8 py-5 border-b border-border/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-white text-[12px] font-extrabold flex items-center justify-center shrink-0">4</span>
                  <h2 className="font-heading font-extrabold text-[18px] text-primary">Squad / Players</h2>
                </div>
                <div className="flex items-center gap-3">
                  {players.length > 0 && <span className="text-text-muted text-[12px] font-medium">{players.length} added</span>}
                  <button type="button" onClick={addPlayer}
                    className="inline-flex items-center gap-1.5 bg-primary text-white text-[13px] font-semibold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors cursor-pointer">
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
                      <PlayerCard key={idx} index={idx} player={player}
                        onUpdate={(f, v) => updatePlayer(idx, f, v)}
                        onPhotoChange={e => handlePlayerPhoto(idx, e)}
                        onRemove={() => removePlayer(idx)} />
                    ))}
                    <button type="button" onClick={addPlayer}
                      className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl py-4 text-text-muted text-[14px] font-medium hover:border-primary/40 hover:text-primary transition-colors cursor-pointer">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add another player
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Proceed button */}
            <div className="bg-white rounded-3xl p-7 shadow-[0px_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-4">
              {formError && (
                <div className="bg-red-50 text-red-700 text-[13px] px-4 py-3 rounded-xl border border-red-200">{formError}</div>
              )}
              <button type="submit"
                className="bg-primary text-white font-semibold text-[15px] px-10 py-4 rounded-xl hover:bg-primary-dark transition-colors w-fit flex items-center gap-2 cursor-pointer">
                Pay Registration Fee
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>

          </form>
        </section>
      </div>
    );
  }

  // ── Phase 2: Payment ──────────────────────────────────────────────────────

  return (
    <div className="bg-page">
      <section className="bg-primary-darker">
        <div className="max-w-7xl mx-auto px-8 py-14">
          <div className="flex flex-col gap-4 max-w-2xl">
            <button onClick={() => { setPhase("form"); setPayError(null); }}
              className="inline-flex items-center gap-2 text-white/50 text-[13px] hover:text-white transition-colors w-fit cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Team Details
            </button>
            <h1 className="font-heading font-extrabold text-[42px] leading-tight text-white tracking-tight">Pay Registration Fee</h1>
            <p className="text-white/60 text-[15px] leading-[1.7]">
              Scan the QR code and pay <strong className="text-white">₹251</strong> to complete your registration for <strong className="text-white">{teamForm.name}</strong>.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-8 py-16">
        <PhaseBar />
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* QR + instructions */}
          <div className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] overflow-hidden">
            <div className="px-8 py-5 border-b border-border/60 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary text-white text-[12px] font-extrabold flex items-center justify-center shrink-0">1</span>
              <h2 className="font-heading font-extrabold text-[18px] text-primary">Scan & Pay</h2>
            </div>
            <div className="px-8 py-8 flex flex-col sm:flex-row gap-8 items-center sm:items-start">
              {/* QR */}
              <div className="shrink-0 flex flex-col items-center gap-3">
                <div className="p-3 bg-white border-2 border-primary/20 rounded-2xl shadow-sm">
                  <Image src="/pg_qr.jpeg" alt="Payment QR Code" width={200} height={200} className="rounded-xl" />
                </div>
                <div className="text-center">
                  <span className="text-[11px] text-text-muted font-semibold uppercase tracking-widest block">Amount</span>
                  <span className="font-heading font-extrabold text-[32px] text-primary leading-none">₹251</span>
                </div>
              </div>

              {/* Steps */}
              <div className="flex flex-col gap-4">
                <p className="text-text-body text-[14px] font-semibold">Follow these steps:</p>
                {[
                  "Open any UPI app — PhonePe, Google Pay, Paytm, etc.",
                  "Scan the QR code shown on the left.",
                  "Pay exactly ₹251 as the registration fee.",
                  "Take a clear screenshot of the payment confirmation screen.",
                  "Upload the screenshot below and submit.",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-text-body text-[13px] leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Screenshot upload */}
          <div className="bg-white rounded-4xl shadow-[0px_4px_24px_rgba(0,0,0,0.07)] overflow-hidden">
            <div className="px-8 py-5 border-b border-border/60 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary text-white text-[12px] font-extrabold flex items-center justify-center shrink-0">2</span>
              <h2 className="font-heading font-extrabold text-[18px] text-primary">Upload Payment Screenshot</h2>
            </div>
            <div className="px-8 py-7">
              <label className={`flex items-center gap-5 border-2 border-dashed rounded-2xl px-6 py-5 cursor-pointer transition-colors group ${
                paymentFile ? "border-primary/40 bg-primary/5" : "border-border bg-page hover:border-primary/40 hover:bg-primary/5"
              }`}>
                {/* Preview or icon */}
                <div className="w-20 h-20 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {paymentPreview ? (
                    <Image src={paymentPreview} alt="payment screenshot" width={80} height={80} className="object-cover w-full h-full" />
                  ) : (
                    <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className={`text-[14px] font-semibold truncate transition-colors ${paymentFile ? "text-primary" : "text-text-primary group-hover:text-primary"}`}>
                    {paymentFile ? paymentFile.name : "Click to upload screenshot"}
                  </span>
                  <span className="text-[12px] text-text-muted">JPG, PNG, WebP · Max 8 MB</span>
                  {paymentFile && (
                    <span className="text-[11px] text-green-600 font-semibold">✓ Screenshot selected</span>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePaymentFile} />
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="bg-white rounded-3xl p-7 shadow-[0px_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-4">
            <p className="text-text-body text-[13px] leading-relaxed">
              By submitting, you confirm payment of <strong>₹251</strong> and that all team details are accurate. Registration is subject to admin verification and approval.
            </p>
            {payError && (
              <div className="bg-red-50 text-red-700 text-[13px] px-4 py-3 rounded-xl border border-red-200">{payError}</div>
            )}
            <div className="flex items-center gap-4">
              <button type="submit" disabled={loading || !paymentFile}
                className="bg-primary text-white font-semibold text-[15px] px-10 py-4 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer">
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting…
                  </>
                ) : "Submit Registration"}
              </button>
              <button type="button" onClick={() => { setPhase("form"); setPayError(null); }}
                className="text-text-muted text-[14px] font-medium hover:text-text-primary transition-colors cursor-pointer">
                ← Edit team details
              </button>
            </div>
          </div>

        </form>
      </section>
    </div>
  );
}

// ── PlayerCard ─────────────────────────────────────────────────────────────────

function PlayerCard({ index, player, onUpdate, onPhotoChange, onRemove }: {
  index: number;
  player: PlayerForm;
  onUpdate: <K extends keyof PlayerForm>(field: K, value: PlayerForm[K]) => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const photoRef = useRef<HTMLInputElement>(null);

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
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onUpdate("is_captain", !player.is_captain)} title="Captain"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-colors cursor-pointer ${
              player.is_captain ? "bg-amber-100 border-amber-400 text-amber-700" : "border-border text-text-muted hover:border-amber-300 hover:text-amber-600"
            }`}>C</button>
          <button type="button" onClick={() => onUpdate("is_vice_captain", !player.is_vice_captain)} title="Vice Captain"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-colors cursor-pointer ${
              player.is_vice_captain ? "bg-blue-100 border-blue-400 text-blue-700" : "border-border text-text-muted hover:border-blue-300 hover:text-blue-600"
            }`}>VC</button>
          <button type="button" onClick={onRemove}
            className="w-8 h-8 ml-1 rounded-lg flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5 py-5 flex gap-4">
        <button type="button" onClick={() => photoRef.current?.click()} title="Upload photo"
          className="shrink-0 w-16 h-16 rounded-xl border border-dashed border-border bg-white hover:border-primary/50 hover:bg-primary/5 flex items-center justify-center overflow-hidden transition-colors cursor-pointer">
          {player.compressing ? (
            <svg className="w-5 h-5 text-text-muted animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : player.photoPreview ? (
            <Image src={player.photoPreview} alt="player" width={64} height={64} className="object-cover w-full h-full" />
          ) : (
            <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          )}
        </button>
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />

        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className={lbl}>Name <span className="text-accent">*</span></label>
            <input type="text" required placeholder="Full name" value={player.name}
              onChange={e => onUpdate("name", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Jersey No.</label>
            <input type="number" min={1} max={99} placeholder="e.g. 7" value={player.jersey_number}
              onChange={e => onUpdate("jersey_number", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Role</label>
            <select value={player.role} onChange={e => onUpdate("role", e.target.value)} className={inp}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
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
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const inp = "w-full bg-white border border-border rounded-xl px-3 py-2.5 text-text-primary text-[13px] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";
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

function Field({ label, required, hint, className, children }: {
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
