"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { token } from "../layout";
import { mediaUrl } from "@/src/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface Member {
  id: number;
  name: string;
  role: string;
  description: string;
  email: string;
  order: number;
  image_url: string;
}

export default function ManagementPage() {
  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Member> | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  const headers = { Authorization: `Token ${token()}` };

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/admin/management/`, { headers })
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
      if (editing?.email !== undefined) fd.append("email", editing.email ?? "");
      if (editing?.order !== undefined) fd.append("order", String(editing.order));
      if (imgFile) fd.append("image", imgFile);
      const url = editing?.id ? `${API}/api/admin/management/${editing.id}/` : `${API}/api/admin/management/`;
      await fetch(url, { method: editing?.id ? "PATCH" : "POST", headers, body: fd });
      setEditing(null); setImgFile(null); load();
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    if (!confirm("Delete this member?")) return;
    await fetch(`${API}/api/admin/management/${id}/`, { method: "DELETE", headers });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-[26px] text-primary">Management Team</h1>
          <p className="text-text-muted text-[13px]">{items.length} members</p>
        </div>
        <button
          onClick={() => { setEditing({ name: "", role: "", description: "", email: "", order: 0 }); setImgFile(null); }}
          className="bg-primary text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:bg-primary-dark transition-colors"
        >
          + Add Member
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-text-muted">No members yet.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-section text-text-muted text-[11px] uppercase tracking-wider border-b border-border/30">
                {["Photo", "Name", "Role", "Email", "Order", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(m => (
                <tr key={m.id} className="border-b border-border/20 last:border-0 hover:bg-section/40 transition-colors">
                  <td className="px-5 py-3">
                    {m.image_url ? (
                      <img src={mediaUrl(m.image_url)} alt={m.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                        <span className="font-heading font-extrabold text-primary text-[12px]">{m.name[0]}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 font-semibold text-text-primary">{m.name}</td>
                  <td className="px-5 py-3 text-text-body">{m.role}</td>
                  <td className="px-5 py-3 text-text-muted text-[12px]">{m.email || "—"}</td>
                  <td className="px-5 py-3 text-text-muted">{m.order}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => { setEditing({ ...m }); setImgFile(null); }} className="text-primary text-[12px] font-semibold hover:underline">Edit</button>
                      <button onClick={() => del(m.id)} className="text-red-500 text-[12px] font-semibold hover:underline">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-extrabold text-[20px] text-primary">{editing.id ? "Edit Member" : "Add Member"}</h2>
              <button onClick={() => setEditing(null)} className="text-text-muted hover:text-text-primary text-[22px] leading-none">×</button>
            </div>
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
              {[
                { label: "Name", field: "name" as keyof Member },
                { label: "Role / Title", field: "role" as keyof Member },
                { label: "Email", field: "email" as keyof Member },
              ].map(({ label, field }) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{label}</label>
                  <input value={String(editing[field] ?? "")} onChange={e => setEditing(p => ({ ...p, [field]: e.target.value }))} className={inp} />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Description</label>
                <textarea value={editing.description ?? ""} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} rows={3} className={inp} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Display Order</label>
                <input type="number" value={editing.order ?? 0} onChange={e => setEditing(p => ({ ...p, order: Number(e.target.value) }))} className={inp} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={save} disabled={saving} className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditing(null)} className="flex-1 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = "w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
