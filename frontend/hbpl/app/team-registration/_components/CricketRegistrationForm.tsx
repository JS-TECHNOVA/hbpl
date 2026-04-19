"use client";

import { useEffect, useRef, useState } from "react";
import {
	registerCricketTeam,
	type RegistrationResult,
} from "../_actions/action";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

type PaymentOrderResponse = {
	key: string;
	order_id: string;
	amount: number;
	currency: string;
	name: string;
	description: string;
	payment_context_token: string;
	detail?: string | Record<string, unknown>;
};

type RazorpaySuccessResponse = {
	razorpay_payment_id: string;
	razorpay_order_id: string;
	razorpay_signature: string;
};

type RazorpayOptions = {
	key: string;
	amount: number;
	currency: string;
	name: string;
	description: string;
	order_id: string;
	prefill?: {
		name?: string;
		contact?: string;
	};
	handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
	modal?: {
		ondismiss?: () => void;
	};
	theme?: {
		color?: string;
	};
};

type RazorpayInstance = {
	open: () => void;
	on: (
		event: string,
		handler: (response: { error?: { description?: string } }) => void,
	) => void;
};

declare global {
	interface Window {
		Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
	}
}

function getErrorMessage(body: unknown): string {
	if (typeof body === "string" && body.trim()) return body;
	if (!body || typeof body !== "object")
		return "Something went wrong. Please try again.";

	const record = body as Record<string, unknown>;
	if (typeof record.detail === "string" && record.detail.trim()) {
		return record.detail;
	}

	for (const value of Object.values(record)) {
		if (typeof value === "string" && value.trim()) return value;
		if (
			Array.isArray(value) &&
			typeof value[0] === "string" &&
			value[0].trim()
		) {
			return value[0];
		}
	}

	return "Something went wrong. Please try again.";
}

function loadRazorpayScript(): Promise<boolean> {
	if (typeof window === "undefined") return Promise.resolve(false);
	if (window.Razorpay) return Promise.resolve(true);

	return new Promise((resolve) => {
		const existingScript = document.querySelector<HTMLScriptElement>(
			'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
		);
		if (existingScript) {
			existingScript.addEventListener("load", () => resolve(true), {
				once: true,
			});
			existingScript.addEventListener("error", () => resolve(false), {
				once: true,
			});
			return;
		}

		const script = document.createElement("script");
		script.src = "https://checkout.razorpay.com/v1/checkout.js";
		script.async = true;
		script.onload = () => resolve(true);
		script.onerror = () => resolve(false);
		document.body.appendChild(script);
	});
}

