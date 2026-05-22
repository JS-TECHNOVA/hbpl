"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mediaUrl } from "@/src/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface GalleryItem {
  id: number;
  title: string;
  category: string;
  image_url: string | null;
}

const stats = [
  { value: "20+", label: "Cricket Matches" },
  { value: "8", label: "League Teams" },
  { value: "200+", label: "Student Participants" },
  { value: "10+", label: "Partner Schools" },
];

const values = [
  {
    title: "Our Mission",
    body: "To promote both cricket excellence and academic growth by offering a premier league and a structured general aptitude competition.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    title: "Excellence",
    body: "We maintain high standards in tournament organisation and exam conduct, from facilities and officials to question design.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    title: "Holistic Growth",
    body: "We believe champions are built on and off the field — giving students opportunities to shine in sports and studies.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.42 10.922a1 1 0 00-.019-1.838L12.83 5.18a2 2 0 00-1.66 0L2.6 9.08a1 1 0 000 1.832l8.57 3.908a2 2 0 001.66 0zM22 10v6M6 12.5V16a6 3 0 0012 0v-3.5" />
      </svg>
    ),
  },
  {
    title: "Community & Passion",
    body: "HBPL is powered by local volunteers, educators, and cricket lovers who want to uplift Harpur Belahi youth.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
      </svg>
    ),
  },
  {
    title: "Innovation",
    body: "From live scoring and fixtures to a digital exam portal and downloadable syllabus, we embrace technology for a better experience.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 14a1 1 0 01-.78-1.63l9.9-10.2a.5.5 0 01.86.46l-1.92 6.02A1 1 0 0013 10h7a1 1 0 01.78 1.63l-9.9 10.2a.5.5 0 01-.86-.46l1.92-6.02A1 1 0 0011 14z" />
      </svg>
    ),
  },
  {
    title: "Opportunity for All",
    body: "School students (Class 5–10) and local teams get equal access to compete, learn, and celebrate together.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

export default function About() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  useEffect(() => {
    fetch(`${API}/api/gallery/`)
      .then(r => r.json())
      .then(d => setGallery((Array.isArray(d) ? d : d.results ?? []).slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
		<div className="bg-page">
			{/* ══════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════ */}
			<section className="bg-primary-darker">
				<div className="max-w-7xl mx-auto px-8 py-20">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
						{/* Left */}
						<div className="flex flex-col gap-6">
							<span className="inline-flex items-center gap-2 w-fit bg-accent/15 text-accent border border-accent/30 text-[11px] font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full">
								About Harpur Belahi Premier League
							</span>
							<h1 className="font-heading font-extrabold text-[52px] leading-[1.05] text-white tracking-tight">
								A Home for{" "}
								<span className="text-accent">Sports</span>
								<br />
								&amp; Studies
							</h1>
							<p className="text-white/60 text-[15px] leading-[1.7] max-w-md">
								HBPL is more than a cricket tournament. We are a
								community initiative that runs both a
								professionally managed premier league and a
								district-level general aptitude competition for
								Classes 5 to 10.
							</p>
						</div>

						{/* Right: feature cards */}
						<div className="flex flex-col gap-4">
							<div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-4 items-start">
								<div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth={2}
										className="w-5 h-5 text-accent"
									>
										<circle cx="12" cy="12" r="10" />
										<circle cx="12" cy="12" r="6" />
										<circle cx="12" cy="12" r="2" />
									</svg>
								</div>
								<div>
									<h3 className="text-white font-semibold text-[15px] mb-1">
										Cricket League
									</h3>
									<p className="text-white/50 text-[13px] leading-relaxed">
										Structured fixtures, live scoring, and
										competitive yet friendly matches for
										local teams.
									</p>
								</div>
							</div>
							<div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-4 items-start">
								<div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth={2}
										className="w-5 h-5 text-accent"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M21.42 10.922a1 1 0 00-.019-1.838L12.83 5.18a2 2 0 00-1.66 0L2.6 9.08a1 1 0 000 1.832l8.57 3.908a2 2 0 001.66 0zM22 10v6M6 12.5V16a6 3 0 0012 0v-3.5"
										/>
									</svg>
								</div>
								<div>
									<h3 className="text-white font-semibold text-[15px] mb-1">
										General Aptitude Competition
									</h3>
									<p className="text-white/50 text-[13px] leading-relaxed">
										A district-level exam for Classes 5–10
										that tests reasoning, academics, and
										general awareness.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ══════════════════════════════════════════════
          2. MISSION & VISION
      ══════════════════════════════════════════════ */}
			<section className="max-w-7xl mx-auto px-8 py-16">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="bg-[#dbeafe] rounded-3xl p-10 flex flex-col gap-6">
						<div className="w-14 h-14 rounded-2xl bg-[#fbbf24]/20 flex items-center justify-center shrink-0">
							<svg
								className="w-7 h-7 text-[#d97706]"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
							</svg>
						</div>
						<div>
							<h2 className="font-heading font-extrabold text-[28px] text-primary-darker mb-3">
								Our Mission
							</h2>
							<p className="text-[#1e3a8a]/70 text-[15px] leading-[1.7]">
								To promote both cricket excellence and academic
								growth by offering a professionally managed
								premier league and a structured general aptitude
								competition — creating measurable impact for
								every student and player in the region.
							</p>
						</div>
						<div className="flex flex-wrap gap-2 mt-auto">
							{["Excellence", "Community", "Integrity"].map(
								(p) => (
									<span
										key={p}
										className="bg-primary/10 text-primary text-[12px] font-semibold px-4 py-1.5 rounded-full"
									>
										{p}
									</span>
								),
							)}
						</div>
					</div>

					<div className="bg-primary-darker rounded-3xl p-10 flex flex-col gap-6 relative overflow-hidden">
						<div
							className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-15"
							style={{
								background:
									"radial-gradient(circle, #003f87 0%, transparent 70%)",
								transform: "translate(30%, -30%)",
							}}
						/>
						<div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
							<svg
								className="w-7 h-7 text-accent"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.8}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div className="relative">
							<h2 className="font-heading font-extrabold text-[28px] text-white mb-3">
								Our Vision
							</h2>
							<p className="text-white/60 text-[15px] leading-[1.7]">
								To become the definitive sports and academic
								force in the Kushinagar region — building
								confident players, curious learners, and a
								strong, connected community in and around Harpur
								Belahi.
							</p>
						</div>
						<div className="flex flex-wrap gap-2 mt-auto relative">
							{["Innovation", "Leadership", "Growth"].map((p) => (
								<span
									key={p}
									className="bg-white/10 text-white/70 text-[12px] font-semibold px-4 py-1.5 rounded-full border border-white/10"
								>
									{p}
								</span>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* ══════════════════════════════════════════════
          3. OUR STORY
      ══════════════════════════════════════════════ */}
			<section className="max-w-7xl mx-auto px-8 pb-16">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
					<div className="md:col-span-2 flex flex-col gap-5">
						<div className="bg-primary rounded-3xl p-7 flex flex-col gap-1">
							<span className="font-heading font-extrabold text-[56px] leading-none text-white">
								2025
							</span>
							<span className="text-primary-light text-[14px] font-medium">
								Founded with a vision to unite sports and
								education
							</span>
						</div>
						<div className="rounded-3xl overflow-hidden aspect-4/3 shadow-[0px_4px_20px_rgba(0,0,0,0.1)] bg-slate-200">
							<img
								src="/12april2.webp"
								alt="Community gathering"
								className="w-full h-full object-cover"
							/>
						</div>
					</div>

					<div className="md:col-span-3 flex flex-col gap-6 pt-2">
						<span className="text-[11px] font-semibold text-text-muted tracking-widest uppercase inline-flex items-center gap-2">
							<span className="w-4 h-px bg-text-muted inline-block" />
							Our History
						</span>
						<h2 className="font-heading font-extrabold text-[40px] leading-[1.1] text-primary tracking-tight">
							Our Story
						</h2>
						<p className="text-text-body text-[15px] leading-[1.7]">
							Founded in 2025, the Harpur Belahi Premier League
							started as a small community effort to give local
							cricketers a professional platform. Over time, HBPL
							has grown into a structured league with clear rules,
							fixtures, and a passionate fan base.
						</p>
						<p className="text-text-body text-[15px] leading-[1.7]">
							As we worked with schools and families, we realised
							that young people needed equal opportunities in
							academics. That is how the HBPL General Aptitude
							Competition was born — a written exam that lets
							students from Class 5 to 10 showcase their knowledge
							and logical thinking.
						</p>
						<p className="text-text-body text-[15px] leading-[1.7]">
							Today, HBPL stands at the intersection of sports and
							education. We are committed to building confident
							players, curious learners, and a strong, connected
							community in and around Harpur Belahi.
						</p>
						<div className="flex items-center gap-2 text-text-muted text-[13px] mt-1">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={1.5}
								className="w-4 h-4 shrink-0"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
								/>
							</svg>
							<span>
								Harpur Belahi, near Panchayat Bhawan,
								Kushinagar, U.P.
							</span>
						</div>
						<Link
							href="/events"
							className="inline-flex items-center gap-2 text-primary font-semibold text-[14px] hover:gap-3 transition-all mt-1 w-fit group"
						>
							Explore Events
							<svg
								className="w-4 h-4 group-hover:translate-x-1 transition-transform"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2.5}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</Link>
					</div>
				</div>
			</section>

			{/* ══════════════════════════════════════════════
          4. WHAT HBPL STANDS FOR — 6 value cards
      ══════════════════════════════════════════════ */}
			<section className="max-w-7xl mx-auto px-8 pb-16">
				<div className="flex flex-col gap-3 mb-10 text-center">
					<span className="text-[11px] font-semibold text-text-muted tracking-widest uppercase inline-flex items-center justify-center gap-2">
						<span className="w-4 h-px bg-text-muted inline-block" />
						Our Values
					</span>
					<h2 className="font-heading font-extrabold text-[36px] text-primary tracking-tight">
						What HBPL Stands For
					</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					{values.map((v) => (
						<div
							key={v.title}
							className="bg-white rounded-2xl p-7 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] flex gap-4 items-start hover:shadow-[0px_4px_20px_rgba(0,0,0,0.1)] transition-shadow"
						>
							<div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-primary-darker flex items-center justify-center shrink-0 text-white">
								{v.icon}
							</div>
							<div>
								<h3 className="font-heading font-extrabold text-[17px] text-primary mb-2">
									{v.title}
								</h3>
								<p className="text-text-body text-[13px] leading-[1.65]">
									{v.body}
								</p>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* ══════════════════════════════════════════════
          5. STATS STRIP
      ══════════════════════════════════════════════ */}
			<section className="bg-primary-darker py-16">
				<div className="max-w-7xl mx-auto px-8">
					<h2 className="font-heading font-extrabold text-[36px] text-white text-center tracking-tight mb-12">
						HBPL At a Glance
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8">
						{stats.map((s) => (
							<div
								key={s.label}
								className="flex flex-col items-center gap-2 text-center"
							>
								<span className="font-heading font-extrabold text-[48px] leading-none text-accent">
									{s.value}
								</span>
								<span className="text-white/50 text-[13px] font-medium tracking-wide">
									{s.label}
								</span>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ══════════════════════════════════════════════
          6. TESTIMONIAL
      ══════════════════════════════════════════════ */}
			<section className="max-w-7xl mx-auto px-8 py-16">
				<div className="bg-white rounded-4xl p-10 md:p-14 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)]">
					<div className="flex flex-col md:flex-row gap-10 items-start md:items-center">
						<div className="shrink-0">
							<div className="w-20 h-20 rounded-2xl overflow-hidden">
								<img
									src="/sonu-removebg-preview.webp"
									alt="Testimonial"
									className="w-full h-full object-cover"
								/>
							</div>
						</div>
						<div className="flex flex-col gap-4">
							<svg
								className="w-8 h-6 text-primary-light"
								fill="currentColor"
								viewBox="0 0 32 24"
							>
								<path d="M0 24V14.4C0 6.48 4.68 1.56 14.04 0l1.44 2.4C10.2 3.6 7.56 6.36 6.72 10.8H12V24H0zm18 0V14.4C18 6.48 22.68 1.56 32.04 0l1.44 2.4c-5.28 1.2-7.92 3.96-8.76 8.4H30V24H18z" />
							</svg>
							<p className="text-text-primary text-[18px] leading-[1.7] font-medium italic">
								&ldquo;HBPL isn&apos;t just a community;
								it&apos;s a blueprint. The resources they
								provide are unparalleled. The mentorship I got
								completely changed my career trajectory.&rdquo;
							</p>
							<p className="font-semibold text-primary text-[15px]">
								— Sonu Kushwaha, HBPL Vice Chairperson and
								Technical Director.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* ══════════════════════════════════════════════
          7. MOMENTS IN MOTION — real gallery images
      ══════════════════════════════════════════════ */}
			<section className="max-w-7xl mx-auto px-8 pb-20">
				<div className="flex items-end justify-between mb-8">
					<div className="flex flex-col gap-2">
						<h2 className="font-heading font-extrabold text-[36px] leading-tight text-primary tracking-tight">
							Moments in Motion
						</h2>
						<p className="text-text-muted text-[14px]">
							Discover our highlights across the gallery
						</p>
					</div>
					<Link
						href="/gallery"
						className="hidden md:inline-flex items-center gap-2 text-primary font-semibold text-[13px] hover:gap-3 transition-all group"
					>
						View Gallery
						<svg
							className="w-4 h-4 group-hover:translate-x-1 transition-transform"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</Link>
				</div>

				{gallery.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{gallery.map((img) => (
							<Link
								key={img.id}
								href="/gallery"
								className="rounded-3xl overflow-hidden aspect-4/3 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] group block"
							>
								{img.image_url ? (
									<img
										src={mediaUrl(img.image_url)}
										alt={img.title}
										className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
									/>
								) : (
									<div className="w-full h-full bg-slate-100 flex items-center justify-center">
										<span className="text-slate-400 text-[13px]">
											{img.title}
										</span>
									</div>
								)}
							</Link>
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{[
							{
								src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
								alt: "Annual gathering",
							},
							{
								src: "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=600&q=80",
								alt: "Students collaborating",
							},
							{
								src: "https://images.unsplash.com/photo-1491975474562-1f4e30bc9468?w=600&q=80",
								alt: "Community workshop",
							},
						].map((img) => (
							<div
								key={img.alt}
								className="rounded-3xl overflow-hidden aspect-4/3 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] group"
							>
								<img
									src={img.src}
									alt={img.alt}
									className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
								/>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
  );
}
