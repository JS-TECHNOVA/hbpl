"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ExaminationSession, fetchApplicationHistory, fetchExamSessions, fetchEligibleExams,
  createCashfreePaymentOrder, downloadStudentApplicationForm, fetchMyResults, fetchSchoolSuggestions, fetchStudentProfile, LegacyApplication,
  ManagedExam, SchoolSuggestion, StudentAccount, StudentApplication, StudentResult,
  updateStudentProfile,
} from "@/src/lib/exams-api";
import { openCashfreeCheckout } from "@/src/lib/cashfree-checkout";

type DashboardSection = "overview" | "profile" | "exams" | "enrollments" | "results";
type ProfileForm = Pick<StudentAccount, "full_name" | "gender" | "class_name" | "phone" | "father_name" | "mother_name" | "date_of_birth" | "school_name" | "address">;
const classOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));

const navItems: { id: DashboardSection; label: string; marker: string }[] = [
  { id: "overview", label: "Overview", marker: "01" },
  { id: "profile", label: "My profile", marker: "02" },
  { id: "exams", label: "Available exams", marker: "03" },
  { id: "enrollments", label: "My enrollments", marker: "04" },
  { id: "results", label: "Results", marker: "05" },
];

const inputClass = "mt-1.5 w-full rounded-xl border border-[#d9dcd9] bg-white px-3.5 py-3 text-[12px] text-[#243247] outline-none transition placeholder:text-[#a0a7af] focus:border-[#a36d17] focus:ring-2 focus:ring-[#a36d17]/15";
const labelClass = "block text-[10px] font-bold uppercase tracking-wide text-[#778293]";