export default function CricketRegistrationForm() {
	const formRef = useRef<HTMLFormElement>(null);
	const [isPending, setIsPending] = useState(false);
	const [result, setResult] = useState<RegistrationResult | null>(null);
	const [agreed, setAgreed] = useState(false);
	const [teamListName, setTeamListName] = useState("");
	const [teamImage, setTeamImage] = useState<any>(null);

	useEffect(() => {
		void loadRazorpayScript();
	}, []);

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!agreed) {
			setResult({
				success: false,
				error: "You must agree to the Terms & Conditions.",
			});
			return;
		}

		const formElement = e.currentTarget;
		const formData = new FormData(formElement);
		const teamName = (formData.get("team_name") as string)?.trim();
		const captainName = (formData.get("captain_name") as string)?.trim();
		const mobileNumber = (formData.get("mobile_number") as string)?.trim();
		const whatsappNumber = (formData.get("whatsapp_number") as string)?.trim();
		const numberOfPlayers = (formData.get("number_of_players") as string)?.trim();
		const villageName = (formData.get("address") as string)?.trim();
		const teamList = formData.get("team_list") as File | null;

		if (!teamList || teamList.size === 0) {
			setResult({ success: false, error: "Team list upload is required." });
			return;
		}

		setIsPending(true);
		setResult(null);

		try {
			const scriptLoaded = await loadRazorpayScript();
			if (!scriptLoaded || !window.Razorpay) {
				setResult({
					success: false,
					error: "Unable to load Razorpay checkout. Please try again.",
				});
				setIsPending(false);
				return;
			}

			const orderResponse = await fetch(`${API_URL}/api/register/payment-order/`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					team_name: teamName,
					captain_name: captainName,
					phone: mobileNumber,
					whatsapp_number: whatsappNumber,
					player_count: Number(numberOfPlayers),
					address: villageName,
				}),
			});
			const orderBody = (await orderResponse
				.json()
				.catch(() => null)) as PaymentOrderResponse | null;

			if (!orderResponse.ok || !orderBody) {
				setResult({ success: false, error: getErrorMessage(orderBody) });
				setIsPending(false);
				return;
			}

			const razorpay = new window.Razorpay({
				key: orderBody.key,
				amount: orderBody.amount,
				currency: orderBody.currency,
				name: orderBody.name,
				description: orderBody.description,
				order_id: orderBody.order_id,
				prefill: {
					name: captainName,
					contact: mobileNumber,
				},
				handler: async (paymentResponse) => {
					const submission = new FormData(formElement);
					submission.set("agreed_to_terms", "true");
					submission.set(
						"payment_context_token",
						orderBody.payment_context_token,
					);
					submission.set(
						"razorpay_order_id",
						paymentResponse.razorpay_order_id,
					);
					submission.set(
						"razorpay_payment_id",
						paymentResponse.razorpay_payment_id,
					);
					submission.set(
						"razorpay_signature",
						paymentResponse.razorpay_signature,
					);

					const res = await registerCricketTeam(submission);
					setResult(res);
					setIsPending(false);

					if (res.success) {
						formRef.current?.reset();
						setTeamListName("");
						setAgreed(false);
					}
				},
				modal: {
					ondismiss: () => setIsPending(false),
				},
				theme: {
					color: "#16a34a",
				},
			});

			razorpay.on("payment.failed", (response) => {
				setResult({
					success: false,
					error:
						response.error?.description ||
						"Payment failed. Please try again.",
				});
				setIsPending(false);
			});

			razorpay.open();
		} catch (error) {
			setResult({
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Something went wrong. Please try again.",
			});
			setIsPending(false);
		}
	};

	if (result?.success) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 px-4 py-12">
				<div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-sm w-full">
					<div className="text-6xl mb-4">Trophy</div>
					<h2 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-wide">
						Registration Successful!
					</h2>
					<div className="bg-green-50 border-2 border-green-500 rounded-xl px-6 py-4 mb-6">
						<p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
							Your Team ID
						</p>
						<p className="text-3xl font-black text-green-600 tracking-widest">
							{result.teamId}
						</p>
						<p className="text-xs text-slate-400 mt-1">
							Save this for future reference
						</p>
					</div>
					<div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 mb-6 text-left space-y-2">
						<p className="text-xs font-bold uppercase tracking-widest text-green-700">
							Payment Confirmed
						</p>
						<p className="text-sm text-slate-700">
							<span className="font-semibold">Payment ID:</span>{" "}
							{result.paymentId || "-"}
						</p>
						<p className="text-sm text-slate-700">
							<span className="font-semibold">Amount Paid:</span>{" "}
							{result.paymentAmount || "-"}
						</p>
						<p className="text-sm text-slate-700">
							<span className="font-semibold">Confirmation Time:</span>{" "}
							{result.paidAt
								? new Date(result.paidAt).toLocaleString("en-IN")
								: "-"}
						</p>
					</div>
					<p className="text-slate-500 text-sm mb-6">
						Your team has been registered for HBPL Cricket
						Tournament. We&apos;ll contact you via the provided mobile
						number.
					</p>
					<div className="flex flex-col gap-3">
						{result.receiptUrl ? (
							<a
								href={result.receiptUrl}
								target="_blank"
								rel="noreferrer"
								className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-colors"
							>
								Download Payment Receipt
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
			</div>
		);
	}

	const inputCls =
		"w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-green-500 focus:bg-white transition-colors";

	const labelCls =
		"text-xs font-bold uppercase tracking-wider text-slate-500";

	return (
		<form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
			{result?.error && (
				<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
					Warning: {result.error}
				</div>
			)}

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
				<div className="sm:col-span-2 flex flex-col gap-1.5">
					<label className={labelCls}>
						Team Name <span className="text-red-500">*</span>
					</label>
					<input
						name="team_name"
						type="text"
						placeholder="e.g. Royal Challengers"
						required
						className={inputCls}
					/>
				</div>

				<div className="sm:col-span-2 flex flex-col gap-1.5">
					<label className={labelCls}>
						Captain Name <span className="text-red-500">*</span>
					</label>
					<input
						name="captain_name"
						type="text"
						placeholder="Full name of captain"
						required
						className={inputCls}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<label className={labelCls}>
						Mobile Number <span className="text-red-500">*</span>
					</label>
					<input
						name="mobile_number"
						type="tel"
						placeholder="10-digit mobile number"
						pattern="[6-9][0-9]{9}"
						minLength={10}
						maxLength={10}
						required
						className={inputCls}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<label className={labelCls}>
						WhatsApp Number <span className="text-red-500">*</span>
					</label>
					<input
						name="whatsapp_number"
						type="tel"
						placeholder="10-digit WhatsApp number"
						pattern="[6-9][0-9]{9}"
						minLength={10}
						maxLength={10}
						required
						className={inputCls}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<label className={labelCls}>
						Number of Players{" "}
						<span className="text-red-500">*</span>
					</label>
					<input
						name="number_of_players"
						type="number"
						placeholder="e.g. 15"
						min={11}
						max={25}
						required
						className={inputCls}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<label className={labelCls}>
						Address <span className="text-red-500">*</span>
					</label>
					<input
						name="address"
						type="text"
						placeholder="Your village / city"
						required
						className={inputCls}
					/>
				</div>

				<div className="sm:col-span-2 flex flex-col gap-1.5">
					<label className={labelCls}>
						Upload Team Logo/Photo
						{/* <span className="text-red-500">*</span> */}
					</label>
					<p className="text-xs text-slate-400">
						You can upload an optional team logo or photo.
					</p>
					<label className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:border-green-500 hover:bg-green-50 cursor-pointer transition-colors group">
						<span className="text-sm font-semibold text-slate-400 group-hover:text-green-700 truncate max-w-xs">
							{teamImage || "Choose file..."}
						</span>
						<input
							name="team_image"
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(event) =>
								setTeamImage(
									event.target.files?.[0].name || null
								)
							}
						/>
					</label>
				</div>

				<div className="sm:col-span-2 flex flex-col gap-1.5">
					<label className={labelCls}>
						Upload Team List (With Aadhaar Card){" "}
						<span className="text-red-500">*</span>
					</label>
					<p className="text-xs text-slate-400">
						Upload 1 supported file: PDF, document, or image. Max 10
						MB.
					</p>
					<label className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:border-green-500 hover:bg-green-50 cursor-pointer transition-colors group">
						<span className="text-sm font-semibold text-slate-400 group-hover:text-green-700 truncate max-w-xs">
							{teamListName || "Choose file..."}
						</span>
						<input
							name="team_list"
							type="file"
							accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
							className="hidden"
							onChange={(event) =>
								setTeamListName(
									event.target.files?.[0]?.name || "",
								)
							}
						/>
					</label>
				</div>
			</div>

			<div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 space-y-4">
				<div>
					<p className="font-black text-slate-800">
						Razorpay Payment
					</p>
					<p className="text-sm text-yellow-700 font-semibold mt-0.5">
						Click the payment button below to open Razorpay Checkout
						and pay the registration fee.
					</p>
				</div>
				<div className="rounded-xl bg-white border border-yellow-300 px-4 py-3">
					<p className="text-sm font-bold text-slate-800">
						Registration fee: Rs. 500 per team
					</p>
					<p className="text-xs text-slate-500 mt-1">
						You can pay using UPI, card, netbanking, or wallet in
						the Razorpay popup.
					</p>
				</div>
			</div>

			<div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
				<a
					href="#"
					className="text-sm font-bold text-green-700 hover:underline"
				>
					Download and read carefully HBPL Rule Book
				</a>

				<div className="bg-white border border-slate-200 rounded-lg p-4 max-h-52 overflow-y-auto space-y-3 text-sm text-slate-600">
					<p className="font-black text-slate-800 text-base">
						HBPL Cricket Tournament - Terms & Conditions
					</p>
					<ol className="list-decimal pl-5 space-y-1.5">
						<li>
							All teams must complete the registration form with
							correct and genuine information.
						</li>
						<li>
							Registration will be considered valid only after
							successful submission of the registration fee.
						</li>
						<li>
							The registration fee is refundable if the team is
							not selected by the HBPL Management.
						</li>
						<li>
							Final approval of teams and players lies solely with
							the HBPL Management Committee.
						</li>
						<li>
							HBPL reserves the right to accept or reject any team
							without providing a reason.
						</li>
						<li>
							Once the form is submitted, no changes in team or
							player details will be allowed.
						</li>
						<li>
							All players must carry a valid ID proof during
							matches for verification.
						</li>
						<li>
							Teams must report at the ground at least 30 minutes
							before match time.
						</li>
						<li>
							The match schedule may be changed due to weather or
							unavoidable situations.
						</li>
						<li>
							Any form of misconduct, indiscipline, or unfair play
							will result in immediate disqualification.
						</li>
						<li>
							The decision of the umpires and tournament officials
							will be final and binding.
						</li>
						<li>
							HBPL will not be responsible for any injury, loss,
							or damage during the tournament.
						</li>
						<li>
							Use of abusive language, fighting, or misbehavior
							with officials or other teams is strictly
							prohibited.
						</li>
					</ol>
					<p className="font-bold text-slate-700 border-t border-slate-100 pt-3">
						By submitting this form, the team agrees to follow all
						rules, regulations, and decisions of HBPL.
					</p>
				</div>

				<label className="flex items-start gap-3 cursor-pointer">
					<input
						type="checkbox"
						checked={agreed}
						onChange={(event) => setAgreed(event.target.checked)}
						className="mt-0.5 w-4 h-4 accent-green-600 cursor-pointer"
					/>
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
				{isPending
					? "Opening Razorpay..."
					: "Open Razorpay To Make Payment"}
			</button>
		</form>
	);
}
