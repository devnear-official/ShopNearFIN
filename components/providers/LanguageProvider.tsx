"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Language, translations } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => translations.en[key] || String(key),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    // Read preference from cookie or localStorage
    const saved = document.cookie
      .split("; ")
      .find((row) => row.startsWith("shopnearfin_lang="))
      ?.split("=")[1] as Language;

    if (saved === "bn" || saved === "en") {
      setLanguageState(saved);
      document.documentElement.lang = saved;
      if (saved === "bn") {
        document.documentElement.classList.add("font-bangla");
      } else {
        document.documentElement.classList.remove("font-bangla");
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    document.cookie = `shopnearfin_lang=${lang}; path=/; max-age=31536000`;
    document.documentElement.lang = lang;
    if (lang === "bn") {
      document.documentElement.classList.add("font-bangla");
    } else {
      document.documentElement.classList.remove("font-bangla");
    }
  };

  const t = (key: keyof typeof translations.en): string => {
    return translations[language][key] || translations.en[key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
