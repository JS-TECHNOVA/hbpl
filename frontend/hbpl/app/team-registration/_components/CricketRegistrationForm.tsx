"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import {
  registerCricketTeam,
  submitTeamPlayers,
  type RegistrationResult,
} from "../_actions/action";

// ─── types ───────────────────────────────────────────────────────────────────

interface PlayerEntry {
  name: string;
  role: "batter" | "bowler" | "allrounder" | "wicketkeeper";
  batting_style: "right_handed" | "left_handed";
  bowling_style: string;
  jersey_number: string;
  is_captain: boolean;
  is_vice_captain: boolean;
  photo: File | null;
  photoPreview: string | null;
  compressing: boolean;
}

const blankPlayer = (): PlayerEntry => ({
  name: "",
  role: "batter",
  batting_style: "right_handed",
  bowling_style: "not_applicable",
  jersey_number: "",
  is_captain: false,
  is_vice_captain: false,
  photo: null,
  photoPreview: null,
  compressing: false,
});

// ─── constants ───────────────────────────────────────────────────────────────

const STEPS = ["Team Info", "Contact", "Squad", "Payment"] as const;

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-green-500 focus:bg-white transition-colors";
const labelCls = "text-xs font-bold uppercase tracking-wider text-slate-500";
const selectCls = inputCls + " cursor-pointer";

// ─── main component ───────────────────────────────────────────────────────────

