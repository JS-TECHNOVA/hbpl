// app/register/page.tsx — SERVER COMPONENT
import type { Metadata } from "next";
import CricketRegistrationForm from "./_components/CricketRegistrationForm";

export const metadata: Metadata = {
	title: "HBPL Cricket Tournament – Team Registration",
	description: "Register your cricket team for the HBPL Cricket Tournament.",
};

export default async function CricketRegistrationPage() {
	// Fetch registration status from DB here if needed
	const registrationOpen = true;

	if (!registrationOpen) {
		return (
			<main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 px-4">
				<div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-sm w-full">
					<div className="text-5xl mb-4">🚫</div>
					<h2 className="text-2xl font-black text-red-600 mb-3">
						Registration Closed
					</h2>
					<p className="text-slate-500 text-sm">
						Team registration for HBPL Cricket Tournament is
						currently closed. Please check back later or contact the
						organizers.
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 py-12 px-4">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<div className="text-center mb-8">
					<span className="inline-block bg-yellow-400 text-slate-900 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
						🏏 HBPL 2025
					</span>
					<h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight mb-3">
						Cricket Team Registration
					</h1>
					<p className="text-slate-400 text-sm max-w-md mx-auto">
						Fill in your team details to register for the HBPL
						Cricket Tournament. Fields marked{" "}
						<span className="text-red-400 font-bold">*</span> are
						required.
					</p>
				</div>

				{/* Card */}
				<div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
					<CricketRegistrationForm />
				</div>
			</div>
		</main>
	);
}
