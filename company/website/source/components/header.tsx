"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calculator } from "lucide-react"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { useLanguage } from "@/lib/language-context"

// ─── Navigation data ──────────────────────────────────────────────────────────

type NavLink = { href: string; labelRo: string; labelEn: string; descRo?: string; descEn?: string }
type NavGroup = { labelRo: string; labelEn: string; twoColumns?: boolean; links: NavLink[] }

const navGroups: NavGroup[] = [
  {
    labelRo: "Servicii",
    labelEn: "Services",
    twoColumns: true,
    links: [
      { href: "/servicii", labelRo: "Servicii BMS Complete", labelEn: "Complete BMS Services", descRo: "Parcursul complet, de la consultanță la mentenanță", descEn: "The full journey from consultation to maintenance" },
      { href: "/servicii#proiectare", labelRo: "Proiectare BMS", labelEn: "BMS Design", descRo: "Proiectarea completă a sistemelor de automatizare", descEn: "Full design of automation systems" },
      { href: "/servicii#executie", labelRo: "Execuție Sisteme", labelEn: "System Installation", descRo: "Implementare profesională a sistemelor BMS", descEn: "Professional BMS system implementation" },
      { href: "/servicii#integrare", labelRo: "Integrare Sisteme", labelEn: "Systems Integration", descRo: "Integrare KNX, DALI, Modbus, M-Bus", descEn: "KNX, DALI, Modbus, M-Bus integration" },
    ],
  },
  {
    labelRo: "Sectoare",
    labelEn: "Sectors",
    links: [
      { href: "/sectoare", labelRo: "Toate Sectoarele", labelEn: "All Sectors", descRo: "Expertiză BMS în toate industriile", descEn: "BMS expertise across all industries" },
      { href: "/sectoare/civil", labelRo: "Civil & Birouri", labelEn: "Civil & Office", descRo: "Clădiri de birouri și spații comerciale", descEn: "Office buildings and commercial spaces" },
      { href: "/sectoare/medical", labelRo: "Medical & Farma", labelEn: "Medical & Pharma", descRo: "Facilități medicale și producție farmaceutică", descEn: "Medical facilities and pharmaceutical production" },
      { href: "/sectoare/retail", labelRo: "Retail & HoReCa", labelEn: "Retail & HoReCa", descRo: "Magazine, hoteluri și restaurante", descEn: "Shops, hotels and restaurants" },
      { href: "/sectoare/industrial", labelRo: "Industrial", labelEn: "Industrial", descRo: "Depozite industriale și producție", descEn: "Industrial warehouses and production" },
    ],
  },
  {
    labelRo: "Resurse",
    labelEn: "Resources",
    links: [
      { href: "/resurse", labelRo: "Toate Resursele", labelEn: "All Resources", descRo: "Date, analize și ghiduri pentru profesioniști", descEn: "Data, analysis and guides for professionals" },
      { href: "/resurse/articole/eficienta-bms", labelRo: "Eficienta BMS - Analiza Date", labelEn: "BMS Efficiency - Data Analysis", descRo: "Cât de eficiente sunt sistemele BMS?", descEn: "How efficient are BMS systems?" },
      { href: "/resurse/referinte", labelRo: "Proiecte & Referințe", labelEn: "Projects & References", descRo: "Portofoliul nostru de proiecte BMS", descEn: "Our portfolio of BMS projects" },
      { href: "/ghid-bms", labelRo: "Ghid BMS Gratuit", labelEn: "Free BMS Guide", descRo: "Evaluează potențialul clădirii tale", descEn: "Assess the potential of your building" },
      { href: "/resurse/raport-piata", labelRo: "Raport Piața BMS", labelEn: "BMS Market Report", descRo: "Analiza pieței de automatizare 2025", descEn: "Automation market analysis 2025" },
    ],
  },
]

const produseLink: NavLink = { href: "/produse", labelRo: "Produse SAUTER", labelEn: "SAUTER Products" }