export default function CricketRegistrationForm() {
  const [step, setStep] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — team info
  const [teamName, setTeamName] = useState("");
  const [teamLogo, setTeamLogo] = useState<File | null>(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null);

  // Step 2 — contact
  const [captainName, setCaptainName] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [teamListFile, setTeamListFile] = useState<File | null>(null);
  const [teamListName, setTeamListName] = useState("");

  // Step 3 — squad
  const [players, setPlayers] = useState<PlayerEntry[]>([blankPlayer(), blankPlayer(), blankPlayer()]);

  // Step 4 — payment
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentFileName, setPaymentFileName] = useState("");
  const [agreed, setAgreed] = useState(false);

  // ── logo upload ───────────────────────────────────────────────────────────

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTeamLogo(file);
    setTeamLogoPreview(URL.createObjectURL(file));
  };

  // ── player photo compression ──────────────────────────────────────────────

  const handlePlayerPhoto = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPlayers((prev) => prev.map((p, i) => i === index ? { ...p, compressing: true } : p));

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 600,
        useWebWorker: true,
      });
      const preview = URL.createObjectURL(compressed);
      setPlayers((prev) =>
        prev.map((p, i) =>
          i === index ? { ...p, photo: compressed as File, photoPreview: preview, compressing: false } : p
        )
      );
    } catch {
      setPlayers((prev) => prev.map((p, i) => i === index ? { ...p, compressing: false } : p));
    }
  };

  // ── player field update ───────────────────────────────────────────────────

  const updatePlayer = <K extends keyof PlayerEntry>(index: number, key: K, value: PlayerEntry[K]) => {
    setPlayers((prev) =>
      prev.map((p, i) => {
        const isTarget = i === index;
        const updated = isTarget ? { ...p, [key]: value } : { ...p };
        // enforce single captain across all rows
        if (key === "is_captain" && value) {
          if (isTarget) return { ...updated, is_vice_captain: false };
          return { ...updated, is_captain: false };
        }
        // enforce single vice captain across all rows
        if (key === "is_vice_captain" && value) {
          if (isTarget) return { ...updated, is_captain: false };
          return { ...updated, is_vice_captain: false };
        }
        return updated;
      })
    );
  };

  const addPlayer = () => setPlayers((prev) => [...prev, blankPlayer()]);
  const removePlayer = (i: number) => setPlayers((prev) => prev.filter((_, idx) => idx !== i));

  // ── step validation ───────────────────────────────────────────────────────

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!teamName.trim()) return "Team name is required.";
    }
    if (step === 1) {
      if (!captainName.trim()) return "Captain name is required.";
      if (!/^[6-9][0-9]{9}$/.test(mobile)) return "Enter a valid 10-digit mobile number.";
      if (!/^[6-9][0-9]{9}$/.test(whatsapp)) return "Enter a valid 10-digit WhatsApp number.";
      if (!address.trim()) return "Address is required.";
      if (!teamListFile) return "Team list (with Aadhaar) is required.";
      if (teamListFile.size > 10 * 1024 * 1024) return "Team list must be under 10 MB.";
    }
    if (step === 2) {
      if (players.length < 11) return "Squad must have at least 11 players.";
      if (players.length > 25) return "Squad cannot exceed 25 players.";
      for (const [i, p] of players.entries()) {
        if (!p.name.trim()) return `Player ${i + 1}: name is required.`;
      }
      if (!players.some((p) => p.is_captain)) return "Please designate a team captain.";
    }
    if (step === 3) {
      if (!paymentFile) return "Payment screenshot is required.";
      if (paymentFile.size > 8 * 1024 * 1024) return "Payment screenshot must be under 8 MB.";
      if (!agreed) return "You must agree to the Terms & Conditions.";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => s + 1);
  };

  const back = () => { setError(null); setStep((s) => s - 1); };

  // ── submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setIsPending(true);

    try {
      // Step A: register team
      const teamFormData = new FormData();
      teamFormData.append("team_name", teamName.trim());
      teamFormData.append("captain_name", captainName.trim());
      teamFormData.append("mobile_number", mobile);
      teamFormData.append("whatsapp_number", whatsapp);
      teamFormData.append("number_of_players", String(players.length));
      teamFormData.append("address", address.trim());
      teamFormData.append("team_list", teamListFile!);
      teamFormData.append("payment_screenshot", paymentFile!);
      if (teamLogo) teamFormData.append("team_image", teamLogo);

      const res = await registerCricketTeam(teamFormData);
      if (!res.success || !res.registrationId) {
        setError(res.error ?? "Registration failed.");
        setIsPending(false);
        return;
      }

      // Step B: submit players
      const playerFormData = new FormData();
      playerFormData.append("player_count", String(players.length));
      for (const [i, p] of players.entries()) {
        playerFormData.append(`player_${i}_name`, p.name.trim());
        playerFormData.append(`player_${i}_role`, p.role);
        playerFormData.append(`player_${i}_batting_style`, p.batting_style);
        playerFormData.append(`player_${i}_bowling_style`, p.bowling_style);
        playerFormData.append(`player_${i}_jersey_number`, p.jersey_number);
        playerFormData.append(`player_${i}_is_captain`, String(p.is_captain));
        playerFormData.append(`player_${i}_is_vice_captain`, String(p.is_vice_captain));
        if (p.photo) playerFormData.append(`player_${i}_photo`, p.photo);
      }
      await submitTeamPlayers(res.registrationId, playerFormData);

      setResult(res);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsPending(false);
    }
  };

  // ── success screen ────────────────────────────────────────────────────────

  if (result?.success) {
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl">🏆</div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wide">Registration Submitted!</h2>
        <div className="bg-green-50 border-2 border-green-500 rounded-xl px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Your Team ID</p>
          <p className="text-3xl font-black text-green-600 tracking-widest">{result.teamId}</p>
          <p className="text-xs text-slate-400 mt-1">Save this for future reference</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-5 py-4 text-sm text-yellow-800">
          Your payment screenshot has been received. HBPL team will verify the payment and approve your registration. You will be contacted on the provided mobile number.
        </div>
        <div className="flex flex-col gap-3">
          {result.receiptUrl && (
            <a href={result.receiptUrl} target="_blank" rel="noreferrer"
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-colors">
              Download Confirmation Receipt
            </a>
          )}
          <button onClick={() => { setResult(null); setStep(0); }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl transition-colors">
            Register Another Team
          </button>
        </div>
      </div>
    );
  }

  // ── step indicator ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Step progress bar */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center gap-1 ${i <= step ? "text-green-700" : "text-slate-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-colors ${
                i < step ? "bg-green-600 border-green-600 text-white" :
                i === step ? "border-green-600 text-green-700 bg-white" :
                "border-slate-200 bg-slate-50 text-slate-400"
              }`}>{i < step ? "✓" : i + 1}</div>
              <span className="text-[10px] font-bold hidden sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded transition-colors ${i < step ? "bg-green-500" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* ── Step 0: Team Info ─────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-5">
          <h2 className="text-lg font-black text-slate-800">Team Information</h2>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Team Name <span className="text-red-500">*</span></label>
            <input
              type="text" placeholder="e.g. Royal Challengers" value={teamName}
              onChange={(e) => setTeamName(e.target.value)} className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Team Logo</label>
            <p className="text-xs text-slate-400">Optional. JPG, PNG, or WebP.</p>
            <label className="flex items-center gap-4 w-full py-3 px-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:border-green-500 hover:bg-green-50 cursor-pointer transition-colors group">
              {teamLogoPreview ? (
                <Image src={teamLogoPreview} alt="logo preview" width={56} height={56} className="rounded-lg object-cover border border-slate-200" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 text-2xl">🏏</div>
              )}
              <span className="text-sm font-semibold text-slate-400 group-hover:text-green-700 truncate">
                {teamLogo?.name ?? "Choose logo..."}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
          </div>
        </div>
      )}

      {/* ── Step 1: Contact ───────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-lg font-black text-slate-800">Contact Information</h2>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Captain Name <span className="text-red-500">*</span></label>
            <input type="text" placeholder="Full name of captain" value={captainName}
              onChange={(e) => setCaptainName(e.target.value)} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Mobile Number <span className="text-red-500">*</span></label>
              <input type="tel" placeholder="10-digit mobile" value={mobile} maxLength={10}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>WhatsApp Number <span className="text-red-500">*</span></label>
              <input type="tel" placeholder="10-digit WhatsApp" value={whatsapp} maxLength={10}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))} className={inputCls} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Address <span className="text-red-500">*</span></label>
            <input type="text" placeholder="Your village / city" value={address}
              onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Upload Team List (With Aadhaar Card) <span className="text-red-500">*</span></label>
            <p className="text-xs text-slate-400">PDF, image, or document. Max 10 MB.</p>
            <label className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:border-green-500 hover:bg-green-50 cursor-pointer transition-colors group">
              <span className="text-sm font-semibold text-slate-400 group-hover:text-green-700 truncate max-w-xs">
                {teamListName || "Choose file..."}
              </span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setTeamListFile(f);
                  setTeamListName(f?.name ?? "");
                }} />
            </label>
          </div>
        </div>
      )}

      {/* ── Step 2: Squad ─────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800">Squad ({players.length} players)</h2>
            <button type="button" onClick={addPlayer}
              className="text-xs font-bold text-green-700 border border-green-400 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors">
              + Add Player
            </button>
          </div>
          <p className="text-xs text-slate-400 -mt-3">Min 11, max 25 players. Photos are compressed automatically.</p>

          <div className="space-y-4">
            {players.map((player, i) => (
              <PlayerRow
                key={i}
                index={i}
                player={player}
                onUpdate={(key, val) => updatePlayer(i, key, val)}
                onPhotoChange={(e) => handlePlayerPhoto(i, e)}
                onRemove={players.length > 11 ? () => removePlayer(i) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Step 3: Payment ───────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-lg font-black text-slate-800">Pay Registration Fee</h2>

          <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-5 space-y-4">
            <p className="text-sm text-green-700 font-semibold">
              Scan the QR code below and pay <strong>₹251</strong> to complete registration.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0 bg-white rounded-xl p-3 border border-green-200 shadow-sm">
                <Image src="/pg_qr.jpeg" alt="Payment QR Code" width={180} height={180} className="rounded-lg" />
              </div>
              <div className="text-sm text-slate-600 space-y-1.5">
                <p>1. Open any UPI app (PhonePe, GPay, Paytm, etc.)</p>
                <p>2. Scan the QR code</p>
                <p>3. Pay exactly <strong className="text-green-700">₹251</strong></p>
                <p>4. Take a screenshot of the payment confirmation</p>
                <p>5. Upload the screenshot below</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={`${labelCls} text-green-700`}>
                Upload Payment Screenshot <span className="text-red-500">*</span>
              </label>
              <label className={`flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors group ${
                paymentFileName ? "border-green-500 bg-green-50" : "border-slate-300 bg-slate-50 hover:border-green-500 hover:bg-green-50"
              }`}>
                <span className={`text-sm font-semibold truncate max-w-xs ${paymentFileName ? "text-green-700" : "text-slate-400 group-hover:text-green-700"}`}>
                  {paymentFileName || "Choose payment screenshot..."}
                </span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setPaymentFile(f);
                    setPaymentFileName(f?.name ?? "");
                  }} />
              </label>
            </div>
          </div>

          {/* T&C */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <a target="_blank" href="/HBPL Official Rule book.pdf"
              className="text-sm font-bold text-green-700 hover:underline">
              Download and read carefully HBPL Rule Book
            </a>
            <div className="bg-white border border-slate-200 rounded-lg p-4 max-h-52 overflow-y-auto space-y-3 text-sm text-slate-600">
              <p className="font-black text-slate-800 text-base">HBPL Cricket Tournament — Terms & Conditions</p>
              <ol className="list-decimal pl-5 space-y-1.5">
                <li>All teams must complete the registration form with correct and genuine information.</li>
                <li>Registration will be considered valid only after successful verification of the payment screenshot.</li>
                <li>The registration fee is refundable if the team is not selected by the HBPL Management.</li>
                <li>Final approval of teams and players lies solely with the HBPL Management Committee.</li>
                <li>HBPL reserves the right to accept or reject any team without providing a reason.</li>
                <li>Once the form is submitted, no changes in team or player details will be allowed.</li>
                <li>All players must carry a valid ID proof during matches for verification.</li>
                <li>Teams must report at the ground at least 30 minutes before match time.</li>
                <li>The match schedule may be changed due to weather or unavoidable situations.</li>
                <li>Any form of misconduct, indiscipline, or unfair play will result in immediate disqualification.</li>
                <li>The decision of the umpires and tournament officials will be final and binding.</li>
                <li>HBPL will not be responsible for any injury, loss, or damage during the tournament.</li>
                <li>Use of abusive language, fighting, or misbehavior with officials or other teams is strictly prohibited.</li>
              </ol>
              <p className="font-bold text-slate-700 border-t border-slate-100 pt-3">
                By submitting this form, the team agrees to follow all rules, regulations, and decisions of HBPL.
              </p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-green-600 cursor-pointer" />
              <span className="text-sm font-bold text-slate-700">I agree to all the above Terms & Conditions</span>
            </label>
          </div>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={back}
            className="flex-1 py-3 border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-bold rounded-xl transition-colors">
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-black text-base rounded-xl transition-colors">
            {step === 2 ? "Pay Registration Fee →" : "Next →"}
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={isPending}
            className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg rounded-xl transition-colors flex items-center justify-center gap-2">
            {isPending ? "Submitting..." : "Submit Registration"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── PlayerRow sub-component ──────────────────────────────────────────────────

function PlayerRow({
  index,
  player,
  onUpdate,
  onPhotoChange,
  onRemove,
}: {
  index: number;
  player: PlayerEntry;
  onUpdate: <K extends keyof PlayerEntry>(key: K, val: PlayerEntry[K]) => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove?: () => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-2 border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400">Player {index + 1}</span>
        <div className="flex items-center gap-3">
          {/* Captain / VC badges */}
          <label className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
            player.is_captain ? "bg-amber-100 border-amber-400 text-amber-700" : "border-slate-200 text-slate-400 hover:border-amber-300"
          }`}>
            <input type="checkbox" className="hidden" checked={player.is_captain}
              onChange={(e) => onUpdate("is_captain", e.target.checked)} />
            C
          </label>
          <label className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
            player.is_vice_captain ? "bg-blue-100 border-blue-400 text-blue-700" : "border-slate-200 text-slate-400 hover:border-blue-300"
          }`}>
            <input type="checkbox" className="hidden" checked={player.is_vice_captain}
              onChange={(e) => onUpdate("is_vice_captain", e.target.checked)} />
            VC
          </label>
          {onRemove && (
            <button type="button" onClick={onRemove}
              className="text-xs text-red-400 hover:text-red-600 font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 items-start">
        {/* Photo */}
        <button type="button" onClick={() => photoInputRef.current?.click()}
          className="flex-shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-green-400 bg-slate-50 hover:bg-green-50 flex items-center justify-center overflow-hidden transition-colors">
          {player.compressing ? (
            <span className="text-[10px] text-slate-400 text-center leading-tight">...</span>
          ) : player.photoPreview ? (
            <Image src={player.photoPreview} alt="player" width={64} height={64} className="object-cover w-full h-full" />
          ) : (
            <span className="text-xl">📷</span>
          )}
        </button>
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />

        {/* Name */}
        <div className="flex-1 flex flex-col gap-1">
          <input type="text" placeholder="Player name *" value={player.name}
            onChange={(e) => onUpdate("name", e.target.value)}
            className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-green-500 focus:bg-white transition-colors" />
          <input type="text" placeholder="Jersey no." value={player.jersey_number} maxLength={3}
            onChange={(e) => onUpdate("jersey_number", e.target.value.replace(/\D/g, ""))}
            className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-green-500 focus:bg-white transition-colors" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <select value={player.role} onChange={(e) => onUpdate("role", e.target.value as PlayerEntry["role"])}
          className={selectCls}>
          <option value="batter">Batter</option>
          <option value="bowler">Bowler</option>
          <option value="allrounder">All-rounder</option>
          <option value="wicketkeeper">Wicket-keeper</option>
        </select>
        <select value={player.batting_style} onChange={(e) => onUpdate("batting_style", e.target.value as PlayerEntry["batting_style"])}
          className={selectCls}>
          <option value="right_handed">Right-handed</option>
          <option value="left_handed">Left-handed</option>
        </select>
        <select value={player.bowling_style} onChange={(e) => onUpdate("bowling_style", e.target.value)}
          className={`${selectCls} sm:col-span-1 col-span-2`}>
          <option value="not_applicable">N/A (batting)</option>
          <option value="right_arm_fast">RA Fast</option>
          <option value="right_arm_medium">RA Medium</option>
          <option value="right_arm_off_spin">RA Off Spin</option>
          <option value="right_arm_leg_spin">RA Leg Spin</option>
          <option value="left_arm_fast">LA Fast</option>
          <option value="left_arm_medium">LA Medium</option>
          <option value="left_arm_spin">LA Spin</option>
        </select>
      </div>
    </div>
  );
}
