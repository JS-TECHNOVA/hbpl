"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { token } from "../layout";
import { mediaUrl } from "@/src/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface Student {
  id: number;
  roll_number: string;
  full_name: string;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  phone: string;
  email: string;
  school_name: string;
  class_name: string;
  examination_center: string;
  center_address: string;
  address: string;
  notes: string;
  result_status: string;
  marks_obtained: string | null;
  total_marks: string | null;
  rank: string | null;
  remarks: string;
  publish_admit_card: boolean;
  publish_participation_certificate: boolean;
  student_image_url: string;
  signature_image_url: string;
  test_copy_url: string;
  result_file_url: string;
  admit_card_url: string;
  participation_certificate_url: string;
}

const STATUS_CHIP: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  pass: "bg-green-50 text-green-700",
  fail: "bg-red-50 text-red-700",
  absent: "bg-gray-100 text-gray-500",
};

const IMPORTABLE_FIELDS = [
  "", "full_name", "father_name", "mother_name", "roll_number",
  "date_of_birth", "phone", "email", "school_name", "class_name",
  "examination_center", "center_address", "address", "notes",
];

type ImportMode = "" | "students" | "marks" | "copies";

export default function ExamStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCenter, setFilterCenter] = useState("");
  const [filterCopyStatus, setFilterCopyStatus] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;

  const [selected, setSelected] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  // Import modal state
  const [importMode, setImportMode] = useState<ImportMode>("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFiles, setImportFiles] = useState<FileList | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState("");
  const [importError, setImportError] = useState("");
  const [importStep, setImportStep] = useState<"upload" | "map" | "done">("upload");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importRowCount, setImportRowCount] = useState(0);

  const studentImgRef = useRef<HTMLInputElement>(null);
  const sigImgRef = useRef<HTMLInputElement>(null);
  const testCopyRef = useRef<HTMLInputElement>(null);
  const resultFileRef = useRef<HTMLInputElement>(null);

  const headers = { Authorization: `Token ${token()}` };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PER_PAGE),
      offset: String((page - 1) * PER_PAGE),
    });
    if (search) params.set("search", search);
    if (filterClass) params.set("class_name", filterClass);
    if (filterStatus) params.set("result_status", filterStatus);
    if (filterCenter) params.set("examination_center", filterCenter);
    if (filterCopyStatus) params.set("has_test_copy", filterCopyStatus);
    fetch(`${API}/api/admin/exam/registrations/?${params}`, { headers })
      .then(r => r.json())
      .then(d => {
        setStudents(Array.isArray(d) ? d : d.results ?? []);
        setTotal(d.count ?? (Array.isArray(d) ? d.length : 0));
      })
      .finally(() => setLoading(false));
  }, [search, filterClass, filterStatus, filterCenter, filterCopyStatus, page]);

  useEffect(() => { load(); }, [load]);

  async function reloadSelected(id: number) {
    const s = await fetch(`${API}/api/admin/exam/registrations/${id}/`, { headers }).then(r => r.json());
    setSelected(s);
    load();
  }

  async function saveStudent() {
    if (!selected) return;
    setSaving(true); setSaveError("");
    try {
      const body: Record<string, unknown> = {
        roll_number: selected.roll_number,
        full_name: selected.full_name,
        father_name: selected.father_name,
        mother_name: selected.mother_name,
        date_of_birth: selected.date_of_birth,
        phone: selected.phone,
        email: selected.email,
        school_name: selected.school_name,
        class_name: selected.class_name,
        examination_center: selected.examination_center,
        address: selected.address,
        notes: selected.notes,
        result_status: selected.result_status,
        marks_obtained: selected.marks_obtained,
        total_marks: selected.total_marks,
        rank: selected.rank,
        remarks: selected.remarks,
        publish_admit_card: selected.publish_admit_card,
        publish_participation_certificate: selected.publish_participation_certificate,
      };
      const res = await fetch(`${API}/api/admin/exam/registrations/${selected.id}/`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      await reloadSelected(selected.id);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(field: string, file: File) {
    if (!selected) return;
    const fd = new FormData();
    fd.append(field, file);
    await fetch(`${API}/api/admin/exam/registrations/${selected.id}/`, {
      method: "PATCH", headers, body: fd,
    });
    await reloadSelected(selected.id);
  }

  async function generateDocs(type: "admit_card" | "certificate" | "both") {
    if (!selected) return;
    setGenLoading(true);
    try {
      await fetch(`${API}/api/admin/exam/registrations/${selected.id}/generate-docs/`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      await reloadSelected(selected.id);
    } finally {
      setGenLoading(false);
    }
  }

  function exportCSV() {
    const params = new URLSearchParams();
    if (filterClass) params.set("class_name", filterClass);
    if (filterStatus) params.set("result_status", filterStatus);
    if (filterCenter) params.set("examination_center", filterCenter);
    window.open(`${API}/api/admin/exam/registrations/export/csv/?${params}&token=${token()}`, "_blank");
  }

  function closeImport() {
    setImportMode("");
    setImportFile(null);
    setImportFiles(null);
    setImportResult("");
    setImportError("");
    setImportStep("upload");
    setImportHeaders([]);
    setImportMapping({});
    setImportRowCount(0);
  }

  async function importStudentsDryRun() {
    if (!importFile) return;
    setImportLoading(true); setImportError("");
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("dry_run", "true");
      const res = await fetch(`${API}/api/admin/exam/registrations/import/`, {
        method: "POST", headers, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Preview failed");
      setImportHeaders(data.headers || []);
      setImportRowCount(data.row_count || 0);
      setImportMapping(data.suggested_mapping || {});
      setImportStep("map");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Error");
    } finally {
      setImportLoading(false);
    }
  }

  async function importStudentsCommit() {
    if (!importFile) return;
    setImportLoading(true); setImportError("");
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("mapping", JSON.stringify(importMapping));
      const res = await fetch(`${API}/api/admin/exam/registrations/import/`, {
        method: "POST", headers, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Import failed");
      const msg = `Imported: ${data.imported}, Updated: ${data.updated}, Skipped: ${data.skipped}${data.error_count > 0 ? `, Errors: ${data.error_count}` : ""}`;
      setImportResult(msg);
      setImportStep("done");
      load();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Error");
    } finally {
      setImportLoading(false);
    }
  }

  async function importMarks() {
    if (!importFile) return;
    setImportLoading(true); setImportError("");
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const res = await fetch(`${API}/api/admin/exam/registrations/import-marks/`, {
        method: "POST", headers, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Import failed");
      const msg = `Updated: ${data.updated}, Skipped: ${data.skipped}${data.error_count > 0 ? `, Errors: ${data.error_count}` : ""}`;
      setImportResult(msg);
      setImportStep("done");
      load();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Error");
    } finally {
      setImportLoading(false);
    }
  }

  async function uploadTestCopies() {
    if (!importFiles?.length) return;
    setImportLoading(true); setImportError("");
    try {
      const fd = new FormData();
      Array.from(importFiles).forEach(f => fd.append("files", f));
      const res = await fetch(`${API}/api/admin/exam/registrations/upload-test-copies/`, {
        method: "POST", headers, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      const notFound = data.not_found?.length ? `, Not found: ${data.not_found.slice(0, 5).join(", ")}` : "";
      const errs = data.errors?.length ? `, Errors: ${data.errors.length}` : "";
      setImportResult(`Uploaded: ${data.uploaded}${notFound}${errs}`);
      setImportStep("done");
      load();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Error");
    } finally {
      setImportLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PER_PAGE);
  const set = (field: keyof Student, val: unknown) =>
    setSelected(s => s ? { ...s, [field]: val } : s);

  function resetPage() { setPage(1); }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-extrabold text-[26px] text-primary">Exam Students</h1>
          <p className="text-text-muted text-[13px]">{total} registered</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { setImportMode("students"); setImportStep("upload"); }} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-blue-700 transition-colors">
            Import Students
          </button>
          <button onClick={() => { setImportMode("marks"); setImportStep("upload"); }} className="bg-purple-600 text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-purple-700 transition-colors">
            Import Marks
          </button>
          <button onClick={() => { setImportMode("copies"); setImportStep("upload"); }} className="bg-orange-500 text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-orange-600 transition-colors">
            Upload Test Copies
          </button>
          <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-green-700 transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); resetPage(); }}
          placeholder="Search name, roll, phone, school…"
          className="border border-border rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white w-60"
        />
        <select value={filterClass} onChange={e => { setFilterClass(e.target.value); resetPage(); }} className="border border-border rounded-xl px-3 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All Classes</option>
          {["6", "7", "8", "9", "10", "11", "12"].map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); resetPage(); }} className="border border-border rounded-xl px-3 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All Statuses</option>
          {["pending", "pass", "fail", "absent"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCopyStatus} onChange={e => { setFilterCopyStatus(e.target.value); resetPage(); }} className="border border-border rounded-xl px-3 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All Copy Status</option>
          <option value="yes">Copy Uploaded</option>
          <option value="no">No Copy</option>
        </select>
        <input
          value={filterCenter}
          onChange={e => { setFilterCenter(e.target.value); resetPage(); }}
          placeholder="Filter by center…"
          className="border border-border rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white w-44"
        />
        {(search || filterClass || filterStatus || filterCopyStatus || filterCenter) && (
          <button
            onClick={() => { setSearch(""); setFilterClass(""); setFilterStatus(""); setFilterCopyStatus(""); setFilterCenter(""); resetPage(); }}
            className="px-3 py-2.5 text-[13px] text-text-muted hover:text-text-primary border border-border rounded-xl bg-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-text-muted">Loading…</div>
        ) : students.length === 0 ? (
          <div className="py-20 text-center text-text-muted">No students found.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-section text-text-muted text-[11px] uppercase tracking-wider border-b border-border/30">
                {["Roll No.", "Name", "School", "Class", "Center", "Status", "Copy", "Card", "Cert", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b border-border/20 last:border-0 hover:bg-section/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-[12px] text-text-muted">{s.roll_number || "—"}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-text-primary">{s.full_name}</p>
                    <p className="text-text-muted text-[11px]">{s.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-text-body max-w-[120px] truncate">{s.school_name}</td>
                  <td className="px-4 py-3 text-text-muted">{s.class_name}</td>
                  <td className="px-4 py-3 text-text-muted max-w-[100px] truncate text-[11px]">{s.examination_center || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_CHIP[s.result_status] ?? "bg-gray-100 text-gray-500"}`}>
                      {s.result_status}
                    </span>
                  </td>
                  <td className="px-4 py-3"><Dot active={!!s.test_copy_url} /></td>
                  <td className="px-4 py-3"><Dot active={s.publish_admit_card} /></td>
                  <td className="px-4 py-3"><Dot active={s.publish_participation_certificate} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelected(s); setSaveError(""); }} className="text-primary text-[12px] font-semibold hover:underline">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 rounded-xl bg-white border border-border text-[13px] disabled:opacity-40">Prev</button>
          <span className="text-text-muted text-[13px]">Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-xl bg-white border border-border text-[13px] disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Student Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center px-4 py-6 overflow-y-auto">
          <div className="bg-white rounded-3xl p-7 w-full max-w-4xl shadow-2xl my-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-heading font-extrabold text-[22px] text-primary">{selected.full_name}</h2>
                <p className="text-text-muted text-[13px]">{selected.phone} · {selected.school_name} · Class {selected.class_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary text-[24px] leading-none">×</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: photos + docs */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Student Photo</p>
                  <div className="w-full aspect-square bg-section rounded-2xl overflow-hidden flex items-center justify-center">
                    {selected.student_image_url ? (
                      <img src={mediaUrl(selected.student_image_url)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-text-muted text-[12px]">No photo</span>
                    )}
                  </div>
                  <input ref={studentImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile("student_image", e.target.files[0])} />
                  <button onClick={() => studentImgRef.current?.click()} className="text-[12px] text-primary font-semibold hover:underline">Upload Photo</button>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Signature</p>
                  <div className="w-full h-20 bg-section rounded-xl overflow-hidden flex items-center justify-center">
                    {selected.signature_image_url ? (
                      <img src={mediaUrl(selected.signature_image_url)} alt="" className="h-full object-contain" />
                    ) : (
                      <span className="text-text-muted text-[12px]">No signature</span>
                    )}
                  </div>
                  <input ref={sigImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile("signature_image", e.target.files[0])} />
                  <button onClick={() => sigImgRef.current?.click()} className="text-[12px] text-primary font-semibold hover:underline">Upload Signature</button>
                </div>

                <div className="bg-section rounded-2xl p-4 flex flex-col gap-2">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Documents</p>
                  <DocRow label="Admit Card" url={selected.admit_card_url} />
                  <DocRow label="Result File" url={selected.result_file_url} />
                  <DocRow label="Certificate" url={selected.participation_certificate_url} />
                  <DocRow label="Test Copy" url={selected.test_copy_url} />
                  <div className="mt-1 flex flex-col gap-1">
                    <input ref={testCopyRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadFile("test_copy", e.target.files[0])} />
                    <input ref={resultFileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && uploadFile("result_file", e.target.files[0])} />
                    <button onClick={() => testCopyRef.current?.click()} className="text-[11px] text-primary hover:underline text-left">Upload Test Copy</button>
                    <button onClick={() => resultFileRef.current?.click()} className="text-[11px] text-primary hover:underline text-left">Upload Result File</button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Generate Documents</p>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => generateDocs("admit_card")} disabled={genLoading} className="bg-blue-600 text-white text-[12px] font-semibold py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50">Generate Admit Card</button>
                    <button onClick={() => generateDocs("certificate")} disabled={genLoading} className="bg-purple-600 text-white text-[12px] font-semibold py-2 rounded-xl hover:bg-purple-700 disabled:opacity-50">Generate Certificate</button>
                    <button onClick={() => generateDocs("both")} disabled={genLoading} className="bg-primary text-white text-[12px] font-semibold py-2 rounded-xl hover:bg-primary-dark disabled:opacity-50">
                      {genLoading ? "Generating…" : "Generate Both"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: editable fields */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <F label="Roll Number"><input value={selected.roll_number ?? ""} onChange={e => set("roll_number", e.target.value)} className={inp} placeholder="HBPL00001" /></F>
                  <F label="Full Name"><input value={selected.full_name} onChange={e => set("full_name", e.target.value)} className={inp} /></F>
                  <F label="Father Name"><input value={selected.father_name ?? ""} onChange={e => set("father_name", e.target.value)} className={inp} /></F>
                  <F label="Mother Name"><input value={selected.mother_name ?? ""} onChange={e => set("mother_name", e.target.value)} className={inp} /></F>
                  <F label="Date of Birth"><input type="date" value={selected.date_of_birth ?? ""} onChange={e => set("date_of_birth", e.target.value)} className={inp} /></F>
                  <F label="Phone"><input value={selected.phone} onChange={e => set("phone", e.target.value)} className={inp} /></F>
                  <F label="Email" wide><input value={selected.email ?? ""} onChange={e => set("email", e.target.value)} className={inp} /></F>
                  <F label="School"><input value={selected.school_name} onChange={e => set("school_name", e.target.value)} className={inp} /></F>
                  <F label="Class"><input value={selected.class_name} onChange={e => set("class_name", e.target.value)} className={inp} /></F>
                  <F label="Exam Center" wide><input value={selected.examination_center} onChange={e => set("examination_center", e.target.value)} className={inp} /></F>
                  <F label="Center Address" wide><input value={selected.center_address ?? ""} onChange={e => set("center_address", e.target.value)} className={inp} /></F>
                  <F label="Address" wide><input value={selected.address ?? ""} onChange={e => set("address", e.target.value)} className={inp} /></F>
                  <F label="Notes" wide><textarea value={selected.notes ?? ""} onChange={e => set("notes", e.target.value)} rows={2} className={inp} /></F>
                </div>

                <div className="bg-section rounded-2xl p-4">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Result & Marks</p>
                  <div className="grid grid-cols-3 gap-3">
                    <F label="Marks Obtained"><input type="number" value={selected.marks_obtained ?? ""} onChange={e => set("marks_obtained", e.target.value)} className={inp} /></F>
                    <F label="Total Marks"><input type="number" value={selected.total_marks ?? ""} onChange={e => set("total_marks", e.target.value)} className={inp} /></F>
                    <F label="Rank"><input type="number" value={selected.rank ?? ""} onChange={e => set("rank", e.target.value)} className={inp} /></F>
                    <F label="Status">
                      <select value={selected.result_status} onChange={e => set("result_status", e.target.value)} className={inp}>
                        {["pending", "pass", "fail", "absent"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </F>
                    <F label="Remarks" wide><input value={selected.remarks ?? ""} onChange={e => set("remarks", e.target.value)} className={inp} /></F>
                  </div>
                </div>

                <div className="bg-section rounded-2xl p-4">
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Publication</p>
                  <div className="flex flex-col gap-2.5">
                    <Toggle label="Publish Admit Card" value={selected.publish_admit_card} onChange={v => set("publish_admit_card", v)} />
                    <Toggle label="Publish Participation Certificate" value={selected.publish_participation_certificate} onChange={v => set("publish_participation_certificate", v)} />
                  </div>
                </div>

                {saveError && <p className="text-red-600 text-[13px]">{saveError}</p>}

                <div className="flex gap-3">
                  <button onClick={saveStudent} disabled={saving} className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                  <button onClick={() => setSelected(null)} className="flex-1 bg-section text-text-primary font-semibold py-3 rounded-xl hover:bg-border transition-colors">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importMode !== "" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-extrabold text-[20px] text-primary">
                {importMode === "students" ? "Import Students" : importMode === "marks" ? "Import Marks" : "Upload Test Copies"}
              </h2>
              <button onClick={closeImport} className="text-text-muted hover:text-text-primary text-[22px] leading-none">×</button>
            </div>

            {importStep === "done" ? (
              <div className="flex flex-col gap-4 items-center py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-text-primary font-semibold text-[15px]">{importResult}</p>
                <button onClick={closeImport} className="bg-primary text-white font-semibold px-8 py-2.5 rounded-xl hover:bg-primary-dark transition-colors">Done</button>
              </div>
            ) : importMode === "students" && importStep === "map" ? (
              /* Column mapping step */
              <div className="flex flex-col gap-4">
                <p className="text-text-muted text-[13px]">{importRowCount} rows detected. Map your file columns to database fields:</p>
                <div className="overflow-auto max-h-72 border border-border rounded-xl">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-section text-text-muted text-[11px] uppercase">
                        <th className="px-4 py-2.5 text-left font-semibold">File Column</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Maps To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importHeaders.map(h => (
                        <tr key={h} className="border-t border-border/30">
                          <td className="px-4 py-2 font-mono text-[12px] text-text-primary">{h}</td>
                          <td className="px-4 py-2">
                            <select
                              value={importMapping[h] ?? ""}
                              onChange={e => setImportMapping(m => ({ ...m, [h]: e.target.value }))}
                              className="border border-border rounded-lg px-2 py-1.5 text-[12px] bg-white focus:outline-none w-full"
                            >
                              {IMPORTABLE_FIELDS.map(f => (
                                <option key={f} value={f}>{f || "— skip —"}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importError && <p className="text-red-600 text-[13px]">{importError}</p>}
                <div className="flex gap-3">
                  <button onClick={importStudentsCommit} disabled={importLoading} className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark disabled:opacity-50">
                    {importLoading ? "Importing…" : "Import Now"}
                  </button>
                  <button onClick={() => setImportStep("upload")} className="px-6 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border">Back</button>
                </div>
              </div>
            ) : (
              /* Upload step */
              <div className="flex flex-col gap-4">
                {importMode === "students" && (
                  <p className="text-text-muted text-[13px]">Upload a CSV or XLSX file. Columns will be auto-detected and you can review the mapping before importing.</p>
                )}
                {importMode === "marks" && (
                  <p className="text-text-muted text-[13px]">Upload a CSV or XLSX with columns: roll_number, marks_obtained, total_marks, rank, remarks. Matches existing students by roll number.</p>
                )}
                {importMode === "copies" && (
                  <p className="text-text-muted text-[13px]">Select multiple PDF test copy files. Each filename (without extension) must match the student&apos;s roll number exactly.</p>
                )}

                {importMode === "copies" ? (
                  <label className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors">
                    <input type="file" multiple accept=".pdf" className="hidden" onChange={e => setImportFiles(e.target.files)} />
                    <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className={`text-[14px] text-center ${importFiles?.length ? "text-primary font-medium" : "text-text-muted"}`}>
                      {importFiles?.length ? `${importFiles.length} file(s) selected` : "Click to select PDF files"}
                    </span>
                  </label>
                ) : (
                  <label className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors">
                    <input type="file" accept=".csv,.xlsx,.xlsm" className="hidden" onChange={e => setImportFile(e.target.files?.[0] ?? null)} />
                    <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className={`text-[14px] text-center ${importFile ? "text-primary font-medium" : "text-text-muted"}`}>
                      {importFile ? importFile.name : "Click to select CSV or XLSX"}
                    </span>
                  </label>
                )}

                {importError && <p className="text-red-600 text-[13px]">{importError}</p>}

                <button
                  disabled={importLoading || (importMode === "copies" ? !importFiles?.length : !importFile)}
                  onClick={importMode === "students" ? importStudentsDryRun : importMode === "marks" ? importMarks : uploadTestCopies}
                  className="bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {importLoading ? "Processing…" : importMode === "students" ? "Preview Columns" : "Upload"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inp = "w-full border border-border rounded-xl px-3 py-2 text-[13px] text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 ${wide ? "col-span-2" : ""}`}>
      <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Dot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${active ? "bg-green-500" : "bg-gray-300"}`} title={active ? "Yes" : "No"} />
  );
}

function DocRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-text-muted">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-[11px] text-primary font-semibold hover:underline">View</a>
      ) : (
        <span className="text-[11px] text-text-muted/50">—</span>
      )}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-[13px] text-text-primary font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-10 h-5.5 rounded-full transition-colors relative ${value ? "bg-primary" : "bg-border"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}
