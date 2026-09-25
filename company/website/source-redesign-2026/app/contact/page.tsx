"use client"

import { MapPin, Phone, Mail, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { HeroField } from "@/components/hero-field"

export default function ContactPage() {
  const { t } = useLanguage()

  return (
    <>
      <section className="bg-[#07201C] min-h-[45vh] flex items-end pt-28 pb-16 relative overflow-hidden">
        <HeroField />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fingerprint-59QWj1Ik1Fd1hqzZduTrEqLz2j557z.svg" alt="" className="h-[600px] w-auto" />
        </div>
        <div className="container-site w-full relative z-10">
          <span className="text-[#C8E6C9] text-sm font-semibold tracking-wider uppercase mb-4 block">• {t("Contact", "Contact")}</span>
          <h1 className="text-4xl md:text-6xl font-light text-white leading-tight tracking-tighter max-w-4xl">
            {t(
              "Contact Sovitech Control: București, Str. Dr. Niculae D. Staicovici nr. 35",
              "Contact Sovitech Control: Bucharest, Str. Dr. Niculae D. Staicovici no. 35"
            )}
          </h1>
          <p className="text-lg text-white/60 font-light mt-4 max-w-2xl">
            {t(
              "Sovitech Control răspunde la cereri de evaluare a clădirii, la cereri de ofertă pentru sisteme de automatizare și BMS, la solicitări de suport tehnic pentru sistemele instalate și la întrebări despre echipamentele SAUTER. Sediul este în București, Sector 5, iar programul este luni până vineri, 09:00-18:00. Cererile trimise prin formular primesc răspuns în maximum două zile lucrătoare.",
              "Sovitech Control answers building assessment requests, quote requests for automation and BMS systems, technical support requests for installed systems and questions about SAUTER equipment. The office is in Bucharest, Sector 5, and working hours are Monday to Friday, 09:00-18:00. Requests sent through the form receive an answer within two working days at most."
            )}
          </p>
        </div>
      </section>

      <section className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <div className="grid gap-16 lg:grid-cols-2">
            <div className="space-y-12">
              <div>
                <p className="section-label mb-3">• {t("INFORMAȚII", "INFORMATION")}</p>
                <h2 className="text-3xl lg:text-4xl font-light text-[#0D2E2B] tracking-tighter mb-4">
                  {t("Sediu, program și acces", "Office, hours and access")}
                </h2>
                <p className="text-base text-[#888888] font-light leading-relaxed">
                  {t(
                    "Vizitele la sediu se fac numai pe bază de programare prealabilă, pentru că echipa lucrează în cea mai mare parte a timpului pe șantiere și în clădirile clienților. Pentru urgențe pe sisteme aflate în contract de întreținere, telefonul direct al echipei tehnice este mai rapid decât formularul.",
                    "Office visits are by prior appointment only, because the team spends most of its time on construction sites and in clients' buildings. For emergencies on systems under a maintenance contract, the technical team's direct phone line is faster than the form."
                  )}
                </p>
              </div>

              {/* Headquarters map — the whole map opens Google Maps at our
                  location; the bbox is centred on Staicovici 35 so our
                  building mark sits exactly on the point (no OSM pin) */}
              <a
                href="https://www.google.com/maps/search/?api=1&query=44.43177,26.07940"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("Deschide sediul SOVITECH în Google Maps", "Open SOVITECH headquarters in Google Maps")}
                className="group relative block aspect-[16/9] overflow-hidden rounded-[2px] border border-[#0D2E2B]/10 bg-[#0D2E2B]/5"
              >
                <iframe
                  title={t("Harta sediului SOVITECH CONTROL, București", "Map of SOVITECH CONTROL headquarters, Bucharest")}
                  src="https://www.openstreetmap.org/export/embed.html?bbox=26.0734%2C44.4288%2C26.0854%2C44.4348&layer=mapnik"
                  className="pointer-events-none absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                {/* our building mark as the location pin */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[2px] bg-[#07201C]">
                    <img src="/building.svg" alt="" aria-hidden="true" className="h-9 w-auto select-none" />
                  </div>
                  <div className="h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-[#07201C]" />
                </div>
                {/* click-through hint */}
                <div className="absolute bottom-3 right-3 rounded-[1px] border border-[#0D2E2B]/10 bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[#0D2E2B]/70 transition-colors duration-150 group-hover:text-[#0D2E2B]">
                  {t("Deschide în Google Maps", "Open in Google Maps")} ↗
                </div>
              </a>

              <div className="space-y-8">
                {/* Program with the address in text to its right */}
                <div className="grid sm:grid-cols-2 gap-8">
                  <div className="flex items-start gap-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[2px] bg-[#0D2E2B]/8 flex-shrink-0">
                      <Clock className="h-5 w-5 text-[#0D2E2B]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold tracking-widest uppercase text-[#888888] mb-1">{t("Program", "Hours")}</p>
                      <p className="text-sm text-[#0D2E2B] font-light leading-relaxed whitespace-pre-line">
                        {t("Luni-vineri: 09:00-18:00\nSâmbătă și duminică: închis", "Monday-Friday: 09:00-18:00\nSaturday and Sunday: closed")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[2px] bg-[#0D2E2B]/8 flex-shrink-0">
                      <MapPin className="h-5 w-5 text-[#0D2E2B]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold tracking-widest uppercase text-[#888888] mb-1">{t("Adresa", "Address")}</p>
                      <p className="text-sm text-[#0D2E2B] font-light leading-relaxed whitespace-pre-line">
                        {"SOVITECH CONTROL SRL\nStr. Dr. Niculae D. Staicovici nr. 35\n" +
                          t("Sector 5, București, România", "Sector 5, Bucharest, Romania") +
                          "\nCUI 38500895, Reg. Com. J40/19288/2017"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Department contacts */}
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-[#888888] mb-4">
                  • {t("Contact direct", "Direct contact")}
                </p>
                <div className="flex flex-col divide-y divide-[#0D2E2B]/10 border-y border-[#0D2E2B]/10">
                  {/* TODO(contact): roles below to be confirmed against the Despre noi page before publication (copy doc C1 note) */}
                  {[
                    { deptRo: "Tehnic, proiecte și suport", deptEn: "Technical, projects and support", name: "Mihai Sorica", phone: "+40720547802", phoneDisplay: "+40 720 547 802", email: "mihai@sovitech.ro" },
                    { deptRo: "Vânzări și oferte", deptEn: "Sales and quotes", name: "Cristina Vitalariu", phone: "+40731338414", phoneDisplay: "+40 731 338 414", email: "cristina@sovitech.ro" },
                    { deptRo: "Media și comunicare", deptEn: "Media and communication", name: "Cristian Gaidenic", phone: "+40740527366", phoneDisplay: "+40 740 527 366", email: "media@sovitech.ro" },
                  ].map((person) => (
                    <div key={person.email} className="py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <div className="sm:w-32 shrink-0">
                        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#1F6B4A]">{t(person.deptRo, person.deptEn)}</p>
                        <p className="text-sm font-medium text-[#0D2E2B] mt-0.5">{person.name}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                        <a href={`tel:${person.phone}`} className="inline-flex items-center gap-2 text-sm font-light text-[#0D2E2B]/70 hover:text-[#0D2E2B] transition-colors duration-150">
                          <Phone className="h-3.5 w-3.5 text-[#1F6B4A]" />
                          {person.phoneDisplay}
                        </a>
                        <a href={`mailto:${person.email}`} className="inline-flex items-center gap-2 text-sm font-light text-[#0D2E2B]/70 hover:text-[#0D2E2B] transition-colors duration-150">
                          <Mail className="h-3.5 w-3.5 text-[#1F6B4A]" />
                          {person.email}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm font-light text-[#0D2E2B]/70">
                  {t("Adresă generală: ", "General address: ")}
                  <a href="mailto:office@sovitech.ro" className="text-[#1F6B4A] hover:underline">office@sovitech.ro</a>
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[2px] p-10 border border-[#0D2E2B]/10">
              <p className="section-label mb-3">• {t("MESAJ", "MESSAGE")}</p>
              <h2 className="text-3xl font-light text-[#0D2E2B] tracking-tighter mb-4">
                {t("Trimiteți o cerere", "Send a request")}
              </h2>
              <p className="text-sm text-[#888888] font-light leading-relaxed mb-8">
                {t(
                  "Trei informații scurtează cel mai mult drumul până la un răspuns util: tipul clădirii, suprafața aproximativă și ce sistem de automatizare există astăzi, dacă există. Restul se clarifică la telefon.",
                  "Three pieces of information shorten the road to a useful answer the most: the building type, the approximate area and what automation system exists today, if any. The rest is clarified over the phone."
                )}
              </p>

              {/* Copy doc C1 rule: no personal names in placeholders, field descriptions only. */}
              <form className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  {[
                    { id: "firstName", labelRo: "Prenume", labelEn: "First name", placeholderRo: "Prenumele persoanei de contact", placeholderEn: "Contact person's first name" },
                    { id: "lastName", labelRo: "Nume", labelEn: "Last name", placeholderRo: "Numele persoanei de contact", placeholderEn: "Contact person's last name" },
                  ].map(({ id, labelRo, labelEn, placeholderRo, placeholderEn }) => (
                    <div key={id}>
                      <label htmlFor={id} className="block text-xs font-semibold tracking-widest uppercase text-[#888888] mb-2">{t(labelRo, labelEn)}</label>
                      <input type="text" id={id} placeholder={t(placeholderRo, placeholderEn)} className="w-full rounded-[2px] border border-[#0D2E2B]/15 bg-[#F5F4F0] px-4 py-3 text-sm text-[#0D2E2B] placeholder:text-[#0D2E2B]/30 focus:border-[#1F6B4A] focus:outline-none focus:ring-1 focus:ring-[#1F6B4A] transition" />
                    </div>
                  ))}
                </div>

                {[
                  { id: "email", type: "email", labelRo: "Adresă de email", labelEn: "Email address", placeholderRo: "adresa de email de serviciu", placeholderEn: "work email address" },
                  { id: "phone", type: "tel", labelRo: "Telefon", labelEn: "Phone", placeholderRo: "număr de telefon cu prefix", placeholderEn: "phone number with country code" },
                ].map(({ id, type, labelRo, labelEn, placeholderRo, placeholderEn }) => (
                  <div key={id}>
                    <label htmlFor={id} className="block text-xs font-semibold tracking-widest uppercase text-[#888888] mb-2">{t(labelRo, labelEn)}</label>
                    <input type={type} id={id} placeholder={t(placeholderRo, placeholderEn)} className="w-full rounded-[2px] border border-[#0D2E2B]/15 bg-[#F5F4F0] px-4 py-3 text-sm text-[#0D2E2B] placeholder:text-[#0D2E2B]/30 focus:border-[#1F6B4A] focus:outline-none focus:ring-1 focus:ring-[#1F6B4A] transition" />
                  </div>
                ))}

                <div>
                  <label htmlFor="subject" className="block text-xs font-semibold tracking-widest uppercase text-[#888888] mb-2">{t("Subiectul cererii", "Request subject")}</label>
                  <select id="subject" className="w-full rounded-[2px] border border-[#0D2E2B]/15 bg-[#F5F4F0] px-4 py-3 text-sm text-[#0D2E2B] focus:border-[#1F6B4A] focus:outline-none focus:ring-1 focus:ring-[#1F6B4A] transition">
                    <option>{t("Evaluare a clădirii", "Building assessment")}</option>
                    <option>{t("Cerere de ofertă", "Quote request")}</option>
                    <option>{t("Suport tehnic pentru un sistem existent", "Technical support for an existing system")}</option>
                    <option>{t("Întrebare despre produse SAUTER", "Question about SAUTER products")}</option>
                    <option>{t("Colaborare ca proiectant sau antreprenor", "Collaboration as a designer or contractor")}</option>
                    <option>{t("Altul", "Other")}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-semibold tracking-widest uppercase text-[#888888] mb-2">{t("Detalii despre cerere", "Request details")}</label>
                  <textarea id="message" rows={5} placeholder={t("Ce sisteme tehnice există în clădire, ce funcționează prost astăzi, ce termen aveți", "What technical systems the building has, what works poorly today, what deadline you have")} className="w-full rounded-[2px] border border-[#0D2E2B]/15 bg-[#F5F4F0] px-4 py-3 text-sm text-[#0D2E2B] placeholder:text-[#0D2E2B]/30 focus:border-[#1F6B4A] focus:outline-none focus:ring-1 focus:ring-[#1F6B4A] transition resize-none" />
                </div>

                <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-[#1F6B4A] text-white text-sm font-medium px-6 py-3.5 rounded-[2px] hover:bg-[#185c3f] transition-colors">
                  {t("Trimite cererea", "Send the request")}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-xs text-[#888888] font-light leading-relaxed">
                  {t(
                    "Datele din formular se folosesc pentru a răspunde la această cerere și pentru a pregăti o eventuală ofertă. Nu se vând și nu se transmit către terți în scop de marketing. Detalii în ",
                    "The data in this form is used to answer this request and to prepare a possible quote. It is not sold and not passed to third parties for marketing. Details in the "
                  )}
                  <Link href="/confidentialitate" className="text-[#1F6B4A] underline underline-offset-2">
                    {t("Politica de confidențialitate", "Privacy Policy")}
                  </Link>
                  .
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#07201C] section-l">
        <div className="container-site flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="section-label text-[#1F6B4A] mb-2">• {t("CALCULATOR", "CALCULATOR")}</p>
            <h2 className="text-3xl font-light text-white tracking-tighter">
              {t("Estimați ordinul de mărime al investiției într-un sistem BMS", "Estimate the order of magnitude of a BMS investment")}
            </h2>
          </div>
          <Link href="/calculator-roi" className="btn-sovitech-ghost flex-shrink-0">
            {t("Deschide calculatorul", "Open the calculator")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
