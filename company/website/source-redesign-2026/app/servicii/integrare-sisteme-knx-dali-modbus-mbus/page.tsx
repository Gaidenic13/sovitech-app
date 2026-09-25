"use client"

// LINKS-TO-REACTIVATE: BACnet, Modbus, KNX, M-Bus si LON: cum se alege protocolul | interim /resurse/bms-scada-integrare | final /ghid/protocoale-automatizarea-cladirilor
// LINKS-TO-REACTIVATE: Integrarea BMS cu echipamente vechi | interim /resurse/bms-scada-integrare | final /resurse/integrare-bms-echipamente-vechi
// LINKS-TO-REACTIVATE: Vendor lock-in: sisteme deschise versus proprietare | interim /resurse/bms-scada-integrare | final /resurse/vendor-lock-in-protocoale-deschise
// TODO(confirm): duratele orientative pe etape si termenele curente de livrare a interfetelor

import Link from "next/link"
import { Clock, CheckCircle2, Network, Target, Users, ShieldCheck, XCircle, ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { ServiceHero } from "@/components/service-hero"

export default function IntegrarePage() {
  const { t } = useLanguage()

  const sidebarProtocols = [
    { ro: "Modbus RTU și TCP", en: "Modbus RTU and TCP" },
    { ro: "BACnet MS/TP și IP", en: "BACnet MS/TP and IP" },
    { ro: "KNX", en: "KNX" },
    { ro: "DALI", en: "DALI" },
    { ro: "M-Bus", en: "M-Bus" },
  ]

  const summaryPoints = [
    { ro: "Fiecare echipament major vine cu automatizarea lui. Integrarea nu o înlocuiește: o supraveghează, îi dă comenzi și îi citește valorile.", en: "Every major piece of equipment comes with its own controls. Integration does not replace them: it supervises them, sends them commands and reads their values." },
    { ro: "Cinci protocoale acoperă aproape tot ce există într-o clădire comercială: Modbus pentru echipamente de instalații și contoare, BACnet pentru automatizarea de clădire, KNX pentru iluminat și comenzi de cameră, DALI pentru corpuri de iluminat adresabile, M-Bus pentru contoare de energie termică și de apă.", en: "Five protocols cover almost everything in a commercial building: Modbus for plant equipment and meters, BACnet for building automation, KNX for lighting and room controls, DALI for addressable luminaires, M-Bus for heat and water meters." },
    { ro: "Costul se calculează pe punct integrat, în aceeași bandă de 90-320 EUR pe punct de date, cu observația că punctele preluate pe magistrală sunt în partea de jos a benzii, iar cele care cer gateway și mapare în partea de sus.", en: "The cost is calculated per integrated point, in the same 90-320 EUR per data point band, with the note that points taken over the bus sit at the bottom of the band, while those requiring a gateway and mapping sit at the top." },
    { ro: "Un gateway nu creează funcții care nu există. Dacă echipamentul nu expune o valoare pe protocol, nicio integrare nu o poate citi.", en: "A gateway does not create functions that do not exist. If the equipment does not expose a value over the protocol, no integration can read it." },
    { ro: "Integrarea este condiția de bază pentru raportarea de energie, pentru că datele de contorizare trebuie să ajungă într-un singur istoric, cu aceeași bază de timp.", en: "Integration is the basic condition for energy reporting, because metering data must land in a single history, on the same time base." },
    { ro: "Protocoalele deschise sunt și un instrument comercial: ele determină dacă beneficiarul poate schimba furnizorul de service fără să schimbe sistemul.", en: "Open protocols are also a commercial instrument: they determine whether the client can change the service provider without changing the system." },
  ]

  const deliverables = [
    { ro: "Inventarul echipamentelor integrabile, cu protocolul, versiunea, interfața fizică disponibilă și lista de valori pe care fiecare echipament le expune efectiv.", en: "The inventory of integrable equipment, with the protocol, version, available physical interface and the list of values each device actually exposes." },
    { ro: "Tabelul de mapare, punct cu punct: registrul sau obiectul din echipament, adresa în sistemul BMS, unitatea de măsură, factorul de scalare, sensul comenzii.", en: "The mapping table, point by point: the register or object in the equipment, the address in the BMS, the unit of measure, the scaling factor, the command direction." },
    { ro: "Echipamentele de interfață, unde sunt necesare: gateway-uri de protocol, convertoare de mediu fizic, repetoare de magistrală, cu poziția lor în tablou.", en: "The interface equipment, where needed: protocol gateways, physical media converters, bus repeaters, with their position in the panel." },
    { ro: "Configurarea magistralelor: topologie, adresare, terminații, viteze de comunicație, separarea segmentelor.", en: "Bus configuration: topology, addressing, terminations, communication speeds, segment separation." },
    { ro: "Integrarea în interfața grafică: echipamentele integrate apar pe sinopticele proprii, cu valorile reale, nu ca un link către un alt program.", en: "Integration into the graphical interface: integrated equipment appears on its own synoptics, with real values, not as a link to another program." },
    { ro: "Alarme și supraveghere de comunicație: fiecare echipament integrat are alarmă de pierdere a comunicației, distinctă de alarmele lui interne.", en: "Alarms and communication monitoring: every integrated device has a communication-loss alarm, distinct from its internal alarms." },
    { ro: "Trend-loguri pe punctele integrate, cu rezoluție de 15 minute pentru energie electrică, 15 minute până la 1 oră pentru energie termică și 5-15 minute pentru parametrii de mediu interior.", en: "Trend logs on the integrated points, at 15-minute resolution for electricity, 15 minutes to 1 hour for heat, and 5-15 minutes for indoor environment parameters." },
    { ro: "Documentația de integrare: tabelul de mapare final, configurațiile gateway-urilor, backup-urile și procedura de refacere.", en: "The integration documentation: the final mapping table, the gateway configurations, the backups and the restore procedure." },
  ]

  const stages = [
    { stageRo: "1. Inventar și fezabilitate", stageEn: "1. Inventory and feasibility", whatRo: "Se identifică fiecare echipament, protocolul, interfața fizică existentă și lista de valori expuse. Se stabilește ce se poate citi și ce se poate comanda.", whatEn: "Each device is identified, with its protocol, existing physical interface and the list of exposed values. What can be read and what can be commanded is established.", durRo: "3-10 zile", durEn: "3-10 days" },
    { stageRo: "2. Tabelul de mapare", stageEn: "2. Mapping table", whatRo: "Se stabilesc punctele care se preiau, adresele, unitățile și scalările. Se decide ce se comandă din BMS și ce rămâne pe automatizarea proprie.", whatEn: "The points to take over, the addresses, units and scalings are established. What is commanded from the BMS and what stays on the built-in controls is decided.", durRo: "1-2 săptămâni", durEn: "1-2 weeks" },
    { stageRo: "3. Comanda interfețelor", stageEn: "3. Ordering the interfaces", whatRo: "Gateway-uri, convertoare, module de comunicație de la producătorii echipamentelor. Unele module se comandă de la producătorul echipamentului și au termen propriu.", whatEn: "Gateways, converters, communication modules from the equipment manufacturers. Some modules are ordered from the equipment manufacturer and have their own lead time.", durRo: "2-6 săptămâni", durEn: "2-6 weeks" },
    { stageRo: "4. Montaj și configurare magistrale", stageEn: "4. Installation and bus configuration", whatRo: "Cablare de magistrală, adresare, terminații, punerea în comunicație a fiecărui echipament.", whatEn: "Bus cabling, addressing, terminations, bringing each device into communication.", durRo: "1-3 săptămâni", durEn: "1-3 weeks" },
    { stageRo: "5. Mapare și verificare valoare cu valoare", stageEn: "5. Mapping and value-by-value verification", whatRo: "Fiecare punct integrat se compară cu valoarea afișată local pe echipament.", whatEn: "Every integrated point is compared with the value displayed locally on the device.", durRo: "1-2 săptămâni", durEn: "1-2 weeks" },
    { stageRo: "6. Ecrane, alarme, trend-loguri", stageEn: "6. Screens, alarms, trend logs", whatRo: "Sinoptice, alarme de comunicație, istoricizare.", whatEn: "Synoptics, communication alarms, historisation.", durRo: "1 săptămână", durEn: "1 week" },
    { stageRo: "7. Testare și predare", stageEn: "7. Testing and handover", whatRo: "Testarea comenzilor, testarea comportamentului la pierderea comunicației, predarea tabelului de mapare final.", whatEn: "Testing the commands, testing the behaviour on communication loss, handing over the final mapping table.", durRo: "3-5 zile", durEn: "3-5 days" },
  ]

  const clientRequirements = [
    { ro: "Lista echipamentelor, cu producător, model, an de punere în funcțiune și, dacă există, manualul de comunicație.", en: "The equipment list, with manufacturer, model, year of commissioning and, if available, the communication manual." },
    { ro: "Confirmarea că modulele de comunicație există fizic. Multe echipamente au portul de protocol ca opțiune neinstalată, iar modulul se comandă de la producător.", en: "Confirmation that the communication modules physically exist. Many devices have the protocol port as an uninstalled option, and the module is ordered from the manufacturer." },
    { ro: "Accesul la echipamente și, unde este necesar, asistența furnizorului lor. Unele echipamente cer parametrizare de la producător pentru a activa comunicația.", en: "Access to the equipment and, where necessary, the assistance of its supplier. Some devices need manufacturer parametrisation to enable communication." },
    { ro: "Politica de rețea, pentru echipamentele care comunică pe Ethernet: adrese, VLAN, reguli de acces, poziția stației de supervizare.", en: "The network policy, for equipment communicating over Ethernet: addresses, VLANs, access rules, the position of the supervision station." },
    { ro: "Decizia de sferă: ce echipamente se doresc numai monitorizate și ce echipamente se doresc și comandate din BMS. Comanda schimbă responsabilitatea și, uneori, garanția echipamentului.", en: "The scope decision: which equipment is to be only monitored and which is also to be commanded from the BMS. Commanding changes responsibility and, sometimes, the equipment warranty." },
    { ro: "Ferestre de lucru, pentru echipamentele care trebuie oprite scurt pentru montarea modulului de comunicație.", en: "Work windows, for equipment that must be briefly stopped to fit the communication module." },
  ]

  const acceptanceCriteria = [
    { ro: "Fiecare punct integrat este verificat față de valoarea afișată local pe echipament, la aceeași oră, cu aceeași unitate de măsură și cu aceeași scalare.", en: "Every integrated point is verified against the value displayed locally on the device, at the same time, with the same unit and the same scaling." },
    { ro: "Comenzile sunt testate în ambele sensuri, inclusiv comportamentul echipamentului la revenirea în regim local.", en: "Commands are tested in both directions, including the device's behaviour when returning to local mode." },
    { ro: "Pierderea comunicației generează alarmă distinctă, iar sistemul trece pe un regim definit, nu pe ultima valoare citită.", en: "Communication loss raises a distinct alarm, and the system falls back to a defined mode, not to the last value read." },
    { ro: "Fiecare echipament integrat are un sinoptic propriu, cu valorile reale în interfața grafică, nu un link către software-ul producătorului.", en: "Every integrated device has its own synoptic, with real values in the graphical interface, not a link to the manufacturer's software." },
    { ro: "Tabelul de mapare final este predat în format editabil și corespunde configurației reale.", en: "The final mapping table is handed over in editable format and matches the real configuration." },
    { ro: "Trend-logurile de pe punctele integrate înregistrează la rezoluția declarată, cu retenție de minimum 24 de luni la rezoluție completă.", en: "The trend logs on the integrated points record at the declared resolution, with at least 24 months of full-resolution retention." },
    { ro: "Se consemnează explicit ce nu a putut fi integrat și de ce. Un echipament care nu expune o valoare pe protocol se trece pe listă, nu se ascunde.", en: "What could not be integrated, and why, is explicitly recorded. A device that does not expose a value over the protocol goes on the list, it does not get hidden." },
  ]

  const exclusions = [
    { ro: "Nu include înlocuirea automatizării proprii a echipamentului. Logica internă a chillerului sau a centralei de tratare a aerului rămâne a producătorului.", en: "It does not include replacing the equipment's built-in controls. The internal logic of the chiller or the air handling unit remains the manufacturer's." },
    { ro: "Nu include modulele de comunicație care se comandă de la producătorul echipamentului, dacă nu sunt prevăzute explicit în ofertă.", en: "It does not include communication modules ordered from the equipment manufacturer, unless explicitly provided for in the offer." },
    { ro: "Nu include valorile pe care echipamentul nu le expune. Dacă un chiller nu publică pe protocol temperatura de la un anumit senzor intern, acea valoare nu se poate integra fără senzor suplimentar.", en: "It does not include values the equipment does not expose. If a chiller does not publish the temperature of a certain internal sensor over the protocol, that value cannot be integrated without an additional sensor." },
    { ro: "Nu include repararea echipamentului integrat și nici service-ul lui.", en: "It does not include repairing the integrated equipment, nor its servicing." },
    { ro: "Nu include integrarea sistemelor de securitate la incendiu ca funcție de siguranță. Semnalele se pot prelua ca informație, dar scenariul de securitate la incendiu rămâne la centrala de incendiu.", en: "It does not include integrating fire safety systems as a safety function. Signals can be taken over as information, but the fire safety scenario stays with the fire alarm panel." },
    { ro: "Nu include licențele de puncte suplimentare pe platforma de supervizare, dacă numărul de puncte depășește licența existentă. Costul licențelor se declară separat în ofertă.", en: "It does not include additional point licences on the supervision platform, if the number of points exceeds the existing licence. Licence costs are declared separately in the offer." },
  ]

  const protocolRows = [
    { pRo: "Modbus RTU și TCP", pEn: "Modbus RTU and TCP", uRo: "chillere, centrale de tratare a aerului, pompe de căldură, variatoare de turație, analizoare de rețea electrică, grupuri de pompare", uEn: "chillers, air handling units, heat pumps, variable speed drives, power network analysers, pump groups", mRo: "RS-485 sau Ethernet", mEn: "RS-485 or Ethernet", vRo: "harta de registre a producătorului, adresarea, scalarea valorilor", vEn: "the manufacturer's register map, addressing, value scaling" },
    { pRo: "BACnet MS/TP și IP", pEn: "BACnet MS/TP and IP", uRo: "automatizare de clădire, controlere de la alți producători, unele chillere", uEn: "building automation, controllers from other manufacturers, some chillers", mRo: "RS-485 sau Ethernet", mEn: "RS-485 or Ethernet", vRo: "lista de obiecte expuse, instanțele, drepturile de scriere", vEn: "the list of exposed objects, the instances, the write permissions" },
    { pRo: "KNX", pEn: "KNX", uRo: "iluminat, jaluzele, comenzi de cameră, termostate de cameră", uEn: "lighting, blinds, room controls, room thermostats", mRo: "pereche torsadată KNX", mEn: "KNX twisted pair", vRo: "proiectul ETS existent, adresele de grup, cine deține fișierul de proiect", vEn: "the existing ETS project, the group addresses, who owns the project file" },
    { pRo: "DALI", pEn: "DALI", uRo: "corpuri de iluminat adresabile, senzori de lumină naturală, drivere", uEn: "addressable luminaires, daylight sensors, drivers", mRo: "magistrală DALI", mEn: "DALI bus", vRo: "numărul de adrese pe linie, existența unui gateway, gruparea existentă", vEn: "the number of addresses per line, whether a gateway exists, the existing grouping" },
    { pRo: "M-Bus", pEn: "M-Bus", uRo: "contoare de energie termică, contoare de apă, unele contoare de energie electrică", uEn: "heat meters, water meters, some electricity meters", mRo: "M-Bus cu fir sau radio", mEn: "wired or radio M-Bus", vRo: "numărul de contoare pe magistrală, adresele primare și secundare, nivelul de repetare", vEn: "the number of meters on the bus, the primary and secondary addresses, the level of repeaters" },
  ]

  const faqs = [
    { qRo: "De ce să integrez echipamentele dacă fiecare are deja automatizarea lui?", qEn: "Why integrate the equipment if each device already has its own controls?", aRo: "Pentru că automatizarea proprie a fiecărui echipament optimizează echipamentul, nu clădirea. Un chiller își face treaba corect chiar dacă în același timp centrala de tratare a aerului încălzește aerul pe care el tocmai l-a răcit. Integrarea face vizibil acest conflict și permite o strategie comună, plus o singură listă de alarme și un singur istoric de date.", aEn: "Because each device's built-in controls optimise the device, not the building. A chiller does its job correctly even while the air handling unit is heating the air it has just cooled. Integration makes this conflict visible and enables a common strategy, plus a single alarm list and a single data history." },
    { qRo: "Cât costă integrarea unui chiller sau a unei centrale de tratare a aerului?", qEn: "How much does integrating a chiller or an air handling unit cost?", aRo: "Costul se calculează pe punctele preluate, în aceeași bandă de 90-320 EUR pe punct de date. Punctele preluate direct pe magistrală sunt în partea de jos a benzii. Punctele care cer gateway, modul de comunicație de la producător și mapare manuală sunt în partea de sus.", aEn: "The cost is calculated on the points taken over, in the same 90-320 EUR per data point band. Points taken directly over the bus sit at the bottom of the band. Points requiring a gateway, a manufacturer's communication module and manual mapping sit at the top." },
    { qRo: "Ce se întâmplă dacă echipamentul nu are port de comunicație?", qEn: "What happens if the equipment has no communication port?", aRo: "Există trei variante, în ordinea costului: se comandă modulul de comunicație de la producător, se preiau semnalele esențiale prin contacte și semnale analogice cablate direct, sau se montează senzori și traductoare proprii. Prima variantă păstrează cele mai multe valori, a treia este cea mai scumpă și dă cele mai puține informații de stare.", aEn: "There are three options, in order of cost: order the communication module from the manufacturer, take over the essential signals through directly wired contacts and analogue signals, or fit dedicated sensors and transducers. The first option preserves the most values; the third is the most expensive and yields the least status information." },
    { qRo: "Integrarea anulează garanția echipamentului?", qEn: "Does integration void the equipment warranty?", aRo: "Citirea valorilor pe protocol nu afectează garanția. Comanda echipamentului din BMS poate intra în discuție cu producătorul, în special la chillere și la pompe de căldură. De aceea sfera se stabilește explicit înainte de execuție, iar unde există dubiu se cere confirmarea scrisă a furnizorului echipamentului.", aEn: "Reading values over the protocol does not affect the warranty. Commanding the equipment from the BMS may need discussion with the manufacturer, especially for chillers and heat pumps. That is why the scope is set explicitly before execution, and where in doubt, written confirmation from the equipment supplier is requested." },
    { qRo: "Se pot integra echipamente vechi, de 15-20 de ani?", qEn: "Can old equipment, 15-20 years old, be integrated?", aRo: "De multe ori da, prin contacte și semnale analogice, chiar dacă protocolul lipsește. Rezultatul este mai sărac: se obțin stări de funcționare, defecte și comenzi de pornire și oprire, dar nu parametrii interni. Limitele acestei abordări sunt descrise în materialele despre integrare BMS-SCADA.", aEn: "Often yes, through contacts and analogue signals, even if the protocol is missing. The result is poorer: you get running states, faults and start-stop commands, but not the internal parameters. The limits of this approach are described in our BMS-SCADA integration materials." },
  ]

  const related = [
    { href: "/servicii/proiectare-automatizari-bms", titleRo: "Proiectare automatizări și BMS", titleEn: "BMS and automation design", descRo: "Listă de puncte, caiet de sarcini, scheme de tablou", descEn: "Points list, technical specification, panel diagrams" },
    { href: "/servicii/executie-sisteme-bms", titleRo: "Execuție sisteme BMS", titleEn: "BMS execution", descRo: "Tablou, cablare, programe, punere în funcțiune", descEn: "Panel, cabling, programs, commissioning" },
    { href: "/servicii/modernizare-sisteme-de-automatizare-si-bms", titleRo: "Modernizare sisteme de automatizare și BMS", titleEn: "Automation and BMS modernisation", descRo: "Migrare pe etape, fără oprirea clădirii", descEn: "Staged migration, without stopping the building" },
  ]

  const resources = [
    { href: "/resurse/bms-scada-integrare", ro: "Materiale despre protocoale și integrare BMS-SCADA", en: "Materials on protocols and BMS-SCADA integration" },
    { href: "/resurse/scada-vs-bms", ro: "SCADA versus BMS: care este diferența", en: "SCADA versus BMS: what the difference is" },
    { href: "/pentru/it-ot", ro: "Pentru IT și OT", en: "For IT and OT" },
  ]

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <ServiceHero
        titleRo={"Integrare KNX, DALI, Modbus și M-Bus: echipamentele clădirii într-o singură supervizare"}
        titleEn={"KNX, DALI, Modbus and M-Bus integration: the building's equipment under a single supervision"}
        leadRo={"Integrarea aduce echipamentele cu automatizare proprie ale clădirii, chillere, centrale de tratare a aerului, corpuri de iluminat, contoare, grupuri de pompare și generatoare, într-o singură supervizare, prin protocoalele pe care le vorbesc deja: KNX, DALI, Modbus RTU și TCP, M-Bus și BACnet. Rezultatul este un singur ecran, o singură listă de alarme și un singur set de date istorice. Durata uzuală este de 2-10 săptămâni."}
        leadEn={"Integration brings the building's equipment with built-in controls, chillers, air handling units, luminaires, meters, pump groups and generators, into a single supervision layer, over the protocols they already speak: KNX, DALI, Modbus RTU and TCP, M-Bus and BACnet. The result is one screen, one alarm list and one set of historical data. The usual duration is 2-10 weeks."}
      />

      <div className="container-site section-m">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[280px_1fr] lg:items-start">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20">
            <div className="bg-white rounded-[2px] overflow-hidden">
              <div className="p-6 border-b border-[#0D2E2B]/8">
                <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">{t("Durată orientativă", "Indicative duration")}</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#1F6B4A]" />
                  <span className="font-light text-[#0D2E2B]">{t("2-10 săptămâni", "2-10 weeks")}</span>
                </div>
                <p className="text-xs text-[#888888] font-light mt-2">{t("pentru 10-40 de echipamente integrate", "for 10-40 integrated devices")}</p>
              </div>
              <div className="p-6 border-b border-[#0D2E2B]/8">
                <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-4">{t("Protocoale acoperite", "Protocols covered")}</p>
                <ul className="space-y-3">
                  {sidebarProtocols.map((item) => (
                    <li key={item.en} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#1F6B4A] mt-0.5 shrink-0" />
                      <span className="text-sm text-[#0D2E2B] font-light">{t(item.ro, item.en)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6">
                <Link
                  href="/contact"
                  className="block w-full text-center bg-[#0D2E2B] text-white text-sm font-semibold py-3 rounded-[2px] hover:bg-[#0a2220] transition-colors"
                >
                  {t("Cere o evaluare a clădirii", "Request a building assessment")}
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="space-y-16">
            {/* Pe scurt */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Network className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Pe scurt", "In short")}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {summaryPoints.map((p) => (
                  <div key={p.en} className="bg-white rounded-[2px] p-5">
                    <p className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(p.ro, p.en)}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Deliverables */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Network className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce livrează concret o lucrare de integrare", "What an integration job concretely delivers")}</h2>
              </div>
              <div className="bg-white rounded-[2px] p-6">
                <ul className="space-y-4">
                  {deliverables.map((item) => (
                    <li key={item.en} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-[#1F6B4A] mt-1 shrink-0" />
                      <span className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(item.ro, item.en)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Stages */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Target className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum decurge integrarea, pe etape", "How integration proceeds, stage by stage")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Duratele sunt orientative, pentru 10-40 de echipamente integrate.", "Durations are indicative, for 10-40 integrated devices.")}</p>
              <div className="overflow-x-auto bg-white rounded-[2px]">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-[#0D2E2B]/10">
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Etapă", "Stage")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Ce se face", "What is done")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Durată orientativă", "Indicative duration")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((s) => (
                      <tr key={s.stageEn} className="border-b border-[#0D2E2B]/8 last:border-0 align-top">
                        <td className="p-4 text-[#0D2E2B] font-light">{t(s.stageRo, s.stageEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(s.whatRo, s.whatEn)}</td>
                        <td className="p-4 text-[#1F6B4A] font-light whitespace-nowrap">{t(s.durRo, s.durEn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Client requirements */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce cere integrarea din partea beneficiarului", "What integration requires from the client")}</h2>
              </div>
              <div className="bg-white rounded-[2px] p-6">
                <ul className="space-y-4">
                  {clientRequirements.map((item) => (
                    <li key={item.en} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-[#1F6B4A] mt-1 shrink-0" />
                      <span className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(item.ro, item.en)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Acceptance criteria */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum se măsoară că integrarea a ieșit bine", "How you measure that integration turned out well")}</h2>
              </div>
              <ol className="space-y-3">
                {acceptanceCriteria.map((item, idx) => (
                  <li key={item.en} className="bg-white rounded-[2px] p-5 flex items-start gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D2E2B] text-white text-sm font-light shrink-0">{idx + 1}</span>
                    <span className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(item.ro, item.en)}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* Exclusions */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce nu include integrarea", "What integration does not include")}</h2>
              </div>
              <div className="bg-white rounded-[2px] p-6">
                <ul className="space-y-4">
                  {exclusions.map((item) => (
                    <li key={item.en} className="flex items-start gap-3">
                      <XCircle className="h-4 w-4 text-[#888888] mt-1 shrink-0" />
                      <span className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(item.ro, item.en)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Protocols table */}
            <section>
              <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter mb-6">{t("Cele cinci protocoale și ce integrează fiecare", "The five protocols and what each one integrates")}</h2>
              <div className="overflow-x-auto bg-white rounded-[2px]">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-[#0D2E2B]/10">
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Protocol", "Protocol")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Ce integrează uzual", "What it usually integrates")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Mediu fizic", "Physical medium")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Ce trebuie verificat înainte", "What to check beforehand")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {protocolRows.map((r) => (
                      <tr key={r.pEn} className="border-b border-[#0D2E2B]/8 last:border-0 align-top">
                        <td className="p-4 text-[#0D2E2B] font-light whitespace-nowrap">{t(r.pRo, r.pEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.uRo, r.uEn)}</td>
                        <td className="p-4 text-[#888888] font-light">{t(r.mRo, r.mEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.vRo, r.vEn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-[#888888] font-light mt-4">
                {t("O observație practică pentru KNX: cine deține fișierul de proiect ETS deține de fapt sistemul de iluminat. Este exact aceeași problemă comercială ca parolele de nivel inginer pe partea de BMS, tratată pe pagina de ", "A practical note on KNX: whoever owns the ETS project file in fact owns the lighting system. It is exactly the same commercial problem as engineer-level passwords on the BMS side, covered on the ")}
                <Link href="/servicii/modernizare-sisteme-de-automatizare-si-bms" className="text-[#1F6B4A] hover:underline">{t("modernizare", "modernisation page")}</Link>.
              </p>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter mb-8">{t("Întrebări frecvente", "Frequently asked questions")}</h2>
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div key={faq.qEn} className="bg-white rounded-[2px] p-6">
                    <h3 className="font-light text-[#0D2E2B] mb-2">{t(faq.qRo, faq.qEn)}</h3>
                    <p className="text-sm text-[#888888] font-light leading-relaxed">{t(faq.aRo, faq.aEn)}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="bg-[#07201C] rounded-[2px] p-10 text-center">
              <h2 className="text-2xl font-light text-white mb-3">
                {t("Inventar de integrare, pe echipamentele existente", "An integration inventory, on the existing equipment")}
              </h2>
              <p className="text-white/60 font-light mb-7 max-w-xl mx-auto text-sm leading-relaxed">
                {t(
                  "Primul pas nu este oferta, ci inventarul: ce echipamente există, ce protocol vorbesc, ce module de comunicație au montate și ce valori expun efectiv. Din inventar rezultă lista punctelor care se pot integra și cele care nu.",
                  "The first step is not the offer, but the inventory: what equipment exists, what protocol it speaks, what communication modules are fitted and what values it actually exposes. The inventory yields the list of points that can be integrated and those that cannot.",
                )}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0D2E2B] text-sm font-bold px-6 py-3 rounded-[2px] hover:bg-[#F5F4F0] transition-colors"
              >
                {t("Cere o evaluare a clădirii", "Request a building assessment")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            {/* Resources */}
            <section>
              <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-4">{t("• Resurse utile", "• Useful resources")}</p>
              <ul className="space-y-2">
                {resources.map((r) => (
                  <li key={r.en}>
                    <Link href={r.href} className="text-sm text-[#1F6B4A] font-light hover:underline">
                      {t(r.ro, r.en)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Related */}
            <section className="pt-4 border-t border-[#0D2E2B]/8">
              <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-6">{t("• Servicii conexe", "• Related services")}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {related.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="group rounded-[2px] border border-[#0D2E2B]/8 bg-white p-5 hover:border-[#1F6B4A]/30 transition-colors"
                  >
                    <h4 className="font-light text-sm text-[#0D2E2B] group-hover:text-[#1F6B4A] transition-colors mb-1">
                      {t(s.titleRo, s.titleEn)}
                    </h4>
                    <p className="text-xs text-[#888888] font-light">{t(s.descRo, s.descEn)}</p>
                  </Link>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
