"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { mediaUrl } from "@/src/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface VolunteerItem {
  id: number;
  name: string;
  role: string;
  description: string;
  img: string;
  image_url: string | null;
}

const benefits = [
  {
    title: "Make an Impact",
    desc: "Directly shape the lives of thousands of students through exam logistics, mentorship, and event coordination.",
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    title: "Learn & Grow",
    desc: "Gain hands-on leadership, organisational, and communication skills that last a lifetime.",
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: "Be Recognised",
    desc: "Receive certificates, awards, and community recognition for your dedication and service.",
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
];

const roles = [
  { title: "Exam Coordinator", count: "12 active", desc: "Help manage exam venues, distribute materials, and support students on exam day." },
  { title: "Cricket Ground Staff", count: "20 active", desc: "Set up and maintain the cricket ground, manage scorekeeping and logistics." },
  { title: "Community Outreach", count: "8 active", desc: "Represent HBPL in local schools and communities, share our mission." },
  { title: "Social Media & Content", count: "5 active", desc: "Create content, manage our social presence, and document events." },
];

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState<VolunteerItem[]>([]);

  useEffect(() => {
    fetch(`${API}/api/volunteers/`)
      .then(r => r.json())
      .then(data => setVolunteers(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => {});
  }, []);

  return (
    <div className="bg-page">

      {/* ── Page Header ── */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-5">
            <span className="text-[11px] font-semibold text-text-muted tracking-widest uppercase inline-flex items-center gap-2">
              <span className="w-4 h-px bg-text-muted inline-block" />
              Join Us
            </span>
            <h1 className="font-heading font-extrabold text-[48px] leading-[1.05] text-primary tracking-tight">
              Community
              <br />
              <span className="text-accent">Volunteers</span>
            </h1>
            <div className="w-12 h-1 rounded-full bg-accent" />
            <p className="text-text-body text-[15px] leading-[1.7] max-w-lg">
              Our volunteers are the backbone of everything we do. From exam
              logistics to cricket ground setup, they make it all happen.
            </p>
            <a
              href="mailto:volunteer@hbplcommunity.org"
              className="inline-flex items-center gap-2 w-fit bg-primary text-white font-semibold text-[14px] px-7 py-3.5 rounded-xl shadow-[0px_4px_12px_rgba(0,63,135,0.25)] hover:bg-primary-dark transition-colors mt-2"
            >
              Apply to Volunteer
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-[0px_20px_60px_rgba(0,0,0,0.12)] aspect-4/3">
            <img
              src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80"
              alt="Volunteers at work"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Why volunteer ── */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <div className="flex flex-col gap-3 mb-10">
          <h2 className="font-heading font-extrabold text-[36px] leading-tight text-primary tracking-tight">
            Why Volunteer with Us?
          </h2>
          <div className="w-12 h-1 rounded-full bg-accent" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((v) => (
            <div
              key={v.title}
              className="bg-white rounded-3xl p-8 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] flex flex-col gap-5"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                {v.icon}
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-[20px] text-primary mb-2">
                  {v.title}
                </h3>
                <p className="text-text-body text-[14px] leading-[1.65]">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Open roles ── */}
      <section className="bg-section py-16">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col gap-3 mb-10">
            <h2 className="font-heading font-extrabold text-[36px] leading-tight text-primary tracking-tight">
              Open Roles
            </h2>
            <div className="w-12 h-1 rounded-full bg-accent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {roles.map((r) => (
              <div
                key={r.title}
                className="bg-white rounded-3xl p-7 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-heading font-extrabold text-[18px] text-primary">{r.title}</h4>
                  <span className="shrink-0 text-[11px] font-semibold text-accent bg-accent-peach px-3 py-1 rounded-full">
                    {r.count}
                  </span>
                </div>
                <p className="text-text-body text-[14px] leading-[1.6]">{r.desc}</p>
                <a
                  href="mailto:volunteer@hbplcommunity.org"
                  className="text-primary font-semibold text-[13px] hover:underline mt-1 w-fit"
                >
                  Express interest →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Volunteer List ── */}
      {volunteers.length > 0 && (
        <section className="bg-section py-16">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-col gap-3 mb-10">
              <h2 className="font-heading font-extrabold text-[36px] leading-tight text-primary tracking-tight">
                Meet Our Volunteers
              </h2>
              <div className="w-12 h-1 rounded-full bg-accent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {volunteers.map(v => {
                const photo = mediaUrl(v.image_url || v.img || null) || null;
                const initials = v.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <div key={v.id} className="bg-white rounded-3xl overflow-hidden shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] flex flex-col group hover:shadow-[0px_8px_32px_rgba(0,63,135,0.12)] transition-shadow duration-200">
                    {/* Photo */}
                    <div className="aspect-square bg-primary-light overflow-hidden">
                      {photo ? (
                        <img src={photo} alt={v.name} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-primary font-extrabold text-[48px] opacity-30">{initials}</span>
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="p-5 flex flex-col gap-2 flex-1">
                      <div>
                        <h3 className="font-heading font-extrabold text-[16px] text-primary leading-tight">{v.name}</h3>
                        <p className="text-accent text-[11px] font-semibold uppercase tracking-widest mt-1">{v.role}</p>
                      </div>
                      {v.description && (
                        <p className="text-text-body text-[13px] leading-[1.65] mt-1">{v.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Apply CTA ── */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <div className="bg-primary rounded-4xl p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
            style={{ background: "white", filter: "blur(60px)", transform: "translate(30%, -30%)" }}
          />
          <div className="flex flex-col gap-3">
            <h2 className="font-heading font-extrabold text-[32px] leading-tight text-white tracking-tight">
              Ready to volunteer?
            </h2>
            <p className="text-primary-light text-[15px] leading-relaxed">
              Fill out the form and our team will get in touch within 48 hours.
            </p>
          </div>
          <a
            href="mailto:volunteer@hbplcommunity.org"
            className="shrink-0 bg-accent text-white font-semibold text-[14px] px-8 py-4 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Apply to Volunteer
          </a>
        </div>
      </section>
    </div>
  );
}
