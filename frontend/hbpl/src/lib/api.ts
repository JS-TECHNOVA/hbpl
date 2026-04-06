const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Team {
  id: number;
  name: string;
  captain: string;
  description: string;
}

export interface Match {
  id: number;
  stage: string;
  match_type: "league" | "semi" | "final";
  date: string;        // "YYYY-MM-DD"
  time: string;        // "HH:MM" or ""
  venue: string;
  team1: string;
  team2: string;
  team1_score: string; // blank for upcoming
  team2_score: string;
  result: string;
  player_of_match: string;
  season: number;
}

export interface ManagementMember {
  id: number;
  name: string;
  role: string;
  description: string;
  email: string;
  image_url: string | null;
  order: number;
}

export interface GalleryImage {
  id: number;
  title: string;
  category: string;
  image_url: string | null;
}

export interface Volunteer {
  id: number;
  name: string;
  role: string;
  img: string; // public path, e.g. "/Subhash_-removebg-preview.png"
  image_url: string | null;
  order: number;
}

export interface TeamRegistrationData {
  team_name: string;
  captain_name: string;
  email: string;
  phone: string;
  player_count: number;
  message?: string;
}

export interface ExamRegistrationData {
  full_name: string;
  date_of_birth: string;
  phone: string;
  email?: string;
  school_name?: string;
  class_name?: string;
  address?: string;
  student_image?: File | null;
  signature_image?: File | null;
}

export interface ExamResultLookupData {
  roll_number: string;
  date_of_birth: string;
}

export interface ExamResult {
  full_name: string;
  roll_number: string;
  date_of_birth: string;
  school_name: string;
  class_name: string;
  result_status: "pending" | "published";
  marks_obtained: string | null;
  total_marks: string | null;
  rank: number | null;
  remarks: string;
  test_copy_url: string | null;
  result_file_url: string | null;
  admit_card_url: string | null;
  participation_certificate_url: string | null;
}

export interface ExamImportantDate {
  id: number;
  title: string;
  date: string;
  order: number;
}

export interface ExamSupportSchool {
  id: number;
  name: string;
  address: string;
  principal_name: string;
  contact_info: string;
  principal_image_url: string | null;
  order: number;
}

export interface ExamSyllabusItem {
  id: number;
  class_name: string;
  title: string;
  description: string;
  pdf_url: string | null;
  order: number;
}

export interface ExamSamplePaper {
  id: number;
  class_name: string;
  title: string;
  description: string;
  external_url: string;
  file_url: string | null;
  order: number;
}

export interface ExamCenterDetail {
  id: number;
  center_name: string;
  form_range: string;
  roll_range: string;
  extra_details: string;
  order: number;
}

export interface ExamFaq {
  id: number;
  question: string;
  answer: string;
  order: number;
}

export interface ExamTopper {
  id: number;
  student: number;
  student_name: string;
  school_name: string;
  class_name: string;
  marks_obtained: string | null;
  rank: number;
  highlight_text: string;
  student_image_url: string | null;
  order: number;
}

