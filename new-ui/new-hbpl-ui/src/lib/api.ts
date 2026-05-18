/**
 * HBPL API client — typed wrappers around the Django REST backend.
 * Base URL is controlled by NEXT_PUBLIC_API_URL (.env.local).
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Team {
  id: number;
  team_name: string;
  captain_name: string;
  address: string;
  team_image: string | null;
}

export interface Match {
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
  img: string;
  image_url: string | null;
  order: number;
}

export interface NewsTicker {
  id: number;
  text: string;
  link: string;
  is_active: boolean;
  order: number;
}

// ── Exam ─────────────────────────────────────────────────────────────────────

export interface ExamRegistrationData {
  full_name: string;
  father_name?: string;
  mother_name?: string;
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
  publish_admit_card: boolean;
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
  registration_closed: boolean;
  important_dates: ExamImportantDate[];
  support_schools: ExamSupportSchool[];
  syllabus_items: ExamSyllabusItem[];
  sample_papers: ExamSamplePaper[];
  center_details: ExamCenterDetail[];
  faqs: ExamFaq[];
  toppers: ExamTopper[];
}

export interface ComplaintData {
  name: string;
  roll_number: string;
  message: string;
  screenshot?: File | null;
}

export interface ComplaintStatusData {
  roll_number: string;
}

// ── Cricket ───────────────────────────────────────────────────────────────────

export interface TeamRegistrationPayload {
  team_name: string;
  captain_name: string;
  phone: string;
  whatsapp_number: string;
  player_count: number;
  address: string;
  message?: string;
  team_image?: File | null;
  team_list?: File | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN TYPES
// ─────────────────────────────────────────────────────────────────────────────

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
  father_name: string;
  mother_name: string;
  roll_number: string;
  date_of_birth: string;
  phone: string;
  email: string;
  school_name: string;
  class_name: string;
  examination_center: string;
  center_address: string;
  address: string;
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

export interface AdminTeamRegistration {
  id: number;
  team_name: string;
  captain_name: string;
  phone: string;
  whatsapp_number: string;
  player_count: number;
  address: string;
  payment_id: string;
  payment_order_id: string;
  payment_amount_paise: number;
  payment_currency: string;
  team_list_url: string | null;
  team_image_url: string | null;
  is_approved: boolean;
  receipt_download_url: string | null;
  created_at: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Token ${token}` };
}

async function adminGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

async function adminPost<T>(
  token: string,
  path: string,
  body: FormData | object,
): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: isForm
      ? authHeaders(token)
      : { ...authHeaders(token), "Content-Type": "application/json" },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data) || "Create failed");
  return data as T;
}

async function adminPatch<T>(
  token: string,
  path: string,
  body: FormData | object,
): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: isForm
      ? authHeaders(token)
      : { ...authHeaders(token), "Content-Type": "application/json" },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data) || "Update failed");
  return data as T;
}

async function adminDelete(token: string, path: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204)
    throw new Error(`Delete failed: ${res.status}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export const fetchTeams = (): Promise<Team[]> => get<Team[]>("/api/teams/");

export const fetchMatches = (season?: number): Promise<Match[]> =>
  get<Match[]>(
    season != null ? `/api/matches/?season=${season}` : "/api/matches/",
  );

export const fetchManagement = (): Promise<ManagementMember[]> =>
  get<ManagementMember[]>("/api/management/");

export const fetchGallery = (): Promise<GalleryImage[]> =>
  get<GalleryImage[]>("/api/gallery/");

export const fetchVolunteers = (): Promise<Volunteer[]> =>
  get<Volunteer[]>("/api/volunteers/");

export const fetchNewsTickers = (): Promise<NewsTicker[]> =>
  get<NewsTicker[]>("/api/news-ticker/");

// ── Exam Portal ───────────────────────────────────────────────────────────────

export const fetchExamPortalContent = (): Promise<ExamPortalContent> =>
  get<ExamPortalContent>("/api/exam/portal/content/");

export const submitExamRegistration = async (
  data: ExamRegistrationData,
): Promise<{ roll_number: string }> => {
  const fd = new FormData();
  fd.append("full_name", data.full_name);
  fd.append("father_name", data.father_name ?? "");
  fd.append("mother_name", data.mother_name ?? "");
  fd.append("date_of_birth", data.date_of_birth);
  fd.append("phone", data.phone);
  fd.append("email", data.email ?? "");
  fd.append("school_name", data.school_name ?? "");
  fd.append("class_name", data.class_name ?? "");
  fd.append("address", data.address ?? "");
  if (data.student_image) fd.append("student_image", data.student_image);
  if (data.signature_image) fd.append("signature_image", data.signature_image);

  const res = await fetch(`${API_URL}/api/exam/registrations/`, {
    method: "POST",
    body: fd,
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(JSON.stringify(body) || "Registration failed");
  return {
    roll_number:
      typeof body.roll_number === "string" ? body.roll_number : "",
  };
};

export const lookupExamResult = async (
  data: ExamResultLookupData,
): Promise<ExamResult> => {
  const res = await fetch(`${API_URL}/api/exam/results/lookup/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      typeof body?.detail === "string" ? body.detail : "Result lookup failed",
    );
  return body as ExamResult;
};

export const downloadAdmitCard = async (
  data: ExamResultLookupData,
): Promise<Blob> => {
  const res = await fetch(
    `${API_URL}/api/exam/results/admit-card/download/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : "Admit card not available yet",
    );
  }
  return res.blob();
};

export const downloadCertificate = async (
  data: ExamResultLookupData,
): Promise<Blob> => {
  const res = await fetch(
    `${API_URL}/api/exam/results/certificate/download/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : "Certificate not available yet",
    );
  }
  return res.blob();
};

export const submitComplaint = async (
  data: ComplaintData,
): Promise<{ id: number }> => {
  const fd = new FormData();
  fd.append("name", data.name);
  fd.append("roll_number", data.roll_number);
  fd.append("message", data.message);
  if (data.screenshot) fd.append("screenshot", data.screenshot);

  const res = await fetch(`${API_URL}/api/exam/complaints/`, {
    method: "POST",
    body: fd,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(body) || "Submission failed");
  return body as { id: number };
};

export const checkComplaintStatus = async (
  roll_number: string,
): Promise<{ status: string; admin_note: string; message: string }> => {
  const res = await fetch(`${API_URL}/api/exam/complaints/status/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roll_number }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      typeof body?.detail === "string" ? body.detail : "Status check failed",
    );
  return body as { status: string; admin_note: string; message: string };
};

// ── Cricket Registration ───────────────────────────────────────────────────────

export const createPaymentOrder = async (): Promise<{
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}> => {
  const res = await fetch(`${API_URL}/api/register/payment-order/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(body) || "Order creation failed");
  return body as { order_id: string; amount: number; currency: string; key_id: string };
};

export const submitTeamRegistration = async (
  data: TeamRegistrationPayload & {
    payment_order_id?: string;
    payment_id?: string;
    payment_signature?: string;
  },
): Promise<{ id: number; team_name: string }> => {
  const fd = new FormData();
  fd.append("team_name", data.team_name);
  fd.append("captain_name", data.captain_name);
  fd.append("phone", data.phone);
  fd.append("whatsapp_number", data.whatsapp_number);
  fd.append("player_count", String(data.player_count));
  fd.append("address", data.address);
  fd.append("message", data.message ?? "");
  if (data.team_image) fd.append("team_image", data.team_image);
  if (data.team_list) fd.append("team_list", data.team_list);
  if (data.payment_order_id)
    fd.append("payment_order_id", data.payment_order_id);
  if (data.payment_id) fd.append("payment_id", data.payment_id);
  if (data.payment_signature)
    fd.append("payment_signature", data.payment_signature);

  const res = await fetch(`${API_URL}/api/register/`, {
    method: "POST",
    body: fd,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(body) || "Registration failed");
  return body as { id: number; team_name: string };
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN API
// ─────────────────────────────────────────────────────────────────────────────

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
  if (!res.ok)
    throw new Error(
      typeof body?.detail === "string" ? body.detail : "Login failed",
    );
  return body as { token: string; username: string; email: string };
};

export const adminMe = (token: string): Promise<AdminUser> =>
  adminGet<AdminUser>(token, "/api/admin/me/");

// Exam students
export const adminFetchStudents = (
  token: string,
  search?: string,
): Promise<AdminExamRegistration[]> =>
  adminGet<AdminExamRegistration[]>(
    token,
    search
      ? `/api/admin/exam/registrations/?search=${encodeURIComponent(search)}`
      : "/api/admin/exam/registrations/",
  );

export const adminFetchStudent = (
  token: string,
  id: number,
): Promise<AdminExamRegistration> =>
  adminGet<AdminExamRegistration>(
    token,
    `/api/admin/exam/registrations/${id}/`,
  );

export const adminUpdateStudent = (
  token: string,
  id: number,
  data: FormData | object,
): Promise<AdminExamRegistration> =>
  adminPatch<AdminExamRegistration>(
    token,
    `/api/admin/exam/registrations/${id}/`,
    data,
  );

export const adminGenerateDocs = (
  token: string,
  id: number,
  type: "admit" | "certificate" | "both",
): Promise<AdminExamRegistration> =>
  adminPost<AdminExamRegistration>(
    token,
    `/api/admin/exam/registrations/${id}/generate-docs/`,
    { type },
  );

export const adminExportCSV = async (token: string): Promise<Blob> => {
  const res = await fetch(
    `${API_URL}/api/admin/exam/registrations/export/csv/`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error("CSV export failed");
  return res.blob();
};

// Team registrations
export const adminFetchTeamRegistrations = (
  token: string,
): Promise<AdminTeamRegistration[]> =>
  adminGet<AdminTeamRegistration[]>(token, "/api/admin/team-registrations/");

export const adminApproveTeam = (
  token: string,
  id: number,
  is_approved: boolean,
): Promise<AdminTeamRegistration> =>
  adminPatch<AdminTeamRegistration>(token, `/api/admin/team-registrations/${id}/`, {
    is_approved,
  });

// Matches
export const adminFetchMatches = (token: string): Promise<AdminMatch[]> =>
  adminGet<AdminMatch[]>(token, "/api/admin/matches/");

export const adminCreateMatch = (
  token: string,
  data: Partial<AdminMatch>,
): Promise<AdminMatch> =>
  adminPost<AdminMatch>(token, "/api/admin/matches/", data);

export const adminUpdateMatch = (
  token: string,
  id: number,
  data: Partial<AdminMatch>,
): Promise<AdminMatch> =>
  adminPatch<AdminMatch>(token, `/api/admin/matches/${id}/`, data);

export const adminDeleteMatch = (token: string, id: number): Promise<void> =>
  adminDelete(token, `/api/admin/matches/${id}/`);

// Utility: trigger browser download from a Blob
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
