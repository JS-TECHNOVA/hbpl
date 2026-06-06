"use client";

import { useEffect, useState } from "react";
import { mediaUrl } from "@/src/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface Member {
  id: number;
  name: string;
  role: string;
  description: string;
  email: string;
  image_url: string | null;
}

function MemberCard({ m }: { m: Member }) {
  const initials = m.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] flex flex-col">
      {m.image_url ? (
        <div className="w-full aspect-4/3 overflow-hidden">
          <img
            src={mediaUrl(m.image_url)}
            alt={m.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full aspect-4/3 bg-primary flex items-center justify-center">
          <span className="font-heading font-extrabold text-[40px] text-white">{initials}</span>
        </div>
      )}
      <div className="flex flex-col gap-6 p-8">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading font-extrabold text-[20px] text-primary">{m.name}</h3>
          <p className="text-accent text-[13px] font-semibold tracking-wide">{m.role}</p>
        </div>
        <p className="text-text-body text-[14px] leading-[1.65]">{m.description}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] flex flex-col gap-6 animate-pulse">
      <div className="w-28 h-28 rounded-2xl bg-gray-200" />
      <div className="flex flex-col gap-2">
        <div className="h-5 w-40 rounded bg-gray-200" />
        <div className="h-3.5 w-24 rounded bg-gray-100" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-4/5 rounded bg-gray-100" />
      </div>
    </div>
  );
}

export default function Management() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/management/`)
      .then(r => r.json())
      .then(d => setMembers(Array.isArray(d) ? d : d.results ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-page">

      {/* ── Page Header ── */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-12">
        <div className="flex flex-col gap-4 max-w-2xl">
          <span className="text-[11px] font-semibold text-text-muted tracking-widest uppercase inline-flex items-center gap-2">
            <span className="w-4 h-px bg-text-muted inline-block" />
            The House Behind HBPL
          </span>
          <h1 className="font-heading font-extrabold text-[48px] leading-[1.05] text-primary tracking-tight">
            Management
            <br />
            <span className="text-accent">Team</span>
          </h1>
          <div className="w-12 h-1 rounded-full bg-accent" />
          <p className="text-text-body text-[15px] leading-[1.7] mt-2">
            Meet the dedicated people who power HBPL Community every day —
            from strategy to on-ground execution.
          </p>
        </div>
      </section>

      {/* ── Team grid ── */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : members.map(m => <MemberCard key={m.id} m={m} />)
          }
          {!loading && members.length === 0 && (
            <p className="col-span-3 text-center text-text-muted py-16">No team members found.</p>
          )}
        </div>
      </section>

      {/* ── Contact CTA ── */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        <div className="bg-primary rounded-4xl p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
            style={{ background: "white", filter: "blur(60px)", transform: "translate(30%, -30%)" }}
          />
          <div className="flex flex-col gap-3">
            <h2 className="font-heading font-extrabold text-[32px] leading-tight text-white tracking-tight">
              Want to reach out?
            </h2>
            <p className="text-primary-light text-[15px] leading-relaxed">
              For partnerships, media inquiries, or general questions about HBPL Community.
            </p>
          </div>
          <a
            href="mailto:myhbpl@gmail.com"
            className="shrink-0 bg-white text-primary font-semibold text-[14px] px-8 py-4 rounded-xl hover:bg-primary-light transition-colors whitespace-nowrap"
          >
            Contact Management
          </a>
        </div>
      </section>
    </div>
  );
}
