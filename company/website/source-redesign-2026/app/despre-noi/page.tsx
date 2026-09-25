"use client"

// Page copy from doc C1 (copy_01_core.md), section "Despre noi".
// The team section from the copy doc is intentionally NOT published: real
// names, roles and photographs are [DE FURNIZAT]. Per the doc's rule, the
// section stays hidden until complete real data exists.

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { HeroField } from "@/components/hero-field"

export default function DespreNoiPage() {
  const { t } = useLanguage()

  const facts = [
    {
      ro: "SOVITECH CONTROL SRL, CUI 38500895, Reg. Com. J40/19288/2017.",
      en: "SOVITECH CONTROL SRL, tax code (CUI) 38500895, Trade Register no. J40/19288/2017.",
    },
    {
      ro: "Sediu: Str. Dr. Niculae D. Staicovici nr. 35, Sector 5, București.",
      en: "Registered office: Str. Dr. Niculae D. Staicovici no. 35, Sector 5, Bucharest.",
    },
    {
      ro: "Din 2017: partener autorizat SAUTER, Systems Partner.",
      en: "Since 2017: authorised SAUTER partner, Systems Partner.",
    },
    {
      ro: "25 de proiecte de referință livrate, cu nume public, în 8 sectoare.",
      en: "25 reference projects delivered, publicly named, across 8 sectors.",
    },
    {
      ro: "Echipă mică, specializată, fără subcontractare a punerii în funcțiune.",
      en: "A small, specialised team; commissioning is never subcontracted.",
    },
    {
      ro: "Independentă de producători: proiectele se scriu pe funcții și protocoale deschise.",
      en: "Manufacturer-independent: designs are written around functions and open protocols.",
    },
  ]

  const idRows = [
    { labelRo: "Denumire", labelEn: "Company name", value: "SOVITECH CONTROL SRL" },
    { labelRo: "Cod unic de înregistrare (CUI)", labelEn: "Tax code (CUI)", value: "38500895" },
    { labelRo: "Număr de ordine în Registrul Comerțului", labelEn: "Trade Register number", value: "J40/19288/2017" },
    { labelRo: "An înființare", labelEn: "Year founded", value: "2017" },
    {
      labelRo: "Sediu social",
      labelEn: "Registered office",
      value: t(
        "Str. Dr. Niculae D. Staicovici nr. 35, Sector 5, București, România",
        "Str. Dr. Niculae D. Staicovici no. 35, Sector 5, Bucharest, Romania"
      ),
    },
    {
      labelRo: "Obiect principal de activitate",
      labelEn: "Main activity",
      value: t(
        "proiectare, execuție, integrare și întreținere de sisteme de automatizare a clădirilor și BMS",
        "design, execution, integration and maintenance of building automation and BMS systems"
      ),
    },
    {
      labelRo: "Parteneriat",
      labelEn: "Partnership",
      value: t("SAUTER (Elveția), Systems Partner, din 2017", "SAUTER (Switzerland), Systems Partner, since 2017"),
    },
  ]

  const faqs = [
    {
      qRo: "Din ce an este Sovitech Control partener SAUTER?",
      qEn: "Since when has Sovitech Control been a SAUTER partner?",
      aRo: "Din 2017, anul înființării firmei. Sovitech Control este Systems Partner SAUTER și lucrează cu gama Modulo6, Modulo5 și ECOS, cu senzorii EGQ, EGH și EGP, cu vane și servomotoare, precum și cu platformele de supervizare Sauter Vision Center și ModuWeb Vision EY-WS 500.",
      aEn: "Since 2017, the year the company was founded. Sovitech Control is a SAUTER Systems Partner and works with the Modulo6, Modulo5 and ECOS ranges, the EGQ, EGH and EGP sensors, valves and actuators, as well as the Sauter Vision Center and ModuWeb Vision EY-WS 500 supervision platforms.",
    },
    {
      qRo: "Sovitech Control lucrează doar cu echipamente SAUTER?",
      qEn: "Does Sovitech Control work only with SAUTER equipment?",
      aRo: "Nu. Echipamentele SAUTER sunt platforma preferată pentru automatele și senzorii noi, dar sistemele existente din clădire se integrează pe protocoale deschise: KNX, DALI, Modbus și M-Bus. Chillere, centrale de tratare a aerului, contoare și corpuri de iluminat de alte mărci rămân în funcțiune și intră în aceeași interfață.",
      aEn: "No. SAUTER equipment is the preferred platform for new controllers and sensors, but the building's existing systems are integrated over open protocols: KNX, DALI, Modbus and M-Bus. Chillers, air handling units, meters and luminaires of other brands stay in service and join the same interface.",
    },
    {
      qRo: "Câte proiecte a livrat Sovitech Control?",
      qEn: "How many projects has Sovitech Control delivered?",
      aRo: "Firma publică 25 de proiecte de referință, cu nume, oraș și sector, în HORECA, birouri, pharma, medical, industrial, retail și clădiri instituționale. Sovitech Control nu publică un număr total de proiecte peste cele care pot fi verificate prin numele clădirii.",
      aEn: "The company publishes 25 reference projects, with name, city and sector, in HORECA, offices, pharma, medical, industrial, retail and institutional buildings. Sovitech Control does not publish a total project count beyond those that can be verified by building name.",
    },
    {
      qRo: "Unde are sediul firma și în ce zone intervine?",
      qEn: "Where is the company based and where does it operate?",
      aRo: "Sediul este în București, Str. Dr. Niculae D. Staicovici nr. 35, Sector 5. Proiectele livrate acoperă București, Sibiu, Bacău, Pitești, Roman, Otopeni și Pantelimon, plus o lucrare în Uzbekistan. Intervențiile de întreținere se stabilesc prin contract, cu timp de răspuns declarat.",
      aEn: "The office is in Bucharest, Str. Dr. Niculae D. Staicovici no. 35, Sector 5. Delivered projects cover Bucharest, Sibiu, Bacau, Pitesti, Roman, Otopeni and Pantelimon, plus one project in Uzbekistan. Maintenance interventions are set by contract, with a declared response time.",
    },
  ]

  return (
    <>
      {/* Hero */}
      <section className="bg-[#07201C] min-h-[45vh] flex items-end pt-28 pb-16 relative overflow-hidden">
        <HeroField />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fingerprint-59QWj1Ik1Fd1hqzZduTrEqLz2j557z.svg"
            alt=""
            className="h-[600px] w-auto"
          />
        </div>
        <div className="container-site w-full relative z-10">
          <span className="text-[#C8E6C9] text-xs font-semibold tracking-widest uppercase mb-4 block">
            • {t("Despre noi", "About us")}
          </span>
          <h1 className="text-4xl md:text-6xl font-light text-white leading-tight tracking-tighter max-w-4xl">
            {t(
              "Sovitech Control: firmă de automatizare a clădirilor din București, înființată în 2017",
              "Sovitech Control: a building automation company from Bucharest, founded in 2017"
            )}
          </h1>
          <p className="text-lg text-white/60 font-light mt-4 max-w-2xl">
            {t(
              "Sovitech Control este o firmă românească de automatizare a clădirilor, înființată în 2017 la București și partener autorizat SAUTER din același an. Echipa este mică și specializată, lucrează pe proiecte de BMS în opt sectoare de clădiri și acoperă întregul ciclu: proiectare, execuție, integrare pe protocoale deschise, punere în funcțiune, întreținere și modernizare.",
              "Sovitech Control is a Romanian building automation company, founded in Bucharest in 2017 and an authorised SAUTER partner since that same year. The team is small and specialised, works on BMS projects across eight building sectors and covers the full cycle: design, execution, integration over open protocols, commissioning, maintenance and modernisation."
            )}
          </p>
        </div>
      </section>

      {/* At a glance */}
      <section className="bg-[#F5F4F0] section-m">
        <div className="container-site">
          <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">• {t("Pe scurt", "At a glance")}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map((f) => (
              <div key={f.ro} className="rounded-[2px] bg-white border border-[#0D2E2B]/10 p-6">
                <p className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(f.ro, f.en)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* History */}
      <section className="bg-white section-l">
        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">• {t("Istoric", "History")}</p>
              <h2 className="text-3xl sm:text-4xl font-light text-[#0D2E2B] tracking-tighter leading-tight">
                {t(
                  "Sovitech Control lucrează cu SAUTER din 2017, anul înființării",
                  "Sovitech Control has worked with SAUTER since 2017, the year it was founded"
                )}
              </h2>
            </div>
            <div className="space-y-5 text-base text-[#0D2E2B]/80 font-light leading-relaxed">
              <p>
                {t(
                  "Sovitech Control a pornit în 2017 ca firmă de automatizare a clădirilor, cu o echipă formată din ingineri care lucraseră deja pe sisteme BMS în clădiri mari din România. Parteneriatul cu SAUTER, producătorul elvețian de echipamente de automatizare, a fost stabilit din primul an.",
                  "Sovitech Control started in 2017 as a building automation company, with a team of engineers who had already worked on BMS systems in large buildings across Romania. The partnership with SAUTER, the Swiss manufacturer of automation equipment, was established in the first year."
                )}
              </p>
              <p>
                {t(
                  "Portofoliul s-a construit în ordinea în care apar cerințele reale pe piața românească: hoteluri și complexe de wellness, birouri clasa A, unități farmaceutice, spitale, fabrici, parcuri de retail și clădiri instituționale. Primul proiect internațional, o fabrică farmaceutică Rompharm în Uzbekistan, a venit din continuarea unei lucrări livrate în România.",
                  "The portfolio was built in the order real demand appears on the Romanian market: hotels and wellness complexes, class A offices, pharmaceutical facilities, hospitals, factories, retail parks and institutional buildings. The first international project, a Rompharm pharmaceutical plant in Uzbekistan, came as the continuation of a project delivered in Romania."
                )}
              </p>
              <p>
                {t(
                  "Firma nu publică cifră de afaceri, număr de angajați sau număr total de proiecte peste cele 25 listate public. Ce se poate verifica este lista de clădiri.",
                  "The company does not publish revenue, headcount or a total project count beyond the 25 listed publicly. What can be verified is the list of buildings."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Independence */}
      <section className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">• {t("Independență", "Independence")}</p>
          <h2 className="text-3xl sm:text-4xl font-light text-[#0D2E2B] tracking-tighter leading-tight mb-6 max-w-3xl">
            {t(
              "Integrator independent: proiect executabil și de alt furnizor",
              "Independent integrator: a design another supplier can also execute"
            )}
          </h2>
          <p className="text-base text-[#0D2E2B]/70 font-light leading-relaxed mb-10 max-w-3xl">
            {t(
              "„Integrator independent” este o afirmație care se verifică în trei locuri concrete, nu în declarații.",
              "“Independent integrator” is a claim you verify in three concrete places, not in statements."
            )}
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[2px] bg-white border border-[#0D2E2B]/10 p-8">
              <h3 className="text-lg font-medium text-[#0D2E2B] tracking-tight mb-3">
                {t("În caietul de sarcini", "In the tender specification")}
              </h3>
              <p className="text-sm text-[#0D2E2B]/70 font-light leading-relaxed">
                {t(
                  "Un proiect scris pe funcții, puncte și protocoale deschise poate fi ofertat de mai mulți executanți. Un proiect scris pe coduri de produs blochează cumpărătorul la un singur furnizor și, într-o achiziție publică, poate fi contestat.",
                  "A design written around functions, points and open protocols can be quoted by several contractors. A design written around product codes locks the buyer to a single supplier and, in a public procurement, can be contested."
                )}
              </p>
            </div>
            <div className="rounded-[2px] bg-white border border-[#0D2E2B]/10 p-8">
              <h3 className="text-lg font-medium text-[#0D2E2B] tracking-tight mb-3">
                {t("În ce se păstrează din clădire", "In what is kept from the building")}
              </h3>
              <p className="text-sm text-[#0D2E2B]/70 font-light leading-relaxed">
                {t(
                  "Un integrator independent păstrează senzorii, cablarea și elementele de execuție care funcționează și le integrează pe KNX, DALI, Modbus sau M-Bus. Un furnizor legat de o marcă are un motiv comercial să înlocuiască tot.",
                  "An independent integrator keeps the sensors, cabling and field devices that work and integrates them over KNX, DALI, Modbus or M-Bus. A supplier tied to one brand has a commercial reason to replace everything."
                )}
              </p>
            </div>
            <div className="rounded-[2px] bg-white border border-[#0D2E2B]/10 p-8">
              <h3 className="text-lg font-medium text-[#0D2E2B] tracking-tight mb-3">
                {t("În cine deține sistemul", "In who owns the system")}
              </h3>
              <p className="text-sm text-[#0D2E2B]/70 font-light leading-relaxed">
                {t(
                  "Clientul primește documentația As-built, lista de puncte, programele și accesul de administrare. Fără acestea, întreținerea rămâne captivă la firma care a executat lucrarea, indiferent de calitatea ei.",
                  "The client receives the As-built documentation, the points list, the programs and the administrator access. Without these, maintenance stays captive to the company that executed the work, whatever its quality."
                )}
              </p>
            </div>
          </div>
          <p className="text-base text-[#0D2E2B]/70 font-light leading-relaxed mt-10 max-w-3xl">
            {t(
              "Sovitech Control lucrează cu echipamente SAUTER pentru că platforma are ciclu de viață lung și piese disponibile, nu pentru că ar exista o obligație de volum.",
              "Sovitech Control works with SAUTER equipment because the platform has a long life cycle and available spare parts, not because there is any volume commitment."
            )}
          </p>
        </div>
      </section>

      {/* SAUTER partnership */}
      <section className="bg-[#07201C] section-l">
        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <p className="text-xs text-[#C8E6C9] font-semibold tracking-widest uppercase mb-3">• {t("Parteneriat", "Partnership")}</p>
              <h2 className="text-3xl sm:text-4xl font-light text-white tracking-tighter leading-tight">
                {t(
                  "Parteneriatul SAUTER aduce platformă, piese și continuitate",
                  "The SAUTER partnership brings a platform, spare parts and continuity"
                )}
              </h2>
            </div>
            <div className="space-y-5 text-base text-white/60 font-light leading-relaxed">
              <p>
                {t(
                  "SAUTER este un producător elvețian de echipamente de automatizare a clădirilor. Ca Systems Partner, Sovitech Control are acces la gama completă, la instruire tehnică și la suportul producătorului pentru configurații neobișnuite.",
                  "SAUTER is a Swiss manufacturer of building automation equipment. As a Systems Partner, Sovitech Control has access to the full range, to technical training and to the manufacturer's support for unusual configurations."
                )}
              </p>
              <p>
                {t(
                  "Echipamentele folosite curent: automate Modulo6 (EY-AS660 și EY-AS680), Modulo5 și ECOS, senzori EGQ pentru CO2, senzori EGH pentru umiditate și EGP pentru presiune, vane și servomotoare, plus stratul de supervizare Sauter Vision Center și ModuWeb Vision EY-WS 500. Pentru monitorizarea energiei se folosesc EMS 100 și EMS 200.",
                  "The equipment in current use: Modulo6 controllers (EY-AS660 and EY-AS680), Modulo5 and ECOS, EGQ sensors for CO2, EGH sensors for humidity and EGP for pressure, valves and actuators, plus the Sauter Vision Center and ModuWeb Vision EY-WS 500 supervision layer. Energy monitoring uses EMS 100 and EMS 200."
                )}
              </p>
              <p>
                {t(
                  "Ce contează pentru cumpărător este disponibilitatea pe termen lung. Un sistem de automatizare are un ciclu de viață de peste zece ani, iar întrebarea corectă la achiziție nu este ce face astăzi interfața, ci dacă peste opt ani se mai găsește un modul de înlocuire și cine îl poate pune.",
                  "What matters to the buyer is long-term availability. An automation system has a life cycle of over ten years, and the right purchasing question is not what the interface does today, but whether a replacement module can still be found in eight years and who can install it."
                )}
              </p>
              <Link href="/produse" className="inline-flex items-center gap-2 text-sm text-[#C8E6C9] hover:text-white transition-colors duration-150">
                {t("Vezi echipamentele SAUTER integrate", "See the integrated SAUTER equipment")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Same engineers */}
      <section className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">• {t("Mod de lucru", "How we work")}</p>
              <h2 className="text-3xl sm:text-4xl font-light text-[#0D2E2B] tracking-tighter leading-tight">
                {t(
                  "Aceiași ingineri, de la proiect la punerea în funcțiune",
                  "The same engineers, from design to commissioning"
                )}
              </h2>
            </div>
            <div className="space-y-5 text-base text-[#0D2E2B]/80 font-light leading-relaxed">
              <p>
                {t(
                  "Echipa este mică și specializată. Persoana care scrie lista de puncte este aceeași care programează automatul și care răspunde la telefon când o alarmă nu are sens. Punerea în funcțiune nu se subcontractează.",
                  "The team is small and specialised. The person who writes the points list is the same one who programs the controller and answers the phone when an alarm makes no sense. Commissioning is never subcontracted."
                )}
              </p>
              <p>
                {t(
                  "Un proiect trece prin patru etape, cu livrabile clare la fiecare: evaluarea clădirii și lista de puncte, proiectul tehnic și schemele de tablou, execuția și punerea în funcțiune, apoi documentația As-built și instruirea echipei de operare.",
                  "A project goes through four stages, each with clear deliverables: the building assessment and the points list, the technical design and panel schematics, execution and commissioning, then the As-built documentation and training for the operating team."
                )}
              </p>
              <p>
                {t(
                  "După recepție, relația continuă prin contract de întreținere sau prin intervenții punctuale. Bugetul anual uzual pentru un contract de bază este 4-7% din valoarea investiției, iar pentru un contract extins, cu timp de răspuns garantat, 7-12%.",
                  "After handover, the relationship continues through a maintenance contract or one-off interventions. The usual annual budget for a basic contract is 4-7% of the investment value, and 7-12% for an extended contract with guaranteed response time."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Company identification data */}
      <section className="bg-white section-l">
        <div className="container-site">
          <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">• {t("Date de firmă", "Company data")}</p>
          <h2 className="text-3xl sm:text-4xl font-light text-[#0D2E2B] tracking-tighter leading-tight mb-10">
            {t("Date de identificare SOVITECH CONTROL SRL", "SOVITECH CONTROL SRL identification data")}
          </h2>
          <div className="overflow-x-auto rounded-[2px] border border-[#0D2E2B]/10 max-w-4xl">
            <table className="w-full min-w-[560px] text-sm border-collapse">
              <tbody>
                {idRows.map((row) => (
                  <tr key={row.labelRo} className="border-b border-[#0D2E2B]/10 last:border-b-0">
                    <th className="text-left align-top font-semibold text-[#0D2E2B] bg-[#0D2E2B]/4 px-5 py-3.5 w-1/3">
                      {t(row.labelRo, row.labelEn)}
                    </th>
                    <td className="align-top text-[#0D2E2B]/80 font-light px-5 py-3.5">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">• {t("Întrebări frecvente", "FAQ")}</p>
          <h2 className="text-3xl sm:text-4xl font-light text-[#0D2E2B] tracking-tighter leading-tight mb-10">
            {t("Întrebări frecvente despre firmă", "Frequently asked questions about the company")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((f) => (
              <div key={f.qRo} className="rounded-[2px] bg-white border border-[#0D2E2B]/10 p-8">
                <h3 className="text-lg font-medium text-[#0D2E2B] tracking-tight mb-3">{t(f.qRo, f.qEn)}</h3>
                <p className="text-sm text-[#0D2E2B]/70 font-light leading-relaxed">{t(f.aRo, f.aEn)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#07201C] section-l">
        <div className="container-site">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] items-end">
            <div>
              <p className="text-sm font-semibold tracking-wider uppercase mb-4 text-[#C8E6C9]">
                • {t("Următorul pas", "Next step")}
              </p>
              <h2 className="text-4xl md:text-5xl font-light text-white leading-none tracking-tighter mb-4">
                {t(
                  "Discutați proiectul cu inginerul care îl va executa",
                  "Discuss the project with the engineer who will execute it"
                )}
              </h2>
              <p className="text-lg text-white/60 font-light">
                {t(
                  "La Sovitech Control, persoana care evaluează clădirea este aceeași care scrie lista de puncte și pune sistemul în funcțiune. Prima discuție clarifică scopul lucrării și ordinul de mărime al investiției.",
                  "At Sovitech Control, the person who assesses the building is the same one who writes the points list and commissions the system. The first conversation clarifies the scope of the work and the order of magnitude of the investment."
                )}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch gap-3 lg:justify-self-end">
              <Link href="/contact" className="inline-flex items-center justify-center bg-white text-[#07201C] text-base px-8 py-4 rounded-[1px] transition-colors duration-300 hover:bg-[#C8E6C9]">
                {t("Cere o discuție tehnică", "Request a technical discussion")}
              </Link>
              <Link href="/referinte" className="inline-flex items-center justify-center text-white/80 text-base border border-white/15 px-8 py-4 rounded-[1px] transition-colors duration-300 hover:text-white hover:border-white/40">
                {t("Vezi cele 25 de proiecte de referință", "See the 25 reference projects")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
