"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type Lang = "ro" | "en"

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (ro: string, en: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "ro",
  setLang: () => {},
  t: (ro) => ro,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ro")
  const t = (ro: string, en: string) => (lang === "ro" ? ro : en)
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
