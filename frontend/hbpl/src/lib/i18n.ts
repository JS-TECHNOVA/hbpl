import type { Language } from "@/hooks/use-language";

export const tr = (en: string, hi: string, language: Language) =>
  language === "hi" ? hi : en;
