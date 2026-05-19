"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Moon, Sun, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import hbplLogo from "@/assets/hbpl_logo-removebg-preview.png";
import { useLanguage } from "@/hooks/use-language";
import NewsTicker from "@/components/NewsTicker";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(9);
  const pathname = usePathname();
  const { language, toggleLanguage } = useLanguage();
  const navSlotRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const measureRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const moreMeasureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("theme");
    setIsDark(saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches));
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      window.localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      window.localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const navLinks = [
    { name: { en: "Home", hi: "होम" }, path: "/" },
    { name: { en: "About", hi: "हमारे बारे में" }, path: "/about" },
    { name: { en: "Management", hi: "प्रबंधन" }, path: "/management" },
    { name: { en: "Teams", hi: "टीमें" }, path: "/teams" },
    { name: { en: "Schedule", hi: "कार्यक्रम" }, path: "/schedule" },
    { name: { en: "Previous Session", hi: "पिछला सत्र" }, path: "/hbpl-2025" },
    { name: { en: "Gallery", hi: "गैलरी" }, path: "/gallery" },
    { name: { en: "Community Volunteer", hi: "समुदाय स्वयंसेवक" }, path: "/volunteer" },
    { name: { en: "Exam Portal", hi: "परीक्षा पोर्टल" }, path: "/exam-portal" },
  ];

  const labels = useMemo(
    () => navLinks.map((link) => (language === "hi" ? link.name.hi : link.name.en)),
    [language]
  );

  const visibleLinks = navLinks.slice(0, visibleCount);
  const overflowLinks = navLinks.slice(visibleCount);

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    const recalculateMenu = () => {
      const slotWidth = navSlotRef.current?.clientWidth ?? 0;
      if (!slotWidth) {
        setVisibleCount(navLinks.length);
        return;
      }

      const itemWidths = labels.map((_, idx) => measureRefs.current[idx]?.offsetWidth ?? 120);
      const gap = 8;
      const moreWidth = moreMeasureRef.current?.offsetWidth ?? 92;

      let used = 0;
      let count = 0;

      for (let i = 0; i < itemWidths.length; i += 1) {
        const nextGap = count > 0 ? gap : 0;
        const remaining = itemWidths.length - (i + 1);
        const reserveForMore = remaining > 0 ? moreWidth + gap : 0;

        if (used + nextGap + itemWidths[i] + reserveForMore <= slotWidth) {
          used += nextGap + itemWidths[i];
          count += 1;
        } else {
          break;
        }
      }

      setVisibleCount(Math.max(0, count));
    };

    recalculateMenu();
    const ro = new ResizeObserver(recalculateMenu);
    if (navSlotRef.current) {
      ro.observe(navSlotRef.current);
    }
    window.addEventListener("resize", recalculateMenu);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalculateMenu);
    };
  }, [labels, navLinks.length]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!moreMenuRef.current) return;
      const target = event.target as Node;
      if (!moreMenuRef.current.contains(target)) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 group">
          <motion.img
            src={hbplLogo.src}
            alt="HBPL Logo"
            className="h-12 w-12 rounded-full bg-white/5 p-1 shadow-md"
            initial={{ rotate: 0 }}
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
          <div>
            <motion.h1
              className="text-2xl font-extrabold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
              whileHover={{ scale: 1.05 }}
            >
              HBPL
            </motion.h1>
            <p className="text-xs text-muted-foreground tracking-wide">Premier League</p>
          </div>
        </Link>

        {/* Desktop Navigation (Greedy Menu) */}
        <div className="hidden md:flex min-w-0 flex-1 mx-4">
          <div ref={navSlotRef} className="flex items-center gap-2 min-w-0 w-full justify-center">
          {visibleLinks.map((link) => (
            <motion.div key={link.path} whileHover={{ y: -2 }}>
              <Link
                href={link.path}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  isActive(link.path)
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-foreground hover:text-primary hover:bg-muted/40"
                }`}
              >
                {language === "hi" ? link.name.hi : link.name.en}
              </Link>
            </motion.div>
          ))}

          {overflowLinks.length > 0 && (
            <div className="relative" ref={moreMenuRef}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsMoreOpen((prev) => !prev)}
                className="px-4 py-2 rounded-lg font-medium text-foreground hover:text-primary hover:bg-muted/40"
              >
                More <ChevronDown className="ml-1 h-4 w-4" />
              </Button>

              <AnimatePresence>
                {isMoreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 min-w-[220px] rounded-xl border border-border bg-background/95 backdrop-blur-md shadow-lg p-2 z-50"
                  >
                    {overflowLinks.map((link) => (
                      <Link
                        key={link.path}
                        href={link.path}
                        onClick={() => setIsMoreOpen(false)}
                        className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive(link.path)
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted hover:text-primary"
                        }`}
                      >
                        {language === "hi" ? link.name.hi : link.name.en}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          </div>
        </div>

        {/* Actions (Language + Dark Mode + Menu) */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="rounded-full hover:bg-muted transition-all text-xs font-semibold"
            aria-label={language === "hi" ? "Switch to English" : "हिंदी में बदलें"}
          >
            {language === "hi" ? "EN" : "हिं"}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
            className="rounded-full hover:bg-muted transition-all"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5 text-blue-500" />
            )}
          </Button>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </nav>

      {/* Hidden size measurement row for greedy menu calculations */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none invisible flex items-center gap-2" aria-hidden>
        {labels.map((label, idx) => (
          <span
            key={`measure-${navLinks[idx].path}`}
            ref={(el) => {
              measureRefs.current[idx] = el;
            }}
            className="px-4 py-2 rounded-lg font-medium whitespace-nowrap"
          >
            {label}
          </span>
        ))}
        <span ref={moreMeasureRef} className="px-4 py-2 rounded-lg font-medium whitespace-nowrap">More</span>
      </div>

      <NewsTicker />

      {/* ===== Mobile Menu (Animated) ===== */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="md:hidden bg-background border-t border-border px-4 py-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-center font-medium transition-all duration-300 ${
                    isActive(link.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted hover:text-primary"
                  }`}
                >
                  {language === "hi" ? link.name.hi : link.name.en}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
