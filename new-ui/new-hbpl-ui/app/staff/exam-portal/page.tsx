"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { token } from "../layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

type Tab = "dates" | "schools" | "syllabus" | "papers" | "centers" | "faqs" | "toppers";

const TABS: { id: Tab; label: string }[] = [
  { id: "dates", label: "Important Dates" },
  { id: "schools", label: "Support Schools" },
  { id: "syllabus", label: "Syllabus" },
  { id: "papers", label: "Sample Papers" },
  { id: "centers", label: "Exam Centers" },
  { id: "faqs", label: "FAQs" },
  { id: "toppers", label: "Toppers" },
];

export default function ExamPortalPage() {
  const [tab, setTab] = useState<Tab>("dates");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading font-extrabold text-[26px] text-primary">Exam Portal Content</h1>
        <p className="text-text-muted text-[13px]">Manage all exam portal sections</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-border/50 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
              tab === t.id ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dates" && <DatesSection />}
      {tab === "schools" && <SchoolsSection />}
      {tab === "syllabus" && <SyllabusSection />}
      {tab === "papers" && <PapersSection />}
      {tab === "centers" && <CentersSection />}
      {tab === "faqs" && <FaqsSection />}
      {tab === "toppers" && <ToppersSection />}
    </div>
  );
}

// ── Important Dates ───────────────────────────────────────────────────────────

interface DateItem { id: number; title: string; date: string; description: string; order: number }

function DatesSection() {
  const [items, setItems] = useState<DateItem[]>([]);
  const [editing, setEditing] = useState<Partial<DateItem> | null>(null);
  const h = { Authorization: `Token ${token()}`, "Content-Type": "application/json" };
  const load = () => fetch(`${API}/api/admin/exam/important-dates/`, { headers: h }).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : d.results ?? []));
  useEffect(() => { load(); }, []);
  async function save() {
    const url = editing?.id ? `${API}/api/admin/exam/important-dates/${editing.id}/` : `${API}/api/admin/exam/important-dates/`;
    await fetch(url, { method: editing?.id ? "PATCH" : "POST", headers: h, body: JSON.stringify(editing) });
    setEditing(null); load();
  }
  async function del(id: number) {
    if (!confirm("Delete?")) return;
    await fetch(`${API}/api/admin/exam/important-dates/${id}/`, { method: "DELETE", headers: h });
    load();
  }
  return (
    <CrudSection
      title="Important Dates"
      onAdd={() => setEditing({ title: "", date: "", description: "", order: 0 })}
      items={items}
      renderRow={item => <><td className="px-5 py-3 font-semibold text-text-primary">{item.title}</td><td className="px-5 py-3 text-text-muted">{item.date}</td><td className="px-5 py-3 text-text-body truncate max-w-xs">{item.description}</td><td className="px-5 py-3 text-text-muted">{item.order}</td></>}
      cols={["Title", "Date", "Description", "Order"]}
      onEdit={item => setEditing({ ...item })}
      onDelete={item => del(item.id)}
    >
      {editing && (
        <Modal title={editing.id ? "Edit Date" : "Add Date"} onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-3">
            <F label="Title"><input value={editing.title ?? ""} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} className={inp} /></F>
            <F label="Date"><input value={editing.date ?? ""} onChange={e => setEditing(p => ({ ...p, date: e.target.value }))} className={inp} placeholder="e.g. 15 June 2025" /></F>
            <F label="Description"><textarea value={editing.description ?? ""} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} rows={2} className={inp} /></F>
            <F label="Order"><input type="number" value={editing.order ?? 0} onChange={e => setEditing(p => ({ ...p, order: Number(e.target.value) }))} className={inp} /></F>
            <SaveCancel onSave={save} onCancel={() => setEditing(null)} />
          </div>
        </Modal>
      )}
    </CrudSection>
  );
}

// ── Support Schools ───────────────────────────────────────────────────────────

interface School { id: number; name: string; principal_name: string; address: string; order: number; image_url: string }

