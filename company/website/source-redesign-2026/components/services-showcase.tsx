"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

type Service = {
  titleRo: string
  titleEn: string
  leadRo: string
  leadEn: string
  restRo: string
  restEn: string
  href: string
  image: string
}

const services: Service[] = [
  {
    titleRo: "Proiectare BMS",
    titleEn: "BMS Design",
    leadRo: "Proiectăm sisteme complete de automatizare",
    leadEn: "We design complete automation systems",
    restRo: ", de la concept la documentația tehnică de execuție.",
    restEn: ", from concept to detailed execution drawings.",
    href: "/servicii/proiectare-automatizari-bms",
    image: "/servicii/proiectare-bms.jpg",
  },
  {
    titleRo: "Execuție Sisteme",
    titleEn: "System Installation",
    leadRo: "Instalăm și punem în funcțiune",
    leadEn: "We install and commission",
    restRo: " sisteme BMS cu echipamente SAUTER, la standarde profesionale.",
    restEn: " BMS systems with SAUTER equipment, to professional standards.",
    href: "/servicii/executie-sisteme-bms",
    image: "/servicii/executie-sisteme.jpg",
  },
  {
    titleRo: "Integrare Sisteme",
    titleEn: "Systems Integration",
    leadRo: "Integrăm orice protocol",
    leadEn: "We integrate any protocol",
    restRo: " (KNX, DALI, Modbus, M-Bus și BACnet) într-o singură platformă.",
    restEn: " (KNX, DALI, Modbus, M-Bus and BACnet) into a single platform.",
    href: "/servicii/integrare-sisteme-knx-dali-modbus-mbus",
    image: "/servicii/integrare-sisteme.jpg",
  },
  {
    titleRo: "Mentenanță",
    titleEn: "Maintenance",
    leadRo: "Menținem clădirea la performanță maximă",
    leadEn: "We keep your building at peak performance",
    restRo: " prin mentenanță predictivă și suport dedicat 24/7.",
    restEn: " with predictive maintenance and dedicated 24/7 support.",
    href: "/servicii/intretinere-sisteme-bms",
    image: "/servicii/mentenanta.jpg",
  },
]

export function ServicesShowcase() {
  const { t } = useLanguage()

  return (
    <section className="relative z-10 section-l">
      <div className="container-site">
        <p className="text-sm font-semibold tracking-wider uppercase mb-3 text-[#C8E6C9]">
          • {t("Ce facem", "What we do")}
        </p>
        <h2 className="text-4xl md:text-5xl font-light text-white tracking-tighter mb-14">
          {t("Servicii BMS complete", "End-to-end BMS services")}
        </h2>

        {/* Phones get a snapping horizontal rail with the next card peeking, so the
            set reads as scrollable without a control; sm and up keeps the grid. The
            negative margin lets the rail bleed to the screen edge while scroll-px
            keeps a snapped card aligned with the container's text. */}
        <div
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:scroll-px-0 sm:px-0 lg:grid-cols-4"
        >
          {services.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex w-[72vw] shrink-0 snap-start flex-col border-y border-white/10 py-6 sm:w-auto"
            >
              <h3 className="text-lg font-light text-white mb-4">{t(s.titleRo, s.titleEn)}</h3>

              <div className="relative aspect-[3/4] overflow-hidden rounded-[2px] bg-white/5 border border-white/8">
                <img
                  src={s.image}
                  alt={t(s.titleRo, s.titleEn)}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-sm transition-colors duration-300 group-hover:bg-white/20">
                  <ArrowRight className="h-5 w-5 text-white transition-transform duration-150 group-hover:translate-x-0.5" />
                </span>
              </div>

              <p className="text-base leading-relaxed mt-4">
                <span className="font-semibold text-white">{t(s.leadRo, s.leadEn)}</span>
                <span className="text-white/50">{t(s.restRo, s.restEn)}</span>
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
