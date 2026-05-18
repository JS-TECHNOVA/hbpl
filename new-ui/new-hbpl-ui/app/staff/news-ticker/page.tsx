"use client";

import { useEffect, useState, useCallback } from "react";
import { token } from "../layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface TickerItem {
  id: number;
  text: string;
  link: string;
  is_active: boolean;
  order: number;
}

export default function NewsTickerPage() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<TickerItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Token ${token()}`, "Content-Type": "application/json" };

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/admin/news-ticker/`, { headers })
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : d.results ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      const url = editing?.id ? `${API}/api/admin/news-ticker/${editing.id}/` : `${API}/api/admin/news-ticker/`;
      await fetch(url, { method: editing?.id ? "PATCH" : "POST", headers, body: JSON.stringify(editing) });
      setEditing(null); load();
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    if (!confirm("Delete this ticker item?")) return;
    await fetch(`${API}/api/admin/news-ticker/${id}/`, { method: "DELETE", headers });
    load();
  }

  async function toggleActive(item: TickerItem) {
    await fetch(`${API}/api/admin/news-ticker/${item.id}/`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-[26px] text-primary">News Ticker</h1>
          <p className="text-text-muted text-[13px]">{items.filter(i => i.is_active).length} active · {items.length} total</p>
        </div>
        <button
          onClick={() => setEditing({ text: "", link: "", is_active: true, order: 0 })}
          className="bg-primary text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold hover:bg-primary-dark transition-colors"
        >
          + Add Item
        </button>
      </div>

      {/* Preview */}
      {items.filter(i => i.is_active).length > 0 && (
        <div className="bg-[#0f172a] rounded-2xl px-5 py-3 overflow-hidden">
          <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest mb-1.5">Live Preview</p>
          <div className="text-white text-[13px] truncate">
            {items.filter(i => i.is_active).map(i => i.text).join("  ·  ")}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-text-muted">No ticker items yet.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-section text-text-muted text-[11px] uppercase tracking-wider border-b border-border/30">
                {["Text", "Link", "Order", "Active", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.sort((a, b) => a.order - b.order).map(item => (
                <tr key={item.id} className="border-b border-border/20 last:border-0 hover:bg-section/40 transition-colors">
                  <td className="px-5 py-3 text-text-primary font-medium max-w-sm truncate">{item.text}</td>
                  <td className="px-5 py-3 text-text-muted text-[12px] max-w-xs truncate">{item.link || "—"}</td>
                  <td className="px-5 py-3 text-text-muted">{item.order}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(item)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${item.is_active ? "bg-primary" : "bg-border"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${item.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => setEditing({ ...item })} className="text-primary text-[12px] font-semibold hover:underline">Edit</button>
                      <button onClick={() => del(item.id)} className="text-red-500 text-[12px] font-semibold hover:underline">Del</button>
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
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-extrabold text-[20px] text-primary">{editing.id ? "Edit Ticker Item" : "Add Ticker Item"}</h2>
              <button onClick={() => setEditing(null)} className="text-text-muted hover:text-text-primary text-[22px] leading-none">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Ticker Text</label>
                <textarea
                  value={editing.text ?? ""}
                  onChange={e => setEditing(p => ({ ...p, text: e.target.value }))}
                  rows={3}
                  className={inp}
                  placeholder="Breaking: HBPL Season 2025 registration now open!"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Link URL (optional)</label>
                <input value={editing.link ?? ""} onChange={e => setEditing(p => ({ ...p, link: e.target.value }))} className={inp} placeholder="/cricket/register" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Display Order</label>
                  <input type="number" value={editing.order ?? 0} onChange={e => setEditing(p => ({ ...p, order: Number(e.target.value) }))} className={inp} />
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setEditing(p => ({ ...p, is_active: !p?.is_active }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${editing.is_active ? "bg-primary" : "bg-border"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editing.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                    <span className="text-[13px] font-medium text-text-primary">Active</span>
                  </label>
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

const inp = "w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