export default function StudentDashboardPage() {
  const [profile, setProfile] = useState<StudentAccount | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>({ full_name: "", gender: "", class_name: "", phone: "", father_name: "", mother_name: "", date_of_birth: "", school_name: "", address: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [signaturePreview, setSignaturePreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [sessions, setSessions] = useState<ExaminationSession[]>([]);
  const [schools, setSchools] = useState<SchoolSuggestion[]>([]);
  const [eligibleExams, setEligibleExams] = useState<ManagedExam[]>([]);
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [legacyApplications, setLegacyApplications] = useState<LegacyApplication[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [section, setSection] = useState<DashboardSection>("overview");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const studentToken = localStorage.getItem("student_token") ?? "";
    if (!studentToken) { window.location.href = "/exams/login"; return; }
    Promise.all([
      fetchStudentProfile(studentToken), fetchExamSessions(), fetchEligibleExams(studentToken),
      fetchApplicationHistory(studentToken), fetchMyResults(studentToken), fetchSchoolSuggestions(),
    ]).then(([student, availableSessions, eligible, history, studentResults, schoolSuggestions]) => {
      setProfile(student);
      setProfileForm({ full_name: student.full_name, gender: student.gender ?? "", class_name: student.class_name, phone: student.phone, father_name: student.father_name, mother_name: student.mother_name, date_of_birth: student.date_of_birth ?? "", school_name: student.school_name, address: student.address });
      setPhotoPreview(student.photo_url ?? "");
      setSignaturePreview(student.signature_url ?? "");
      const query = new URLSearchParams(window.location.search);
      if (query.get("section") === "profile") setSection("profile");
      setSessions(availableSessions);
      setEligibleExams(eligible);
      setApplications(history.applications);
      setLegacyApplications(history.legacy_registrations);
      setResults(studentResults);
      setSchools(schoolSuggestions);
    }).catch((err) => setError(err instanceof Error ? err.message : "Unable to load your dashboard."))
      .finally(() => setLoading(false));
  }, []);

  const session = sessions.find((item) => String(item.id) === sessionFilter);
  const exams = eligibleExams.filter((exam) => sessionFilter === "all" || exam.session?.id === session?.id);
  const enrollments = applications.filter((application) => sessionFilter === "all" || application.exam.session?.id === session?.id);
  const visibleResults = results.filter((result) => sessionFilter === "all" || result.session_id === session?.id || result.session === session?.name);
  const oldRecords = sessionFilter === "all" ? legacyApplications : [];
  const awaitingReview = enrollments.filter((application) => ["submitted", "under_review", "resubmitted"].includes(application.status)).length;
  const initials = (profile?.full_name || "Student").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  async function saveProfile() {
    const studentToken = localStorage.getItem("student_token") ?? "";
    setSaving(true); setNotice(""); setError("");
    try {
      const returnTo = new URLSearchParams(window.location.search).get("return_to") ?? "";
      if (returnTo.startsWith("/exams/") && (!profileForm.full_name.trim() || !profileForm.gender || !profileForm.phone || !profileForm.date_of_birth || !profileForm.father_name || !profileForm.school_name || !profileForm.class_name || !profileForm.address || (!photo && !profile?.photo_url) || (!signature && !profile?.signature_url))) {
        throw new Error("Complete the required profile details, photo, and signature before continuing to apply.");
      }
      const updated = await updateStudentProfile(studentToken, profileForm, photo, signature);
      setProfile(updated);
      setPhoto(null); setSignature(null);
      setPhotoPreview(updated.photo_url ?? ""); setSignaturePreview(updated.signature_url ?? "");
      setEligibleExams(await fetchEligibleExams(studentToken));
      setNotice("Your profile has been saved.");
      if (returnTo.startsWith("/exams/") && !returnTo.startsWith("//")) window.location.href = returnTo;
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save your profile."); }
    finally { setSaving(false); }
  }

  function logout() { localStorage.removeItem("student_token"); window.location.href = "/exams"; }
  function setProfileField(key: keyof ProfileForm, value: string) { setProfileForm((current) => ({ ...current, [key]: value })); }

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f3f2ed] text-[13px] text-[#687486]">Loading your student workspace…</div>;
  if (error && !profile) return <div className="min-h-screen bg-[#f3f2ed] p-6"><div role="alert" className="mx-auto mt-16 max-w-lg rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{error}</div></div>;

  return <div className="min-h-screen bg-[#f3f2ed] text-[#172438] lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
    <aside className="bg-[#172438] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <div className="flex items-center gap-3 px-5 py-5 lg:px-6 lg:py-7">
        <Link href="/exams" aria-label="HBPL home" className="grid h-10 w-10 place-items-center rounded-xl bg-[#dfb75f] font-heading text-[13px] font-black text-[#172438]">H</Link>
        <div><p className="font-heading text-[13px] font-extrabold tracking-wide">HBPL</p><p className="text-[9px] uppercase tracking-[.17em] text-white/45">Student portal</p></div>
      </div>
      <div className="hidden px-5 pb-6 lg:block lg:px-6">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#dfb75f] font-heading text-[13px] font-extrabold text-[#172438]">{initials}</div>
          <div className="min-w-0"><p className="truncate text-[12px] font-bold">{profile?.full_name || "Student"}</p><p className="truncate text-[10px] text-white/45">{profile?.email}</p></div>
        </div>
      </div>
      <nav aria-label="Student dashboard" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-4 lg:pb-0">
        {navItems.map((item) => <button key={item.id} onClick={() => setSection(item.id)} aria-current={section === item.id ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold transition lg:w-full ${section === item.id ? "bg-white text-[#172438] shadow-sm" : "text-white/60 hover:bg-white/[.07] hover:text-white"}`}>
          <span className={`grid h-7 w-7 place-items-center rounded-lg text-[9px] font-extrabold ${section === item.id ? "bg-[#f5e9ca] text-[#8c5b10]" : "bg-white/[.08] text-white/55"}`}>{item.marker}</span>{item.label}
          {item.id === "enrollments" && enrollments.length > 0 && <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] ${section === item.id ? "bg-[#f5e9ca] text-[#8c5b10]" : "bg-white/10 text-white/65"}`}>{enrollments.length}</span>}
        </button>)}
      </nav>
      <div className="mt-auto hidden border-t border-white/10 px-5 py-5 lg:block lg:px-6"><p className="mb-3 text-[10px] leading-5 text-white/45">Your exam history and documents stay together in this account.</p><button onClick={logout} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[11px] font-semibold text-white/65 transition hover:bg-white/[.07] hover:text-white">Sign out <span aria-hidden="true">↗</span></button></div>
    </aside>

    <div className="min-w-0">
      <header className="sticky top-0 z-10 border-b border-[#e3e2dc] bg-[#faf9f6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-10">
          <div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9b6d20]">Student workspace</p><h1 className="mt-0.5 font-heading text-[15px] font-extrabold">{navItems.find((item) => item.id === section)?.label}</h1></div>
          <div className="flex items-center gap-2"><label className="hidden items-center gap-2 text-[10px] font-semibold text-[#778293] sm:flex">SESSION<select aria-label="Filter by examination session" value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)} className="rounded-lg border border-[#deded8] bg-white px-2.5 py-2 text-[11px] text-[#243247]"><option value="all">All sessions</option>{sessions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button onClick={logout} className="rounded-lg border border-[#deded8] px-3 py-2 text-[10px] font-semibold text-[#596678] transition hover:bg-white lg:hidden">Sign out</button></div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] space-y-6 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <label className="flex items-center justify-between gap-3 text-[10px] font-semibold text-[#778293] sm:hidden">Filter by session<select value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)} className="min-w-0 rounded-lg border border-[#deded8] bg-white px-2.5 py-2 text-[11px] text-[#243247]"><option value="all">All sessions</option>{sessions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">{error}</div>}

        {section === "overview" && <>
          <section className="relative isolate overflow-hidden rounded-[26px] bg-[#1b2b43] px-6 py-7 text-white sm:px-9 sm:py-9">
            <div aria-hidden="true" className="absolute -right-10 -top-24 -z-10 h-72 w-72 rounded-full border border-white/[.08]"/><div aria-hidden="true" className="absolute -right-2 -top-16 -z-10 h-52 w-52 rounded-full border border-[#dfb75f]/20"/>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#dfb75f]">Your exam journey</p><h2 className="mt-3 max-w-2xl font-heading text-[27px] font-extrabold tracking-tight sm:text-[34px]">Good to see you, {profile?.full_name?.split(" ")[0] || "Student"}.</h2><p className="mt-2 max-w-xl text-[12px] leading-6 text-white/60">Find your next examination, keep track of each enrollment, and access documents as soon as they are issued.</p><button onClick={() => setSection("exams")} className="mt-5 inline-flex items-center gap-3 rounded-xl bg-[#dfb75f] px-4 py-3 text-[11px] font-extrabold text-[#172438] transition hover:bg-[#edca7a]">Explore available exams <span aria-hidden="true">→</span></button>
          </section>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
            { label: "Exam enrollments", value: enrollments.length + oldRecords.length, detail: "Across your exam history" },
            { label: "Awaiting review", value: awaitingReview, detail: "Applications in progress" },
            { label: "Admit cards", value: enrollments.filter((item) => Boolean(item.admit_card_url)).length, detail: "Ready to download" },
            { label: "Published results", value: visibleResults.length, detail: "Results released" },
          ].map((stat, index) => <article key={stat.label} className="rounded-2xl border border-[#e3e2dc] bg-white p-4 sm:p-5"><div className="flex items-start justify-between"><p className="max-w-28 text-[10px] font-bold uppercase leading-4 tracking-[.1em] text-[#778293]">{stat.label}</p><span className={`h-2 w-2 rounded-full ${index === 1 ? "bg-[#dfb75f]" : index === 2 ? "bg-[#709a79]" : "bg-[#9aa7b5]"}`}/></div><p className="mt-3 font-heading text-[27px] font-extrabold">{stat.value}</p><p className="mt-1 text-[9px] text-[#9098a2]">{stat.detail}</p></article>)}</div>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.85fr)]">
            <section className="rounded-2xl border border-[#e3e2dc] bg-white"><div className="flex items-center justify-between gap-3 border-b border-[#efeee9] px-5 py-4"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9b6d20]">A good next step</p><h2 className="mt-1 font-heading text-[16px] font-extrabold">Exams you can apply for</h2></div><button onClick={() => setSection("exams")} className="text-[10px] font-bold text-[#8c5b10] hover:underline">See all →</button></div>{exams.length ? exams.slice(0, 3).map((exam) => <article key={exam.id} className="flex items-center justify-between gap-3 border-b border-[#f0efeb] px-5 py-4 last:border-0"><div className="min-w-0"><p className="truncate text-[12px] font-bold">{exam.name}</p><p className="mt-1 text-[10px] text-[#828c98]">{exam.session?.name ?? "Session not set"}{exam.exam_date ? ` · ${exam.exam_date}` : ""}</p></div><Link href={`/exams/${exam.slug}`} className="shrink-0 rounded-lg bg-[#172438] px-3 py-2.5 text-[9px] font-bold text-white hover:bg-[#273d5c]">View exam</Link></article>) : <p className="px-5 py-6 text-[11px] leading-5 text-[#778293]">No published exam currently matches your class and selected session.</p>}</section>
            <section className="rounded-2xl border border-[#e3e2dc] bg-white"><div className="flex items-center justify-between gap-3 border-b border-[#efeee9] px-5 py-4"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9b6d20]">Your activity</p><h2 className="mt-1 font-heading text-[16px] font-extrabold">Recent enrollments</h2></div><button onClick={() => setSection("enrollments")} className="text-[10px] font-bold text-[#8c5b10] hover:underline">View all →</button></div>{enrollments.length ? enrollments.slice(0, 3).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-[#f0efeb] px-5 py-4 last:border-0"><div className="min-w-0"><p className="truncate text-[11px] font-bold">{item.exam.name}</p><p className="mt-1 text-[9px] text-[#828c98]">{item.application_number ?? "Enrollment"} · {item.exam.session?.name ?? "Session"}</p></div><StatusPill status={item.status}/></div>) : <p className="px-5 py-6 text-[11px] leading-5 text-[#778293]">Your submitted exam applications will appear here.</p>}</section>
          </div>
        </>}

        {section === "profile" && <section className="max-w-4xl rounded-2xl border border-[#e3e2dc] bg-white">
          <div className="border-b border-[#efeee9] px-5 py-5 sm:px-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9b6d20]">Account details</p><h2 className="mt-1 font-heading text-[20px] font-extrabold">Student profile</h2><p className="mt-1 text-[11px] text-[#778293]">Keep these details up to date; exam eligibility uses your class.</p></div><span className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${profile?.email_verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{profile?.email_verified ? "Email verified" : "Email unverified"}</span></div><p className="mt-4 rounded-xl bg-[#f6f5f1] px-3.5 py-3 text-[11px] text-[#626f7e]">{profile?.email} <span className="ml-2 text-[#99a0a8]">Login email</span></p></div>
          <div className="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 sm:p-7">
            <label className={labelClass}>Student name<input required value={profileForm.full_name} onChange={(event) => setProfileField("full_name", event.target.value)} className={inputClass} autoComplete="name"/></label>
            <label className={labelClass}>Class<select required value={profileForm.class_name} onChange={(event) => setProfileField("class_name", event.target.value)} className={inputClass}><option value="" disabled>Select your class</option>{profileForm.class_name && !classOptions.includes(profileForm.class_name) && <option value={profileForm.class_name}>{profileForm.class_name}</option>}{classOptions.map((className) => <option key={className} value={className}>Class {className}</option>)}</select></label>
            <label className={labelClass}>Gender<select required value={profileForm.gender} onChange={(event) => setProfileField("gender", event.target.value)} className={inputClass}><option value="" disabled>Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
            <label className={labelClass}>Phone number<input required value={profileForm.phone} onChange={(event) => setProfileField("phone", event.target.value)} className={inputClass} autoComplete="tel"/></label>
            <label className={labelClass}>Date of birth<input required type="date" value={profileForm.date_of_birth ?? ""} onChange={(event) => setProfileField("date_of_birth", event.target.value)} className={inputClass}/></label>
            <label className={labelClass}>School name<input required list="profile-school-suggestions" value={profileForm.school_name} onChange={(event) => setProfileField("school_name", event.target.value)} className={inputClass} autoComplete="organization"/><datalist id="profile-school-suggestions">{schools.map((school) => <option key={school.id} value={school.name}/>)}</datalist></label>
            <label className={labelClass}>Father’s name<input required value={profileForm.father_name} onChange={(event) => setProfileField("father_name", event.target.value)} className={inputClass}/></label>
            <label className={labelClass}>Mother’s name<input value={profileForm.mother_name} onChange={(event) => setProfileField("mother_name", event.target.value)} className={inputClass}/></label>
            <label className={`${labelClass} sm:col-span-2`}>Address<textarea required rows={3} value={profileForm.address} onChange={(event) => setProfileField("address", event.target.value)} className={`${inputClass} resize-y`} placeholder="House, street, locality, city"/></label>
            <ProfileImageField label="Student photo" preview={photoPreview} maxSize="2 MB" onChange={(file) => { setPhoto(file); setPhotoPreview(file ? URL.createObjectURL(file) : profile?.photo_url ?? ""); }} onError={setImageError} />
            <ProfileImageField label="Signature" preview={signaturePreview} maxSize="1 MB" onChange={(file) => { setSignature(file); setSignaturePreview(file ? URL.createObjectURL(file) : profile?.signature_url ?? ""); }} onError={setImageError} />
            {imageError && <p role="alert" className="sm:col-span-2 text-[10px] font-semibold text-red-700">{imageError}</p>}
            {new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("return_to") && <p className="sm:col-span-2 rounded-xl bg-[#f7f1e5] px-4 py-3 text-[11px] leading-5 text-[#765416]">Complete your one-time profile and save. You’ll return to the examination page to apply.</p>}
            <div className="sm:col-span-2"><button onClick={saveProfile} disabled={saving} className="rounded-xl bg-[#172438] px-5 py-3 text-[11px] font-bold text-white transition hover:bg-[#273d5c] disabled:opacity-50">{saving ? "Saving profile…" : "Save profile"}</button>{notice && <p role="status" className="mt-3 text-[10px] font-semibold text-emerald-700">{notice}</p>}</div>
          </div>
        </section>}

        {section === "exams" && <section><div className="mb-5 rounded-2xl bg-[#1b2b43] px-6 py-6 text-white sm:px-8"><p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#dfb75f]">Your next opportunity</p><h2 className="mt-2 font-heading text-[22px] font-extrabold">Available examinations</h2><p className="mt-1 text-[11px] text-white/55">Only published exams matching your profile are listed.</p></div>
          {exams.length ? <div className="grid gap-4 xl:grid-cols-2">{exams.map((exam, index) => <article key={exam.id} className="flex min-h-48 flex-col rounded-2xl border border-[#e3e2dc] bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#9b6d20]">{exam.session?.name ?? "Session not set"}</p><h3 className="mt-2 font-heading text-[16px] font-extrabold">{exam.name}</h3><p className="mt-2 text-[10px] leading-5 text-[#778293]">{exam.subtitle || "View examination details and submit your enrollment."}</p></div><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f3f1eb] font-heading text-[11px] font-extrabold text-[#9b6d20]">{String(index + 1).padStart(2, "0")}</span></div><div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#efeee9] pt-4"><p className="text-[10px] text-[#778293]">{exam.exam_date ? `Exam date · ${exam.exam_date}` : "Date to be announced"}</p><Link href={`/exams/${exam.slug}`} className="rounded-lg bg-[#a36d17] px-4 py-2.5 text-[10px] font-bold text-white transition hover:bg-[#8c5b10]">View details & apply <span aria-hidden="true">→</span></Link></div></article>)}</div> : <EmptyState title="No eligible exams right now" detail={`When an exam is published for ${profileForm.class_name || "your class"}, it will appear here.`} action="Review my profile" onAction={() => setSection("profile")}/>}</section>}

        {section === "enrollments" && <section><SectionTitle eyebrow="Your exam history" title="My enrollments" detail="Each application, exam centre, admit card, and certificate is tracked separately."/>
          {enrollments.length ? <div className="space-y-4">{enrollments.map((application) => <ApplicationCard key={application.id} application={application}/>)}</div> : <EmptyState title="No enrollments for this session" detail="Browse available exams to start an application." action="Browse exams" onAction={() => setSection("exams")}/>}
          {oldRecords.length > 0 && <details className="mt-5 rounded-2xl border border-[#e3e2dc] bg-white px-5 py-4"><summary className="cursor-pointer text-[11px] font-bold text-[#596678]">Older registration records ({oldRecords.length})</summary><div className="mt-3 divide-y divide-[#efefeb]">{oldRecords.map((item) => <LegacyRow key={item.id} item={item}/>)}</div></details>}
        </section>}

        {section === "results" && <section><SectionTitle eyebrow="Your outcomes" title="Published results" detail="Results from your exams, organized by session."/>
          {visibleResults.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleResults.map((result) => <article key={result.id} className="rounded-2xl border border-[#e3e2dc] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#9b6d20]">{result.session}</p><h3 className="mt-2 font-heading text-[14px] font-extrabold">{result.exam}</h3><p className="mt-5 font-heading text-[28px] font-extrabold text-[#172438]">{result.obtained_marks ?? "—"}<span className="text-[13px] font-semibold text-[#8b949e]"> / {result.total_marks ?? "—"}</span></p><div className="mt-3 flex flex-wrap gap-2 text-[9px] text-[#687486]">{result.percentage && <span className="rounded-full bg-[#f3f1eb] px-2.5 py-1">{result.percentage}%</span>}{result.grade && <span className="rounded-full bg-[#f3f1eb] px-2.5 py-1">Grade {result.grade}</span>}{result.rank && <span className="rounded-full bg-[#f3f1eb] px-2.5 py-1">Rank {result.rank}</span>}</div></article>)}</div> : <EmptyState title="No results published yet" detail="Once results are released for your enrollments, you’ll find them here."/>}
        </section>}
      </main>
    </div>
  </div>;
}

function SectionTitle({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <div className="mb-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9b6d20]">{eyebrow}</p><h2 className="mt-1 font-heading text-[21px] font-extrabold">{title}</h2><p className="mt-1 text-[11px] text-[#778293]">{detail}</p></div>;
}

function ProfileImageField({ label, preview, maxSize, onChange, onError }: { label: string; preview: string; maxSize: string; onChange: (file: File | null) => void; onError: (message: string) => void }) {
  return <label className={labelClass}>
    {label}<span className="mt-1.5 flex items-center gap-3 rounded-xl border border-dashed border-[#cfd2d0] bg-[#faf9f6] p-3 normal-case tracking-normal">
      {preview ? <Image src={preview} width={64} height={64} unoptimized alt={`${label} preview`} className="h-16 w-16 rounded-lg border border-[#e3e2dc] bg-white object-cover" /> : <span className="grid h-16 w-16 place-items-center rounded-lg bg-[#efeee9] text-[18px] text-[#8c5b10]">＋</span>}
      <span className="min-w-0"><span className="block text-[11px] font-bold text-[#344258]">{preview ? "Replace file" : `Upload ${label.toLowerCase()}`}</span><span className="mt-1 block text-[9px] font-normal text-[#828c98]">JPG or PNG · max {maxSize}</span></span>
      <input type="file" required={!preview} accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
        const file = event.target.files?.[0] ?? null;
        if (file && file.size > (maxSize === "2 MB" ? 2 : 1) * 1024 * 1024) { event.target.value = ""; onError(`${label} file is too large. Choose an image up to ${maxSize}.`); return; }
        onError("");
        onChange(file);
      }} />
    </span>
  </label>;
}

function EmptyState({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) {
  return <div className="rounded-2xl border border-dashed border-[#cfd2d0] bg-white px-6 py-10 text-center"><p className="font-heading text-[15px] font-bold">{title}</p><p className="mx-auto mt-2 max-w-md text-[11px] leading-5 text-[#778293]">{detail}</p>{action && onAction && <button onClick={onAction} className="mt-4 rounded-lg bg-[#172438] px-4 py-2.5 text-[10px] font-bold text-white">{action}</button>}</div>;
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "approved" ? "bg-emerald-50 text-emerald-700" : status === "rejected" ? "bg-red-50 text-red-700" : "bg-[#f5f0e3] text-[#89651f]";
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold capitalize ${tone}`}>{status.replaceAll("_", " ")}</span>;
}

function LegacyRow({ item }: { item: LegacyApplication }) {
  const centre = [item.examination_center, item.center_address].filter(Boolean).join(" · ");
  return <article className="py-4 text-[11px]"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold text-[#172438]">{item.examination_name}<span className="ml-2 font-medium text-[#8791a0]">{item.roll_number}</span></p><p className="mt-1 text-[#687486]">{item.full_name} · Class {item.class_name || "—"}{item.school_name ? ` · ${item.school_name}` : ""}</p>{centre && <p className="mt-1 text-[#687486]">Centre: {centre}</p>}</div><div className="text-right"><StatusPill status={item.result_status}/>{item.marks_obtained !== null && <p className="mt-2 text-[#687486]">{item.marks_obtained} / {item.total_marks}{item.rank ? ` · Rank ${item.rank}` : ""}</p>}</div></div>{item.remarks && <p className="mt-2 text-[#687486]">{item.remarks}</p>}<div className="mt-3 flex flex-wrap gap-2">{item.admit_card_url && <a href={item.admit_card_url} target="_blank" rel="noreferrer" className="rounded-lg border border-[#d7e1ec] px-3 py-2 font-semibold text-[#315b82]">Admit card</a>}{item.result_url && <a href={item.result_url} target="_blank" rel="noreferrer" className="rounded-lg border border-[#e0e0d9] px-3 py-2 font-semibold text-[#687486]">Result sheet</a>}{item.certificate_url && <a href={item.certificate_url} target="_blank" rel="noreferrer" className="rounded-lg border border-[#d6e8dc] px-3 py-2 font-semibold text-[#287047]">Certificate</a>}</div></article>;
}

function ApplicationCard({ application }: { application: StudentApplication }) {
  const paymentStatus = application.payment_status ?? (Number(application.exam.fee) > 0 ? "unpaid" : "not_required");
  const [downloadingForm, setDownloadingForm] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [startingPayment, setStartingPayment] = useState(false);
  const centreAddress = application.centre && [application.centre.address, application.centre.city, application.centre.district, application.centre.state, application.centre.postal_code].filter(Boolean).join(", ");
  const canContinue = ["draft", "correction_required"].includes(application.status);
  async function downloadForm() {
    const token = localStorage.getItem("student_token");
    if (!token) return;
    setDownloadingForm(true);
    setDownloadError("");
    try {
      const blob = await downloadStudentApplicationForm(token, application.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `HBPL-${application.application_number ?? application.id}-application-form.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Unable to download the enrollment form.");
    } finally {
      setDownloadingForm(false);
    }
  }
  async function payExamFee() {
    const token = localStorage.getItem("student_token") ?? "";
    if (!token) return;
    setStartingPayment(true);
    setDownloadError("");
    try {
      const order = await createCashfreePaymentOrder(token, application.id);
      if (order.already_paid) {
        window.location.href = "/exams/dashboard?section=enrollments";
        return;
      }
      await openCashfreeCheckout(order);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Unable to start payment.");
    } finally {
      setStartingPayment(false);
    }
  }
  return <article className="rounded-2xl border border-[#e3e2dc] bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#9b6d20]">{application.exam.session?.name ?? "Session not set"}</p><h3 className="mt-1 font-heading text-[16px] font-extrabold">{application.exam.name}</h3><p className="mt-1 text-[10px] text-[#778293]">Enrollment no. {application.application_number ?? "Draft"}</p>{paymentStatus !== "not_required" && <p className="mt-1 text-[10px] font-semibold capitalize text-[#8c5b10]">Fee payment: {paymentStatus.replaceAll("_", " ")}</p>}</div><StatusPill status={application.status}/></div>
    <div className="mt-4 grid gap-3 border-y border-[#efefeb] py-4 sm:grid-cols-2"><div><p className="text-[9px] font-bold uppercase tracking-wide text-[#8791a0]">Exam centre</p><p className="mt-1 text-[11px] font-semibold">{application.centre?.name ?? "Not assigned yet"}</p>{application.centre && <p className="mt-1 text-[10px] leading-4 text-[#778293]">{centreAddress}</p>}</div><div><p className="text-[9px] font-bold uppercase tracking-wide text-[#8791a0]">Result</p><p className="mt-1 text-[11px] font-semibold">{application.result ? `${application.result.obtained_marks ?? "—"} / ${application.result.total_marks ?? "—"}${application.result.rank ? ` · Rank ${application.result.rank}` : ""}` : "Not published"}</p></div></div>
    {application.review_notes && <p className="mt-3 rounded-lg bg-[#fbf4e7] p-3 text-[10px] leading-4 text-[#77500e]">Staff note: {application.review_notes}</p>}
    <div className="mt-4 flex flex-wrap gap-2">{application.status === "draft" && Number(application.exam.fee) > 0 && paymentStatus !== "paid" && <button type="button" onClick={payExamFee} disabled={startingPayment} className="rounded-lg bg-[#a36d17] px-3.5 py-2.5 text-[10px] font-bold text-white disabled:opacity-60">{startingPayment ? "Opening secure checkout..." : paymentStatus === "unpaid" ? `Pay ₹${Number(application.exam.fee).toLocaleString("en-IN")}` : "Continue payment"}</button>}{application.status === "draft" && paymentStatus === "paid" && application.payment_order_id && <Link href={`/exams/payment/return?order_id=${encodeURIComponent(application.payment_order_id)}`} className="rounded-lg bg-emerald-700 px-3.5 py-2.5 text-[10px] font-bold text-white">Confirm enrollment</Link>}{application.application_number && <button type="button" onClick={downloadForm} disabled={downloadingForm} className="rounded-lg border border-[#d7e1ec] bg-[#f7fafc] px-3.5 py-2.5 text-[10px] font-bold text-[#315b82] disabled:opacity-60">{downloadingForm ? "Preparing form..." : "Download enrollment form"}</button>}{canContinue && paymentStatus !== "paid" && <Link href={`/exams/register?exam=${application.exam.id}&application=${application.id}`} className="rounded-lg bg-[#172438] px-3.5 py-2.5 text-[10px] font-bold text-white">{application.status === "draft" ? "Edit enrollment" : "Correct application"}</Link>}{application.admit_card_url && <a href={application.admit_card_url} target="_blank" rel="noreferrer" className="rounded-lg border border-[#d7e1ec] bg-[#f7fafc] px-3.5 py-2.5 text-[10px] font-bold text-[#315b82]">Download this exam’s admit card</a>}{application.certificate_url && <a href={application.certificate_url} target="_blank" rel="noreferrer" className="rounded-lg border border-[#d6e8dc] bg-[#f6fbf7] px-3.5 py-2.5 text-[10px] font-bold text-[#287047]">Download certificate</a>}</div>{downloadError && <p role="alert" className="mt-2 text-[10px] text-red-700">{downloadError}</p>}
  </article>;
}