function SchoolsSection() {
  const [items, setItems] = useState<School[]>([]);
  const [editing, setEditing] = useState<Partial<School> | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const h = { Authorization: `Token ${token()}` };
  const load = () => fetch(`${API}/api/admin/exam/support-schools/`, { headers: h }).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : d.results ?? []));
  useEffect(() => { load(); }, []);
  async function save() {
    const fd = new FormData();
    if (editing?.name) fd.append("name", editing.name);
    if (editing?.principal_name) fd.append("principal_name", editing.principal_name);
    if (editing?.address) fd.append("address", editing.address);
    if (editing?.order !== undefined) fd.append("order", String(editing.order));
    if (imgFile) fd.append("image", imgFile);
    const url = editing?.id ? `${API}/api/admin/exam/support-schools/${editing.id}/` : `${API}/api/admin/exam/support-schools/`;
    await fetch(url, { method: editing?.id ? "PATCH" : "POST", headers: h, body: fd });
    setEditing(null); setImgFile(null); load();
  }
  async function del(id: number) {
    if (!confirm("Delete?")) return;
    await fetch(`${API}/api/admin/exam/support-schools/${id}/`, { method: "DELETE", headers: h });
    load();
  }
  return (
    <CrudSection
      title="Support Schools"
      onAdd={() => { setEditing({ name: "", principal_name: "", address: "", order: 0 }); setImgFile(null); }}
      items={items}
      renderRow={item => <><td className="px-5 py-3">{item.image_url && <img src={item.image_url} className="w-8 h-8 rounded object-cover" alt="" />}</td><td className="px-5 py-3 font-semibold text-text-primary">{item.name}</td><td className="px-5 py-3 text-text-muted">{item.principal_name}</td><td className="px-5 py-3 text-text-muted">{item.order}</td></>}
      cols={["", "School", "Principal", "Order"]}
      onEdit={item => { setEditing({ ...item }); setImgFile(null); }}
      onDelete={item => del(item.id)}
    >
      {editing && (
        <Modal title={editing.id ? "Edit School" : "Add School"} onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-3">
            <F label="School Name"><input value={editing.name ?? ""} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className={inp} /></F>
            <F label="Principal Name"><input value={editing.principal_name ?? ""} onChange={e => setEditing(p => ({ ...p, principal_name: e.target.value }))} className={inp} /></F>
            <F label="Address"><input value={editing.address ?? ""} onChange={e => setEditing(p => ({ ...p, address: e.target.value }))} className={inp} /></F>
            <F label="Order"><input type="number" value={editing.order ?? 0} onChange={e => setEditing(p => ({ ...p, order: Number(e.target.value) }))} className={inp} /></F>
            <F label="Image">
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => setImgFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => imgRef.current?.click()} className="border border-dashed border-border rounded-xl px-4 py-2.5 text-[13px] text-text-muted hover:border-primary hover:text-primary transition-colors text-left">
                {imgFile ? imgFile.name : "Choose image…"}
              </button>
            </F>
            <SaveCancel onSave={save} onCancel={() => setEditing(null)} />
          </div>
        </Modal>
      )}
    </CrudSection>
  );
}

// ── Syllabus ──────────────────────────────────────────────────────────────────

interface SyllabusItem { id: number; class_name: string; title: string; description: string; order: number; pdf_url: string }

