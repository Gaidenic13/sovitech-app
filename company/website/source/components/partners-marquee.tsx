"use client"

import { useLanguage } from "@/lib/language-context"

// Trusted-partner brand names in a continuous right-to-left marquee (same
// animation as the references marquee). Text placeholders for now — swap in
// real logos later by replacing the <span> with an <img>.

const partners = ["SAUTER", "KNX", "DALI", "Modbus", "M-Bus", "BACnet", "LonMark"]

export function PartnersMarquee() {
  const { t } = useLanguage()
  // duplicate so the -50% translate loops seamlessly
  const loop = [...partners, ...partners]

  return (
    <section className="py-14 bg-[#F5F4F0] overflow-hidden">
      <div className="container-site mb-8">
        <p className="text-sm text-[#888888] font-semibold tracking-wider uppercase mb-2">
          • {t("De încredere", "Trusted by")}
        </p>
        <h2 className="text-3xl md:text-4xl font-light text-[#0D2E2B] tracking-tighter">
          {t("Parteneri de încredere", "Trusted Partners")}
        </h2>
      </div>

      <div className="[mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
        <div className="flex w-max animate-marquee">
          {loop.map((name, i) => (
            <div
              key={i}
              className="mr-4 shrink-0 w-[200px] h-24 rounded-[2px] border border-[#0D2E2B]/10 bg-white flex items-center justify-center"
            >
              <span className="text-lg font-semibold text-[#0D2E2B]/40">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
