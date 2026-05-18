"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";
export function token() {
  return typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : "";
}

interface NavItem { href: string; label: string; exact?: boolean }
interface NavSection { section: string; items: NavItem[] }

const NAV: NavSection[] = [
  {
    section: "Overview",
    items: [{ href: "/staff", label: "Dashboard", exact: true }],
  },
  {
    section: "Cricket",
    items: [
      { href: "/staff/tournaments", label: "Tournaments" },
      { href: "/staff/cricket-teams", label: "Teams & Players" },
      { href: "/staff/matches", label: "All Matches" },
    ],
  },
  {
    section: "Exam",
    items: [
      { href: "/staff/exam-students", label: "Students" },
      { href: "/staff/exam-portal", label: "Portal Content" },
    ],
  },
  {
    section: "Content",
    items: [
      { href: "/staff/volunteers", label: "Volunteers" },
      { href: "/staff/gallery", label: "Gallery" },
      { href: "/staff/management", label: "Management" },
      { href: "/staff/news-ticker", label: "News Ticker" },
    ],
  },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ username: string } | null>(null);

  const isLogin = pathname === "/staff/login";

  useEffect(() => {
    if (isLogin) { setReady(true); return; }
    const t = token();
    if (!t) { router.replace("/staff/login"); return; }
    fetch(`${API}/api/admin/me/`, { headers: { Authorization: `Token ${t}` } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => { setUser(d); setReady(true); })
      .catch(() => { localStorage.removeItem("admin_token"); router.replace("/staff/login"); });
  }, [isLogin]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isLogin) return <>{children}</>;

  function logout() {
    localStorage.removeItem("admin_token");
    router.push("/staff/login");
  }

  return (
    <div className="flex min-h-screen bg-[#f1f5f9]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-[#0f172a] flex flex-col min-h-screen sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/8">
          <p className="font-heading font-extrabold text-white text-[16px]">HBPL Staff</p>
          <p className="text-white/30 text-[11px] mt-0.5 truncate">{user?.username ?? "admin"}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-5">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="text-white/25 text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5">
                {group.section}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-primary text-white"
                          : "text-white/50 hover:text-white hover:bg-white/8"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/8">
          <Link href="/" className="block px-3 py-2 text-white/40 hover:text-white text-[12px] rounded-lg hover:bg-white/8 transition-colors">
            ← Back to site
          </Link>
          <button onClick={logout} className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 text-[12px] rounded-lg hover:bg-white/8 transition-colors mt-0.5">
            Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-8">
        {children}
      </main>
    </div>
  );
}