function SyllabusSection() {
  const [items, setItems] = useState<SyllabusItem[]>([]);
  const [editing, setEditing] = useState<Partial<SyllabusItem> | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const h = { Authorization: `Token ${token()}` };
  const load = () => fetch(`${API}/api/admin/exam/syllabus/`, { headers: h }).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : d.results ?? []));
  useEffect(() => { load(); }, []);
  async function save() {
    const fd = new FormData();
    if (editing?.class_name) fd.append("class_name", editing.class_name);
    if (editing?.title) fd.append("title", editing.title);
    if (editing?.description) fd.append("description", editing.description ?? "");
    if (editing?.order !== undefined) fd.append("order", String(editing.order));
    if (pdfFile) fd.append("pdf", pdfFile);
    const url = editing?.id ? `${API}/api/admin/exam/syllabus/${editing.id}/` : `${API}/api/admin/exam/syllabus/`;
    await fetch(url, { method: editing?.id ? "PATCH" : "POST", headers: h, body: fd });
    setEditing(null); setPdfFile(null); load();
  }
  async function del(id: number) {
    if (!confirm("Delete?")) return;
    await fetch(`${API}/api/admin/exam/syllabus/${id}/`, { method: "DELETE", headers: h });
    load();
  }
  return (
    <CrudSection
      title="Syllabus"
      onAdd={() => { setEditing({ class_name: "", title: "", description: "", order: 0 }); setPdfFile(null); }}
      items={items}
      renderRow={item => <><td className="px-5 py-3 font-semibold text-text-primary">Class {item.class_name}</td><td className="px-5 py-3 text-text-body">{item.title}</td><td className="px-5 py-3">{item.pdf_url && <a href={item.pdf_url} target="_blank" rel="noreferrer" className="text-primary text-[12px] hover:underline">PDF</a>}</td><td className="px-5 py-3 text-text-muted">{item.order}</td></>}
      cols={["Class", "Title", "PDF", "Order"]}
      onEdit={item => { setEditing({ ...item }); setPdfFile(null); }}
      onDelete={item => del(item.id)}
    >
      {editing && (
        <Modal title={editing.id ? "Edit Syllabus" : "Add Syllabus"} onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-3">
            <F label="Class"><input value={editing.class_name ?? ""} onChange={e => setEditing(p => ({ ...p, class_name: e.target.value }))} className={inp} placeholder="e.g. 10" /></F>
            <F label="Title"><input value={editing.title ?? ""} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} className={inp} /></F>
            <F label="Description"><textarea value={editing.description ?? ""} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} rows={2} className={inp} /></F>
            <F label="Order"><input type="number" value={editing.order ?? 0} onChange={e => setEditing(p => ({ ...p, order: Number(e.target.value) }))} className={inp} /></F>
            <F label="PDF">
              <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => pdfRef.current?.click()} className="border border-dashed border-border rounded-xl px-4 py-2.5 text-[13px] text-text-muted hover:border-primary hover:text-primary transition-colors text-left">
                {pdfFile ? pdfFile.name : "Choose PDF…"}
              </button>
            </F>
            <SaveCancel onSave={save} onCancel={() => setEditing(null)} />
          </div>
        </Modal>
      )}
    </CrudSection>
  );
}

// ── Sample Papers ─────────────────────────────────────────────────────────────

interface Paper { id: number; class_name: string; title: string; file_url: string; external_url: string; order: number }

function PapersSection() {
  const [items, setItems] = useState<Paper[]>([]);
  const [editing, setEditing] = useState<Partial<Paper> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const h = { Authorization: `Token ${token()}` };
  const load = () => fetch(`${API}/api/admin/exam/sample-papers/`, { headers: h }).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : d.results ?? []));
  useEffect(() => { load(); }, []);
  async function save() {
    const fd = new FormData();
    if (editing?.class_name) fd.append("class_name", editing.class_name);
    if (editing?.title) fd.append("title", editing.title);
    if (editing?.external_url) fd.append("external_url", editing.external_url);
    if (editing?.order !== undefined) fd.append("order", String(editing.order));
    if (file) fd.append("file", file);
    const url = editing?.id ? `${API}/api/admin/exam/sample-papers/${editing.id}/` : `${API}/api/admin/exam/sample-papers/`;
    await fetch(url, { method: editing?.id ? "PATCH" : "POST", headers: h, body: fd });
    setEditing(null); setFile(null); load();
  }
  async function del(id: number) {
    if (!confirm("Delete?")) return;
    await fetch(`${API}/api/admin/exam/sample-papers/${id}/`, { method: "DELETE", headers: h });
    load();
  }
  return (
    <CrudSection
      title="Sample Papers"
      onAdd={() => { setEditing({ class_name: "", title: "", external_url: "", order: 0 }); setFile(null); }}
      items={items}
      renderRow={item => <><td className="px-5 py-3 font-semibold text-text-primary">Class {item.class_name}</td><td className="px-5 py-3 text-text-body">{item.title}</td><td className="px-5 py-3">{(item.file_url || item.external_url) && <a href={item.file_url || item.external_url} target="_blank" rel="noreferrer" className="text-primary text-[12px] hover:underline">Link</a>}</td><td className="px-5 py-3 text-text-muted">{item.order}</td></>}
      cols={["Class", "Title", "File", "Order"]}
      onEdit={item => { setEditing({ ...item }); setFile(null); }}
      onDelete={item => del(item.id)}
    >
      {editing && (
        <Modal title={editing.id ? "Edit Paper" : "Add Paper"} onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-3">
            <F label="Class"><input value={editing.class_name ?? ""} onChange={e => setEditing(p => ({ ...p, class_name: e.target.value }))} className={inp} /></F>
            <F label="Title"><input value={editing.title ?? ""} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} className={inp} /></F>
            <F label="External URL"><input value={editing.external_url ?? ""} onChange={e => setEditing(p => ({ ...p, external_url: e.target.value }))} className={inp} placeholder="https://…" /></F>
            <F label="Order"><input type="number" value={editing.order ?? 0} onChange={e => setEditing(p => ({ ...p, order: Number(e.target.value) }))} className={inp} /></F>
            <F label="Or upload file">
              <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileRef.current?.click()} className="border border-dashed border-border rounded-xl px-4 py-2.5 text-[13px] text-text-muted hover:border-primary hover:text-primary transition-colors text-left">
                {file ? file.name : "Choose file…"}
              </button>
            </F>
            <SaveCancel onSave={save} onCancel={() => setEditing(null)} />
          </div>
        </Modal>
      )}
    </CrudSection>
  );
}

