"use client";

import { useEffect, useState, useCallback } from "react";
import { mediaUrl } from "@/src/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface GalleryItem {
  id: number;
  title: string;
  category: string;
  image_url: string | null;
}

const CATEGORIES = ["All", "Action", "Ceremony", "Team"];

// Bento span pattern — repeating every 9
const BENTO: { col: string; row: string }[] = [
  { col: "col-span-2", row: "row-span-2" }, // big square
  { col: "col-span-1", row: "row-span-1" }, // small
  { col: "col-span-1", row: "row-span-2" }, // tall
  { col: "col-span-2", row: "row-span-1" }, // wide
  { col: "col-span-1", row: "row-span-1" }, // small
  { col: "col-span-1", row: "row-span-1" }, // small
  { col: "col-span-2", row: "row-span-2" }, // big square
  { col: "col-span-1", row: "row-span-2" }, // tall
  { col: "col-span-1", row: "row-span-1" }, // small
];

function getBento(i: number) {
  return BENTO[i % BENTO.length];
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const item = items[index];

  // keyboard navigation
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md px-4"
      onClick={onClose}
    >
      {/* Prev */}
      <button
        onClick={e => { e.stopPropagation(); onPrev(); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer z-10"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Image */}
      <div
        className="relative max-w-5xl w-full max-h-[85vh] flex flex-col items-center"
        onClick={e => e.stopPropagation()}
      >
        {item.image_url && (
          <img
            src={mediaUrl(item.image_url)}
            alt={item.title}
            className="w-full h-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
          />
        )}
        <div className="mt-4 text-center">
          <p className="text-white font-semibold text-[16px]">{item.title}</p>
          <p className="text-white/50 text-[12px] mt-0.5 capitalize">{item.category}</p>
        </div>
        <p className="text-white/30 text-[11px] mt-2">{index + 1} / {items.length}</p>
      </div>

      {/* Next */}
      <button
        onClick={e => { e.stopPropagation(); onNext(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer z-10"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonGrid() {
  const skels = Array.from({ length: 9 });
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-3 [grid-auto-flow:dense]"
      style={{ gridAutoRows: "200px" }}
    >
      {skels.map((_, i) => {
        const b = getBento(i);
        return (
          <div
            key={i}
            className={`${b.col} ${b.row} rounded-2xl bg-white/5 animate-pulse`}
          />
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GalleryPage() {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API}/api/gallery/`)
      .then(r => r.json())
      .then(d => setImages(Array.isArray(d) ? d : d.results ?? []))
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeCategory === "All"
    ? images
    : images.filter(img => img.category.toLowerCase() === activeCategory.toLowerCase());

  const openLightbox = useCallback((idx: number) => setLightboxIdx(idx), []);
  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevImage = useCallback(() => setLightboxIdx(i => i == null ? 0 : (i - 1 + filtered.length) % filtered.length), [filtered.length]);
  const nextImage = useCallback(() => setLightboxIdx(i => i == null ? 0 : (i + 1) % filtered.length), [filtered.length]);

  return (
    <div className="min-h-screen bg-[#070d1a] text-white">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        {/* ambient glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6D28D9]/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#fd8b00]/10 blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-12">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#fd8b00]/80 uppercase mb-3">
            Our Moments
          </p>
          <h1 className="font-heading font-extrabold text-[40px] md:text-[56px] leading-none text-white mb-4">
            Gallery
          </h1>
          <p className="text-[#94A3B8] text-[15px] max-w-xl leading-relaxed">
            Capturing the energy of our cricket matches, community events, and ceremonies.
          </p>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mt-8">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer border ${
                  activeCategory === cat
                    ? "bg-[#fd8b00] border-[#fd8b00] text-white shadow-[0_0_20px_rgba(253,139,0,0.3)]"
                    : "border-white/10 text-[#94A3B8] hover:border-white/20 hover:text-white"
                }`}
              >
                {cat}
                {cat !== "All" && (
                  <span className={`ml-1.5 text-[10px] ${activeCategory === cat ? "text-white/70" : "text-white/30"}`}>
                    {images.filter(img => img.category.toLowerCase() === cat.toLowerCase()).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10">

        {loading ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-white/30">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
            <p className="text-white/40 text-[15px]">No images in this category yet.</p>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-3 [grid-auto-flow:dense]"
            style={{ gridAutoRows: "200px" }}
          >
            {filtered.map((img, i) => {
              const b = getBento(i);
              return (
                <div
                  key={img.id}
                  className={`${b.col} ${b.row} relative rounded-2xl overflow-hidden group cursor-pointer bg-white/5`}
                  onClick={() => openLightbox(i)}
                >
                  {img.image_url ? (
                    <img
                      src={mediaUrl(img.image_url)}
                      alt={img.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-white/20">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Info on hover */}
                  <div className="absolute bottom-0 left-0 right-0 px-4 py-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <p className="text-white font-semibold text-[13px] truncate">{img.title}</p>
                    <p className="text-white/60 text-[11px] capitalize mt-0.5">{img.category}</p>
                  </div>

                  {/* Zoom icon */}
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                    </svg>
                  </div>

                  {/* Category badge on large tiles */}
                  {(b.col === "col-span-2" && b.row === "row-span-2") && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm">
                      <span className="text-white/80 text-[10px] font-semibold uppercase tracking-wider capitalize">{img.category}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Count */}
        {!loading && filtered.length > 0 && (
          <p className="text-center text-white/20 text-[12px] mt-10">
            {filtered.length} photo{filtered.length !== 1 ? "s" : ""}
            {activeCategory !== "All" && ` in ${activeCategory}`}
          </p>
        )}
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────── */}
      {lightboxIdx !== null && filtered.length > 0 && (
        <Lightbox
          items={filtered}
          index={lightboxIdx}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </div>
  );
}
