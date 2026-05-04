"use server";

import { revalidatePath } from "next/cache";

export type RegistrationResult = {
	success: boolean;
	teamId?: string;
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
		const address = formData.get("address") as string;
		const teamList = formData.get("team_list") as File | null;
		const paymentScreenshot = formData.get("payment_screenshot") as File | null;
		const teamImage = formData.get("team_image") as File | null;

		if (!teamName?.trim())
			return { success: false, error: "Team name is required." };
		if (!captainName?.trim())
			return { success: false, error: "Captain name is required." };
		if (!mobileNumber?.trim() || mobileNumber.length < 10)
			return { success: false, error: "Enter a valid mobile number." };
		if (!whatsappNumber?.trim() || whatsappNumber.length < 10)
			return { success: false, error: "Enter a valid WhatsApp number." };
		if (
			!numberOfPlayers ||
			parseInt(numberOfPlayers, 10) < 11 ||
			parseInt(numberOfPlayers, 10) > 25
		)
			return { success: false, error: "Squad must have 11–25 players." };
		if (!address?.trim())
			return { success: false, error: "Address is required." };
		if (!teamList || teamList.size === 0)
			return { success: false, error: "Team list upload is required." };
		if (teamList.size > 10 * 1024 * 1024)
			return { success: false, error: "Team list must be under 10 MB." };
		if (!paymentScreenshot || paymentScreenshot.size === 0)
			return { success: false, error: "Payment screenshot is required." };

		const payload = new FormData();
		payload.append("team_name", teamName.trim());
		payload.append("captain_name", captainName.trim());
		payload.append("phone", mobileNumber.trim());
		payload.append("whatsapp_number", whatsappNumber.trim());
		payload.append("player_count", parseInt(numberOfPlayers, 10).toString());
		payload.append("address", address.trim());
		payload.append("team_list", teamList, teamList.name);
		payload.append("payment_screenshot", paymentScreenshot, paymentScreenshot.name);
		if (teamImage && teamImage.size > 0) {
			payload.append("team_image", teamImage, teamImage.name);
		}

		const res = await fetch(`${API_URL}/api/register/`, {
			method: "POST",
			body: payload,
			cache: "no-store",
			signal: AbortSignal.timeout(60_000),
		});
		const body = (await res.json().catch(() => null)) as {
			id?: number | string;
			receipt_download_url?: string;
		} | null;

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
