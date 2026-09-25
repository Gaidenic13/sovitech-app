"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, User } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

// ─── Customer spotlight carousel ──────────────────────────────────────────────
// One spotlight card at a time (with a peek of the next), coloured per customer
// type from our portfolio. Photos and logos are placeholders — swap in real
// assets later via the `photo` / `logo` slots.

type Detail = { labelRo: string; labelEn: string; valueRo: string; valueEn: string }

type Spotlight = {
  typeRo: string
  typeEn: string
  name: string
  quoteRo: string
  quoteEn: string
  author?: string
  roleRo?: string
  roleEn?: string
  caseStudy?: string
  details: Detail[]
  // colour recipe per customer type
  bg: string
  text: string
  muted: string
  divider: string
  badgeBg: string
  badgeText: string
  chipBg: string // photo / logo placeholder tint
}

const spotlights: Spotlight[] = [
  {
    typeRo: "HoReCa & Wellness",
    typeEn: "HoReCa & Wellness",
    name: "Therme Bucharest",
    quoteRo: "Sistemul BMS implementat de Sovitech ne-a redus costurile energetice cu 38% în primul an. ROI-ul a fost atins în mai puțin de 2 ani.",
    quoteEn: "The BMS system implemented by Sovitech reduced our energy costs by 38% in the first year. ROI was achieved in less than 2 years.",
    author: "Alexandru Ionescu",
    roleRo: "Director Tehnic",
    roleEn: "Technical Director",
    caseStudy: "/resurse/studii-de-caz/therme-bucuresti",
    details: [
      { labelRo: "Persoană de contact", labelEn: "Contact", valueRo: "Alexandru Ionescu", valueEn: "Alexandru Ionescu" },
      { labelRo: "Sector", labelEn: "Sector", valueRo: "HoReCa & Wellness", valueEn: "HoReCa & Wellness" },
      { labelRo: "Rezultat", labelEn: "Result", valueRo: "−38% costuri energetice", valueEn: "−38% energy costs" },
    ],
    bg: "#8B7B5C", text: "#ffffff", muted: "rgba(255,255,255,0.7)", divider: "rgba(255,255,255,0.2)",
    badgeBg: "#C8E6C9", badgeText: "#0D2E2B", chipBg: "rgba(255,255,255,0.12)",
  },
  {
    typeRo: "Birouri & Office",
    typeEn: "Office Buildings",
    name: "Floreasca Business Park",
    quoteRo: "Controlul centralizat ne oferă vizibilitate completă asupra celor 45.000 m² și ne ajută să menținem certificarea energetică clasa A.",
    quoteEn: "Centralised control gives us full visibility across 45,000 m² and helps us maintain our class-A energy certification.",
    caseStudy: undefined,
    details: [
      { labelRo: "Sector", labelEn: "Sector", valueRo: "Birouri & Office", valueEn: "Office Buildings" },
      { labelRo: "Suprafață", labelEn: "Area", valueRo: "45.000 m²", valueEn: "45,000 m²" },
      { labelRo: "Certificare", labelEn: "Certification", valueRo: "Clasa A", valueEn: "Class A" },
    ],
    bg: "#C5C0F5", text: "#0D2E2B", muted: "rgba(13,46,43,0.6)", divider: "rgba(13,46,43,0.15)",
    badgeBg: "#0D2E2B", badgeText: "#ffffff", chipBg: "rgba(13,46,43,0.08)",
  },
  {
    typeRo: "Medical & Farma",
    typeEn: "Medical & Pharma",
    name: "Rompharm",
    quoteRo: "Monitorizarea în timp real și alertele automate ne-au permis să prevenim probleme costisitoare înainte să apară.",
    quoteEn: "Real-time monitoring and automated alerts allowed us to prevent costly problems before they occurred.",
    author: "Dan Georgescu",
    roleRo: "Director Operațiuni",
    roleEn: "Operations Director",
    caseStudy: undefined,
    details: [
      { labelRo: "Persoană de contact", labelEn: "Contact", valueRo: "Dan Georgescu", valueEn: "Dan Georgescu" },
      { labelRo: "Sector", labelEn: "Sector", valueRo: "Medical & Farma", valueEn: "Medical & Pharma" },
      { labelRo: "Rezultat", labelEn: "Result", valueRo: "0 avarii neplanificate", valueEn: "0 unplanned outages" },
    ],
    bg: "#C8E6C9", text: "#0D2E2B", muted: "rgba(13,46,43,0.6)", divider: "rgba(13,46,43,0.15)",
    badgeBg: "#0D2E2B", badgeText: "#ffffff", chipBg: "rgba(13,46,43,0.08)",
  },
  {
    typeRo: "Retail & Shopping",
    typeEn: "Retail & Shopping",
    name: "Mega Mall",
    quoteRo: "Automatizarea BMS menține confortul vizitatorilor în tot mall-ul, reducând în același timp costurile energetice pe cei 80.000 m².",
    quoteEn: "BMS automation keeps shoppers comfortable across the entire mall while cutting energy costs over 80,000 m².",
    caseStudy: undefined,
    details: [
      { labelRo: "Sector", labelEn: "Sector", valueRo: "Retail & Shopping", valueEn: "Retail & Shopping" },
      { labelRo: "Suprafață", labelEn: "Area", valueRo: "80.000 m²", valueEn: "80,000 m²" },
      { labelRo: "Sistem", labelEn: "System", valueRo: "HVAC, iluminat, energie", valueEn: "HVAC, lighting, energy" },
    ],
    bg: "#5C5FD4", text: "#ffffff", muted: "rgba(255,255,255,0.7)", divider: "rgba(255,255,255,0.2)",
    badgeBg: "#C8E6C9", badgeText: "#0D2E2B", chipBg: "rgba(255,255,255,0.12)",
  },
  {
    typeRo: "HoReCa & Wellness",
    typeEn: "HoReCa & Wellness",
    name: "Radisson Blu",
    quoteRo: "Colaborarea cu Sovitech ne-a adus nu doar tehnologie de top, ci și o echipă care înțelege nevoile specifice ale industriei hoteliere.",
    quoteEn: "Working with Sovitech gave us not only top technology, but also a team that understands the specific needs of the hotel industry.",
    author: "Maria Popescu",
    roleRo: "Facility Manager",
    roleEn: "Facilities Manager",
    caseStudy: "/resurse/studii-de-caz/radisson-bucuresti",
    details: [
      { labelRo: "Persoană de contact", labelEn: "Contact", valueRo: "Maria Popescu", valueEn: "Maria Popescu" },
      { labelRo: "Sector", labelEn: "Sector", valueRo: "HoReCa & Wellness", valueEn: "HoReCa & Wellness" },
      { labelRo: "Amploare", labelEn: "Scale", valueRo: "428 camere", valueEn: "428 rooms" },
    ],
    bg: "#8B7B5C", text: "#ffffff", muted: "rgba(255,255,255,0.7)", divider: "rgba(255,255,255,0.2)",
    badgeBg: "#C8E6C9", badgeText: "#0D2E2B", chipBg: "rgba(255,255,255,0.12)",
  },
]

