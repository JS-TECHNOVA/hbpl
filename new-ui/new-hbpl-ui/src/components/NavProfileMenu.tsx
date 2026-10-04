"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchStudentProfile, StudentAccount } from "@/src/lib/exams-api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

type AccountMenuState = {
  student: StudentAccount | null;
  staff: { username: string; email: string; is_staff: boolean; is_superuser: boolean } | null;
};

export function NavProfileMenu() {
  const [account, setAccount] = useState<AccountMenuState>({ student: null, staff: null });
  const menuRef = useRef<HTMLDetailsElement>(null);
  const isLoggedIn = Boolean(account.student || account.staff);
  const displayName = account.student?.full_name || account.staff?.username || "Account";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  useEffect(() => {
    let active = true;
    const studentToken = localStorage.getItem("student_token");
    const adminToken = localStorage.getItem("admin_token");

    Promise.all([
      studentToken
        ? fetchStudentProfile(studentToken).then((student) => ({ student, error: false })).catch(() => ({ student: null, error: true }))
        : Promise.resolve({ student: null, error: false }),
      adminToken
        ? fetch(`${API}/api/admin/me/`, { headers: { Authorization: `Token ${adminToken}` } })
            .then((response) => response.ok ? response.json() : Promise.reject())
            .then((staff) => ({ staff, error: false }))
            .catch(() => ({ staff: null, error: true }))
        : Promise.resolve({ staff: null, error: false }),
    ]).then(([studentResult, staffResult]) => {
      if (!active) return;
      if (studentResult.error) localStorage.removeItem("student_token");
      if (staffResult.error) localStorage.removeItem("admin_token");
      if (staffResult.staff && adminToken && !studentResult.student) {
        // Both portals use the same DRF user/token; let staff use their student profile too.
        localStorage.setItem("student_token", adminToken);
        fetchStudentProfile(adminToken)
          .then((student) => { if (active) setAccount({ student, staff: staffResult.staff }); })
          .catch(() => { if (active) setAccount({ student: null, staff: staffResult.staff }); });
        return;
      }
      setAccount({ student: studentResult.student, staff: staffResult.staff });
    });

    return () => { active = false; };
  }, []);

  function logout() {
    localStorage.removeItem("student_token");
    localStorage.removeItem("admin_token");
    setAccount({ student: null, staff: null });
    if (menuRef.current) menuRef.current.open = false;
  }

  return (
    <details ref={menuRef} className="group relative">
      <summary
        aria-label={isLoggedIn ? `Account menu for ${displayName}` : "Open account menu"}
        className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full bg-[#101f62] text-white shadow-sm transition hover:bg-[#192e7c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#101f62] [&::-webkit-details-marker]:hidden"
      >
        {isLoggedIn ? <span className="text-[12px] font-bold">{initials}</span> : (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="8" r="3.5" />
            <path strokeLinecap="round" d="M4.8 20c.7-3.6 3.2-5.5 7.2-5.5s6.5 1.9 7.2 5.5" />
          </svg>
        )}
      </summary>

      <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#d9e2f0] bg-white text-[#34445d] shadow-[0_18px_50px_rgba(20,38,73,.16)]">
        {isLoggedIn ? (
          <>
            <div className="flex items-center gap-3 border-b border-[#e7edf5] px-5 py-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#101f62] text-[12px] font-bold text-white">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-[#14244b]">{displayName}</p>
                <p className="truncate text-[12px] text-[#718096]">{account.student?.email || account.staff?.email}</p>
              </div>
            </div>
            <nav aria-label="Account links" className="p-2">
              {account.student && <>
                <MenuLink href="/exams/dashboard">Student dashboard</MenuLink>
                <MenuLink href="/exams/dashboard?section=profile">Profile</MenuLink>
                <MenuLink href="/exams/dashboard?section=enrollments">My enrollments</MenuLink>
                <MenuLink href="/exams/results">Exam results</MenuLink>
              </>}
              {account.staff && (account.staff.is_staff || account.staff.is_superuser) && <MenuLink href="/staff">Staff dashboard</MenuLink>}
            </nav>
            <div className="border-t border-[#e7edf5] p-2">
              <button type="button" onClick={logout} className="w-full rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-[#b42318] transition hover:bg-red-50">Log out</button>
            </div>
          </>
        ) : (
          <nav aria-label="Account links" className="p-2">
            <MenuLink href="/exams/login">Login</MenuLink>
            <MenuLink href="/exams/account/register">Register</MenuLink>
          </nav>
        )}
      </div>
    </details>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="block rounded-lg px-3 py-2.5 text-[13px] font-medium transition hover:bg-[#f2f6fc] hover:text-[#101f62]">{children}</Link>;
}
