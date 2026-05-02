"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
	registerCricketTeam,
	type RegistrationResult,
} from "../_actions/action";

export default function CricketRegistrationForm() {
	const formRef = useRef<HTMLFormElement>(null);
	const [isPending, setIsPending] = useState(false);
	const [result, setResult] = useState<RegistrationResult | null>(null);
	const [agreed, setAgreed] = useState(false);
	const [teamListName, setTeamListName] = useState("");
	const [teamImageName, setTeamImageName] = useState("");
	const [paymentScreenshotName, setPaymentScreenshotName] = useState("");

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!agreed) {
			setResult({ success: false, error: "You must agree to the Terms & Conditions." });
			return;
		}

		const formData = new FormData(e.currentTarget);
		setIsPending(true);
		setResult(null);

		const res = await registerCricketTeam(formData);
		setResult(res);
		setIsPending(false);

		if (res.success) {
			formRef.current?.reset();
			setTeamListName("");
			setTeamImageName("");
			setPaymentScreenshotName("");
			setAgreed(false);
		}
	};

	if (result?.success) {
		return (
			<div className="text-center space-y-6">
				<div className="text-6xl">🏆</div>
				<h2 className="text-2xl font-black text-slate-900 uppercase tracking-wide">
					Registration Submitted!
				</h2>
				<div className="bg-green-50 border-2 border-green-500 rounded-xl px-6 py-4">
					<p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Your Team ID</p>
					<p className="text-3xl font-black text-green-600 tracking-widest">{result.teamId}</p>
					<p className="text-xs text-slate-400 mt-1">Save this for future reference</p>
				</div>
				<div className="bg-yellow-50 border border-yellow-300 rounded-xl px-5 py-4 text-sm text-yellow-800">
					Your payment screenshot has been received. HBPL team will verify the payment
					and approve your registration. You will be contacted on the provided mobile number.
				</div>
				<div className="flex flex-col gap-3">
					{result.receiptUrl ? (
						<a
							href={result.receiptUrl}
							target="_blank"
							rel="noreferrer"
							className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-colors"
						>
							Download Confirmation Receipt
						</a>
					) : null}
					<button
						onClick={() => setResult(null)}
						className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl transition-colors"
					>
						Register Another Team
					</button>
				</div>
			</div>
		);
	}

	const inputCls =
		"w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-green-500 focus:bg-white transition-colors";
	const labelCls = "text-xs font-bold uppercase tracking-wider text-slate-500";

	return (
		<form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
			{result?.error && (
				<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
					{result.error}
				</div>
			)}

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
				<div className="sm:col-span-2 flex flex-col gap-1.5">
					<label className={labelCls}>Team Name <span className="text-red-500">*</span></label>
					<input name="team_name" type="text" placeholder="e.g. Royal Challengers" required className={inputCls} />
				</div>

				<div className="sm:col-span-2 flex flex-col gap-1.5">
					<label className={labelCls}>Captain Name <span className="text-red-500">*</span></label>
					<input name="captain_name" type="text" placeholder="Full name of captain" required className={inputCls} />
				</div>

				<div className="flex flex-col gap-1.5">
					<label className={labelCls}>Mobile Number <span className="text-red-500">*</span></label>
					<input name="mobile_number" type="tel" placeholder="10-digit mobile number" pattern="[6-9][0-9]{9}" minLength={10} maxLength={10} required className={inputCls} />
				</div>

				<div className="flex flex-col gap-1.5">
					<label className={labelCls}>WhatsApp Number <span className="text-red-500">*</span></label>
					<input name="whatsapp_number" type="tel" placeholder="10-digit WhatsApp number" pattern="[6-9][0-9]{9}" minLength={10} maxLength={10} required className={inputCls} />
				</div>

				<div className="flex flex-col gap-1.5">
					<label className={labelCls}>Number of Players <span className="text-red-500">*</span></label>
					<input name="number_of_players" type="number" placeholder="e.g. 15" min={11} max={25} required className={inputCls} />
				</div>

				<div className="flex flex-col gap-1.5">
					<label className={labelCls}>Address <span className="text-red-500">*</span></label>
					<input name="address" type="text" placeholder="Your village / city" required className={inputCls} />
				</div>

				{/* Team logo */}
				<div className="sm:col-span-2 flex flex-col gap-1.5">
					<label className={labelCls}>Upload Team Logo/Photo</label>
					<p className="text-xs text-slate-400">Optional team logo or photo.</p>
					<label className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:border-green-500 hover:bg-green-50 cursor-pointer transition-colors group">
						<span className="text-sm font-semibold text-slate-400 group-hover:text-green-700 truncate max-w-xs">
							{teamImageName || "Choose file..."}
						</span>
						<input name="team_image" type="file" accept="image/*" className="hidden"
							onChange={(e) => setTeamImageName(e.target.files?.[0]?.name || "")} />
					</label>
				</div>

				{/* Team list */}
				<div className="sm:col-span-2 flex flex-col gap-1.5">
					<label className={labelCls}>Upload Team List (With Aadhaar Card) <span className="text-red-500">*</span></label>
					<p className="text-xs text-slate-400">PDF, document, or image. Max 10 MB.</p>
					<label className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:border-green-500 hover:bg-green-50 cursor-pointer transition-colors group">
						<span className="text-sm font-semibold text-slate-400 group-hover:text-green-700 truncate max-w-xs">
							{teamListName || "Choose file..."}
						</span>
						<input name="team_list" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="hidden" required
							onChange={(e) => setTeamListName(e.target.files?.[0]?.name || "")} />
					</label>
				</div>
			</div>

			{/* ── QR Payment section ── */}
			<div className="bg-green-50 border-2 border-green-400 rounded-2xl p-5 space-y-4">
				<div>
					<p className="font-black text-slate-800 text-base">Pay Registration Fee</p>
					<p className="text-sm text-green-700 font-semibold mt-0.5">
						Scan the QR code below and pay <strong>₹251</strong> to complete registration.
					</p>
				</div>

				<div className="flex flex-col sm:flex-row items-center gap-6">
					<div className="flex-shrink-0 bg-white rounded-xl p-3 border border-green-200 shadow-sm">
						<Image
							src="/pg_qr.jpeg"
							alt="Payment QR Code"
							width={180}
							height={180}
							className="rounded-lg"
						/>
					</div>
					<div className="text-sm text-slate-600 space-y-1.5">
						<p>1. Open any UPI app (PhonePe, GPay, Paytm, etc.)</p>
						<p>2. Scan the QR code</p>
						<p>3. Pay exactly <strong className="text-green-700">₹251</strong></p>
						<p>4. Take a screenshot of the payment confirmation</p>
						<p>5. Upload the screenshot below</p>
					</div>
				</div>

				{/* Payment screenshot upload */}
				<div className="flex flex-col gap-1.5">
					<label className={`${labelCls} text-green-700`}>
						Upload Payment Screenshot <span className="text-red-500">*</span>
					</label>
					<label className={`flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors group ${
						paymentScreenshotName
							? "border-green-500 bg-green-50"
							: "border-slate-300 bg-slate-50 hover:border-green-500 hover:bg-green-50"
					}`}>
						<span className={`text-sm font-semibold truncate max-w-xs ${paymentScreenshotName ? "text-green-700" : "text-slate-400 group-hover:text-green-700"}`}>
							{paymentScreenshotName || "Choose payment screenshot..."}
						</span>
						<input name="payment_screenshot" type="file" accept="image/*" className="hidden" required
							onChange={(e) => setPaymentScreenshotName(e.target.files?.[0]?.name || "")} />
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
					<span className="text-sm font-bold text-slate-700">
						I agree to all the above Terms & Conditions
					</span>
				</label>
			</div>

			<button
				type="submit"
				disabled={isPending || !agreed}
				className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg rounded-xl transition-colors flex items-center justify-center gap-2"
			>
				{isPending ? "Submitting..." : "Submit Registration"}
			</button>
		</form>
	);
}