export function AethelTestimonials() {
  const { t } = useLanguage()
  const [index, setIndex] = useState(0)
  const [offset, setOffset] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  // translate the track by the measured slide pitch (slide width + gap) so the
  // peek + gap are always pixel-accurate regardless of viewport
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => {
      const slides = track.children
      if (slides.length < 2) {
        setOffset(0)
        return
      }
      const pitch = (slides[1] as HTMLElement).offsetLeft - (slides[0] as HTMLElement).offsetLeft
      setOffset(-index * pitch)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [index])

  const prev = () => setIndex((i) => Math.max(0, i - 1))
  const next = () => setIndex((i) => Math.min(spotlights.length - 1, i + 1))

  return (
    <section className="bg-[#F5F4F0] py-24 overflow-hidden">
      <div className="container-site">
        <p className="text-sm font-semibold tracking-wider uppercase mb-6 text-[#1F6B4A]">
          • {t("Clienți din portofoliu", "Customer spotlight")}
        </p>
        <h2
          className="font-light text-[#0D2E2B] mb-16 lg:mb-20 tracking-tighter"
          style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 1 }}
        >
          {t("Clienții vorbesc.", "Clients speak.")}
          <br />
          <span className="text-[#888888]">{t("Cifrele confirmă.", "The numbers confirm.")}</span>
        </h2>
      </div>

      {/* Carousel */}
      <div className="container-site">
        <div className="overflow-hidden">
          <div
            ref={trackRef}
            className="flex gap-6 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(${offset}px)` }}
          >
            {spotlights.map((card) => (
              <article
                key={card.name + card.typeEn}
                className="shrink-0 basis-full lg:basis-[92%] rounded-[2px] p-8 md:p-10"
                style={{ backgroundColor: card.bg, color: card.text }}
              >
                <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 lg:gap-14">
                  {/* Left — narrative */}
                  <div className="flex flex-col">
                    <span
                      className="inline-flex w-max items-center rounded-[1px] px-3 py-1.5 text-xs font-semibold tracking-wide"
                      style={{ backgroundColor: card.badgeBg, color: card.badgeText }}
                    >
                      {t(card.typeRo, card.typeEn)}
                    </span>

                    <h3 className="text-3xl md:text-4xl font-light tracking-tighter mt-5 mb-5 leading-none">
                      {card.name}
                    </h3>

                    <blockquote className="text-base md:text-lg font-light leading-relaxed max-w-xl">
                      &ldquo;{t(card.quoteRo, card.quoteEn)}&rdquo;
                    </blockquote>

                    <div className="mt-6">
                      {card.author ? (
                        <p className="text-sm font-semibold">{card.author}</p>
                      ) : (
                        <p className="text-sm font-semibold" style={{ color: card.muted }}>
                          {t("Client din portofoliul Sovitech", "From the Sovitech portfolio")}
                        </p>
                      )}
                      {card.caseStudy && (
                        <Link
                          href={card.caseStudy}
                          className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
                        >
                          {t("Vezi studiul de caz", "Read case study")}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>

                    {/* Logo placeholder — replace with client logo */}
                    <div
                      className="mt-auto pt-8 inline-flex w-max items-center rounded-[2px] border px-4 py-2.5 text-xs font-bold tracking-[0.15em] uppercase"
                      style={{ borderColor: card.divider, color: card.muted }}
                      aria-hidden="true"
                    >
                      {card.name}
                    </div>
                  </div>

                  {/* Right — photo placeholder + details */}
                  <div>
                    <div
                      className="w-full max-w-[140px] aspect-square rounded-[2px] flex items-center justify-center mb-6"
                      style={{ backgroundColor: card.chipBg }}
                    >
                      <User className="h-10 w-10" style={{ color: card.muted }} aria-hidden="true" />
                    </div>

                    <dl className="space-y-4">
                      {card.details.map((d, di) => (
                        <div key={di} className={di > 0 ? "pt-4 border-t" : ""} style={di > 0 ? { borderColor: card.divider } : undefined}>
                          <dt className="text-[11px] font-semibold tracking-[0.15em] uppercase mb-1" style={{ color: card.muted }}>
                            {t(d.labelRo, d.labelEn)}
                          </dt>
                          <dd className="text-base font-light">{t(d.valueRo, d.valueEn)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-8">
          <div className="flex items-center gap-2">
            {spotlights.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`${t("Spre cardul", "Go to card")} ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index ? "w-8 bg-[#1F6B4A]" : "w-2 bg-[#0D2E2B]/20 hover:bg-[#0D2E2B]/40"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={index === 0}
              aria-label={t("Anterior", "Previous")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#0D2E2B]/15 bg-white text-[#0D2E2B] transition-colors duration-150 hover:bg-[#F5F4F0] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              disabled={index === spotlights.length - 1}
              aria-label={t("Următor", "Next")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#0D2E2B]/15 bg-white text-[#0D2E2B] transition-colors duration-150 hover:bg-[#F5F4F0] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
