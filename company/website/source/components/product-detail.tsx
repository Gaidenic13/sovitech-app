"use client"

import Link from "next/link"
import { ArrowRight, ChevronRight, Check } from "lucide-react"
import { getProductById, products, articleCodes, categoryEn } from "@/lib/product-data"
import { useLanguage } from "@/lib/language-context"

const NOT_SPECIFIED = "NU ESTE SPECIFICAT"

export function ProductDetail({ id }: { id: string }) {
  const { t } = useLanguage()
  const product = getProductById(id)
  if (!product) return null

  const codes = articleCodes(product)
  const related = products.filter((p) => p.familyTitle === product.familyTitle && p.id !== product.id)
  const specValue = (v: string, en?: string) => (v === NOT_SPECIFIED ? t("Nu este specificat", "Not specified") : t(v, en ?? v))

  const specs = [
    { labelRo: "Model", labelEn: "Model", value: product.specs.model, valueEn: undefined as string | undefined },
    { labelRo: "Protocol / Semnal", labelEn: "Protocol / Signal", value: product.specs.protocol, valueEn: product.specsEn?.protocol },
    { labelRo: "Gamă", labelEn: "Range", value: product.specs.range, valueEn: product.specsEn?.range },
    { labelRo: "Alimentare", labelEn: "Power", value: product.specs.power, valueEn: product.specsEn?.power },
  ]

  return (
    <>
      {/* Breadcrumb + header */}
      <section className="bg-[#07201C] pt-6 pb-10 sm:pt-10 sm:pb-14">
        <div className="container-site">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-white/50 mb-10 flex-wrap">
            <Link href="/produse" className="hover:text-white transition-colors duration-150">{t("Produse", "Products")}</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>{t(product.category, categoryEn[product.category] ?? product.category)}</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[#C8E6C9]">{product.code}</span>
          </nav>
          <p className="text-sm font-semibold tracking-wider uppercase text-[#C8E6C9] mb-3">
            SAUTER {product.code}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-white tracking-tighter leading-tight max-w-3xl break-words text-balance">
            {t(product.name, product.nameEn ?? product.name)}
          </h1>
          {product.nameEn && (
            <p className="mt-2 text-base text-white/50 font-light">{t(product.nameEn, product.name)}</p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="bg-[#F5F4F0] py-10 sm:py-16">
        <div className="container-site grid gap-6 sm:gap-10 lg:grid-cols-[1fr_1.2fr]">
          {/* Image */}
          <div className="bg-white rounded-[2px] border border-[#0D2E2B]/10 p-5 sm:p-6 lg:p-10 flex items-center justify-center aspect-[4/3] lg:aspect-auto lg:min-h-[380px]">
            <img
              src={product.image || "/placeholder.svg"}
              alt={`SAUTER ${product.code} — ${product.name}`}
              className="max-h-[260px] sm:max-h-[340px] w-auto max-w-full object-contain"
            />
          </div>

          {/* Details */}
          <div>
            <p className="text-base text-[#555555] font-light leading-relaxed mb-6 sm:mb-8">
              {t(product.shortDesc, product.shortDescEn ?? product.shortDesc)}
            </p>

            {/* Specs: stacked label-over-value on phones — a narrow screen can't
                fit a label and a long technical value on one row; two-column
                from sm up */}
            <div className="bg-white rounded-[2px] border border-[#0D2E2B]/10 divide-y divide-[#0D2E2B]/8 mb-6 sm:mb-8">
              {specs.map((s) => (
                <div key={s.labelEn} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between sm:gap-6 sm:px-6 sm:py-4">
                  <span className="text-xs sm:text-sm text-[#888888] shrink-0">{t(s.labelRo, s.labelEn)}</span>
                  <span className="text-sm font-medium text-[#0D2E2B] break-words sm:text-right min-w-0">{specValue(s.value, s.valueEn)}</span>
                </div>
              ))}
            </div>

            <h2 className="text-lg font-light text-[#0D2E2B] tracking-tighter mb-4">
              {t("Caracteristici", "Features")}
            </h2>
            <ul className="space-y-3 mb-8">
              {(product.features).map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[#C8E6C9] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-[#0D2E2B]" />
                  </div>
                  <span className="text-sm text-[#0D2E2B] font-light">
                    {t(f, product.featuresEn?.[i] ?? f)}
                  </span>
                </li>
              ))}
            </ul>

            {codes.length > 0 && (
              <>
                <h2 className="text-lg font-light text-[#0D2E2B] tracking-tighter mb-3">
                  {t("Coduri de articol", "Article codes")}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {codes.map((c) => (
                    <span key={c} className="rounded-[1px] border border-[#0D2E2B]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#0D2E2B]">
                      {c}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="bg-white py-10 sm:py-16">
          <div className="container-site">
            <p className="section-label mb-3">• {t("Din aceeași familie", "From the same family")}</p>
            <h2 className="text-2xl sm:text-3xl font-light text-[#0D2E2B] tracking-tighter mb-6 sm:mb-10">
              {t(product.familyTitle, product.familyTitleEn ?? product.familyTitle)}
            </h2>
            <div className="grid gap-3 sm:gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/produse/${r.id}`}
                  className="group rounded-[2px] border border-[#0D2E2B]/10 bg-white p-5 transition-colors duration-300 hover:border-[#0D2E2B]/30"
                >
                  <div className="mb-4 aspect-[4/3] bg-white flex items-center justify-center">
                    <img src={r.image || "/placeholder.svg"} alt={`SAUTER ${r.code}`} className="max-h-full max-w-full object-contain" />
                  </div>
                  <p className="text-xs font-semibold text-[#888888] mb-1">{r.code}</p>
                  <p className="text-sm font-light text-[#0D2E2B] leading-snug">{t(r.name, r.nameEn ?? r.name)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-[#07201C] py-10 sm:py-16">
        <div className="container-site flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tighter mb-2">
              {t("Ai nevoie de acest produs în proiectul tău?", "Need this product in your project?")}
            </h2>
            <p className="text-white/60 font-light text-sm">
              {t("Primești o ofertă personalizată cu echipamente SAUTER originale și suport tehnic dedicat.", "Get a personalised quote with original SAUTER equipment and dedicated technical support.")}
            </p>
          </div>
          <Link
            href="/cerere-oferta"
            className="shrink-0 inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-white text-[#07201C] text-sm font-semibold px-6 py-3.5 sm:py-3 rounded-[1px] hover:bg-[#C8E6C9] transition-colors duration-300"
          >
            {t("Cere ofertă", "Request a quote")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