export interface ExamPortalContent {
  important_dates: ExamImportantDate[];
  support_schools: ExamSupportSchool[];
  syllabus_items: ExamSyllabusItem[];
  sample_papers: ExamSamplePaper[];
  center_details: ExamCenterDetail[];
  faqs: ExamFaq[];
  toppers: ExamTopper[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const fetchTeams = (): Promise<Team[]> =>
  get<Team[]>("/api/teams/");

export const fetchMatches = (season?: number): Promise<Match[]> =>
  get<Match[]>(season != null ? `/api/matches/?season=${season}` : "/api/matches/");

export const fetchManagement = (): Promise<ManagementMember[]> =>
  get<ManagementMember[]>("/api/management/");

export const fetchGallery = (): Promise<GalleryImage[]> =>
  get<GalleryImage[]>("/api/gallery/");

export const fetchVolunteers = (): Promise<Volunteer[]> =>
  get<Volunteer[]>("/api/volunteers/");

export const submitRegistration = async (data: TeamRegistrationData): Promise<void> => {
  const res = await fetch(`${API_URL}/api/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(body) || "Registration failed");
  }
};

export const submitExamRegistration = async (data: ExamRegistrationData): Promise<void> => {
  const formData = new FormData();
  formData.append("full_name", data.full_name);
  formData.append("date_of_birth", data.date_of_birth);
  formData.append("phone", data.phone);
  formData.append("email", data.email ?? "");
  formData.append("school_name", data.school_name ?? "");
  formData.append("class_name", data.class_name ?? "");
  formData.append("address", data.address ?? "");
  if (data.student_image) formData.append("student_image", data.student_image);
  if (data.signature_image) formData.append("signature_image", data.signature_image);

  const res = await fetch(`${API_URL}/api/exam/registrations/`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(body) || "Exam registration failed");
  }
};

export const lookupExamResult = async (data: ExamResultLookupData): Promise<ExamResult> => {
  const res = await fetch(`${API_URL}/api/exam/results/lookup/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body?.detail === "string" ? body.detail : "Result lookup failed");
  }

  return body as ExamResult;
};

export const fetchExamPortalContent = (): Promise<ExamPortalContent> =>
  get<ExamPortalContent>("/api/exam/portal/content/");

// ── Admin types ───────────────────────────────────────────────────────────────

export interface AdminUser {
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  user_permissions: string[];
}

export interface AdminExamRegistration {
  id: number;
  full_name: string;
  roll_number: string;
  date_of_birth: string;
  phone: string;
  email: string;
  school_name: string;
  class_name: string;
  address: string;
  notes: string;
  student_image_url: string | null;
  signature_image_url: string | null;
  result_status: "pending" | "published";
  marks_obtained: string | null;
  total_marks: string;
  rank: number | null;
  remarks: string;
  test_copy_url: string | null;
  result_file_url: string | null;
  admit_card_url: string | null;
  participation_certificate_url: string | null;
  publish_admit_card: boolean;
  publish_participation_certificate: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminExamImportantDate {
  id: number;
  title: string;
  date: string;
  order: number;
}

export interface AdminExamSupportSchool {
  id: number;
  name: string;
  address: string;
  principal_name: string;
  contact_info: string;
  principal_image_url: string | null;
  order: number;
}

export interface AdminExamSyllabusItem {
  id: number;
  class_name: string;
  title: string;
  description: string;
  pdf_url: string | null;
  order: number;
}

export interface AdminExamSamplePaper {
  id: number;
  class_name: string;
  title: string;
  description: string;
  external_url: string;
  file_url: string | null;
  order: number;
}

export interface AdminExamCenterDetail {
  id: number;
  center_name: string;
  form_range: string;
  roll_range: string;
  extra_details: string;
  order: number;
}

export interface AdminExamFaq {
  id: number;
  question: string;
  answer: string;
  order: number;
}

export interface AdminExamTopper {
  id: number;
  student: number;
  student_name: string;
  rank: number;
  highlight_text: string;
  order: number;
}

// ── Admin API helpers ─────────────────────────────────────────────────────────

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Token ${token}` };
}

export const adminLogin = async (
  username: string,
  password: string,
): Promise<{ token: string; username: string; email: string }> => {
  const res = await fetch(`${API_URL}/api/admin/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body?.detail === "string" ? body.detail : "Login failed");
  }
  return body as { token: string; username: string; email: string };
};

