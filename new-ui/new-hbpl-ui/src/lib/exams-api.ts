const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

export interface ExaminationSession {
  id: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ExamCentre {
  id: number;
  name: string;
  code: string;
  address: string;
  city: string;
  district: string;
  state: string;
  postal_code: string;
  capacity: number;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  facilities: string;
  internal_notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManagedExam {
  id: number;
  session: ExaminationSession | null;
  category: number | null;
  code: string | null;
  name: string;
  short_name: string;
  slug: string;
  status: string;
  description: string;
  subtitle: string;
  allowed_classes: string[];
  application_prefix: string;
  is_published: boolean;
  fee: string;
  max_registrations: number | null;
  exam_date: string | null;
  result_date: string | null;
  registration_start: string | null;
  registration_end: string | null;
  reporting_time: string | null;
  exam_start_time: string | null;
  exam_end_time: string | null;
  admit_card_template: string | null;
  certificate_template: string | null;
  sample_papers?: Array<{ id: number; title: string; caption: string; file_url: string | null }>;
  centre_ids: number[];
  application_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExamSamplePaper {
  id: number;
  exam_id: number;
  title: string;
  caption: string;
  file_url: string | null;
}

export interface StudentAccount {
  id: number;
  username: string;
  email: string;
  full_name: string;
  gender: string;
  phone: string;
  date_of_birth: string | null;
  father_name: string;
  mother_name: string;
  school_name: string;
  class_name: string;
  address: string;
  photo: string | null;
  photo_url: string | null;
  signature: string | null;
  signature_url: string | null;
  email_verified: boolean;
}

export interface StudentApplication {
  id: number;
  exam: ManagedExam;
  application_number: string | null;
  status: string;
  payment_status?: "not_required" | "unpaid" | "pending" | "paid" | "failed" | "user_dropped" | "expired";
  payment_order_id?: string | null;
  full_name: string;
  father_name: string;
  mother_name: string;
  date_of_birth: string | null;
  phone: string;
  email: string;
  school_name: string;
  class_name: string;
  address: string;
  notes: string;
  submitted_at: string | null;
  review_notes: string;
  documents: Array<{ id: number; document_type: string; file_url: string; uploaded_at: string }>;
  centre: { id: number; name: string; address: string; city: string; district: string; state: string; postal_code: string } | null;
  admit_card_url: string | null;
  admit_card_available: boolean;
  admit_card_issued_at: string | null;
  certificate_url: string | null;
  certificate_available: boolean;
  certificate_number: string | null;
  certificate_issued_at: string | null;
  result?: StudentResult | null;
}

/** The only candidate fields an exam enrollment may snapshot from the profile. */
export interface StudentApplicationInput {
  full_name: string;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  phone: string;
  school_name: string;
  class_name: string;
  address: string;
}

export interface StudentApplicationCreateInput extends StudentApplicationInput {
  exam_id: number;
}

export interface CashfreePaymentOrder {
  order_id: string;
  payment_session_id: string;
  mode: "sandbox" | "production";
  already_paid?: boolean;
}

export interface LegacyApplication {
  id: number;
  examination_name: string;
  full_name: string;
  roll_number: string;
  date_of_birth: string;
  school_name: string;
  class_name: string;
  examination_center: string;
  center_address: string;
  result_status: string;
  marks_obtained: string | null;
  total_marks: string;
  rank: number | null;
  remarks: string;
  admit_card_url: string | null;
  result_url: string | null;
  certificate_url: string | null;
  created_at: string;
}

export interface StudentResult {
  id: number;
  exam: string;
  session: string;
  session_id?: number | null;
  application_number: string | null;
  obtained_marks: string | null;
  total_marks: string | null;
  percentage: string | null;
  rank: number | null;
  grade: string;
  is_pass: boolean | null;
  remarks: string;
}

export interface StaffExamResult {
  id: number;
  exam: number;
  exam_name: string;
  application_id: number;
  application_number: string;
  student_name: string;
  roll_number: string;
  total_marks: string | null;
  obtained_marks: string | null;
  percentage: string | null;
  rank: number | null;
  grade: string;
  is_pass: boolean | null;
  remarks: string;
  updated_at: string;
}

export interface StaffExamPayment {
  id: number;
  application_number: string | null;
  student_name: string;
  student_email: string;
  exam_name: string;
  session_name: string | null;
  order_id: string;
  amount: string;
  currency: string;
  status: "pending" | "paid" | "failed" | "user_dropped" | "expired";
  payment_method: "cashfree" | "manual" | "no_charge";
  cf_payment_id: string;
  manual_reference: string;
  manually_accepted_by_name: string | null;
  manually_accepted_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface ExamFormData {
  session_id: number;
  code: string;
  name: string;
  short_name: string;
  slug: string;
  status: string;
  description: string;
  subtitle: string;
  application_prefix: string;
  allowed_classes: string[];
  is_published: boolean;
  fee: string;
  max_registrations: string;
  exam_date: string;
  result_date: string;
  registration_start: string;
  registration_end: string;
  admit_card_template: File | null;
  certificate_template: File | null;
  centre_ids: number[];
}

export interface SchoolSuggestion {
  id: number;
  name: string;
}

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function authHeaders(adminToken: string): Record<string, string> {
  return { Authorization: `Token ${adminToken}` };
}

function listPayload<T>(payload: T[] | { results?: T[] }): T[] {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

export function normalizeAllowedClasses(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(normalizeAllowedClasses);
  if (typeof value === "number") return [String(value)];
  if (typeof value !== "string" || !value.trim()) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return normalizeAllowedClasses(parsed);
    } catch { /* Accept legacy comma-separated values below. */ }
  }
  return trimmed.split(",").map((item) => item.trim().replace(/\\/g, "").replace(/^['"\[]+|['"\]]+$/g, "")).filter(Boolean);
}

function normalizeManagedExam(exam: ManagedExam): ManagedExam {
  return { ...exam, allowed_classes: normalizeAllowedClasses(exam.allowed_classes) };
}

async function request<T>(adminToken: string, path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...authHeaders(adminToken),
      ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiRequestError(apiErrorMessage(body, response.status), response.status);
  }
  return body as T;
}

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...(!isFormData && init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiRequestError(apiErrorMessage(body, response.status), response.status);
  return body as T;
}

/** Turn Django/DRF field errors into a message a student can act on. */
function apiErrorMessage(body: unknown, status: number): string {
  if (!body || typeof body !== "object") return `Request failed (${status}). Please try again.`;
  const data = body as Record<string, unknown>;
  if (typeof data.detail === "string") return data.detail;
  const messages = Object.entries(data).flatMap(([field, value]) => {
    const label = field === "non_field_errors" ? "" : `${field.replaceAll("_", " ")}: `;
    const values = Array.isArray(value) ? value : [value];
    return values.filter((item): item is string => typeof item === "string").map((item) => `${label}${item}`);
  });
  return messages.join(" ") || `Request failed (${status}). Please try again.`;
}

export function validateStudentApplicationInput(data: StudentApplicationInput): string[] {
  const errors: string[] = [];
  const required: Array<[keyof StudentApplicationInput, string]> = [
    ["full_name", "student name"], ["date_of_birth", "date of birth"], ["phone", "mobile number"],
    ["father_name", "father's name"], ["school_name", "school name"], ["class_name", "class"], ["address", "address"],
  ];
  for (const [field, label] of required) {
    if (!data[field].trim()) errors.push(`Enter your ${label}.`);
  }
  const phoneDigits = data.phone.replace(/\D/g, "");
  if (data.phone.trim() && (phoneDigits.length < 10 || phoneDigits.length > 15)) errors.push("Enter a valid mobile number.");
  if (data.class_name && !/^(?:[1-9]|1[0-2])$/.test(data.class_name)) errors.push("Select a class from Class 1 to Class 12.");
  if (data.date_of_birth && new Date(`${data.date_of_birth}T00:00:00`).getTime() > Date.now()) errors.push("Date of birth cannot be in the future.");
  return errors;
}

export async function fetchStaffSessions(adminToken: string): Promise<ExaminationSession[]> {
  const data = await request<ExaminationSession[] | { results?: ExaminationSession[] }>(adminToken, "/api/v1/staff/exam-sessions/");
  return listPayload(data);
}

export async function sendStaffEmailTest(adminToken: string, email: string): Promise<{ success: boolean; detail: string }> {
  return request(adminToken, "/api/v1/staff/email-test/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function createStaffSession(adminToken: string, data: Partial<ExaminationSession>): Promise<ExaminationSession> {
  return request<ExaminationSession>(adminToken, "/api/v1/staff/exam-sessions/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateStaffSession(adminToken: string, id: number, data: Partial<ExaminationSession>): Promise<ExaminationSession> {
  return request<ExaminationSession>(adminToken, `/api/v1/staff/exam-sessions/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteStaffSession(adminToken: string, id: number): Promise<void> {
  await request<void>(adminToken, `/api/v1/staff/exam-sessions/${id}/`, { method: "DELETE" });
}

export async function fetchStaffExams(adminToken: string): Promise<ManagedExam[]> {
  const data = await request<ManagedExam[] | { results?: ManagedExam[] }>(adminToken, "/api/v1/staff/exams/");
  return listPayload(data).map(normalizeManagedExam);
}

export async function fetchStaffSamplePapers(adminToken: string, examId: number): Promise<ExamSamplePaper[]> {
  const data = await request<ExamSamplePaper[] | { results?: ExamSamplePaper[] }>(
    adminToken,
    `/api/v1/staff/sample-papers/?exam_id=${examId}`,
  );
  return listPayload(data);
}

export async function uploadStaffSamplePaper(
  adminToken: string,
  data: { exam_id: number; title: string; caption: string; file: File },
): Promise<ExamSamplePaper> {
  const form = new FormData();
  form.append("exam_id", String(data.exam_id));
  form.append("title", data.title);
  form.append("caption", data.caption);
  form.append("file", data.file);
  return request<ExamSamplePaper>(adminToken, "/api/v1/staff/sample-papers/", { method: "POST", body: form });
}

export async function deleteStaffSamplePaper(adminToken: string, paperId: number): Promise<void> {
  await request<void>(adminToken, `/api/v1/staff/sample-papers/${paperId}/`, { method: "DELETE" });
}

export async function fetchStaffExamCentres(adminToken: string): Promise<ExamCentre[]> {
  const data = await request<ExamCentre[] | { results?: ExamCentre[] }>(adminToken, "/api/v1/staff/exam-centres/");
  return listPayload(data);
}

export async function createStaffExamCentre(adminToken: string, data: Partial<ExamCentre>): Promise<ExamCentre> {
  return request<ExamCentre>(adminToken, "/api/v1/staff/exam-centres/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateStaffExamCentre(adminToken: string, id: number, data: Partial<ExamCentre>): Promise<ExamCentre> {
  return request<ExamCentre>(adminToken, `/api/v1/staff/exam-centres/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteStaffExamCentre(adminToken: string, id: number): Promise<void> {
  await request<void>(adminToken, `/api/v1/staff/exam-centres/${id}/`, { method: "DELETE" });
}

function examFormData(data: ExamFormData): FormData {
  const form = new FormData();
  const scalarFields: Array<keyof ExamFormData> = [
  "session_id", "code", "name", "short_name", "slug", "status", "description",
    "subtitle", "application_prefix",
    "allowed_classes", "is_published", "fee", "max_registrations", "exam_date", "result_date", "registration_start", "registration_end",
  ];
  for (const key of scalarFields) {
    const value = data[key];
    if (value === "" || value === null || value === undefined) continue;
    const serialized = key === "registration_start" || key === "registration_end"
      ? new Date(String(value)).toISOString()
      : key === "allowed_classes"
        ? JSON.stringify(value)
      : String(value);
    form.append(key, serialized);
  }
  form.append("centre_ids", JSON.stringify(data.centre_ids));
  if (data.admit_card_template) form.append("admit_card_template", data.admit_card_template);
  if (data.certificate_template) form.append("certificate_template", data.certificate_template);
  return form;
}

export async function createStaffExam(adminToken: string, data: ExamFormData): Promise<ManagedExam> {
  return normalizeManagedExam(await request<ManagedExam>(adminToken, "/api/v1/staff/exams/", { method: "POST", body: examFormData(data) }));
}

export async function updateStaffExam(adminToken: string, id: number, data: ExamFormData): Promise<ManagedExam> {
  return normalizeManagedExam(await request<ManagedExam>(adminToken, `/api/v1/staff/exams/${id}/`, { method: "PATCH", body: examFormData(data) }));
}

export async function deleteStaffExam(adminToken: string, id: number): Promise<void> {
  await request<void>(adminToken, `/api/v1/staff/exams/${id}/`, { method: "DELETE" });
}

export async function fetchPublicExams(): Promise<ManagedExam[]> {
  const response = await fetch(`${API}/api/v1/exams/`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error("Unable to load examinations");
  return listPayload<ManagedExam>(data as ManagedExam[] | { results?: ManagedExam[] }).map(normalizeManagedExam);
}

export async function fetchPublicExam(slug: string): Promise<ManagedExam> {
  const response = await fetch(`${API}/api/v1/exams/${encodeURIComponent(slug)}/`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(response.status === 404 ? "This examination could not be found." : "Unable to load examination details.");
  return normalizeManagedExam(data as ManagedExam);
}

export async function fetchExamSessions(): Promise<ExaminationSession[]> {
  const response = await fetch(`${API}/api/v1/exam-sessions/`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error("Unable to load sessions");
  return listPayload(data);
}

export async function fetchSchoolSuggestions(): Promise<SchoolSuggestion[]> {
  const response = await fetch(`${API}/api/v1/schools/`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error("Unable to load school suggestions");
  return listPayload(data);
}

export async function fetchEligibleExams(studentToken: string): Promise<ManagedExam[]> {
  const data = await request<ManagedExam[] | { results?: ManagedExam[] }>(studentToken, "/api/v1/eligible-exams/");
  return listPayload(data).map(normalizeManagedExam);
}

export async function fetchStudentProfile(studentToken: string): Promise<StudentAccount> {
  return request<StudentAccount>(studentToken, "/api/v1/me/");
}

export async function updateStudentProfile(studentToken: string, data: Partial<StudentAccount>, photo?: File | null, signature?: File | null): Promise<StudentAccount> {
  if (photo || signature) {
    const body = new FormData();
    Object.entries(data).forEach(([key, value]) => { if (value !== undefined && value !== null) body.append(key, String(value)); });
    if (photo) body.append("photo", photo);
    if (signature) body.append("signature", signature);
    return request<StudentAccount>(studentToken, "/api/v1/me/", { method: "PATCH", body });
  }
  return request<StudentAccount>(studentToken, "/api/v1/me/", { method: "PATCH", body: JSON.stringify(data) });
}

export async function quickApplyStudent(studentToken: string, examId: number): Promise<StudentApplication> {
  return request<StudentApplication>(studentToken, "/api/v1/applications/quick-apply/", { method: "POST", body: JSON.stringify({ exam_id: examId }) });
}

export async function registerStudentAccount(data: {
  email: string; password: string; full_name: string; gender: string; phone: string; date_of_birth: string;
  father_name: string; mother_name: string; school_name: string; class_name: string; address: string;
  photo: File; signature: File;
}): Promise<{ detail: string; user: StudentAccount }> {
  const body = new FormData();
  Object.entries(data).forEach(([key, value]) => body.append(key, value));
  return publicRequest("/api/v1/auth/register/", { method: "POST", body });
}

export async function loginStudentAccount(data: { email: string; password: string }): Promise<{ token: string; user: StudentAccount }> {
  return publicRequest("/api/v1/auth/login/", { method: "POST", body: JSON.stringify(data) });
}

export async function requestStudentPasswordReset(email: string): Promise<{ detail: string }> {
  return publicRequest("/api/v1/auth/password-reset/", { method: "POST", body: JSON.stringify({ email }) });
}

export async function confirmStudentPasswordReset(data: { uid: string; token: string; password: string }): Promise<{ detail: string }> {
  return publicRequest("/api/v1/auth/password-reset/confirm/", { method: "POST", body: JSON.stringify(data) });
}

export async function verifyStudentEmail(data: { email: string; code: string }): Promise<{ detail: string }> {
  return publicRequest("/api/v1/auth/verify-email/", { method: "POST", body: JSON.stringify(data) });
}

export async function resendStudentVerification(email: string): Promise<{ detail: string }> {
  return publicRequest("/api/v1/auth/resend-verification/", { method: "POST", body: JSON.stringify({ email }) });
}

export async function createStudentApplication(studentToken: string, data: StudentApplicationCreateInput): Promise<StudentApplication> {
  return request<StudentApplication>(studentToken, "/api/v1/applications/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateStudentApplication(studentToken: string, id: number, data: StudentApplicationInput): Promise<StudentApplication> {
  return request<StudentApplication>(studentToken, `/api/v1/applications/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function submitStudentApplication(studentToken: string, id: number): Promise<StudentApplication> {
  return request<StudentApplication>(studentToken, `/api/v1/applications/${id}/submit/`, { method: "POST", body: JSON.stringify({}) });
}

export async function createCashfreePaymentOrder(studentToken: string, id: number): Promise<CashfreePaymentOrder> {
  return request<CashfreePaymentOrder>(studentToken, `/api/v1/applications/${id}/payment-order/`, { method: "POST", body: JSON.stringify({}) });
}

export async function verifyCashfreePayment(studentToken: string, orderId: string): Promise<{ paid: boolean; application: StudentApplication }> {
  return request(studentToken, "/api/v1/payments/verify/", { method: "POST", body: JSON.stringify({ order_id: orderId }) });
}

export async function fetchMyApplications(studentToken: string): Promise<StudentApplication[]> {
  const data = await request<StudentApplication[] | { results?: StudentApplication[] }>(studentToken, "/api/v1/applications/");
  return listPayload(data);
}

export async function downloadStudentApplicationForm(studentToken: string, id: number): Promise<Blob> {
  const response = await fetch(`${API}/api/v1/applications/${id}/form/`, {
    headers: authHeaders(studentToken),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body?.detail === "string" ? body.detail : "Unable to download the enrollment form.");
  }
  return response.blob();
}

export async function downloadStudentAdmitCard(studentToken: string, id: number): Promise<Blob> {
  const response = await fetch(`${API}/api/v1/applications/${id}/admit-card/`, {
    headers: authHeaders(studentToken),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body?.detail === "string" ? body.detail : "Unable to generate the admit card.");
  }
  return response.blob();
}

export async function downloadStudentCertificate(studentToken: string, id: number): Promise<Blob> {
  const response = await fetch(`${API}/api/v1/applications/${id}/certificate/`, {
    headers: authHeaders(studentToken),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body?.detail === "string" ? body.detail : "Unable to generate the certificate.");
  }
  return response.blob();
}

export async function fetchApplicationHistory(studentToken: string): Promise<{ applications: StudentApplication[]; legacy_registrations: LegacyApplication[] }> {
  return request<{ applications: StudentApplication[]; legacy_registrations: LegacyApplication[] }>(studentToken, "/api/v1/applications/history/");
}

export async function fetchMyResults(studentToken: string, sessionId?: number): Promise<StudentResult[]> {
  const suffix = sessionId ? `?session=${sessionId}` : "";
  return request<StudentResult[]>(studentToken, `/api/v1/results/${suffix}`);
}

export async function fetchStaffApplications(adminToken: string, params = ""): Promise<StudentApplication[]> {
  const data = await request<StudentApplication[] | { results?: StudentApplication[] }>(adminToken, `/api/v1/staff/applications/${params}`);
  return listPayload(data);
}

export async function fetchStaffExamPayments(adminToken: string, params = ""): Promise<StaffExamPayment[]> {
  const data = await request<StaffExamPayment[] | { results?: StaffExamPayment[] }>(adminToken, `/api/v1/staff/payments/${params}`);
  return listPayload(data);
}

export async function acceptStaffExamPayment(adminToken: string, id: number, reference: string): Promise<StaffExamPayment> {
  return request<StaffExamPayment>(adminToken, `/api/v1/staff/payments/${id}/accept/`, {
    method: "POST", body: JSON.stringify({ reference }),
  });
}

export async function transitionStaffApplication(adminToken: string, id: number, status: string, note = ""): Promise<StudentApplication> {
  return request<StudentApplication>(adminToken, `/api/v1/staff/applications/${id}/transition/`, { method: "POST", body: JSON.stringify({ status, note }) });
}

export async function autoAssignStaffApplicationCentres(adminToken: string, examId: number): Promise<{ assigned: number; unassigned: number }> {
  return request<{ assigned: number; unassigned: number }>(adminToken, "/api/v1/staff/applications/auto-assign-centres/", {
    method: "POST", body: JSON.stringify({ exam_id: examId }),
  });
}

export async function assignStaffApplicationCentre(adminToken: string, id: number, centreId: number | null): Promise<StudentApplication> {
  return request<StudentApplication>(adminToken, `/api/v1/staff/applications/${id}/`, {
    method: "PATCH", body: JSON.stringify({ centre_id: centreId }),
  });
}

export async function fetchStaffExamResults(adminToken: string, examId: number): Promise<StaffExamResult[]> {
  const data = await request<StaffExamResult[] | { results?: StaffExamResult[] }>(adminToken, `/api/v1/staff/exam-results/?exam=${examId}`);
  return listPayload(data);
}

export async function saveStaffExamResult(adminToken: string, data: Partial<StaffExamResult> & { application_id: number }): Promise<StaffExamResult> {
  const existing = data.id;
  return request<StaffExamResult>(adminToken, existing ? `/api/v1/staff/exam-results/${existing}/` : "/api/v1/staff/exam-results/", {
    method: existing ? "PATCH" : "POST", body: JSON.stringify(data),
  });
}
