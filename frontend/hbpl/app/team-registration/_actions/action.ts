"use server";

import { revalidatePath } from "next/cache";

export type RegistrationResult = {
	success: boolean;
	teamId?: string;
	paymentId?: string;
	paymentAmount?: string;
	paidAt?: string;
	receiptUrl?: string;
	error?: string;
};

const API_URL =
	process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

function getErrorMessage(body: unknown): string {
	if (typeof body === "string" && body.trim()) return body;
	if (!body || typeof body !== "object") return "Registration failed.";

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

	return "Registration failed.";
}

export async function registerCricketTeam(
	formData: FormData,
): Promise<RegistrationResult> {
	try {
		const teamName = formData.get("team_name") as string;
		const captainName = formData.get("captain_name") as string;
		const mobileNumber = formData.get("mobile_number") as string;
		const whatsappNumber = formData.get("whatsapp_number") as string;
		const numberOfPlayers = formData.get("number_of_players") as string;
		const villageName = formData.get("address") as string;
		const teamList = formData.get("team_list") as File | null;
		const paymentContextToken = formData.get("payment_context_token") as string;
		const razorpayOrderId = formData.get("razorpay_order_id") as string;
		const razorpayPaymentId = formData.get("razorpay_payment_id") as string;
		const razorpaySignature = formData.get("razorpay_signature") as string;
		const agreedToTerms = formData.get("agreed_to_terms") as string;
		const teamImage = formData.get("team_image") as File | null;

		if (!teamName?.trim())
			return { success: false, error: "Team name is required." };
		if (!captainName?.trim())
			return { success: false, error: "Captain name is required." };
		if (!mobileNumber?.trim() || mobileNumber.length < 10)
			return { success: false, error: "Enter a valid mobile number." };
		if (!whatsappNumber?.trim() || whatsappNumber.length < 10)
			return { success: false, error: "Enter a valid WhatsApp number." };
		if (!numberOfPlayers || parseInt(numberOfPlayers, 10) < 11 || parseInt(numberOfPlayers, 10) > 25)
			return { success: false, error: "Squad must have 11-25 players." };
		if (!villageName?.trim())
			return { success: false, error: "Village name is required." };
		if (!teamList || teamList.size === 0)
			return { success: false, error: "Team list upload is required." };
		if (teamList.size > 10 * 1024 * 1024)
			return { success: false, error: "Team list must be under 10 MB." };
		if (!paymentContextToken || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature)
			return {
				success: false,
				error: "Payment verification is required before registration.",
			};
		if (agreedToTerms !== "true")
			return {
				success: false,
				error: "You must agree to the Terms & Conditions.",
			};

		const payload = new FormData();
		payload.append("team_name", teamName.trim());
		payload.append("captain_name", captainName.trim());
		payload.append("phone", mobileNumber.trim());
		payload.append("whatsapp_number", whatsappNumber.trim());
		payload.append("player_count", parseInt(numberOfPlayers, 10).toString());
		payload.append("address", villageName.trim());
		payload.append("team_list", teamList, teamList.name);
		payload.append("payment_context_token", paymentContextToken);
		payload.append("razorpay_order_id", razorpayOrderId);
		payload.append("razorpay_payment_id", razorpayPaymentId);
		payload.append("razorpay_signature", razorpaySignature);
		if (teamImage) {
			payload.append("team_image", teamImage, teamImage.name);
		}

		const res = await fetch(`${API_URL}/api/register/`, {
			method: "POST",
			body: payload,
			cache: "no-store",
		});
		const body = (await res.json().catch(() => null)) as
			| {
					id?: number | string;
					payment_id?: string;
					payment_amount_paise?: number;
					payment_currency?: string;
					created_at?: string;
					receipt_download_url?: string;
			  }
			| null;

		if (!res.ok) {
			return { success: false, error: getErrorMessage(body) };
		}

		const teamId =
			body?.id != null
				? `HBPL-${String(body.id).toUpperCase()}`
				: `HBPL-${Date.now().toString(36).toUpperCase()}`;
		revalidatePath("/team-registration");
		return {
			success: true,
			teamId,
			paymentId: body?.payment_id,
			paymentAmount:
				typeof body?.payment_amount_paise === "number"
					? `${body.payment_currency ?? "INR"} ${(body.payment_amount_paise / 100).toFixed(2)}`
					: undefined,
			paidAt: body?.created_at,
			receiptUrl: body?.receipt_download_url,
		};
	} catch (err) {
		console.error("Registration error:", err);
		return {
			success: false,
			error: "Something went wrong. Please try again.",
		};
	}
}
