"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Copy, Linkedin, Twitter, Facebook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

export default function EficientaBMSArticlePage() {
  const { t } = useLanguage()

  const latestArticles = [
    {
      category: t("Studiu de Caz", "Case Study"),
      title: t(
        "Automatizare BMS la Therme București, pas cu pas",
        "BMS automation at Therme Bucharest, step by step",
      ),
      date: t("Dec 20, 2025", "Dec 20, 2025"),
      readTime: "8 min",
      image: "/thermal-spa-modern-building.jpg",
      href: "/resurse/studii-de-caz/therme-bucuresti",
    },
    {
      category: t("Ghid Tehnic", "Technical Guide"),
      title: t(
        "Sistem BMS pentru clădiri: ghidul complet 2026",
        "Building management systems: the complete 2026 guide",
      ),
      date: t("Dec 15, 2025", "Dec 15, 2025"),
      readTime: "15 min",
      image: "/building-automation-technical-diagram.jpg",
      href: "/ghid/sisteme-bms-cladiri",
    },
    {
      category: t("Ghid", "Guide"),
      title: t(
        "Cât costă un sistem BMS în România: structura de preț",
        "What a BMS costs in Romania: the price structure",
      ),
      date: t("Aug 19, 2026", "Aug 19, 2026"),
      readTime: "10 min",
      image: "/romania-cityscape-modern-buildings.jpg",
      href: "/resurse/cost-sistem-bms",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b border-border/40">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/resurse"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("Resurse", "Resources")}
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <article className="container mx-auto px-4 section-s">
        <div className="grid gap-12 lg:grid-cols-[280px_1fr]">
          {/* Left Sidebar */}
          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            {/* Category */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {t("Categorie", "Category")}
              </p>
              <Link
                href="/resurse?category=data"
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {t("Date & Analiză", "Data & Analysis")}
              </Link>
            </div>

            {/* Author */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                {t("Scris de", "Written by")}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#0D2E2B] text-xs font-semibold text-[#C8E6C9]">
                  SC
                </div>
                <div>
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Echipa de inginerie Sovitech Control
                  </p>
                  <p className="text-sm text-muted-foreground">{t("Director Tehnic, Sovitech", "Technical Director, Sovitech")}</p>
                </div>
              </div>
            </div>

            {/* Share */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                {t("Distribuie", "Share")}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-transparent">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-transparent">
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-transparent">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-transparent">
                  <Facebook className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="max-w-3xl">
            {/* Article Header */}
            <header className="mb-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {t("Date & Analiză", "Data & Analysis")}
              </div>
              <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tighter text-foreground md:text-5xl">
                {t(
                  "Cât de eficiente sunt sistemele BMS în reducerea costurilor energetice?",
                  "How effective are BMS systems at reducing energy costs?",
                )}
              </h1>
              <p className="mb-6 text-xl text-muted-foreground leading-relaxed">
                {t(
                  "Studiile independente, pe peste 1.000 de proiecte măsurate, arată economii reale, dar rezultatele variază în funcție de sector și complexitate.",
                  "An analysis of data from 150+ BMS projects implemented in Romania shows significant savings - but results vary by sector and complexity.",
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("Ian 15, 2026 · 12 min citire", "Jan 15, 2026 · 12 min read")}
              </p>
            </header>

            {/* Hero Image */}
            <div className="relative mb-12 aspect-[16/9] overflow-hidden rounded-[2px] bg-muted">
              <Image
                src="/modern-building-automation-dashboard-with-energy-c.jpg"
                alt={t("Dashboard BMS cu grafice energie", "BMS dashboard with energy charts")}
                fill
                className="object-cover"
              />
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none">
              <p className="text-lg leading-relaxed text-foreground">
                {t(
                  "Un studiu recent publicat de Asociația pentru Eficiență Energetică din România susține că sistemele BMS pot reduce costurile energetice cu până la",
                  "A recent study published by the Romanian Association for Energy Efficiency claims that BMS systems can reduce energy costs by up to",
                )}{" "}
                <strong>50%</strong>
                {t(
                  ". Cu toate acestea, datele noastre sugerează că această cifră necesită context.",
                  ". However, our data suggests this figure needs context.",
                )}
              </p>

              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "Bazându-ne pe analiza a studii independente pe peste 1.000 de proiecte măsurate, am identificat trei probleme structurale în studiile existente:",
                  "Based on our analysis of independent studies across more than 1,000 measured projects, we have identified three structural problems in the existing studies:",
                )}
              </p>

              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                  <span>
                    <strong className="text-foreground">
                      {t("Setul de date este dominat de clădiri noi.", "The dataset is dominated by new buildings.")}
                    </strong>{" "}
                    {t(
                      "Majoritatea studiilor analizează doar clădiri construite recent, unde eficiența este deja ridicată prin design. Acest lucru poate supraevalua impactul BMS.",
                      "Most studies only analyse recently constructed buildings, where efficiency is already high by design. This can overstate the impact of BMS.",
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                  <span>
                    <strong className="text-foreground">{t("Există bias de selecție.", "There is selection bias.")}</strong>{" "}
                    {t(
                      "Clădirile care implementează BMS sunt de obicei cele care și-au propus deja obiective de eficiență. Rezultatele bune nu sunt neapărat cauzate doar de BMS.",
                      "The buildings that implement a BMS are usually the ones that have already set efficiency goals. The good results are not necessarily caused by the BMS alone.",
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                  <span>
                    <strong className="text-foreground">
                      {t("Nu se ia în calcul întreținerea.", "Maintenance is not taken into account.")}
                    </strong>{" "}
                    {t(
                      "Un sistem BMS fără mentenanță corespunzătoare poate pierde până la 15% din eficiență în primii 3 ani.",
                      "A BMS without proper maintenance can lose up to 15% of its efficiency within the first 3 years.",
                    )}
                  </span>
                </li>
              </ul>

              <p className="text-muted-foreground leading-relaxed">
                {t("Setul nostru de date este diferit: monitorizăm consumul energetic", "Our dataset is different: we monitor energy consumption")}{" "}
                <em>{t("în timp real", "in real time")}</em>
                {t(
                  ", fără reconstrucție retroactivă, fără a ne baza pe dacă o clădire a devenit sau nu suficient de notabilă pentru a fi inclusă în studii.",
                  ", with no retroactive reconstruction and no dependence on whether a building became notable enough to be included in studies.",
                )}
              </p>

              <h2 className="mt-16 mb-6 text-3xl font-bold text-foreground">
                {t("Perspectiva Sovitech Control", "The Sovitech Control Perspective")}
              </h2>

              <h3 className="mt-10 mb-4 text-xl font-semibold text-foreground">
                {t("Metodologia Studiului", "Study Methodology")}
              </h3>

              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                  <span>
                    {t("Am analizat", "We analysed")}{" "}
                    <strong className="text-foreground">{t("fiecare proiect BMS", "every BMS project")}</strong>{" "}
                    {t("implementat între 2015-2024 de echipa noastră.", "implemented by our team between 2015-2024.")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                  <span>
                    {t(
                      "Am exclus proiectele incomplete sau cele fără date de consum pre-implementare.",
                      "We excluded incomplete projects and those without pre-implementation consumption data.",
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                  <span>
                    {t("Am grupat proiectele pe", "We grouped the projects by")}{" "}
                    <strong className="text-foreground">{t("sectoare industriale", "industry sector")}</strong> {t("și", "and")}{" "}
                    <strong className="text-foreground">{t("dimensiune clădire", "building size")}</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                  <span>
                    {t("Ultima actualizare a datelor:", "Latest data update:")}{" "}
                    <strong className="text-foreground">{t("Ian 1, 2026", "Jan 1, 2026")}</strong>.
                  </span>
                </li>
              </ul>

              <p className="text-muted-foreground leading-relaxed">
                {t("Am analizat peste", "We analysed over")}{" "}
                <strong className="text-foreground">{t("150 de implementări BMS", "150 BMS implementations")}</strong>
                {t(
                  ", cu o medie de 10-15 proiecte noi pe an, acoperind aproximativ 50-80 de clădiri per categorie de sector. Un set de date cu amploare reală și fără eșecuri silențioase care dispar din vedere.",
                  ", with an average of 10-15 new projects per year, covering approximately 50-80 buildings per sector category. A dataset with real scale and no silent failures disappearing from view.",
                )}
              </p>

              <h3 className="mt-10 mb-4 text-xl font-semibold text-foreground">
                {t("Clădirile cu BMS economisesc mai mult?", "Do buildings with a BMS save more?")}
              </h3>

              <p className="text-muted-foreground leading-relaxed">
                {t("Studiile existente susțin că sistemele BMS reduc consumul cu", "Existing studies claim that BMS systems reduce consumption by")}{" "}
                <strong className="text-foreground">40-50%</strong>
                {t(", comparativ cu", ", compared to")}{" "}
                <strong className="text-foreground">15-20%</strong>{" "}
                {t("pentru clădiri fără automatizare avansată.", "for buildings without advanced automation.")}
              </p>

              <p className="text-muted-foreground leading-relaxed">
                {t("Metrica noastră echivalentă este", "Our equivalent metric is the")}{" "}
                <em>{t("reducerea reală a consumului", "actual reduction in consumption")}</em>
                {t(
                  ": dacă clădirea consumă cu minimum 10% mai puțin după implementarea BMS. Nu este același lucru cu cifrele din studii, dar este cea mai bună metrică non-biasată pe care o avem.",
                  ": whether the building consumes at least 10% less after the BMS implementation. It is not the same as the figures in the studies, but it is the best unbiased metric we have.",
                )}
              </p>

              {/* Data Visualization - Chart 1 */}
              <div className="my-12 rounded-[2px] border border-border bg-card p-8">
                <h4 className="mb-6 text-lg font-semibold text-foreground">
                  {t("Reducerea consumului energetic pe sector (%)", "Energy consumption reduction by sector (%)")}
                </h4>
                <div className="space-y-4">
                  {[
                    { sector: t("HORECA & Wellness", "HORECA & Wellness"), value: 42, color: "bg-primary" },
                    { sector: t("Clădiri de Birouri", "Office Buildings"), value: 38, color: "bg-primary" },
                    { sector: t("Medical & Pharma", "Medical & Pharma"), value: 35, color: "bg-primary" },
                    { sector: t("Retail & Shopping", "Retail & Shopping"), value: 32, color: "bg-primary" },
                    { sector: t("Industrial & Logistică", "Industrial & Logistics"), value: 28, color: "bg-primary" },
                  ].map((item) => (
                    <div key={item.sector} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.sector}</span>
                        <span className="font-medium text-foreground">{item.value}%</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${item.color} transition-all`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm text-muted-foreground">
                  {t(
                    "Rata reducerii consumului energetic după implementarea BMS, măsurată pe parcursul primilor 2 ani de funcționare.",
                    "The rate of energy consumption reduction after the BMS implementation, measured over the first 2 years of operation.",
                  )}
                </p>
              </div>

              <div className="my-8 rounded-[2px] bg-primary/5 border border-primary/20 p-6">
                <p className="text-foreground font-medium mb-2">{t("Rezultatul nostru:", "Our result:")}</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    • <strong className="text-foreground">{t("Sectorul HORECA:", "The HORECA sector:")}</strong>{" "}
                    {t("42% reducere medie a consumului", "42% average reduction in consumption")}
                  </li>
                  <li>
                    • <strong className="text-foreground">{t("Celelalte sectoare:", "The other sectors:")}</strong>{" "}
                    {t("10-20% reducere pe consumul HVAC, acolo unde reglajul era deficitar", "10-20% reduction in HVAC consumption where controls were deficient")}
                  </li>
                </ul>
                <p className="mt-4 text-muted-foreground">
                  {t("Deci: da, o îmbunătățire semnificativă,", "So: yes, a significant improvement,")}{" "}
                  <strong className="text-foreground">{t("nu", "not")}</strong>{" "}
                  {t(
                    "prăpastia enormă de 20-30 puncte procentuale raportată în alte studii.",
                    "the enormous 20-30 percentage point chasm reported in other studies.",
                  )}
                </p>
              </div>

              <h3 className="mt-10 mb-4 text-xl font-semibold text-foreground">
                {t("Care este ROI-ul real al implementării BMS?", "What is the real ROI of a BMS implementation?")}
              </h3>

              <p className="text-muted-foreground leading-relaxed">
                {t(
                  "Dovezile existente pentru ROI se bazează pe două construcții fragile:",
                  "The existing evidence for ROI relies on two fragile constructs:",
                )}
              </p>

              <ol className="space-y-3 text-muted-foreground list-decimal pl-6">
                <li>
                  <strong className="text-foreground">{t('"Perioada de amortizare."', '"The payback period."')}</strong>{" "}
                  {t(
                    "Majoritatea calculelor folosesc costuri ideale, nu reale. Costurile de întreținere și upgrade sunt adesea omise.",
                    "Most calculations use ideal, not real, costs. Maintenance and upgrade costs are often omitted.",
                  )}
                </li>
                <li>
                  <strong className="text-foreground">{t("ROI trimis la 5 ani.", "ROI deferred to 5 years.")}</strong>{" "}
                  {t(
                    "O metrică care este încă influențată de valori extreme și nu reflectă experiența investitorului.",
                    "A metric that is still skewed by extreme values and does not reflect the investor's experience.",
                  )}
                </li>
              </ol>

              <p className="text-muted-foreground leading-relaxed">
                {t(
                  'Noi folosim două măsuri mai robuste: perioada reală de amortizare și "proiecte de succes" (ROI ≥ 100% în 3 ani).',
                  'We use two more robust measures: the actual payback period and "successful projects" (ROI ≥ 100% within 3 years).',
                )}
              </p>

              {/* Data Visualization - Chart 2 */}
              <div className="my-12 rounded-[2px] border border-border bg-card p-8">
                <h4 className="mb-6 text-lg font-semibold text-foreground">
                  {t("Perioada medie de amortizare pe dimensiune clădire", "Average payback period by building size")}
                </h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  {[
                    { size: t("< 5.000 mp", "< 5,000 sqm"), years: t("4.2 ani", "4.2 years") },
                    { size: t("5-15.000 mp", "5-15,000 sqm"), years: t("3.1 ani", "3.1 years") },
                    { size: t("15-30.000 mp", "15-30,000 sqm"), years: t("2.4 ani", "2.4 years") },
                    { size: t("> 30.000 mp", "> 30,000 sqm"), years: t("1.8 ani", "1.8 years") },
                  ].map((item) => (
                    <div key={item.size} className="rounded-[2px] bg-muted/50 p-4">
                      <p className="text-2xl font-bold text-primary mb-1">{item.years}</p>
                      <p className="text-xs text-muted-foreground">{item.size}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm text-muted-foreground">
                  {t(
                    "Clădirile mai mari beneficiază de economii de scară, reducând semnificativ perioada de amortizare a investiției în BMS.",
                    "Larger buildings benefit from economies of scale, significantly reducing the payback period of the BMS investment.",
                  )}
                </p>
              </div>

              <h3 className="mt-10 mb-4 text-xl font-semibold text-foreground">
                {t("Proiecte de Succes", "Successful Projects")}
              </h3>

              <p className="text-muted-foreground leading-relaxed">
                {t("Iată", "Here is the")}{" "}
                <strong className="text-foreground">
                  {t(
                    "fracția de proiecte BMS care ating ROI ≥100% în 3 ani",
                    "fraction of BMS projects that reach ROI ≥100% within 3 years",
                  )}
                </strong>
                .
              </p>

              {/* Data Visualization - Chart 3 */}
              <div className="my-12 rounded-[2px] border border-border bg-card p-8">
                <h4 className="mb-6 text-lg font-semibold text-foreground">
                  {t("Rata de succes (ROI ≥100% în 3 ani) pe sector", "Success rate (ROI ≥100% within 3 years) by sector")}
                </h4>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { sector: "HORECA", rate: "68%" },
                    { sector: t("Birouri", "Offices"), rate: "62%" },
                    { sector: t("Medical", "Medical"), rate: "58%" },
                    { sector: "Retail", rate: "54%" },
                    { sector: t("Industrial", "Industrial"), rate: "51%" },
                  ].map((item) => (
                    <div key={item.sector} className="text-center">
                      <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-lg font-bold text-primary">{item.rate}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.sector}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm text-muted-foreground">
                  {t(
                    "Proiectele din sectorul HORECA au cea mai mare rată de succes datorită consumului intensiv de energie și variabilității mari a utilizării.",
                    "Projects in the HORECA sector have the highest success rate thanks to intensive energy consumption and high variability in usage.",
                  )}
                </p>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                {t("Acum modelul ideal se destramă complet:", "Now the idealised model falls apart completely:")}
              </p>

              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                  <span>
                    {t("Ratele de succes sunt", "Success rates are")}{" "}
                    <strong className="text-foreground">{t("consistente, nu haotice", "consistent, not chaotic")}</strong>{" "}
                    {t("între sectoare.", "across sectors.")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                  <span>{t("Proiectele HORECA conduc, dar nu domină.", "HORECA projects lead, but do not dominate.")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"></span>
                  <span>
                    {t(
                      "Sectorul industrial, deși cu cea mai mică reducere de consum, are totuși >50% rată de succes.",
                      "The industrial sector, despite the smallest reduction in consumption, still has a >50% success rate.",
                    )}
                  </span>
                </li>
              </ul>

              <h2 className="mt-16 mb-6 text-3xl font-bold text-foreground">
                {t("Ce spun datele non-biasate", "What the unbiased data says")}
              </h2>

              <p className="text-muted-foreground leading-relaxed">
                {t("În toate rezultatele noastre, obținem un pattern consistent:", "Across all our results, we see a consistent pattern:")}
              </p>

              <ol className="space-y-4 text-muted-foreground">
                <li className="flex items-start gap-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground flex-shrink-0">
                    1
                  </span>
                  <span>
                    <strong className="text-foreground">
                      {t("Beneficiul BMS este real, dar moderat.", "The BMS benefit is real, but moderate.")}
                    </strong>{" "}
                    {t(
                      "Sistemele BMS reflectă o investiție solidă cu randamente previzibile. Efectul este semnificativ, dar nu miraculos.",
                      "BMS systems represent a solid investment with predictable returns. The effect is significant, but not miraculous.",
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground flex-shrink-0">
                    2
                  </span>
                  <span>
                    <strong className="text-foreground">
                      {t(
                        "Rezultatele extreme nu se concentrează în sectoare specifice.",
                        "Extreme results are not concentrated in specific sectors.",
                      )}
                    </strong>{" "}
                    {t(
                      "Proiectele de succes, cele care contează, nu depind de un singur sector.",
                      "Successful projects, the ones that matter, do not depend on a single sector.",
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground flex-shrink-0">
                    3
                  </span>
                  <span>
                    <strong className="text-foreground">{t("Dimensiunea clădirii contează.", "Building size matters.")}</strong>{" "}
                    {t(
                      "Clădirile mai mari văd ROI mai rapid datorită economiilor de scară.",
                      "Larger buildings see ROI faster thanks to economies of scale.",
                    )}
                  </span>
                </li>
              </ol>

              <h2 className="mt-16 mb-6 text-3xl font-bold text-foreground">{t("Concluzii", "Conclusions")}</h2>

              <ol className="space-y-4 text-muted-foreground">
                <li className="flex items-start gap-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground flex-shrink-0">
                    1
                  </span>
                  <span>
                    <strong className="text-foreground">
                      {t(
                        "Reducerile dramatice raportate în studii sunt probabil un artefact al datelor.",
                        "The dramatic reductions reported in studies are likely an artefact of the data.",
                      )}
                    </strong>{" "}
                    {t(
                      "Într-un set de date fără bias de supraviețuire, gap-ul enorm dispare.",
                      "In a dataset without survivorship bias, the enormous gap disappears.",
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground flex-shrink-0">
                    2
                  </span>
                  <span>
                    <strong className="text-foreground">
                      {t("Sistemele BMS sunt o investiție solidă, nu magică.", "BMS systems are a solid investment, not a magical one.")}
                    </strong>{" "}
                    {t(
                      "Obțineți economii reale și previzibile, nu un univers fundamental diferit.",
                      "You get real, predictable savings, not a fundamentally different universe.",
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground flex-shrink-0">
                    3
                  </span>
                  <span>
                    <strong className="text-foreground">
                      {t(
                        "Succesul este previzibil pe baza dimensiunii și sectorului.",
                        "Success is predictable based on size and sector.",
                      )}
                    </strong>{" "}
                    {t(
                      "Există o legătură clară între caracteristicile proiectului și rezultate.",
                      "There is a clear link between project characteristics and outcomes.",
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground flex-shrink-0">
                    4
                  </span>
                  <span>
                    <strong className="text-foreground">{t("Piața BMS este eficientă.", "The BMS market is efficient.")}</strong>{" "}
                    {t(
                      "Prețurile reflectă valoarea reală. Sistemele BMS nu sunt soluții magice, ci investiții solide cu ROI previzibil.",
                      "Prices reflect real value. BMS systems are not magic solutions, but solid investments with predictable ROI.",
                    )}
                  </span>
                </li>
              </ol>

              {/* Disclaimer */}
              <div className="mt-16 rounded-[2px] border border-border bg-muted/30 p-6">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Disclaimer
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(
                    "Acest document și informațiile, graficele furnizate sunt doar în scop informativ și nu ar trebui să fie considerate sfaturi de investiții. Nimic din acest material nu este destinat a fi o recomandare pentru orice investiție sau alt fel de consiliere. Performanțele trecute nu sunt indicative pentru rezultatele viitoare. Conținutul este valabil doar la data indicată. Orice proiecții, estimări, prognoze, ținte, perspective și/sau opinii exprimate în aceste materiale pot fi modificate fără notificare și pot diferi sau fi contrare opiniilor exprimate de alții. Toate datele menționate în acest material sunt actuale la data de 1/1/2026, dacă nu se specifică altfel.",
                    "This document and the information and charts provided are for informational purposes only and should not be considered investment advice. Nothing in this material is intended to be a recommendation for any investment or any other kind of advice. Past performance is not indicative of future results. The content is valid only as of the date indicated. Any projections, estimates, forecasts, targets, prospects and/or opinions expressed in these materials are subject to change without notice and may differ from or be contrary to opinions expressed by others. All data referenced in this material is current as of 1/1/2026, unless otherwise specified.",
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Latest Articles Section */}
        <section className="mt-24 border-t border-border pt-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-2xl font-bold text-foreground">{t("Ultimele articole", "Latest articles")}</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {latestArticles.map((article, index) => (
                <Link key={index} href={article.href} className="group">
                  <div className="relative mb-4 aspect-[2/1] overflow-hidden rounded-[2px] bg-muted">
                    <Image
                      src={article.image || "/placeholder.svg"}
                      alt={article.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="mb-2 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                    {article.category}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {article.date} ·{" "}
                    <span className="text-primary">
                      {article.readTime} {t("citire", "read")}
                    </span>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </article>
    </div>
  )
}
