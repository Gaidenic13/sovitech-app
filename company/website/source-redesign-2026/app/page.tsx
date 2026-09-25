"use client"

// LINKS-TO-REACTIVATE: Vezi structura de cost a unui BMS | interim /resurse/cost-sistem-bms | final /costuri

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { ReferencesMarquee } from "@/components/references-marquee"
import { ServicesShowcase } from "@/components/services-showcase"
import { LatestArticles } from "@/components/latest-articles"
import { PartnersMarquee } from "@/components/partners-marquee"
import { HeroField } from "@/components/hero-field"
import { BlogSlider } from "@/components/blog-slider"
import { StatsSection } from "@/components/stats-section"
import { sectors, localizeSector } from "@/lib/sector-data"
import { useLanguage } from "@/lib/language-context"
import { expertizaHref } from "@/lib/site-routes"

export default function Home() {
  const { t, lang } = useLanguage()

  return (
    <>
      {/* Hero + Services share one WebGL field so the animation flows across both sections */}
      <div className="relative bg-[#07201C] overflow-hidden">
        <HeroField />

        <section className="min-h-[90vh] flex items-center">
          <div className="container mx-auto px-4 md:px-8 max-w-7xl relative z-10 section-l">
            <div className="flex items-center">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-3 text-sm font-semibold tracking-wider uppercase mb-8 text-white/70">
                  <span className="w-2 h-2 bg-white/70 rounded-[1px]" aria-hidden="true" />
                  Building Management Systems
                </span>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-light leading-none tracking-tighter mb-8 text-white">
                  {t("Integrator independent de automatizare a clădirilor și BMS.", "Independent building automation and BMS integrator.")}
                </h1>
                <p className="text-base leading-6 max-w-xl mb-12 text-white/60">
                  {t(
                    "Sovitech Control proiectează, execută, integrează, întreține și modernizează sisteme BMS în opt sectoare, de la birouri și hoteluri la pharma și spitale, ca partener autorizat SAUTER. Fiind independentă, firma alege arhitectura după clădire, nu după catalogul unui producător.",
                    "Sovitech Control designs, builds, integrates, maintains and modernises BMS systems across eight sectors, from offices and hotels to pharma and hospitals, as an authorised SAUTER partner. Being independent, the company chooses the architecture to fit the building, not a manufacturer's catalogue."
                  )}
                </p>
                <div className="flex items-stretch">
                  <Link href="/contact" className="inline-flex items-center bg-white text-black text-base px-8 py-4 rounded-[1px] transition-colors duration-300 hover:bg-[#C8E6C9]">
                    {t("Cere o evaluare a clădirii", "Request a building assessment")}
                  </Link>
                  <Link href="/calculator-roi" aria-label={t("Calculator ROI", "ROI Calculator")} className="group inline-flex items-center justify-center w-14 bg-white/10 border border-white/15 rounded-[1px] ml-px transition-colors duration-300 hover:bg-white/20">
                    <ArrowRight className="h-5 w-5 text-white transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Link>
                </div>
                {/* Stock "team" headshots removed per copy doc: no invented people on the site. */}
                <div className="mt-14 pt-8 border-t border-white/10 flex items-center gap-4 max-w-xl">
                  <p className="text-sm text-white/60">
                    <span className="text-white font-semibold">25</span>{" "}
                    {t(
                      "proiecte de referință livrate, cu nume public, listate cu nume, oraș și sector pe pagina de referințe",
                      "reference projects delivered under public names, listed with name, city and sector on the references page"
                    )}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        <ServicesShowcase />
      </div>

      <ReferencesMarquee />

      <section className="bg-[#07201C] section-l">
        <div className="container-site">
          {/* The authorised SAUTER partnership is the subject of this section:
              it leads, and the independence copy explains what it does and
              does not mean for the building owner. */}
          <p className="text-sm text-[#C8E6C9] font-semibold tracking-wider uppercase mb-3">• {t("Despre noi", "About us")}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tighter leading-tight max-w-4xl">
            {t(
              "Partener autorizat SAUTER, integrator independent",
              "Authorised SAUTER partner, independent integrator"
            )}
          </h2>

          {/* The credential itself, on the section's own ground. Only the mark
              keeps a light plate behind it: the SAUTER logo carries dark type
              that would be unreadable on the dark green, and it must not be
              recoloured or inverted. */}
          <div className="mt-12 rounded-[2px] bg-white/5 border border-white/10 p-8 sm:p-10 grid gap-8 sm:gap-10 sm:grid-cols-2 sm:items-center">
            <div className="flex items-center justify-center sm:border-r sm:border-white/10 sm:pr-10">
              <span className="inline-flex w-full max-w-[280px] items-center justify-center rounded-[2px] bg-white px-7 py-6">
                <img
                  src="/parteneri/sauter.png"
                  alt="SAUTER"
                  className="w-full max-w-[210px] h-auto"
                />
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-[#C8E6C9]">
                {t("Systems Partner autorizat", "Authorised Systems Partner")}
              </p>
              <p className="mt-2 text-3xl font-light text-white tracking-tighter leading-snug">
                {t("Din 2017", "Since 2017")}
              </p>
              <p className="mt-3 text-sm text-white/60 font-light leading-relaxed">
                {t(
                  "Platformă elvețiană cu ciclu de viață lung și piese disponibile, aleasă implicit, dar niciodată impusă.",
                  "A Swiss platform with a long life cycle and available spare parts, chosen by default but never imposed."
                )}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-white/35 font-light leading-relaxed">
            {t(
              "SAUTER este marcă înregistrată a Fr. Sauter AG.",
              "SAUTER is a registered trademark of Fr. Sauter AG."
            )}
          </p>

          {/* What the partnership does not cost the owner. */}
          <div className="mt-14 grid gap-10 md:grid-cols-2">
            <p className="text-base text-white/60 font-light leading-relaxed">
              {t(
                "Sovitech Control este integrator independent. Firma nu are obligație de volum către un producător și nu are un catalog propriu de vândut cu orice preț. Proiectul livrat se poate executa și de un alt integrator, pentru că se scrie pe funcții și pe protocoale deschise, nu pe coduri de produs care exclud concurența.",
                "Sovitech Control is an independent integrator. The company has no volume commitment towards any manufacturer and no in-house catalogue to sell at any price. The delivered design can also be executed by another integrator, because it is written around functions and open protocols, not product codes that exclude competition."
              )}
            </p>
            <p className="text-base text-white/60 font-light leading-relaxed">
              {t(
                "Echipamentele existente rămân în funcțiune dacă starea lor o permite: integrarea pe KNX, DALI, Modbus și M-Bus înseamnă că un chiller, un contor sau o centrală de tratare a aerului de altă marcă intră în sistem fără să fie înlocuite.",
                "Existing equipment stays in service where its condition allows: integration over KNX, DALI, Modbus and M-Bus means a chiller, a meter or an air handling unit of another brand joins the system without being replaced."
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="section-l bg-[#F5F4F0]">
        <div className="container-site">
          <p className="text-sm text-[#888888] font-semibold tracking-wider uppercase mb-2">• {t("Sectoare", "Sectors")}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0D2E2B] mb-16 tracking-tighter">
            {t("Expertiză pe sectoare de clădiri, fiecare cu alt profil de cost", "Building-sector expertise, each with its own cost profile")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sectors.filter((raw) => raw.slug !== "entertainment").map((raw) => localizeSector(raw, lang)).map((s) => (
              <Link key={s.slug} href={expertizaHref(s.slug)} className="group rounded-[2px] p-8 flex flex-col justify-between min-h-[200px]" style={{ backgroundColor: s.accentColor }}>
                <div>
                  <h3 className="text-2xl font-light tracking-tighter leading-tight" style={{ color: s.accentTextDark ? "#0D2E2B" : "#ffffff" }}>
                    {s.title}
                  </h3>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <span className="text-sm font-medium" style={{ color: s.accentTextDark ? "#0D2E2B80" : "rgba(255,255,255,0.9)" }}>
                    {t("Explorează sectorul", "Explore sector")}
                  </span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" style={{ color: s.accentTextDark ? "#0D2E2B" : "#ffffff" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <StatsSection />

      <PartnersMarquee />

      <BlogSlider />


      <LatestArticles />
    </>
  )
}