// ── Exam Centers ──────────────────────────────────────────────────────────────

interface Center { id: number; name: string; address: string; form_range_start: string; form_range_end: string; roll_range_start: string; roll_range_end: string; order: number }

function CentersSection() {
  const [items, setItems] = useState<Center[]>([]);
  const [editing, setEditing] = useState<Partial<Center> | null>(null);
  const h = { Authorization: `Token ${token()}`, "Content-Type": "application/json" };
  const load = () => fetch(`${API}/api/admin/exam/centers/`, { headers: h }).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : d.results ?? []));
  useEffect(() => { load(); }, []);
  async function save() {
    const url = editing?.id ? `${API}/api/admin/exam/centers/${editing.id}/` : `${API}/api/admin/exam/centers/`;
    await fetch(url, { method: editing?.id ? "PATCH" : "POST", headers: h, body: JSON.stringify(editing) });
    setEditing(null); load();
  }
  async function del(id: number) {
    if (!confirm("Delete?")) return;
    await fetch(`${API}/api/admin/exam/centers/${id}/`, { method: "DELETE", headers: h });
    load();
  }
  return (
    <CrudSection
      title="Exam Centers"
      onAdd={() => setEditing({ name: "", address: "", form_range_start: "", form_range_end: "", roll_range_start: "", roll_range_end: "", order: 0 })}
      items={items}
      renderRow={item => <><td className="px-5 py-3 font-semibold text-text-primary">{item.name}</td><td className="px-5 py-3 text-text-muted max-w-xs truncate">{item.address}</td><td className="px-5 py-3 text-text-muted text-[12px]">{item.form_range_start}–{item.form_range_end}</td><td className="px-5 py-3 text-text-muted text-[12px]">{item.roll_range_start}–{item.roll_range_end}</td></>}
      cols={["Center", "Address", "Form Range", "Roll Range"]}
      onEdit={item => setEditing({ ...item })}
      onDelete={item => del(item.id)}
    >
      {editing && (
        <Modal title={editing.id ? "Edit Center" : "Add Center"} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-2 gap-3">
            <F label="Center Name" wide><input value={editing.name ?? ""} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className={inp} /></F>
            <F label="Address" wide><input value={editing.address ?? ""} onChange={e => setEditing(p => ({ ...p, address: e.target.value }))} className={inp} /></F>
            <F label="Form Range Start"><input value={editing.form_range_start ?? ""} onChange={e => setEditing(p => ({ ...p, form_range_start: e.target.value }))} className={inp} /></F>
            <F label="Form Range End"><input value={editing.form_range_end ?? ""} onChange={e => setEditing(p => ({ ...p, form_range_end: e.target.value }))} className={inp} /></F>
            <F label="Roll Range Start"><input value={editing.roll_range_start ?? ""} onChange={e => setEditing(p => ({ ...p, roll_range_start: e.target.value }))} className={inp} /></F>
            <F label="Roll Range End"><input value={editing.roll_range_end ?? ""} onChange={e => setEditing(p => ({ ...p, roll_range_end: e.target.value }))} className={inp} /></F>
            <F label="Order"><input type="number" value={editing.order ?? 0} onChange={e => setEditing(p => ({ ...p, order: Number(e.target.value) }))} className={inp} /></F>
          </div>
          <div className="mt-4"><SaveCancel onSave={save} onCancel={() => setEditing(null)} /></div>
        </Modal>
      )}
    </CrudSection>
  );
}

