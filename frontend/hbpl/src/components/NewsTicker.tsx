"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTickerItems, type TickerItem } from "@/lib/api";

export default function NewsTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    fetchTickerItems()
      .then((data) =>
        setItems(data.filter((i) => i.is_active).sort((a, b) => a.order - b.order))
      )
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  const repeated = [...items, ...items, ...items];
  const duration = Math.max(20, items.length * 10);

  return (
    <div className="w-full relative flex items-stretch overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-green-500/30">
      <style>{`
        @keyframes ticker-move {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 3)); }
        }
        .ticker-inner {
          animation: ticker-move ${duration}s linear infinite;
          will-change: transform;
        }
        .ticker-inner:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* LIVE badge */}
      <div className="relative z-20 flex-shrink-0 flex items-center gap-2 px-4 bg-green-600 shadow-[4px_0_12px_rgba(0,0,0,0.4)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <span className="text-white font-black text-[10px] tracking-[0.2em] uppercase whitespace-nowrap">
          Live News
        </span>
        {/* Arrow tip */}
        <div className="absolute right-0 top-0 h-full w-3 translate-x-full">
          <svg viewBox="0 0 12 100%" preserveAspectRatio="none" className="h-full w-full fill-green-600">
            <polygon points="0,0 12,50 0,100" />
          </svg>
        </div>
      </div>

      {/* Scrolling content */}
      <div className="flex-1 overflow-hidden relative min-w-0">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />

        <div className="ticker-inner flex items-center py-2">
          {repeated.map((item, idx) => (
            <span key={`${item.id}-${idx}`} className="inline-flex items-center flex-shrink-0">
              {item.link ? (
                <Link
                  href={item.link}
                  target={item.link.startsWith("http") ? "_blank" : undefined}
                  rel={item.link.startsWith("http") ? "noreferrer" : undefined}
                  className="px-5 text-sm text-slate-200 hover:text-green-400 transition-colors duration-200 whitespace-nowrap font-medium cursor-pointer"
                >
                  {item.text}
                </Link>
              ) : (
                <span className="px-5 text-sm text-slate-200 whitespace-nowrap font-medium">
                  {item.text}
                </span>
              )}
              <span className="text-green-500 text-xs mx-1 flex-shrink-0" aria-hidden>
                🏏
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
