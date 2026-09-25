"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

// Compact reference cards (name, location, description, scope) — the same
// segment as the portfolio cards, without the "View Case Study" button.
// Rendered in a continuous right-to-left marquee on the homepage.

type Ref = {
  name: string
  image: string
  locationRo: string
  locationEn: string
  descRo: string
  descEn: string
  scopeRo: string
  scopeEn: string
  dot: string   // category accent colour
  check: string // check-mark colour on the dot
}

const references: Ref[] = [
  {
    name: "Therme Nord București", image: "/referinte/therme-nord-bucuresti.jpg", locationRo: "București", locationEn: "Bucharest",
    descRo: "Sistem BMS complet pentru cel mai mare complex de wellness din Europa, ~34.000 m² construiți",
    descEn: "Complete BMS system for the largest wellness complex in Europe, ~34,000 m² built area",
    scopeRo: "Control HVAC, iluminat, energie", scopeEn: "HVAC control, lighting, energy",
    dot: "#8B7B5C", check: "#ffffff",
  },
  {
    name: "Floreasca Tower", image: "/referinte/floreasca-tower.jpg", locationRo: "București", locationEn: "Bucharest",
    descRo: "Sistem BMS pentru o clădire de birouri clasa A, ~7.500 m²",
    descEn: "BMS system for a class-A office building, ~7,500 m²",
    scopeRo: "Control centralizat, raportare energetică", scopeEn: "Centralised control, energy reporting",
    dot: "#C5C0F5", check: "#0D2E2B",
  },
  {
    name: "Rompharm Company", image: "/referinte/rompharm-company-otopeni.jpg", locationRo: "Otopeni", locationEn: "Otopeni",
    descRo: "Sistem BMS pentru o fabrică farmaceutică cu cerințe stricte",
    descEn: "BMS system for a pharmaceutical factory with strict requirements",
    scopeRo: "Control temperatură, umiditate, presiune", scopeEn: "Temperature, humidity, pressure control",
    dot: "#C8E6C9", check: "#0D2E2B",
  },
  {
    name: "NTN-SNR Fabrica de Rulmenți", image: "/referinte/ntn-snr-fabrica-de-rulmenti.jpg", locationRo: "Sibiu", locationEn: "Sibiu",
    descRo: "Sistem BMS pentru o fabrică de rulmenți cu 37.000 m² suprafață de producție",
    descEn: "BMS system for a bearing factory with 37,000 m² of production floor",
    scopeRo: "Control temperatură, ventilație industrială", scopeEn: "Temperature control, industrial ventilation",
    dot: "#0D2E2B", check: "#ffffff",
  },
  {
    name: "Radisson Blu Hotel", image: "/referinte/radisson-blu-hotel.jpg", locationRo: "București", locationEn: "Bucharest",
    descRo: "Automatizare BMS pentru un hotel de 5 stele cu peste 1.800 m² spații de evenimente",
    descEn: "BMS automation for a 5-star hotel with over 1,800 m² of event space",
    scopeRo: "BMS, control temperatură, ventilație", scopeEn: "BMS, temperature control, ventilation",
    dot: "#8B7B5C", check: "#ffffff",
  },
  {
    name: "Spitalul Foișor", image: "/referinte/spitalul-foisor.jpg", locationRo: "București", locationEn: "Bucharest",
    descRo: "Sistem BMS pentru noul spital de ortopedie, 9.000 m², 119 paturi",
    descEn: "BMS system for the new orthopaedic hospital, 9,000 m², 119 beds",
    scopeRo: "BMS medical, backup sisteme critice", scopeEn: "Medical BMS, critical systems backup",
    dot: "#C8E6C9", check: "#0D2E2B",
  },
  {
    name: "Pitești Retail Park", image: "/referinte/pitesti-retail-park.webp", locationRo: "Pitești", locationEn: "Pitesti",
    descRo: "Sistem BMS pentru un parc de retail cu ~24.800 m² suprafață închiriabilă",
    descEn: "BMS system for a retail park with ~24,800 m² of leasable area",
    scopeRo: "Control HVAC, iluminat, energie", scopeEn: "HVAC control, lighting, energy",
    dot: "#5C5FD4", check: "#ffffff",
  },
  {
    name: "BCR Calea Victoriei", image: "/referinte/bcr-calea-victoriei.jpg", locationRo: "București", locationEn: "Bucharest",
    descRo: "Automatizare BMS pentru o clădire de birouri de 26.300 m² (turn + podium)",
    descEn: "BMS automation for a 26,300 m² office building (tower + podium)",
    scopeRo: "BMS, control acces, iluminat", scopeEn: "BMS, access control, lighting",
    dot: "#C5C0F5", check: "#0D2E2B",
  },
]

function RefCard({ r }: { r: Ref }) {
  const { t } = useLanguage()
  return (
    <Link
      href="/referinte"
      className="group mr-4 shrink-0 w-[300px] rounded-[2px] border border-[#0D2E2B]/8 bg-white overflow-hidden"
    >
      <div className="aspect-[16/10] overflow-hidden border-b border-[#0D2E2B]/8 bg-[#0D2E2B]/5">
        <img
          src={r.image}
          alt={r.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex items-end justify-between gap-3 p-5">
        <div className="min-w-0">
          <h4 className="font-light text-base text-[#0D2E2B] truncate">{r.name}</h4>
          <p className="text-xs text-[#888888] font-light mt-0.5">{t(r.locationRo, r.locationEn)}</p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D2E2B]/5 transition-colors duration-300 group-hover:bg-[#C8E6C9]">
          <ArrowRight className="h-4 w-4 text-[#0D2E2B] transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

export function ReferencesMarquee() {
  const { t } = useLanguage()
  // duplicate the list so the -50% translate loops seamlessly
  const loop = [...references, ...references]

  return (
    <section className="bg-[#F5F4F0] section-s overflow-hidden">
      <div className="container-site mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="section-label mb-2">• {t("Referințe", "References")}</p>
          <h2 className="text-3xl md:text-4xl font-light text-[#0D2E2B] tracking-tighter">
            {t("Proiecte de referință", "Reference projects")}
          </h2>
        </div>
        <Link
          href="/referinte"
          className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-[#1F6B4A] hover:gap-3 transition-all shrink-0"
        >
          {t("Vezi toate referințele", "View all references")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Marquee: edges fade out via mask */}
      <div className="[mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
        <div className="flex w-max animate-marquee">
          {loop.map((r, i) => (
            <RefCard key={i} r={r} />
          ))}
        </div>
      </div>
    </section>
  )
}
