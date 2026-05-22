"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { token } from "../layout";
import { mediaUrl } from "@/src/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface GalleryItem {
  id: number;
  title: string;
  category: string;
  image_url: string;
  order: number;
}

const CATEGORIES = ["action", "ceremony", "team", "other"];

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<GalleryItem> | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("");
  const imgRef = useRef<HTMLInputElement>(null);

  const headers = { Authorization: `Token ${token()}` };

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/admin/gallery/?limit=200`, { headers })
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : d.results ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      const fd = new FormData();
      if (editing?.title !== undefined) fd.append("title", editing.title ?? "");
      if (editing?.category) fd.append("category", editing.category);
      if (editing?.order !== undefined) fd.append("order", String(editing.order));
      if (imgFile) fd.append("image", imgFile);
      const url = editing?.id ? `${API}/api/admin/gallery/${editing.id}/` : `${API}/api/admin/gallery/`;
      await fetch(url, { method: editing?.id ? "PATCH" : "POST", headers, body: fd });
      setEditing(null); setImgFile(null); load();
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    if (!confirm("Delete this image?")) return;
    await fetch(`${API}/api/admin/gallery/${id}/`, { method: "DELETE", headers });
    load();
  }

  const filtered = filterCat ? items.filter(i => i.category === filterCat) : items;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-extrabold text-[26px] text-primary">Gallery</h1>
          <p className="text-text-muted text-[13px]">{items.length} images</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border border-border rounded-xl px-3 py-2.5 text-[13px] bg-white focus:outline-none">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => { setEditing({ title: "", category: "action", order: 0 }); setImgFile(null); }}
            className="bg-primary text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:bg-primary-dark transition-colors"
          >
            + Upload Image
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-text-muted">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-text-muted">No images yet.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="group relative rounded-2xl overflow-hidden bg-section aspect-square shadow-sm">
              {item.image_url && (
                <img src={mediaUrl(item.image_url)} alt={item.title} className="w-full h-full object-cover" />
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button onClick={() => { setEditing({ ...item }); setImgFile(null); }} className="bg-white text-primary text-[12px] font-semibold px-4 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors">Edit</button>
                <button onClick={() => del(item.id)} className="bg-red-600 text-white text-[12px] font-semibold px-4 py-1.5 rounded-lg hover:bg-red-700 transition-colors">Delete</button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                <p className="text-white text-[11px] font-semibold truncate">{item.title}</p>
                <p className="text-white/60 text-[10px] capitalize">{item.category}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-extrabold text-[20px] text-primary">{editing.id ? "Edit Image" : "Upload Image"}</h2>
              <button onClick={() => setEditing(null)} className="text-text-muted hover:text-text-primary text-[22px] leading-none">×</button>
            </div>
            <div className="flex flex-col gap-4">
              {/* Preview */}
              <div className="aspect-video bg-section rounded-2xl overflow-hidden flex items-center justify-center">
                {imgFile ? (
                  <img src={URL.createObjectURL(imgFile)} alt="" className="w-full h-full object-cover" />
                ) : editing.image_url ? (
                  <img src={mediaUrl(editing.image_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <p className="text-text-muted text-[13px]">No image selected</p>
                )}
              </div>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => setImgFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => imgRef.current?.click()} className="border border-dashed border-border rounded-xl px-4 py-3 text-[13px] text-text-muted hover:border-primary hover:text-primary transition-colors">
                {imgFile ? imgFile.name : "Choose image…"}
              </button>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Title</label>
                <input value={editing.title ?? ""} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} className="border border-border rounded-xl px-3 py-2.5 text-[13px] bg-page focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Category</label>
                  <select value={editing.category ?? "action"} onChange={e => setEditing(p => ({ ...p, category: e.target.value }))} className="border border-border rounded-xl px-3 py-2.5 text-[13px] bg-page focus:outline-none capitalize">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="w-24 flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Order</label>
                  <input type="number" value={editing.order ?? 0} onChange={e => setEditing(p => ({ ...p, order: Number(e.target.value) }))} className="border border-border rounded-xl px-3 py-2.5 text-[13px] bg-page focus:outline-none" />
                </div>
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
