/** @type {import('next').NextConfig} */

// Legacy URL map. Every path the site used before the /ghid, /resurse,
// /instrumente, /pentru and /expertiza structure landed redirects permanently
// to its canonical replacement, so existing links and any accrued ranking
// follow the move instead of dying at a 404.
//
// Kept literal rather than derived from lib/site-routes.ts: next.config runs
// before the TypeScript pipeline, and a redirect map should not be able to
// change shape as a side effect of editing the content registry.
const legacyRedirects = [
  // Sectors moved to /expertiza with keyword-bearing slugs.
  { source: "/sectoare", destination: "/expertiza" },
  { source: "/sectoare/civil", destination: "/expertiza/cladiri-de-birouri" },
  { source: "/sectoare/medical", destination: "/expertiza/medical" },
  { source: "/sectoare/retail", destination: "/expertiza/retail" },
  { source: "/sectoare/horeca", destination: "/expertiza/horeca" },
  { source: "/sectoare/industrial", destination: "/expertiza/industrial" },
  { source: "/sectoare/educational", destination: "/expertiza/educational" },
  // Anything else under the old prefix lands on the sector index rather than a 404.
  { source: "/sectoare/:slug*", destination: "/expertiza" },

  // Services gained descriptive slugs.
  { source: "/servicii/proiectare", destination: "/servicii/proiectare-automatizari-bms" },
  { source: "/servicii/executie", destination: "/servicii/executie-sisteme-bms" },
  { source: "/servicii/integrare", destination: "/servicii/integrare-sisteme-knx-dali-modbus-mbus" },
  { source: "/servicii/mentenanta", destination: "/servicii/intretinere-sisteme-bms" },

  // References promoted to a top-level URL.
  { source: "/resurse/referinte", destination: "/referinte" },

  // The market-report page never had content; retired until a report exists.
  { source: "/resurse/raport-piata", destination: "/resurse" },

  // Registry aliases: a declared URL whose content lives elsewhere for now.
  { source: "/instrumente/calculator-economie-energie-bms", destination: "/calculator-roi" },
]

const nextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return legacyRedirects.map((r) => ({ ...r, permanent: true }))
  },
}

export default nextConfig
