"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

type FooterLink = { href: string; labelRo: string; labelEn: string }
type FooterColumn = { headingRo: string; headingEn: string; links: FooterLink[] }

const columns: FooterColumn[] = [
  {
    headingRo: "Servicii",
    headingEn: "Services",
    links: [
      { href: "/servicii/proiectare-automatizari-bms", labelRo: "Proiectare BMS", labelEn: "BMS Design" },
      { href: "/servicii/executie-sisteme-bms", labelRo: "Execuție sisteme", labelEn: "System Installation" },
      { href: "/servicii/integrare-sisteme-knx-dali-modbus-mbus", labelRo: "Integrare sisteme", labelEn: "Systems Integration" },
      { href: "/servicii/intretinere-sisteme-bms", labelRo: "Întreținere sisteme BMS", labelEn: "BMS Maintenance" },
      { href: "/servicii/consultanta", labelRo: "Consultanță", labelEn: "Consultancy" },
    ],
  },
  {
    headingRo: "Resurse",
    headingEn: "Resources",
    links: [
      { href: "/referinte", labelRo: "Proiecte & referințe", labelEn: "Projects & References" },
      { href: "/ghid-bms", labelRo: "Ghid BMS gratuit", labelEn: "Free BMS Guide" },
      { href: "/ghid", labelRo: "Ghiduri de referință", labelEn: "Reference Guides" },
      { href: "/produse", labelRo: "Produse SAUTER", labelEn: "SAUTER Products" },
      { href: "/calculator-roi", labelRo: "Calculator ROI", labelEn: "ROI Calculator" },
    ],
  },
  {
    headingRo: "Companie",
    headingEn: "Company",
    links: [
      { href: "/despre-noi", labelRo: "Despre noi", labelEn: "About Us" },
      { href: "/expertiza", labelRo: "Expertiză", labelEn: "Expertise" },
      { href: "/referinte", labelRo: "Referințe", labelEn: "References" },
      { href: "/contact", labelRo: "Contact", labelEn: "Contact" },
    ],
  },
  {
    headingRo: "Legal",
    headingEn: "Legal",
    links: [
      { href: "/confidentialitate", labelRo: "Politica de confidențialitate", labelEn: "Privacy Policy" },
      { href: "/termeni", labelRo: "Termeni și condiții", labelEn: "Terms & Conditions" },
      { href: "/cookies", labelRo: "Politica de cookies", labelEn: "Cookie Policy" },
    ],
  },
]

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-[#07201C] border-t border-white/10">
      {/* Top section */}
      <div className="flex flex-col lg:flex-row justify-between items-start section-m px-8 gap-12 max-w-7xl mx-auto">
        {/* Left: logo + CTA buttons */}
        <div className="flex flex-col gap-6 flex-shrink-0">
          <Link href="/" className="flex shrink-0 items-center">
            {/* white logo variant on the dark footer surface — no CSS filter
                hacks; fixed height + auto width + shrink-0 keeps proportions */}
            <img
              src="/logo-white.svg"
              alt="SOVITECH Control"
              width={200}
              height={50}
              className="h-9 w-auto shrink-0 select-none"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-white text-[#07201C] text-sm font-medium px-5 py-2.5 rounded-[1px] hover:bg-[#C8E6C9] transition-colors duration-300"
            >
              {t("Cere o evaluare", "Request an assessment")}
            </Link>
            <Link
              href="/calculator-roi"
              className="text-white/50 text-sm border border-white/15 px-4 py-2.5 rounded-[1px] hover:text-white hover:border-white/40 transition-colors duration-300"
            >
              {t("Calculator ROI", "ROI Calculator")}
            </Link>
          </div>
          {/* Company identification data (copy doc C2, footer column 5) */}
          <div className="text-white/40 text-xs leading-relaxed">
            <p className="text-white/60 font-medium">SOVITECH CONTROL SRL</p>
            <p>Str. Dr. Niculae D. Staicovici nr. 35</p>
            <p>{t("Sector 5, București, România", "Sector 5, Bucharest, Romania")}</p>
            <p>CUI 38500895 · Reg. Com. J40/19288/2017</p>
            <p>
              {t("Telefon: ", "Phone: ")}
              <a href="tel:+40720547802" className="hover:text-white transition-colors duration-150">+40 720 547 802</a>
              {" · "}
              <a href="mailto:office@sovitech.ro" className="hover:text-white transition-colors duration-150">office@sovitech.ro</a>
            </p>
            <p>{t("Program: luni-vineri, 09:00-18:00", "Hours: Monday-Friday, 09:00-18:00")}</p>
            <p className="mt-3 max-w-xs">
              {t(
                "Integrator independent de sisteme de automatizare a clădirilor. Partener autorizat SAUTER din 2017.",
                "Independent building automation systems integrator. Authorised SAUTER partner since 2017."
              )}
            </p>
          </div>
        </div>

        {/* Right: link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full lg:w-auto">
          {columns.map((col) => (
            <div key={col.headingEn}>
              <h3 className="text-[#C8E6C9]/70 text-xs font-semibold tracking-[0.2em] uppercase mb-4">
                {t(col.headingRo, col.headingEn)}
              </h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.labelEn}>
                    <Link href={link.href} className="text-white/50 text-sm hover:text-white transition-colors duration-150">
                      {t(link.labelRo, link.labelEn)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar.
          Social links removed per copy doc C2: the old linkedin.com / x.com
          anchors pointed at the platforms' start pages, not company profiles.
          TODO(social): restore a LinkedIn icon once the real company page URL
          is provided. */}
      <div className="border-t border-white/10 py-6 px-8 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-white/40 text-xs">
          &copy; {new Date().getFullYear()} SOVITECH CONTROL SRL. {t("Toate drepturile rezervate.", "All rights reserved.")}
        </p>
        <p className="text-white/40 text-xs flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <Link href="/termeni" className="hover:text-white transition-colors duration-150">
            {t("Termeni și condiții", "Terms & Conditions")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/confidentialitate" className="hover:text-white transition-colors duration-150">
            {t("Politica de confidențialitate", "Privacy Policy")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/cookies" className="hover:text-white transition-colors duration-150">
            {t("Politica de cookies", "Cookie Policy")}
          </Link>
        </p>
      </div>
    </footer>
  )
}
