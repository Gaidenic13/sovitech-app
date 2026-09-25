"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { roleCopy } from "@/lib/role-copy"
import { HeroField } from "@/components/hero-field"
import {
  forPersona,
  hrefFor,
  personaMeta,
  type Persona,
  type RouteEntry,
  type Section,
} from "@/lib/site-routes"

const sectionLabels: Record<Section, { ro: string; en: string }> = {
  ghid: { ro: "Ghiduri", en: "Guides" },
  resurse: { ro: "Articole", en: "Articles" },
  instrumente: { ro: "Instrumente", en: "Tools" },
  pentru: { ro: "Roluri", en: "Roles" },
  expertiza: { ro: "Sectoare", en: "Sectors" },
  servicii: { ro: "Servicii", en: "Services" },
}

const order: Section[] = ["servicii", "ghid", "resurse", "instrumente", "expertiza"]

export function RolePage({ persona }: { persona: Persona }) {
  const { t } = useLanguage()
  const meta = personaMeta[persona]
  const copy = roleCopy[persona]
  const tagged = forPersona(persona)

  const groups = order
    .map((section) => ({
      section,
      items: tagged.filter((e) => e.section === section),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <section className="bg-[#07201C] section-l relative overflow-hidden">
        <HeroField />
        <div className="container-site relative z-10">
          <Link
            href="/pentru"
            className="text-sm font-medium text-[#C8E6C9] hover:text-white transition-colors duration-300"
          >
            ← {t("Toate rolurile", "All roles")}
          </Link>
          <h1 className="text-4xl md:text-6xl font-light text-white tracking-tighter mt-6 max-w-3xl">
            {t(meta.roleRo, meta.roleEn)}
          </h1>
          <p className="text-lg md:text-xl text-[#C8E6C9] font-light mt-5 max-w-2xl leading-relaxed">
            „{t(meta.questionRo, meta.questionEn)}”
          </p>
        </div>
      </section>

      {copy && (
        <section className="bg-white border-b border-[#0D2E2B]/8 section-m">
          <div className="container-site">
            <p className="text-lg md:text-xl font-light text-[#0D2E2B] leading-relaxed max-w-3xl">
              {t(copy.introRo, copy.introEn)}
            </p>
            {copy.painsRo && copy.painsRo.length > 0 && (
              <div className="mt-10">
                <p className="section-label mb-5">• {t("Pe scurt", "At a glance")}</p>
                <ul className="grid gap-x-10 gap-y-4 md:grid-cols-2">
                  {copy.painsRo.map((pain, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-[9px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#1F6B4A]" aria-hidden />
                      <span className="text-sm font-light text-[#0D2E2B]/80 leading-relaxed">
                        {t(pain, copy.painsEn?.[i] ?? pain)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section-l">
        <div className="container-site flex flex-col gap-14">
          {groups.map((g) => (
            <div key={g.section}>
              <p className="section-label mb-5">
                • {t(sectionLabels[g.section].ro, sectionLabels[g.section].en)}
              </p>
              <ul className="divide-y divide-[#0D2E2B]/8 border-t border-[#0D2E2B]/8">
                {g.items.map((e) => (
                  <li key={`${e.section}/${e.slug}`}>
                    <Row entry={e} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#0D2E2B] section-l">
        <div className="container-site">
          <h2 className="text-3xl md:text-4xl font-light text-white tracking-tighter max-w-2xl">
            {t(
              "Discută situația concretă cu un inginer Sovitech",
              "Talk your specific situation through with a Sovitech engineer",
            )}
          </h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/cerere-oferta" className="btn-sovitech-ghost">
              {t("Cere o evaluare", "Request an assessment")}
            </Link>
            <Link href="/contact" className="btn-sovitech-ghost">
              {t("Contact", "Contact")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function Row({ entry }: { entry: RouteEntry }) {
  const { t } = useLanguage()

  const body = (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
      <span className="text-base font-light text-[#0D2E2B]">{t(entry.titleRo, entry.titleEn)}</span>
      <span className="text-sm text-[#888888] font-light sm:text-right sm:max-w-md">
        {t(entry.descRo, entry.descEn)}
      </span>
    </div>
  )

  if (entry.status === "planned") return body

  return (
    <Link href={hrefFor(entry)} className="group block">
      <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
        <span className="inline-flex items-center gap-2 text-base font-light text-[#0D2E2B]">
          {t(entry.titleRo, entry.titleEn)}
          <ArrowRight className="h-4 w-4 text-[#1F6B4A] transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
        <span className="text-sm text-[#888888] font-light sm:text-right sm:max-w-md">
          {t(entry.descRo, entry.descEn)}
        </span>
      </div>
    </Link>
  )
}