export const adminMe = async (token: string): Promise<AdminUser> => {
  const res = await fetch(`${API_URL}/api/admin/me/`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json() as Promise<AdminUser>;
};

export const adminFetchStudents = async (token: string): Promise<AdminExamRegistration[]> => {
  const res = await fetch(`${API_URL}/api/admin/exam/registrations/`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json() as Promise<AdminExamRegistration[]>;
};

export const adminUpdateStudent = async (
  token: string,
  id: number,
  data: FormData,
): Promise<AdminExamRegistration> => {
  const res = await fetch(`${API_URL}/api/admin/exam/registrations/${id}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: data,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(JSON.stringify(body) || "Update failed");
  }
  return body as AdminExamRegistration;
};

export const adminGenerateStudentDocs = async (
  token: string,
  id: number,
  type: "admit" | "certificate" | "both",
): Promise<AdminExamRegistration> => {
  const res = await fetch(`${API_URL}/api/admin/exam/registrations/${id}/generate-docs/`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(JSON.stringify(body) || "Document generation failed");
  }
  return body as AdminExamRegistration;
};

// ── Admin CRUD helpers (website content) ─────────────────────────────────────

export interface AdminVolunteer {
  id: number;
  name: string;
  role: string;
  img: string;
  image_url: string | null;
  order: number;
}

export interface AdminGalleryImage {
  id: number;
  title: string;
  category: string;
  image_url: string | null;
}

export interface AdminManagementMember {
  id: number;
  name: string;
  role: string;
  description: string;
  email: string;
  image_url: string | null;
  order: number;
}

export interface AdminTeam {
  id: number;
  name: string;
  captain: string;
  description: string;
}

export interface AdminMatch {
  id: number;
  stage: string;
  match_type: "league" | "semi" | "final";
  date: string;
  time: string;
  venue: string;
  team1: string;
  team2: string;
  team1_score: string;
  team2_score: string;
  result: string;
  player_of_match: string;
  season: number;
}

async function adminGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

async function adminPost<T>(token: string, path: string, body: FormData | object): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: isForm ? authHeaders(token) : { ...authHeaders(token), "Content-Type": "application/json" },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data) || "Create failed");
  return data as T;
}

async function adminPatch<T>(token: string, path: string, body: FormData | object): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: isForm ? authHeaders(token) : { ...authHeaders(token), "Content-Type": "application/json" },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data) || "Update failed");
  return data as T;
}

async function adminDelete(token: string, path: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers: authHeaders(token) });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
}

// Volunteers
export const adminFetchVolunteers = (t: string) => adminGet<AdminVolunteer[]>(t, "/api/admin/volunteers/");
export const adminCreateVolunteer = (t: string, d: FormData) => adminPost<AdminVolunteer>(t, "/api/admin/volunteers/", d);
export const adminUpdateVolunteer = (t: string, id: number, d: FormData | object) => adminPatch<AdminVolunteer>(t, `/api/admin/volunteers/${id}/`, d);
export const adminDeleteVolunteer = (t: string, id: number) => adminDelete(t, `/api/admin/volunteers/${id}/`);

// Gallery
export const adminFetchGallery = (t: string) => adminGet<AdminGalleryImage[]>(t, "/api/admin/gallery/");
export const adminCreateGallery = (t: string, d: FormData) => adminPost<AdminGalleryImage>(t, "/api/admin/gallery/", d);
export const adminUpdateGallery = (t: string, id: number, d: FormData | object) => adminPatch<AdminGalleryImage>(t, `/api/admin/gallery/${id}/`, d);
export const adminDeleteGallery = (t: string, id: number) => adminDelete(t, `/api/admin/gallery/${id}/`);

// Management
export const adminFetchManagement = (t: string) => adminGet<AdminManagementMember[]>(t, "/api/admin/management/");
export const adminCreateManagement = (t: string, d: FormData) => adminPost<AdminManagementMember>(t, "/api/admin/management/", d);
export const adminUpdateManagement = (t: string, id: number, d: FormData | object) => adminPatch<AdminManagementMember>(t, `/api/admin/management/${id}/`, d);
export const adminDeleteManagement = (t: string, id: number) => adminDelete(t, `/api/admin/management/${id}/`);

// Teams
export const adminFetchTeams = (t: string) => adminGet<AdminTeam[]>(t, "/api/admin/teams/");
export const adminCreateTeam = (t: string, d: object) => adminPost<AdminTeam>(t, "/api/admin/teams/", d);
export const adminUpdateTeam = (t: string, id: number, d: object) => adminPatch<AdminTeam>(t, `/api/admin/teams/${id}/`, d);
export const adminDeleteTeam = (t: string, id: number) => adminDelete(t, `/api/admin/teams/${id}/`);

// Matches
export const adminFetchMatches = (t: string) => adminGet<AdminMatch[]>(t, "/api/admin/matches/");
export const adminCreateMatch = (t: string, d: object) => adminPost<AdminMatch>(t, "/api/admin/matches/", d);
export const adminUpdateMatch = (t: string, id: number, d: object) => adminPatch<AdminMatch>(t, `/api/admin/matches/${id}/`, d);
export const adminDeleteMatch = (t: string, id: number) => adminDelete(t, `/api/admin/matches/${id}/`);

// Exam portal content
export const adminFetchExamImportantDates = (t: string) => adminGet<AdminExamImportantDate[]>(t, "/api/admin/exam/important-dates/");
export const adminCreateExamImportantDate = (t: string, d: object) => adminPost<AdminExamImportantDate>(t, "/api/admin/exam/important-dates/", d);
export const adminUpdateExamImportantDate = (t: string, id: number, d: object) => adminPatch<AdminExamImportantDate>(t, `/api/admin/exam/important-dates/${id}/`, d);
export const adminDeleteExamImportantDate = (t: string, id: number) => adminDelete(t, `/api/admin/exam/important-dates/${id}/`);

export const adminFetchExamSupportSchools = (t: string) => adminGet<AdminExamSupportSchool[]>(t, "/api/admin/exam/support-schools/");
export const adminCreateExamSupportSchool = (t: string, d: FormData) => adminPost<AdminExamSupportSchool>(t, "/api/admin/exam/support-schools/", d);
export const adminUpdateExamSupportSchool = (t: string, id: number, d: FormData | object) => adminPatch<AdminExamSupportSchool>(t, `/api/admin/exam/support-schools/${id}/`, d);
export const adminDeleteExamSupportSchool = (t: string, id: number) => adminDelete(t, `/api/admin/exam/support-schools/${id}/`);

export const adminFetchExamSyllabus = (t: string) => adminGet<AdminExamSyllabusItem[]>(t, "/api/admin/exam/syllabus/");
export const adminCreateExamSyllabus = (t: string, d: FormData | object) => adminPost<AdminExamSyllabusItem>(t, "/api/admin/exam/syllabus/", d);
export const adminUpdateExamSyllabus = (t: string, id: number, d: FormData | object) => adminPatch<AdminExamSyllabusItem>(t, `/api/admin/exam/syllabus/${id}/`, d);
export const adminDeleteExamSyllabus = (t: string, id: number) => adminDelete(t, `/api/admin/exam/syllabus/${id}/`);

export const adminFetchExamSamplePapers = (t: string) => adminGet<AdminExamSamplePaper[]>(t, "/api/admin/exam/sample-papers/");
export const adminCreateExamSamplePaper = (t: string, d: FormData | object) => adminPost<AdminExamSamplePaper>(t, "/api/admin/exam/sample-papers/", d);
export const adminUpdateExamSamplePaper = (t: string, id: number, d: FormData | object) => adminPatch<AdminExamSamplePaper>(t, `/api/admin/exam/sample-papers/${id}/`, d);
export const adminDeleteExamSamplePaper = (t: string, id: number) => adminDelete(t, `/api/admin/exam/sample-papers/${id}/`);

export const adminFetchExamCenters = (t: string) => adminGet<AdminExamCenterDetail[]>(t, "/api/admin/exam/centers/");
export const adminCreateExamCenter = (t: string, d: object) => adminPost<AdminExamCenterDetail>(t, "/api/admin/exam/centers/", d);
export const adminUpdateExamCenter = (t: string, id: number, d: object) => adminPatch<AdminExamCenterDetail>(t, `/api/admin/exam/centers/${id}/`, d);
export const adminDeleteExamCenter = (t: string, id: number) => adminDelete(t, `/api/admin/exam/centers/${id}/`);

export const adminFetchExamFaqs = (t: string) => adminGet<AdminExamFaq[]>(t, "/api/admin/exam/faqs/");
export const adminCreateExamFaq = (t: string, d: object) => adminPost<AdminExamFaq>(t, "/api/admin/exam/faqs/", d);
export const adminUpdateExamFaq = (t: string, id: number, d: object) => adminPatch<AdminExamFaq>(t, `/api/admin/exam/faqs/${id}/`, d);
export const adminDeleteExamFaq = (t: string, id: number) => adminDelete(t, `/api/admin/exam/faqs/${id}/`);

export const adminFetchExamToppers = (t: string) => adminGet<AdminExamTopper[]>(t, "/api/admin/exam/toppers/");
export const adminCreateExamTopper = (t: string, d: object) => adminPost<AdminExamTopper>(t, "/api/admin/exam/toppers/", d);
export const adminUpdateExamTopper = (t: string, id: number, d: object) => adminPatch<AdminExamTopper>(t, `/api/admin/exam/toppers/${id}/`, d);
export const adminDeleteExamTopper = (t: string, id: number) => adminDelete(t, `/api/admin/exam/toppers/${id}/`);