// ── FAQs ──────────────────────────────────────────────────────────────────────

interface FAQ { id: number; question: string; answer: string; order: number }

function FaqsSection() {
  const [items, setItems] = useState<FAQ[]>([]);
  const [editing, setEditing] = useState<Partial<FAQ> | null>(null);
  const h = { Authorization: `Token ${token()}`, "Content-Type": "application/json" };
  const load = () => fetch(`${API}/api/admin/exam/faqs/`, { headers: h }).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : d.results ?? []));
  useEffect(() => { load(); }, []);
  async function save() {
    const url = editing?.id ? `${API}/api/admin/exam/faqs/${editing.id}/` : `${API}/api/admin/exam/faqs/`;
    await fetch(url, { method: editing?.id ? "PATCH" : "POST", headers: h, body: JSON.stringify(editing) });
    setEditing(null); load();
  }
  async function del(id: number) {
    if (!confirm("Delete?")) return;
    await fetch(`${API}/api/admin/exam/faqs/${id}/`, { method: "DELETE", headers: h });
    load();
  }
  return (
    <CrudSection
      title="FAQs"
      onAdd={() => setEditing({ question: "", answer: "", order: 0 })}
      items={items}
      renderRow={item => <><td className="px-5 py-3 font-semibold text-text-primary max-w-xs truncate">{item.question}</td><td className="px-5 py-3 text-text-muted max-w-sm truncate">{item.answer}</td><td className="px-5 py-3 text-text-muted">{item.order}</td></>}
      cols={["Question", "Answer", "Order"]}
      onEdit={item => setEditing({ ...item })}
      onDelete={item => del(item.id)}
    >
      {editing && (
        <Modal title={editing.id ? "Edit FAQ" : "Add FAQ"} onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-3">
            <F label="Question"><textarea value={editing.question ?? ""} onChange={e => setEditing(p => ({ ...p, question: e.target.value }))} rows={2} className={inp} /></F>
            <F label="Answer"><textarea value={editing.answer ?? ""} onChange={e => setEditing(p => ({ ...p, answer: e.target.value }))} rows={4} className={inp} /></F>
            <F label="Order"><input type="number" value={editing.order ?? 0} onChange={e => setEditing(p => ({ ...p, order: Number(e.target.value) }))} className={inp} /></F>
            <SaveCancel onSave={save} onCancel={() => setEditing(null)} />
          </div>
        </Modal>
      )}
    </CrudSection>
  );
}

// ── Toppers ───────────────────────────────────────────────────────────────────

interface Topper { id: number; student_name: string; roll_number: string; class_name: string; marks: string; rank: number; highlight_text: string }

