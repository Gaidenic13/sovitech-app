"use client"

import { MapPin, Phone, Mail, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

export default function ContactPage() {
  const { t } = useLanguage()

  return (
    <>
      <section className="bg-[#07201C] min-h-[45vh] flex items-end pb-16 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fingerprint-59QWj1Ik1Fd1hqzZduTrEqLz2j557z.svg" alt="" className="h-[600px] w-auto" />
        </div>
        <div className="container-site w-full relative z-10">
          <span className="text-[#C8E6C9] text-sm font-semibold tracking-wider uppercase mb-4 block">• {t("Contact", "Contact")}</span>
          <h1 className="text-5xl md:text-7xl font-light text-white leading-tight tracking-tighter">
            {t("Sa vorbim.", "Let's talk.")}
          </h1>
          <p className="text-lg text-white/60 font-light mt-4 max-w-xl">
            {t(
              "Echipa noastra de specialisti BMS este disponibila pentru consultatii, oferte personalizate si suport tehnic.",
              "Our team of BMS specialists is available for consultations, personalised quotes and technical support."
            )}
          </p>
        </div>
      </section>

      <section className="bg-[#F5F4F0] py-24">
        <div className="container-site">
          <div className="grid gap-16 lg:grid-cols-2">
            <div className="space-y-12">
              <div>
                <p className="section-label mb-3">• {t("INFORMATII", "INFORMATION")}</p>
                <h2 className="text-3xl lg:text-4xl font-light text-[#0D2E2B] tracking-tighter mb-4">
                  {t("Venim la tine", "We come to you")}
                </h2>
                <p className="text-base text-[#888888] font-light leading-relaxed">
                  {t(
                    "Suntem disponibili pentru orice tip de proiect BMS — de la consultatie initiala pana la implementare si mentenanta pe termen lung.",
                    "We are available for any type of BMS project — from initial consultation through to implementation and long-term maintenance."
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
                  title={t("Harta — sediul SOVITECH CONTROL, București", "Map — SOVITECH CONTROL headquarters, Bucharest")}
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
                        {t("Luni — Vineri: 09:00 – 18:00\nSambata — Duminica: Inchis", "Monday — Friday: 09:00 – 18:00\nSaturday — Sunday: Closed")}
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
                        {"SOVITECH CONTROL SRL\nStr. Dr. Nicolae D. Staicovici, nr. 35\n" + t("București, Sector 5, România", "Bucharest, Sector 5, Romania")}
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
                  {[
                    { deptRo: "Tehnic", deptEn: "Technical", name: "Mihai Sorica", phone: "+40720547802", phoneDisplay: "+40 720 547 802", email: "mihai@sovitech.ro" },
                    { deptRo: "Vânzări", deptEn: "Sales", name: "Cristina Vitalariu", phone: "+40731338414", phoneDisplay: "+40 731 338 414", email: "cristina@sovitech.ro" },
                    { deptRo: "Media", deptEn: "Media", name: "Cristian Gaidenic", phone: "+40740527366", phoneDisplay: "+40 740 527 366", email: "media@sovitech.ro" },
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
              </div>
            </div>

            <div className="bg-white rounded-[2px] p-10 border border-[#0D2E2B]/10">
              <p className="section-label mb-3">• {t("MESAJ", "MESSAGE")}</p>
              <h2 className="text-3xl font-light text-[#0D2E2B] tracking-tighter mb-8">
                {t("Trimite-ne o cerere", "Send us a request")}
              </h2>

              <form className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  {[
                    { id: "firstName", labelRo: "Prenume", labelEn: "First name", placeholderRo: "Ion", placeholderEn: "John" },
                    { id: "lastName", labelRo: "Nume", labelEn: "Last name", placeholderRo: "Popescu", placeholderEn: "Smith" },
                  ].map(({ id, labelRo, labelEn, placeholderRo, placeholderEn }) => (
                    <div key={id}>
                      <label htmlFor={id} className="block text-xs font-semibold tracking-widest uppercase text-[#888888] mb-2">{t(labelRo, labelEn)}</label>
                      <input type="text" id={id} placeholder={t(placeholderRo, placeholderEn)} className="w-full rounded-[2px] border border-[#0D2E2B]/15 bg-[#F5F4F0] px-4 py-3 text-sm text-[#0D2E2B] placeholder:text-[#0D2E2B]/30 focus:border-[#1F6B4A] focus:outline-none focus:ring-1 focus:ring-[#1F6B4A] transition" />
                    </div>
                  ))}
                </div>

                {[
                  { id: "email", type: "email", labelRo: "Email", labelEn: "Email", placeholder: "ion.popescu@exemplu.ro" },
                  { id: "phone", type: "tel", labelRo: "Telefon", labelEn: "Phone", placeholder: "+40 XXX XXX XXX" },
                ].map(({ id, type, labelRo, labelEn, placeholder }) => (
                  <div key={id}>
                    <label htmlFor={id} className="block text-xs font-semibold tracking-widest uppercase text-[#888888] mb-2">{t(labelRo, labelEn)}</label>
                    <input type={type} id={id} placeholder={placeholder} className="w-full rounded-[2px] border border-[#0D2E2B]/15 bg-[#F5F4F0] px-4 py-3 text-sm text-[#0D2E2B] placeholder:text-[#0D2E2B]/30 focus:border-[#1F6B4A] focus:outline-none focus:ring-1 focus:ring-[#1F6B4A] transition" />
                  </div>
                ))}

                <div>
                  <label htmlFor="subject" className="block text-xs font-semibold tracking-widest uppercase text-[#888888] mb-2">{t("Subiect", "Subject")}</label>
                  <select id="subject" className="w-full rounded-[2px] border border-[#0D2E2B]/15 bg-[#F5F4F0] px-4 py-3 text-sm text-[#0D2E2B] focus:border-[#1F6B4A] focus:outline-none focus:ring-1 focus:ring-[#1F6B4A] transition">
                    <option>{t("Cerere oferta", "Request a Quote")}</option>
                    <option>{t("Consultanta BMS", "BMS Consultation")}</option>
                    <option>{t("Suport tehnic", "Technical Support")}</option>
                    <option>{t("Informatii produs", "Product Information")}</option>
                    <option>{t("Altele", "Other")}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-semibold tracking-widest uppercase text-[#888888] mb-2">{t("Mesaj", "Message")}</label>
                  <textarea id="message" rows={5} placeholder={t("Descrieti pe scurt proiectul sau intrebarea dumneavoastra...", "Briefly describe your project or question...")} className="w-full rounded-[2px] border border-[#0D2E2B]/15 bg-[#F5F4F0] px-4 py-3 text-sm text-[#0D2E2B] placeholder:text-[#0D2E2B]/30 focus:border-[#1F6B4A] focus:outline-none focus:ring-1 focus:ring-[#1F6B4A] transition resize-none" />
                </div>

                <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-[#1F6B4A] text-white text-sm font-medium px-6 py-3.5 rounded-[2px] hover:bg-[#185c3f] transition-colors">
                  {t("Trimite Mesaj", "Send Message")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#07201C] py-24">
        <div className="container-site flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="section-label text-[#1F6B4A] mb-2">• {t("CALCULATOR", "CALCULATOR")}</p>
            <h2 className="text-3xl font-light text-white tracking-tighter">
              {t("Calculeaza ROI-ul proiectului tau BMS", "Calculate the ROI of your BMS project")}
            </h2>
          </div>
          <Link href="/calculator-roi" className="btn-sovitech-ghost flex-shrink-0">
            {t("Deschide Calculatorul", "Open the Calculator")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
