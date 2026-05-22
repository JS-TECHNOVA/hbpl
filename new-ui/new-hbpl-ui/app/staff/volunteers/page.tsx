"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { token } from "../layout";
import { mediaUrl } from "@/src/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface Volunteer {
  id: number;
  name: string;
  role: string;
  description: string;
  order: number;
  image_url: string;
}

export default function VolunteersPage() {
  const [items, setItems] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Volunteer> | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  const headers = { Authorization: `Token ${token()}` };

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/admin/volunteers/`, { headers })
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : d.results ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      const fd = new FormData();
      if (editing?.name) fd.append("name", editing.name);
      if (editing?.role) fd.append("role", editing.role);
      if (editing?.description !== undefined) fd.append("description", editing.description ?? "");
      if (editing?.order !== undefined) fd.append("order", String(editing.order));
      if (imgFile) fd.append("image", imgFile);
      const url = editing?.id ? `${API}/api/admin/volunteers/${editing.id}/` : `${API}/api/admin/volunteers/`;
      await fetch(url, { method: editing?.id ? "PATCH" : "POST", headers, body: fd });
      setEditing(null); setImgFile(null); load();
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    if (!confirm("Delete this volunteer?")) return;
    await fetch(`${API}/api/admin/volunteers/${id}/`, { method: "DELETE", headers });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-[26px] text-primary">Volunteers</h1>
          <p className="text-text-muted text-[13px]">{items.length} total</p>
        </div>
        <button
          onClick={() => { setEditing({ name: "", role: "", description: "", order: 0 }); setImgFile(null); }}
          className="bg-primary text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:bg-primary-dark transition-colors"
        >
          + Add Volunteer
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-text-muted">No volunteers yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {items.map(v => (
              <div key={v.id} className="flex items-center gap-4 bg-section rounded-2xl p-4">
                {v.image_url ? (
                  <img src={mediaUrl(v.image_url)} alt={v.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="font-heading font-extrabold text-primary text-[14px]">{v.name[0]}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary text-[14px] truncate">{v.name}</p>
                  <p className="text-text-muted text-[12px] truncate">{v.role}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => { setEditing({ ...v }); setImgFile(null); }} className="text-primary text-[11px] font-semibold hover:underline">Edit</button>
                  <button onClick={() => del(v.id)} className="text-red-500 text-[11px] font-semibold hover:underline">Del</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit Volunteer" : "Add Volunteer"} onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-4">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-section overflow-hidden flex items-center justify-center shrink-0">
                {imgFile ? (
                  <img src={URL.createObjectURL(imgFile)} alt="" className="w-full h-full object-cover" />
                ) : editing.image_url ? (
                  <img src={mediaUrl(editing.image_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-text-muted text-[12px]">Photo</span>
                )}
              </div>
              <div>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => setImgFile(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => imgRef.current?.click()} className="text-primary text-[13px] font-semibold hover:underline">
                  {imgFile ? "Change photo" : "Upload photo"}
                </button>
              </div>
            </div>
            <F label="Name"><input value={editing.name ?? ""} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className={inp} /></F>
            <F label="Role"><input value={editing.role ?? ""} onChange={e => setEditing(p => ({ ...p, role: e.target.value }))} className={inp} placeholder="e.g. Event Coordinator" /></F>
            <F label="Description"><textarea value={editing.description ?? ""} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} rows={3} className={inp} /></F>
            <F label="Display Order"><input type="number" value={editing.order ?? 0} onChange={e => setEditing(p => ({ ...p, order: Number(e.target.value) }))} className={inp} /></F>
            <div className="flex gap-3 pt-2">
              <button onClick={save} disabled={saving} className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditing(null)} className="flex-1 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inp = "w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-extrabold text-[20px] text-primary">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-[22px] leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