function ToppersSection() {
  const [items, setItems] = useState<Topper[]>([]);
  const [editing, setEditing] = useState<Partial<Topper> | null>(null);
  const h = { Authorization: `Token ${token()}`, "Content-Type": "application/json" };
  const load = () => fetch(`${API}/api/admin/exam/toppers/`, { headers: h }).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : d.results ?? []));
  useEffect(() => { load(); }, []);
  async function save() {
    const url = editing?.id ? `${API}/api/admin/exam/toppers/${editing.id}/` : `${API}/api/admin/exam/toppers/`;
    await fetch(url, { method: editing?.id ? "PATCH" : "POST", headers: h, body: JSON.stringify(editing) });
    setEditing(null); load();
  }
  async function del(id: number) {
    if (!confirm("Delete?")) return;
    await fetch(`${API}/api/admin/exam/toppers/${id}/`, { method: "DELETE", headers: h });
    load();
  }
  return (
    <CrudSection
      title="Toppers"
      onAdd={() => setEditing({ student_name: "", roll_number: "", class_name: "", marks: "", rank: 1, highlight_text: "" })}
      items={items}
      renderRow={item => <><td className="px-5 py-3 text-center font-heading font-extrabold text-primary">{item.rank}</td><td className="px-5 py-3 font-semibold text-text-primary">{item.student_name}</td><td className="px-5 py-3 text-text-muted">{item.roll_number}</td><td className="px-5 py-3 text-text-muted">Class {item.class_name}</td><td className="px-5 py-3 text-text-body">{item.marks}</td></>}
      cols={["Rank", "Student", "Roll No.", "Class", "Marks"]}
      onEdit={item => setEditing({ ...item })}
      onDelete={item => del(item.id)}
    >
      {editing && (
        <Modal title={editing.id ? "Edit Topper" : "Add Topper"} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-2 gap-3">
            <F label="Rank"><input type="number" value={editing.rank ?? 1} onChange={e => setEditing(p => ({ ...p, rank: Number(e.target.value) }))} className={inp} /></F>
            <F label="Student Name"><input value={editing.student_name ?? ""} onChange={e => setEditing(p => ({ ...p, student_name: e.target.value }))} className={inp} /></F>
            <F label="Roll Number"><input value={editing.roll_number ?? ""} onChange={e => setEditing(p => ({ ...p, roll_number: e.target.value }))} className={inp} /></F>
            <F label="Class"><input value={editing.class_name ?? ""} onChange={e => setEditing(p => ({ ...p, class_name: e.target.value }))} className={inp} /></F>
            <F label="Marks"><input value={editing.marks ?? ""} onChange={e => setEditing(p => ({ ...p, marks: e.target.value }))} className={inp} /></F>
            <F label="Highlight Text"><input value={editing.highlight_text ?? ""} onChange={e => setEditing(p => ({ ...p, highlight_text: e.target.value }))} className={inp} placeholder="e.g. District Topper" /></F>
          </div>
          <div className="mt-4"><SaveCancel onSave={save} onCancel={() => setEditing(null)} /></div>
        </Modal>
      )}
    </CrudSection>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

const inp = "w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 ${wide ? "col-span-2" : ""}`}>
      <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function SaveCancel({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onSave} className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark transition-colors">Save</button>
      <button onClick={onCancel} className="flex-1 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border transition-colors">Cancel</button>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-7 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-extrabold text-[18px] text-primary">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-[22px] leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CrudSection<T extends { id: number }>({
  title, onAdd, items, renderRow, cols, onEdit, onDelete, children,
}: {
  title: string;
  onAdd: () => void;
  items: T[];
  renderRow: (item: T) => React.ReactNode;
  cols: string[];
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-text-primary text-[15px]">{title} <span className="text-text-muted font-normal text-[13px]">({items.length})</span></p>
        <button onClick={onAdd} className="bg-primary text-white px-4 py-2 rounded-xl text-[13px] font-semibold hover:bg-primary-dark transition-colors">+ Add</button>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden">
        {items.length === 0 ? (
          <p className="py-12 text-center text-text-muted text-[13px]">No entries yet.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-section text-text-muted text-[11px] uppercase tracking-wider border-b border-border/30">
                {cols.map(c => <th key={c} className="px-5 py-3 text-left font-semibold">{c}</th>)}
                <th className="px-5 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-border/20 last:border-0 hover:bg-section/40 transition-colors">
                  {renderRow(item)}
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => onEdit(item)} className="text-primary text-[12px] font-semibold hover:underline">Edit</button>
                      <button onClick={() => onDelete(item)} className="text-red-500 text-[12px] font-semibold hover:underline">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {children}
    </div>
  );
}
