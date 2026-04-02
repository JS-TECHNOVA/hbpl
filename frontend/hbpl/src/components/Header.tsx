"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import hbplLogo from "@/assets/hbpl_logo-removebg-preview.png";
import { useLanguage } from "@/hooks/use-language";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();
  const { language, toggleLanguage } = useLanguage();

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

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border shadow-sm">
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

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
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
            className="md:hidden rounded-full"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </nav>

      {/* ===== Mobile Menu (Animated) ===== */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="md:hidden bg-background/95 backdrop-blur-md border-t border-border px-4 py-4"
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
