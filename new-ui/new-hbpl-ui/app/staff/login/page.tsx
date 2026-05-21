"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

export default function StaffLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("admin_token"));
  }, []);

  function handleLogout() {
    localStorage.removeItem("admin_token");
    setIsLoggedIn(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      localStorage.setItem("admin_token", data.token);
      router.push("/staff");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-heading font-extrabold text-white text-[28px]">HBPL Staff</p>
            <p className="text-white/40 text-[13px] mt-1">You are already signed in</p>
          </div>

          <div className="bg-[#1e293b] rounded-3xl p-7 flex flex-col gap-3 border border-white/8">
            <Link
              href="/staff"
              className="bg-primary hover:bg-primary-dark text-white font-semibold text-[15px] py-3 rounded-xl transition-colors text-center"
            >
              Go to Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-semibold text-[14px] py-3 rounded-xl transition-colors border border-white/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-heading font-extrabold text-white text-[28px]">HBPL Staff</p>
          <p className="text-white/40 text-[13px] mt-1">Sign in to manage content</p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#1e293b] rounded-3xl p-7 flex flex-col gap-4 border border-white/8">
          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-[12px] font-semibold uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="bg-[#0f172a] border border-white/15 rounded-xl px-4 py-3 text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
              placeholder="admin"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-[12px] font-semibold uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-[#0f172a] border border-white/15 rounded-xl px-4 py-3 text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-[13px] bg-red-400/10 px-4 py-2 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-primary hover:bg-primary-dark text-white font-semibold text-[15px] py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