// Trigger states: solid dark text + cream chip on hover/open/focus so the
// hovered label is unmistakably darker and readable on the white bar
const triggerClasses =
  "bg-transparent text-[15px] font-medium text-[#0D2E2B]/80 rounded-[1px] px-4 transition-colors duration-300 " +
  "hover:bg-[#F5F4F0] hover:text-[#0D2E2B] " +
  "focus:bg-[#F5F4F0] focus:text-[#0D2E2B] " +
  "data-[state=open]:bg-[#F5F4F0] data-[state=open]:text-[#0D2E2B] " +
  "data-[state=open]:hover:bg-[#F5F4F0] data-[state=open]:focus:bg-[#F5F4F0]"

const itemLinkClasses =
  "hover:bg-[#F5F4F0] hover:text-[#0D2E2B] focus:bg-[#F5F4F0] focus:text-[#0D2E2B] " +
  "data-[active=true]:bg-[#F5F4F0] data-[active=true]:text-[#0D2E2B] focus-visible:ring-[#1F6B4A]/40"

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header() {
  const { lang, setLang, t } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // close the drawer on navigation and keep the page from scrolling behind it
  useEffect(() => setMobileOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const langToggle = (
    <div className="flex items-center rounded-[1px] border border-[#0D2E2B]/15 overflow-hidden text-xs font-semibold">
      {(["ro", "en"] as const).map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`px-3 py-2.5 lg:py-1.5 transition-colors duration-150 ${lang === code ? "bg-[#0D2E2B] text-white" : "text-[#0D2E2B]/60 hover:text-[#0D2E2B]"}`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-[#0D2E2B]/10">
      <div className="container-site flex h-16 items-center justify-between gap-4">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/" className="flex shrink-0 items-center">
            <img src="/logo.svg" alt="SOVITECH Control" width={200} height={50} className="h-8 w-auto shrink-0 select-none" />
          </Link>

          {/* Desktop nav appears only when there is genuinely room for it */}
          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList>
              {navGroups.slice(0, 1).map((group) => (
                <NavigationMenuItem key={group.labelEn}>
                  <NavigationMenuTrigger className={triggerClasses}>{t(group.labelRo, group.labelEn)}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className={`grid gap-1 p-2 ${group.twoColumns ? "w-[440px] md:w-[540px] md:grid-cols-2" : "w-[380px]"}`}>
                      {group.links.map((link) => (
                        <li key={link.href}>
                          <NavigationMenuLink asChild className={itemLinkClasses}>
                            <Link href={link.href} className="block select-none space-y-1 rounded-[1px] p-3 leading-none no-underline outline-none transition-colors duration-150">
                              <div className="text-sm font-medium leading-none text-[#0D2E2B]">{t(link.labelRo, link.labelEn)}</div>
                              <p className="line-clamp-2 text-[13px] leading-snug text-[#0D2E2B]/60">{t(link.descRo!, link.descEn!)}</p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}

              <NavigationMenuItem>
                <NavigationMenuLink asChild className={itemLinkClasses}>
                  <Link href={produseLink.href} className="group inline-flex h-9 w-max items-center justify-center rounded-[1px] bg-transparent px-4 py-2 text-[15px] font-medium text-[#0D2E2B]/80 transition-colors duration-300 hover:bg-[#F5F4F0] hover:text-[#0D2E2B] focus:bg-[#F5F4F0] focus:text-[#0D2E2B] focus:outline-none">
                    {t(produseLink.labelRo, produseLink.labelEn)}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              {navGroups.slice(1).map((group) => (
                <NavigationMenuItem key={group.labelEn}>
                  <NavigationMenuTrigger className={triggerClasses}>{t(group.labelRo, group.labelEn)}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className={`grid gap-1 p-2 ${group.twoColumns ? "w-[440px] md:w-[540px] md:grid-cols-2" : "w-[380px]"}`}>
                      {group.links.map((link) => (
                        <li key={link.href}>
                          <NavigationMenuLink asChild className={itemLinkClasses}>
                            <Link href={link.href} className="block select-none space-y-1 rounded-[1px] p-3 leading-none no-underline outline-none transition-colors duration-150">
                              <div className="text-sm font-medium leading-none text-[#0D2E2B]">{t(link.labelRo, link.labelEn)}</div>
                              <p className="line-clamp-2 text-[13px] leading-snug text-[#0D2E2B]/60">{t(link.descRo!, link.descEn!)}</p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right: utilities, CTA, burger — the RO/EN toggle stays visible at
            every width; the CTA yields on the smallest screens (it also lives
            in the drawer) so the bar never crowds */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {langToggle}

          <Link
            href="/calculator-roi"
            className="hidden xl:flex items-center gap-2 text-[#0D2E2B]/70 text-sm font-medium hover:text-[#0D2E2B] transition-colors duration-150"
          >
            <Calculator className="h-4 w-4" />
            {t("Calculator ROI", "ROI Calculator")}
          </Link>

          <Link
            href="/contact"
            className="hidden sm:inline-flex items-center gap-2 bg-[#0D2E2B] text-white text-sm font-medium px-5 py-2 rounded-[1px] hover:bg-[#1F6B4A] transition-colors duration-300"
          >
            {t("Cerere ofertă", "Request a quote")}
          </Link>

          {/* Burger — circular chip from the same family as the RO/EN pill,
              two hairline bars that fold into an X */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? t("Închide meniul", "Close menu") : t("Deschide meniul", "Open menu")}
            className="lg:hidden relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[1px] border border-[#0D2E2B]/15 transition-colors duration-300 hover:border-[#0D2E2B]/40 hover:bg-[#F5F4F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6B4A]/40"
          >
            <span aria-hidden="true" className={`absolute h-[1.5px] w-4 bg-[#0D2E2B] transition-transform duration-300 ease-out ${mobileOpen ? "rotate-45" : "-translate-y-[3px]"}`} />
            <span aria-hidden="true" className={`absolute h-[1.5px] w-4 bg-[#0D2E2B] transition-transform duration-300 ease-out ${mobileOpen ? "-rotate-45" : "translate-y-[3px]"}`} />
          </button>
        </div>
      </div>

      {/* Mobile drawer — full-height sheet under the bar, structured like the
          site's grouped link rails: tracked uppercase group labels, light
          links, hairline dividers */}
      <div
        id="mobile-nav"
        className={`lg:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-white overflow-y-auto border-t border-[#0D2E2B]/10 transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <nav aria-label={t("Meniu mobil", "Mobile menu")} className="px-6 py-8 flex flex-col">
          {navGroups.map((group) => (
            <div key={group.labelEn} className="pb-7 mb-7 border-b border-[#0D2E2B]/10">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#1F6B4A] mb-4">
                {t(group.labelRo, group.labelEn)}
              </p>
              <ul className="space-y-1">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-2 text-lg font-light text-[#0D2E2B]/80 hover:text-[#0D2E2B] transition-colors duration-150"
                    >
                      {t(link.labelRo, link.labelEn)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="pb-7 mb-7 border-b border-[#0D2E2B]/10">
            <Link
              href={produseLink.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-lg font-light text-[#0D2E2B]/80 hover:text-[#0D2E2B] transition-colors duration-150"
            >
              {t(produseLink.labelRo, produseLink.labelEn)}
            </Link>
            <Link
              href="/calculator-roi"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 py-2 text-lg font-light text-[#0D2E2B]/80 hover:text-[#0D2E2B] transition-colors duration-150"
            >
              <Calculator className="h-5 w-5" />
              {t("Calculator ROI", "ROI Calculator")}
            </Link>
          </div>

          <Link
            href="/contact"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center justify-center bg-[#0D2E2B] text-white text-sm font-medium px-5 py-3 rounded-[1px] hover:bg-[#1F6B4A] transition-colors duration-300"
          >
            {t("Cerere ofertă", "Request a quote")}
          </Link>
        </nav>
      </div>
    </header>
  )
}
