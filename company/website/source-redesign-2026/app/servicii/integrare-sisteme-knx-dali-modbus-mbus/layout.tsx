import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Integrare KNX, DALI, Modbus, M-Bus in BMS | Sovitech Control",
  description:
    "Integrare de echipamente in BMS prin KNX, DALI, Modbus, M-Bus si BACnet: chillere, centrale de tratare a aerului, iluminat si contoare, intr-un singur ecran.",
  alternates: { canonical: "/servicii/integrare-sisteme-knx-dali-modbus-mbus" },
}

export default function IntegrareLayout({ children }: { children: React.ReactNode }) {
  return children
}
