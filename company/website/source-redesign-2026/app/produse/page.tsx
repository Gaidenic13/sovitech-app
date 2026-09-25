"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowUpRight, ChevronRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { HeroField } from "@/components/hero-field"
import { products, categoryEn } from "@/lib/product-data"

export default function ProdusePage() {
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("Toate")
  const { t, lang } = useLanguage()
  const spec = (v: string, en?: string) => (v === "NU ESTE SPECIFICAT" ? t("Nu este specificat", "Not specified") : t(v, en ?? v))

  const categories = lang === "ro"
    ? ["Toate", "Controllere & PLC", "Senzori Presiune", "Senzori Ambient", "Actuatori", "Panouri Operare", "Software BMS", "Gateway & Integrare", "Alimentare & Accesorii"]
    : ["All", "Controllers & PLC", "Pressure Sensors", "Ambient Sensors", "Actuators", "Operating Panels", "BMS Software", "Gateway & Integration", "Power & Accessories"]

  // Map EN category back to RO for filtering (data is in RO)
  const categoryMap: Record<string, string> = {
    "All": "Toate",
    "Controllers & PLC": "Controllere & PLC",
    "Pressure Sensors": "Senzori Presiune",
    "Ambient Sensors": "Senzori Ambient",
    "Actuators": "Actuatori",
    "Operating Panels": "Panouri Operare",
    "BMS Software": "Software BMS",
    "Gateway & Integration": "Gateway & Integrare",
    "Power & Accessories": "Alimentare & Accesorii",
  }

  const allLabel = lang === "ro" ? "Toate" : "All"

  // Reset filter to "all" whenever language changes
  useEffect(() => {
    setSelectedCategory(allLabel)
  }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const resolvedCategory = lang === "en" ? (categoryMap[selectedCategory] ?? selectedCategory) : selectedCategory
  const filteredProducts =
    (selectedCategory === "Toate" || selectedCategory === "All")
      ? products
      : products.filter((p) => p.category === resolvedCategory)

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 bg-[#07201C] section-l">
        <HeroField />
        <div className="container-site relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-[#C8E6C9]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C8E6C9] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C8E6C9]"></span>
              </span>
              {t("Partener autorizat SAUTER Elveția în România", "Authorised SAUTER Partner in Romania")}
            </div>
            <h1 className="mb-4 text-5xl font-light tracking-tighter text-white md:text-6xl">
              {t("Gama completă SAUTER", "Complete SAUTER Range")}
            </h1>
            <p className="text-balance text-lg text-white/60 md:text-xl">
              {t("Sovitech oferă întreaga gamă de echipamente, senzori și software necesare pentru execuția, proiectarea, mentenanța și facility management al sistemelor BMS. Produse care îndeplinesc cele mai înalte standarde și certificări elvețiene.", "Sovitech offers the full range of equipment, sensors and software required for the execution, design, maintenance and facility management of BMS systems. Products that meet the highest Swiss standards and certifications.")}
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-5xl">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Technical documentation — informational.
                  No PDFs are hosted on the site yet, so the copy promises
                  documentation on request, not downloadable files. */}
              <div className="rounded-[2px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <h3 className="mb-2 font-semibold text-white">{t("Documentație tehnică", "Technical Documentation")}</h3>
                <p className="text-sm text-white/60">
                  {t("Specificațiile principale sunt pe pagina fiecărui produs. Fișele tehnice și manualele complete se trimit la cerere, pentru orice produs din gamă.", "The main specifications are on each product page. Full data sheets and manuals are sent on request, for any product in the range.")}
                </p>
              </div>

              {/* Full catalogue — opens the SAUTER catalogue on Issuu */}
              <a
                href="https://issuu.com/sauter/docs/2026_2027_catalogue_product_and_sys_6fc437e2aa86d2?fr=sZWRkMjg0Mjg1NTI"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-[2px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-white/30 hover:bg-white/[0.08]"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{t("Catalog complet de produse", "Full Product Catalogue")}</h3>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40 transition-colors group-hover:text-[#C8E6C9]" />
                </div>
                <p className="text-sm text-white/60">
                  {t("Răsfoiește catalogul SAUTER 2026–2027 cu întreaga gamă de produse și sisteme.", "Browse the SAUTER 2026–2027 catalogue with the full range of products and systems.")}
                </p>
              </a>

              {/* Custom quotes — interactive offer-request wizard */}
              <Link
                href="/cerere-oferta"
                className="group flex flex-col rounded-[2px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-white/30 hover:bg-white/[0.08]"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{t("Oferte personalizate", "Custom Quotes")}</h3>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#C8E6C9]" />
                </div>
                <p className="text-sm text-white/60">
                  {t("Completează cererea de ofertă și primești o propunere adaptată nevoilor proiectului tău.", "Complete the offer request and receive a proposal tailored to your project's needs.")}
                </p>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#1F6B4A]/20 blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-[#1F6B4A]/20 blur-3xl"></div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="sticky top-16 z-40 border-b border-[#0D2E2B]/10 bg-white/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container-site">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap rounded-[1px] border px-5 py-2 text-sm font-medium transition-colors duration-150 ${
                  selectedCategory === category
                    ? "bg-[#0D2E2B] border-[#0D2E2B] text-white"
                    : "bg-white border-[#0D2E2B]/15 text-[#0D2E2B]/60 hover:text-[#0D2E2B] hover:border-[#0D2E2B]/30"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="section-m">
        <div className="container-site">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const Icon = product.icon
              const isHovered = hoveredProduct === product.id
              // staggered reveal for the specs rows: tiny 8px rises that settle
              // to zero, so text lands pixel-crisp after the playful entrance
              const reveal = (delay: string) =>
                `transition-all duration-300 ease-out ${delay} ${
                  isHovered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`

              return (
                <div
                  key={product.id}
                  onMouseEnter={() => setHoveredProduct(product.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                  className="group relative flex flex-col overflow-hidden rounded-[2px] border border-border/50 bg-gradient-to-br from-card to-muted/20 transition-colors duration-300 hover:border-primary/50"
                >
                  {/* Product Image — contained and centred so the full product is visible */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-white p-6">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className={`h-full w-full object-contain object-center transition-[opacity,scale] duration-500 ease-out ${
                        isHovered ? "opacity-15 scale-[1.04]" : "opacity-100 scale-100"
                      }`}
                    />

                    {/* Category Badge */}
                    <div className="absolute left-4 top-4 rounded-full border border-border/50 bg-background/90 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                      {t(product.category, categoryEn[product.category] ?? product.category)}
                    </div>

                    {/* Icon */}
                    <div className="absolute bottom-4 right-4 rounded-[2px] bg-primary/90 p-3 text-primary-foreground backdrop-blur-sm">
                      <Icon className="h-6 w-6" />
                    </div>

                  </div>

                  {/* Product Info */}
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="mb-2 text-xl font-semibold text-foreground">{t(product.name, product.nameEn ?? product.name)}</h3>
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{t(product.shortDesc, product.shortDescEn ?? product.shortDesc)}</p>

                    {/* Features */}
                    <div className="mb-4 space-y-2">
                      {product.features.slice(0, 2).map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></div>
                          <span className="text-xs text-muted-foreground">{t(feature, product.featuresEn?.[idx] ?? feature)}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="group/btn mt-auto w-full border-primary/20 hover:border-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
                      asChild
                    >
                      <Link href={`/produse/${product.id}`}>
                        <span>{t("Detalii produs", "Product details")}</span>
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Link>
                    </Button>
                  </div>

                  {/* Hover Overlay with Specs — desktop-pointer only: touch
                      devices can't hover, so they go straight to the detail
                      page (same data) via the always-visible button. The panel
                      itself only fades (no transform), reading as the design
                      system's glass surface; the image beneath goes transparent */}
                  <div
                    className={`absolute inset-0 z-10 hidden pointer-fine:flex flex-col justify-end overflow-y-auto bg-white/70 backdrop-blur-[2px] p-6 transition-opacity duration-300 ${
                      isHovered ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                  >
                    <h4 className={`mb-4 text-sm font-semibold text-primary ${reveal("delay-75")}`}>{t("Specificații Tehnice", "Technical Specifications")}</h4>
                    <div className={`space-y-2 text-sm ${reveal("delay-150")}`}>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-medium text-foreground text-right">{spec(product.specs.model)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t("Protocol:", "Protocol:")}</span>
                        <span className="font-medium text-foreground text-right">{spec(product.specs.protocol, product.specsEn?.protocol)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t("Gamă:", "Range:")}</span>
                        <span className="font-medium text-foreground text-right">{spec(product.specs.range, product.specsEn?.range)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t("Alimentare:", "Power:")}</span>
                        <span className="font-medium text-foreground text-right">{spec(product.specs.power, product.specsEn?.power)}</span>
                      </div>
                    </div>
                    {product.modelCodes && (
                      <div className={`mt-4 border-t border-border/50 pt-4 ${reveal("delay-200")}`}>
                        <h5 className="mb-1 text-xs font-semibold text-muted-foreground">{t("Coduri model:", "Model codes:")}</h5>
                        <p className="text-xs text-foreground/80 leading-relaxed">{product.modelCodes}</p>
                      </div>
                    )}
                    <div className={`mt-4 pt-4 border-t border-border/50 ${reveal("delay-300")}`}>
                      <Link
                        href={`/produse/${product.id}`}
                        className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80"
                      >
                        {t("Detalii produs", "Product details")}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/40 bg-gradient-to-br from-primary/10 via-background to-primary/5 section-l">
        <div className="container-site">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">{t("Ai nevoie de consultanță tehnică?", "Need technical consultancy?")}</h2>
            <p className="mb-8 text-pretty text-lg text-muted-foreground">
              {t("Specialiștii noștri sunt disponibili pentru a oferi informații despre gama de produse, prețuri și disponibilitate. Te ajutăm să alegi echipamentele potrivite pentru proiectul tău BMS.", "Our specialists are available to provide information about the product range, pricing and availability. We help you choose the right equipment for your BMS project.")}
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link href="/contact">
                  {t("Contactează un specialist", "Contact a specialist")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href="https://issuu.com/sauter/docs/2026_2027_catalogue_product_and_sys_6fc437e2aa86d2?fr=sZWRkMjg0Mjg1NTI"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("Răsfoiește catalogul complet SAUTER", "Browse the full SAUTER catalogue")}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
