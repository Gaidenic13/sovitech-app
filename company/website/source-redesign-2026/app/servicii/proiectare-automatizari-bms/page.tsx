"use client"

// LINKS-TO-REACTIVATE: Model de caiet de sarcini BMS, document editabil | interim /contact | final /instrumente/model-caiet-de-sarcini-bms
// LINKS-TO-REACTIVATE: BACnet, Modbus, KNX, M-Bus si LON: cum se alege protocolul | interim /resurse/bms-scada-integrare | final /ghid/protocoale-automatizarea-cladirilor
// TODO(confirm): duratele orientative pe etape, fata de practica reala a echipei

import Link from "next/link"
import { Clock, CheckCircle2, FileText, Target, ClipboardList, Users, ShieldCheck, XCircle, ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { ServiceHero } from "@/components/service-hero"

export default function ProiectarePage() {
  const { t } = useLanguage()

  const sidebarDeliverables = [
    { ro: "Lista de puncte, în format editabil", en: "Points list, in editable format" },
    { ro: "Caiet de sarcini cu criterii de recepție", en: "Technical specification with acceptance criteria" },
    { ro: "Scheme de tablou de automatizare", en: "Automation panel diagrams" },
    { ro: "Specificație de echipamente echivalabilă", en: "Equivalence-ready equipment specification" },
    { ro: "Estimare de cost pe capitole", en: "Cost estimate by chapter" },
  ]

  const deliverables = [
    { ro: "Tema de proiectare, convenită cu beneficiarul: ce se reglează, ce se monitorizează, ce se contorizează, ce se raportează și cine operează sistemul.", en: "The design brief, agreed with the client: what is controlled, what is monitored, what is metered, what is reported and who operates the system." },
    { ro: "Schema funcțională pe fiecare instalație: centrale de tratare a aerului, centrală termică, centrală frigorifică, pompe, ventiloconvectoare, iluminat, contorizare, punct termic.", en: "The functional diagram for each installation: air handling units, heating plant, chiller plant, pumps, fan coil units, lighting, metering, thermal substation." },
    { ro: "Lista de puncte, în format editabil, cu adresa, tipul de semnal (AI, AO, DI, DO și puncte de comunicație), echipamentul deservit, tipul de element de câmp și eticheta din interfața grafică.", en: "The points list, in editable format, with the address, signal type (AI, AO, DI, DO and communication points), the equipment served, the field device type and the label in the graphical interface." },
    { ro: "Descrierea secvențelor de funcționare, în text, pe fiecare instalație: pornire, oprire, regim de ocupare, regim redus, regim de avarie, interblocaje, priorități.", en: "The description of the operating sequences, in text, for each installation: start, stop, occupied mode, reduced mode, failure mode, interlocks, priorities." },
    { ro: "Schemele de tablou de automatizare: alimentare, circuite, dispunerea aparatajului, borne, etichetare.", en: "The automation panel diagrams: power supply, circuits, apparatus layout, terminals, labelling." },
    { ro: "Specificația de echipamente, cu funcție și caracteristici, nu cu un singur cod de produs. Specificația permite echivalare, ca proiectul să rămână ofertabil competitiv.", en: "The equipment specification, by function and characteristics, not by a single product code. The specification allows equivalence, so the design remains competitively biddable." },
    { ro: "Caietul de sarcini, cu cerințele de execuție, de programare, de punere în funcțiune, de documentație și de instruire, plus criteriile de recepție.", en: "The technical specification, with requirements for execution, programming, commissioning, documentation and training, plus the acceptance criteria." },
    { ro: "Lista de alarme propusă, pe trei niveluri de severitate, cu destinatar pe fiecare nivel.", en: "The proposed alarm list, on three severity levels, with a recipient for each level." },
    { ro: "Estimarea de cost pe capitole, cu banda de piață aplicabilă tipului de clădire.", en: "The cost estimate by chapter, with the market band applicable to the building type." },
  ]

  const stages = [
    { stageRo: "1. Tema de proiectare", stageEn: "1. Design brief", whatRo: "Discuție cu beneficiarul și cu proiectantul de instalații. Se stabilesc instalațiile incluse, regimul de ocupare, cerințele de raportare și cine va opera sistemul.", whatEn: "Discussion with the client and the mechanical services designer. The included installations, occupancy pattern, reporting requirements and who will operate the system are established.", durRo: "3-5 zile", durEn: "3-5 days" },
    { stageRo: "2. Preluarea proiectelor de instalații", stageEn: "2. Taking over the services designs", whatRo: "Se preiau planurile de HVAC, electrice și sanitare, listele de echipamente și fișele tehnice. Se identifică ce echipamente vin cu automatizare proprie.", whatEn: "The HVAC, electrical and plumbing plans, equipment lists and datasheets are taken over. Equipment that comes with its own controls is identified.", durRo: "3-5 zile", durEn: "3-5 days" },
    { stageRo: "3. Schema funcțională și secvențele", stageEn: "3. Functional diagram and sequences", whatRo: "Se desenează fiecare instalație și se scriu secvențele de funcționare, inclusiv regimurile de avarie și interblocajele.", whatEn: "Each installation is drawn and the operating sequences are written, including failure modes and interlocks.", durRo: "1-2 săptămâni", durEn: "1-2 weeks" },
    { stageRo: "4. Lista de puncte și arhitectura", stageEn: "4. Points list and architecture", whatRo: "Se stabilesc punctele, împărțirea pe controlere, magistralele, protocoalele și rezerva de puncte.", whatEn: "The points, controller split, buses, protocols and points reserve are established.", durRo: "1-2 săptămâni", durEn: "1-2 weeks" },
    { stageRo: "5. Tablouri și specificație", stageEn: "5. Panels and specification", whatRo: "Scheme de tablou, aparataj, specificația de echipamente de câmp.", whatEn: "Panel diagrams, apparatus, field equipment specification.", durRo: "1 săptămână", durEn: "1 week" },
    { stageRo: "6. Caiet de sarcini și estimare", stageEn: "6. Specification and estimate", whatRo: "Cerințe de execuție, criterii de recepție, estimare de cost pe capitole.", whatEn: "Execution requirements, acceptance criteria, cost estimate by chapter.", durRo: "3-5 zile", durEn: "3-5 days" },
    { stageRo: "7. Predare și revizie", stageEn: "7. Handover and revision", whatRo: "Predarea documentației, o rundă de observații din partea beneficiarului și revizia finală.", whatEn: "Handover of the documentation, one round of client comments and the final revision.", durRo: "1 săptămână", durEn: "1 week" },
  ]

  const clientRequirements = [
    { ro: "Proiectele de instalații, la faza cel puțin de proiect tehnic: HVAC, electrice, sanitare, cu planuri și liste de echipamente.", en: "The services designs, at least at technical design stage: HVAC, electrical, plumbing, with plans and equipment lists." },
    { ro: "Fișele tehnice ale echipamentelor deja alese, în special chillere, centrale de tratare a aerului, cazane și pompe de căldură, pentru că fiecare vine cu automatizare proprie și cu un protocol propriu.", en: "The datasheets of the equipment already selected, especially chillers, air handling units, boilers and heat pumps, because each comes with its own controls and its own protocol." },
    { ro: "Regimul de ocupare real: program de funcționare pe zone, zile de weekend, perioade de vârf, spații închiriate separat.", en: "The real occupancy pattern: operating schedule by zone, weekends, peak periods, separately leased spaces." },
    { ro: "Cerințele de raportare: ce se raportează, cui, la ce interval, dacă există obligație de raportare de energie sau de mediu interior.", en: "The reporting requirements: what is reported, to whom, at what interval, whether there is an energy or indoor environment reporting obligation." },
    { ro: "Cine va opera sistemul: echipă proprie, firmă de facility management sau contract de service. Alegerea schimbă complexitatea interfeței grafice și a matricei de alarme.", en: "Who will operate the system: in-house team, facility management firm or a service contract. The choice changes the complexity of the graphical interface and of the alarm matrix." },
    { ro: "Un interlocutor tehnic desemnat, cu drept de decizie pe temele de proiectare.", en: "A designated technical counterpart, with decision-making authority on design questions." },
  ]

  const acceptanceCriteria = [
    { ro: "Fiecare punct din lista de puncte are un echipament, un tip de semnal și o etichetă. Nu există puncte fără destinație și nici echipamente fără puncte.", en: "Every point in the points list has an equipment item, a signal type and a label. There are no points without a destination and no equipment without points." },
    { ro: "Fiecare instalație are o secvență scrisă, care descrie funcționarea în regim normal, în regim redus și în avarie.", en: "Every installation has a written sequence describing operation in normal mode, reduced mode and failure mode." },
    { ro: "Specificația permite echivalare. Fiecare poziție este descrisă prin funcție și caracteristici, nu doar printr-un cod de produs unic.", en: "The specification allows equivalence. Every item is described by function and characteristics, not just by a unique product code." },
    { ro: "Rezerva de puncte este declarată pe fiecare controler și pe fiecare tablou, în procente și în număr absolut.", en: "The points reserve is declared for each controller and each panel, as a percentage and as an absolute number." },
    { ro: "Caietul de sarcini conține criteriile de recepție ale execuției, protocolul de testare funcțională și lista documentelor care se predau.", en: "The technical specification contains the execution acceptance criteria, the functional test protocol and the list of documents to be handed over." },
    { ro: "Proiectul poate fi ofertat de minimum trei executanți fără completări. Este testul practic al calității unui proiect de automatizare.", en: "The design can be bid by at least three contractors without additions. It is the practical test of the quality of a controls design." },
  ]

  const exclusions = [
    { ro: "Nu include proiectul de instalații. Automatizarea se proiectează peste instalațiile proiectate de specialiștii de HVAC, electrice și sanitare.", en: "It does not include the mechanical services design. The controls are designed on top of the installations designed by the HVAC, electrical and plumbing specialists." },
    { ro: "Nu include verificarea tehnică a proiectului de către verificator atestat și nici avizele. Se pune la dispoziția verificatorului toată documentația.", en: "It does not include technical verification of the design by a certified verifier, nor the permits. All documentation is made available to the verifier." },
    { ro: "Nu include proiectul de detecție și semnalizare a incendiului și nici scenariul de securitate la incendiu.", en: "It does not include the fire detection and alarm design, nor the fire safety scenario." },
    { ro: "Nu include execuția, programarea și punerea în funcțiune. Acestea sunt obiectul serviciului de execuție sisteme BMS.", en: "It does not include execution, programming and commissioning. These are the subject of the BMS execution service." },
    { ro: "Nu include asistența tehnică pe durata șantierului, decât dacă este contractată separat. Asistența pe șantier se ofertează pe vizite sau pe ore.", en: "It does not include technical assistance during construction, unless contracted separately. Site assistance is quoted per visit or per hour." },
    { ro: "Nu include modificările de proiect generate de schimbarea echipamentelor de instalații după predare. Se tratează ca revizie, contra cost.", en: "It does not include design changes generated by a change of mechanical equipment after handover. These are treated as a paid revision." },
  ]

  const responsibilityRows = [
    { elRo: "Lista de puncte", elEn: "Points list", dRo: "întocmește", dEn: "produces", eRo: "verifică pe teren și actualizează în As-built", eEn: "verifies on site and updates in the As-built", bRo: "aprobă", bEn: "approves" },
    { elRo: "Secvențele de funcționare", elEn: "Operating sequences", dRo: "scrie", dEn: "writes", eRo: "implementează în programe", eEn: "implements in the programs", bRo: "validează la punerea în funcțiune", bEn: "validates at commissioning" },
    { elRo: "Alegerea echipamentelor de câmp", elEn: "Field equipment selection", dRo: "specifică prin funcție", dEn: "specifies by function", eRo: "propune echivalențe", eEn: "proposes equivalents", bRo: "acceptă echivalențele", bEn: "accepts the equivalents" },
    { elRo: "Schemele de tablou", elEn: "Panel diagrams", dRo: "întocmește", dEn: "produces", eRo: "execută și actualizează As-built", eEn: "executes and updates the As-built", bRo: "-", bEn: "-" },
    { elRo: "Protocolul de testare funcțională", elEn: "Functional test protocol", dRo: "definește în caietul de sarcini", dEn: "defines in the specification", eRo: "execută și consemnează", eEn: "executes and records", bRo: "asistă și semnează", bEn: "attends and signs" },
    { elRo: "Documentația As-built", elEn: "As-built documentation", dRo: "-", dEn: "-", eRo: "predă", eEn: "hands over", bRo: "verifică față de caietul de sarcini", bEn: "checks against the specification" },
    { elRo: "Parole de nivel inginer", elEn: "Engineer-level passwords", dRo: "-", dEn: "-", eRo: "predă la recepție", eEn: "hands over at acceptance", bRo: "deține", bEn: "owns" },
  ]

  const faqs = [
    { qRo: "Cât costă proiectarea unui sistem BMS?", qEn: "How much does BMS design cost?", aRo: "Proiectarea se ofertează pe suprafață sau pe numărul estimat de puncte, în funcție de complexitatea instalațiilor și de faza de proiectare cerută. Reperul util pentru buget este costul sistemului complet, 4-18 EUR/mp în funcție de tipul de clădire, din care proiectarea este o fracțiune.", aEn: "Design is quoted per area or per estimated number of points, depending on the complexity of the installations and the design stage requested. The useful budget reference is the cost of the complete system, 4-18 EUR/sqm depending on the building type, of which design is a fraction." },
    { qRo: "Câte puncte are un sistem BMS pentru o clădire de birouri?", qEn: "How many points does a BMS have in an office building?", aRo: "Densitatea uzuală pentru birouri clasa A este de 50-90 de puncte la 1.000 mp, deci o clădire de 15.000 mp se încadrează în 750-1.350 de puncte fizice. Densitatea crește cu numărul de zone reglate separat și cu nivelul de contorizare pe chiriași.", aEn: "The usual density for class A offices is 50-90 points per 1,000 sqm, so a 15,000 sqm building falls within 750-1,350 physical points. Density grows with the number of separately controlled zones and with the level of tenant metering." },
    { qRo: "Proiectul poate fi executat și de altă firmă?", qEn: "Can the design be executed by another company?", aRo: "Da, și acesta este criteriul după care se verifică un proiect bun. Proiectele Sovitech Control se scriu pe protocoale deschise, cu specificație prin funcție și caracteristici, astfel încât să poată fi ofertate competitiv de mai mulți executanți. Un proiect care poate fi executat de un singur furnizor este un proiect scris greșit.", aEn: "Yes, and this is the criterion by which a good design is checked. Sovitech Control designs are written on open protocols, with specification by function and characteristics, so they can be bid competitively by several contractors. A design that can be executed by only one supplier is a design written wrong." },
    { qRo: "Ce se întâmplă dacă echipamentele de HVAC se schimbă după predarea proiectului?", qEn: "What happens if the HVAC equipment changes after design handover?", aRo: "Schimbarea unui chiller, a unei centrale de tratare a aerului sau a unei pompe de căldură schimbă protocolul, numărul de puncte și uneori arhitectura. Modificarea se tratează ca revizie de proiect, se ofertează separat și trebuie făcută înainte de comanda tabloului, nu după.", aEn: "Changing a chiller, an air handling unit or a heat pump changes the protocol, the number of points and sometimes the architecture. The change is treated as a design revision, quoted separately, and must be done before the panel is ordered, not after." },
  ]

  const summaryPoints = [
    { ro: "Livrabilul central este lista de puncte. Ea determină prețul, sfera lucrării și criteriul de recepție. O ofertă fără listă de puncte nu se poate compara cu nicio alta.", en: "The central deliverable is the points list. It determines the price, the scope and the acceptance criterion. An offer without a points list cannot be compared with any other." },
    { ro: "Densitatea uzuală pentru birouri clasa A este 50-90 de puncte la 1.000 mp. O clădire de 15.000 mp se încadrează astfel în 750-1.350 de puncte fizice.", en: "The usual density for class A offices is 50-90 points per 1,000 sqm. A 15,000 sqm building thus falls within 750-1,350 physical points." },
    { ro: "Costul pe punct de date este de 90-320 EUR, în funcție de volum, iar acest cost include cablarea, elementul de câmp, poziția în tablou, programarea și punerea în funcțiune.", en: "The cost per data point is 90-320 EUR, depending on volume, and it includes cabling, the field device, the panel position, programming and commissioning." },
    { ro: "Proiectul se scrie pe protocoale deschise, BACnet, Modbus, KNX, DALI și M-Bus, tocmai ca beneficiarul să nu fie legat de un singur executant.", en: "The design is written on open protocols, BACnet, Modbus, KNX, DALI and M-Bus, precisely so the client is not tied to a single contractor." },
    { ro: "Trei decizii de arhitectură nu se pot corecta ieftin după execuție: protocolul de magistrală, împărțirea pe controlere și rezerva de puncte.", en: "Three architecture decisions cannot be corrected cheaply after execution: the bus protocol, the controller split and the points reserve." },
    { ro: "Proiectarea se poate contracta separat de execuție. Sovitech Control livrează proiecte pe care le execută alți antreprenori.", en: "Design can be contracted separately from execution. Sovitech Control delivers designs that other contractors execute." },
  ]

  const related = [
    { href: "/servicii/executie-sisteme-bms", titleRo: "Execuție sisteme BMS", titleEn: "BMS execution", descRo: "Tablou, cablare, programe, punere în funcțiune", descEn: "Panel, cabling, programs, commissioning" },
    { href: "/servicii/integrare-sisteme-knx-dali-modbus-mbus", titleRo: "Integrare KNX, DALI, Modbus, M-Bus", titleEn: "KNX, DALI, Modbus, M-Bus integration", descRo: "Echipamentele clădirii într-o singură supervizare", descEn: "The building's equipment under one supervision" },
    { href: "/servicii/consultanta", titleRo: "Consultanță", titleEn: "Consultancy", descRo: "Comparare de oferte și revizuire de arhitectură", descEn: "Bid comparison and architecture review" },
  ]

  const resources = [
    { href: "/ghid/caiet-de-sarcini-bms", ro: "Caiet de sarcini pentru un sistem BMS, ghid complet", en: "Technical specification for a BMS, complete guide" },
    { href: "/contact", ro: "Cere modelul de caiet de sarcini BMS", en: "Request the BMS specification template" },
    { href: "/resurse/bms-scada-integrare", ro: "Materiale despre protocoale și integrare BMS-SCADA", en: "Materials on protocols and BMS-SCADA integration" },
    { href: "/pentru/director-tehnic", ro: "Pentru directorul tehnic", en: "For the technical director" },
  ]

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <ServiceHero
        titleRo={"Proiectare automatizări și BMS: listă de puncte, caiet de sarcini, scheme de tablou"}
        titleEn={"BMS and automation design: points list, technical specification, panel diagrams"}
        leadRo={"Proiectarea unui sistem BMS produce documentele după care sistemul poate fi ofertat, executat și verificat de oricine: schema funcțională pe fiecare instalație, lista de puncte, caietul de sarcini, schemele de tablou și specificația de echipamente. Un proiect scris pe protocoale deschise poate fi executat și de alt furnizor. Pentru o clădire de birouri de circa 10.000 mp, proiectarea durează 3-8 săptămâni."}
        leadEn={"BMS design produces the documents by which the system can be bid, executed and verified by anyone: the functional diagram for each installation, the points list, the technical specification, the panel diagrams and the equipment specification. A design written on open protocols can be executed by another supplier as well. For an office building of around 10,000 sqm, design takes 3-8 weeks."}
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
                  <span className="font-light text-[#0D2E2B]">{t("3-8 săptămâni", "3-8 weeks")}</span>
                </div>
                <p className="text-xs text-[#888888] font-light mt-2">{t("pentru o clădire de birouri de circa 10.000 mp", "for an office building of around 10,000 sqm")}</p>
              </div>
              <div className="p-6 border-b border-[#0D2E2B]/8">
                <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-4">{t("Livrabile principale", "Main deliverables")}</p>
                <ul className="space-y-3">
                  {sidebarDeliverables.map((item) => (
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
                  {t("Cere o ofertă pentru proiectare", "Request a design quote")}
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
                  <FileText className="h-4 w-4 text-[#1F6B4A]" />
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
                  <ClipboardList className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce livrează concret proiectarea unui sistem BMS", "What BMS design concretely delivers")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Livrabile numite, fiecare predat ca fișier și ca exemplar tipărit semnat.", "Named deliverables, each handed over as a file and as a signed printed copy.")}</p>
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum decurge proiectarea, pe etape", "How design proceeds, stage by stage")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Duratele sunt orientative, pentru o clădire de birouri de circa 10.000 mp.", "Durations are indicative, for an office building of around 10,000 sqm.")}</p>
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
                        <td className="p-4 text-[#0D2E2B] font-light whitespace-nowrap">{t(s.stageRo, s.stageEn)}</td>
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce cere proiectarea din partea beneficiarului", "What design requires from the client")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Fără documentele de mai jos, proiectarea începe cu presupuneri, iar presupunerile devin puncte lipsă în execuție.", "Without the documents below, design starts with assumptions, and assumptions become missing points at execution.")}</p>
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum se măsoară că proiectarea a ieșit bine", "How you measure that design turned out well")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Criteriile de recepție a documentației, verificabile de o terță parte.", "The documentation acceptance criteria, verifiable by a third party.")}</p>
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce nu include proiectarea", "What design does not include")}</h2>
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
              <p className="text-sm text-[#888888] font-light mt-4">
                {t("Execuția, programarea și punerea în funcțiune sunt obiectul serviciului de ", "Execution, programming and commissioning are the subject of the ")}
                <Link href="/servicii/executie-sisteme-bms" className="text-[#1F6B4A] hover:underline">{t("execuție sisteme BMS", "BMS execution service")}</Link>.
              </p>
            </section>

            {/* Responsibility table */}
            <section>
              <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter mb-6">{t("Cine face ce, între proiectant, executant și beneficiar", "Who does what, between designer, contractor and client")}</h2>
              <div className="overflow-x-auto bg-white rounded-[2px]">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-[#0D2E2B]/10">
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Element", "Element")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Proiectant automatizări", "Controls designer")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Executant BMS", "BMS contractor")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Beneficiar", "Client")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responsibilityRows.map((r) => (
                      <tr key={r.elEn} className="border-b border-[#0D2E2B]/8 last:border-0 align-top">
                        <td className="p-4 text-[#0D2E2B] font-light">{t(r.elRo, r.elEn)}</td>
                        <td className="p-4 text-[#888888] font-light">{t(r.dRo, r.dEn)}</td>
                        <td className="p-4 text-[#888888] font-light">{t(r.eRo, r.eEn)}</td>
                        <td className="p-4 text-[#888888] font-light">{t(r.bRo, r.bEn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                {t("Proiect tehnic de automatizare, cu listă de puncte și caiet de sarcini", "A technical controls design, with points list and specification")}
              </h2>
              <p className="text-white/60 font-light mb-7 max-w-xl mx-auto text-sm leading-relaxed">
                {t(
                  "Sovitech Control întocmește documentația de automatizare pentru clădiri noi și pentru renovări majore, inclusiv pentru proiecte pe care le execută alți antreprenori. Primul pas este o discuție despre instalațiile prevăzute și despre cine va opera clădirea.",
                  "Sovitech Control produces the controls documentation for new buildings and major renovations, including for projects executed by other contractors. The first step is a discussion about the planned installations and about who will operate the building.",
                )}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0D2E2B] text-sm font-bold px-6 py-3 rounded-[2px] hover:bg-[#F5F4F0] transition-colors"
              >
                {t("Cere o ofertă pentru proiectare", "Request a design quote")}
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
