"use client"

// TODO(confirm): duratele orientative pe etape si termenele curente de livrare a echipamentelor

import Link from "next/link"
import { Clock, CheckCircle2, Target, Users, ShieldCheck, XCircle, ListOrdered, ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { ServiceHero } from "@/components/service-hero"

export default function ExecutiePage() {
  const { t } = useLanguage()

  const sidebarDeliverables = [
    { ro: "Tablou de forță și automatizare", en: "Power and automation panel" },
    { ro: "Cablare și echipamente de câmp", en: "Cabling and field equipment" },
    { ro: "Programe de control și HMI", en: "Control programs and HMI" },
    { ro: "Punere în funcțiune cu protocol de testare", en: "Commissioning with a test protocol" },
    { ro: "Documentație As-built și parole predate", en: "As-built documentation and passwords handed over" },
  ]

  const summaryPoints = [
    { ro: "Șapte livrabile numite, de la tablou la As-built. Fiecare are un criteriu de recepție scris, nu o descriere generală.", en: "Seven named deliverables, from the panel to the As-built. Each has a written acceptance criterion, not a general description." },
    { ro: "Diferența dintre „conectat\" și „pus în funcțiune\" este protocolul de testare funcțională, executat punct cu punct și buclă cu buclă, cu proces-verbal semnat.", en: "The difference between \"connected\" and \"commissioned\" is the functional test protocol, executed point by point and loop by loop, with a signed report." },
    { ro: "Costul pe punct de date este de 90-320 EUR, în funcție de volum, și include cablarea, elementul de câmp, poziția în tablou, programarea și punerea în funcțiune.", en: "The cost per data point is 90-320 EUR, depending on volume, and includes cabling, the field device, the panel position, programming and commissioning." },
    { ro: "Un sistem BMS nou costă 4-18 EUR/mp ca bandă agregată pentru retail, birouri și hoteluri fără control pe cameră, cu 30-80 EUR/mp în pharma și 18-38 EUR/mp la hotelurile cu control pe cameră.", en: "A new BMS costs 4-18 EUR/sqm as an aggregate band for retail, offices and hotels without room control, with 30-80 EUR/sqm in pharma and 18-38 EUR/sqm for hotels with room control." },
    { ro: "Parolele de nivel inginer, backup-urile de configurație și programele controlerelor se predau la recepție, ca livrabile, nu ca favor.", en: "Engineer-level passwords, configuration backups and controller programs are handed over at acceptance, as deliverables, not as a favour." },
    { ro: "Execuția se poate face pe un proiect întocmit de altcineva. Se verifică lista de puncte și secvențele înainte de ofertare.", en: "Execution can be done on a design produced by someone else. The points list and sequences are checked before quoting." },
  ]

  const deliverables = [
    { ro: "Sistemul de automatizare: controlere, module de extensie, surse, echipamente de rețea și magistrale, dimensionate pe lista de puncte, cu rezerva declarată pe fiecare controler.", en: "The automation system: controllers, extension modules, power supplies, network equipment and buses, sized on the points list, with the reserve declared for each controller." },
    { ro: "Tabloul electric de forță și automatizare: dulap, alimentare, protecții, aparataj de comandă și forță pentru consumatorii deserviți, borne, etichetare, scheme în buzunarul tabloului.", en: "The power and automation electrical panel: cabinet, power supply, protections, control and power apparatus for the loads served, terminals, labelling, diagrams in the panel pocket." },
    { ro: "Cablarea și instalarea echipamentelor: trasee, cablu de semnal și de magistrală, senzori de temperatură, umiditate și CO2, traductoare de presiune, servomotoare pe vane și clapete, contoare, montaj și conectare.", en: "Cabling and equipment installation: routes, signal and bus cable, temperature, humidity and CO2 sensors, pressure transducers, actuators on valves and dampers, meters, mounting and connection." },
    { ro: "Programele de control și monitorizare: secvențele de funcționare implementate în controlere, bucle de reglaj parametrizate, programe orare, regimuri de ocupare și de avarie, interblocaje, matrice de alarme pe trei niveluri, trend-loguri configurate.", en: "The control and monitoring programs: operating sequences implemented in the controllers, tuned control loops, time schedules, occupancy and failure modes, interlocks, a three-level alarm matrix, configured trend logs." },
    { ro: "Interfața grafică HMI: sinoptice pe fiecare instalație, cu valorile reale ale punctelor, ecran de alarme, ecran de programe orare, ecran de tendințe și rapoarte de consum, plus drepturile de acces pe nivel de utilizator.", en: "The HMI graphical interface: synoptics for each installation, with the real point values, an alarm screen, a schedule screen, a trends screen and consumption reports, plus access rights per user level." },
    { ro: "Punerea în funcțiune: verificarea punct cu punct, calibrarea senzorilor, reglajul buclelor, testarea funcțională pe fiecare secvență, testarea regimurilor de avarie, instruirea echipei de operare.", en: "Commissioning: point-by-point verification, sensor calibration, loop tuning, functional testing of each sequence, failure mode testing, training of the operating team." },
    { ro: "Documentarea As-built: scheme funcționale actualizate, scheme de tablou actualizate, lista de puncte finală, manuale de operare, backup de configurație, procesul-verbal de punere în funcțiune.", en: "As-built documentation: updated functional diagrams, updated panel diagrams, the final points list, operating manuals, the configuration backup, the commissioning report." },
  ]

  const stages = [
    { stageRo: "1. Proiect de execuție și liste de comandă", stageEn: "1. Execution design and order lists", whatRo: "Verificarea listei de puncte pe teren, actualizarea schemelor, lansarea comenzilor de echipamente.", whatEn: "On-site verification of the points list, updating the diagrams, placing the equipment orders.", durRo: "2-3 săptămâni", durEn: "2-3 weeks" },
    { stageRo: "2. Livrarea echipamentelor", stageEn: "2. Equipment delivery", whatRo: "Termen de livrare pentru controlere, aparataj de tablou și echipamente de câmp. Este etapa cu cea mai mare variație.", whatEn: "Delivery lead time for controllers, panel apparatus and field equipment. It is the stage with the greatest variation.", durRo: "4-10 săptămâni", durEn: "4-10 weeks" },
    { stageRo: "3. Confecția tabloului", stageEn: "3. Panel assembly", whatRo: "Asamblare, cablare internă, testare la rece, etichetare, verificare pe schema aprobată.", whatEn: "Assembly, internal wiring, cold testing, labelling, verification against the approved diagram.", durRo: "2-4 săptămâni, în paralel cu etapa 2", durEn: "2-4 weeks, in parallel with stage 2" },
    { stageRo: "4. Cablare pe clădire", stageEn: "4. Building cabling", whatRo: "Trasee, cablu de semnal și magistrală, montaj senzori și servomotoare, conectare la tablou. Depinde de accesul pe șantier.", whatEn: "Routes, signal and bus cable, mounting of sensors and actuators, connection to the panel. Depends on site access.", durRo: "3-8 săptămâni", durEn: "3-8 weeks" },
    { stageRo: "5. Montaj tablou și punere sub tensiune", stageEn: "5. Panel installation and energisation", whatRo: "Amplasare, racordare, verificarea alimentării, verificarea protecțiilor.", whatEn: "Placement, connection, power supply check, protection check.", durRo: "3-5 zile", durEn: "3-5 days" },
    { stageRo: "6. Programare și interfață grafică", stageEn: "6. Programming and graphical interface", whatRo: "Implementarea secvențelor, parametrizarea buclelor, construcția sinopticelor, configurarea alarmelor și a trend-logurilor.", whatEn: "Implementing the sequences, tuning the loops, building the synoptics, configuring alarms and trend logs.", durRo: "2-4 săptămâni, parțial în paralel", durEn: "2-4 weeks, partly in parallel" },
    { stageRo: "7. Verificare punct cu punct", stageEn: "7. Point-by-point verification", whatRo: "Fiecare punct se verifică fizic: semnalul ajunge, valoarea este corectă, comanda acționează elementul corect.", whatEn: "Every point is physically checked: the signal arrives, the value is correct, the command actuates the correct element.", durRo: "1-2 săptămâni", durEn: "1-2 weeks" },
    { stageRo: "8. Testare funcțională și regimuri de avarie", stageEn: "8. Functional testing and failure modes", whatRo: "Fiecare secvență se testează în condiții reale, inclusiv căderea de alimentare, defectul de senzor și interblocajele.", whatEn: "Every sequence is tested in real conditions, including power loss, sensor failure and the interlocks.", durRo: "1-2 săptămâni", durEn: "1-2 weeks" },
    { stageRo: "9. Instruire și recepție", stageEn: "9. Training and acceptance", whatRo: "Instruirea echipei de operare, predarea documentației, proces-verbal de punere în funcțiune, recepția la terminarea lucrărilor.", whatEn: "Training of the operating team, handover of the documentation, commissioning report, acceptance at completion of the works.", durRo: "3-5 zile", durEn: "3-5 days" },
  ]

  const clientRequirements = [
    { ro: "Proiectul de automatizare sau, în lipsa lui, mandatul de a-l întocmi ca fază de execuție.", en: "The controls design or, in its absence, the mandate to produce it as an execution phase." },
    { ro: "Acces pe șantier pe zone, cu un grafic agreat. Cablarea nu se poate face după închiderea tavanelor false și după finisaje.", en: "Site access by zone, with an agreed schedule. Cabling cannot be done after the false ceilings are closed and the finishes are in." },
    { ro: "Instalațiile mecanice montate și probate, cu agentul termic disponibil pentru reglaj. Un sistem BMS nu se poate pune în funcțiune pe o instalație care nu funcționează.", en: "The mechanical installations mounted and tested, with the heating and cooling medium available for tuning. A BMS cannot be commissioned on an installation that does not run." },
    { ro: "Alimentarea electrică a tabloului, executată de antreprenorul electric, cu putere și protecție conform schemei.", en: "The electrical supply to the panel, executed by the electrical contractor, with power and protection per the diagram." },
    { ro: "Fișele tehnice și protocoalele echipamentelor cu automatizare proprie: chillere, centrale de tratare a aerului, pompe de căldură, cazane, grupuri de pompare, ascensoare, contoare.", en: "The datasheets and protocols of equipment with its own controls: chillers, air handling units, heat pumps, boilers, pump groups, lifts, meters." },
    { ro: "Un interlocutor tehnic desemnat și echipa care va opera clădirea, disponibilă la instruire.", en: "A designated technical counterpart and the team that will operate the building, available for training." },
    { ro: "Rețea și adrese IP pentru stația de supervizare și pentru controlerele care comunică pe Ethernet, conform politicii IT a beneficiarului.", en: "Network and IP addresses for the supervision station and for the controllers communicating over Ethernet, per the client's IT policy." },
  ]

  const acceptanceCriteria = [
    { ro: "Fiecare punct din lista de puncte este verificat fizic și consemnat. Verificarea confirmă că semnalul ajunge, că valoarea afișată corespunde măsurătorii de referință și că fiecare comandă acționează elementul corect.", en: "Every point in the points list is physically verified and recorded. The check confirms the signal arrives, the displayed value matches the reference measurement and every command actuates the correct element." },
    { ro: "Fiecare secvență de funcționare este testată în condiții reale, cu rezultatul consemnat în protocolul de testare funcțională: regim de ocupare, regim redus, pornire, oprire, avarie.", en: "Every operating sequence is tested in real conditions, with the result recorded in the functional test protocol: occupied mode, reduced mode, start, stop, failure." },
    { ro: "Buclele de reglaj sunt stabile. O buclă care oscilează la recepție va oscila și după un an. Stabilitatea se verifică pe trend-log, nu pe ecranul în timp real.", en: "The control loops are stable. A loop that oscillates at acceptance will still oscillate a year later. Stability is checked on the trend log, not on the real-time screen." },
    { ro: "Regimurile de avarie funcționează: cădere de alimentare și revenire, defect de senzor, defect de comunicație pe magistrală, interblocaje de protecție.", en: "The failure modes work: power loss and recovery, sensor failure, bus communication failure, protective interlocks." },
    { ro: "Alarmele sunt prioritizate pe trei niveluri, fiecare cu destinatar, iar la momentul recepției nu există alarme active nejustificate.", en: "Alarms are prioritised on three levels, each with a recipient, and at acceptance there are no unjustified active alarms." },
    { ro: "Trend-logurile sunt configurate și înregistrează. Rezoluția este de 15 minute pentru energie electrică și de 5-15 minute pentru parametrii de mediu interior, iar retenția la rezoluție completă este de minimum 24 de luni. Sub 24 de luni nu există comparație an la an.", en: "Trend logs are configured and recording. The resolution is 15 minutes for electricity and 5-15 minutes for indoor environment parameters, and full-resolution retention is at least 24 months. Below 24 months there is no year-on-year comparison." },
    { ro: "Documentația As-built este completă și corespunde realității din teren. Se verifică prin sondaj: se aleg 10 puncte din documentație și se caută fizic în clădire.", en: "The As-built documentation is complete and matches reality on site. It is spot-checked: 10 points are picked from the documentation and physically located in the building." },
    { ro: "Parolele de nivel inginer, backup-ul de configurație și programele controlerelor sunt predate beneficiarului, pe suport propriu, cu procedura de restaurare.", en: "The engineer-level passwords, the configuration backup and the controller programs are handed over to the client, on the client's own media, with the restore procedure." },
    { ro: "Instruirea a avut loc și există o listă de participanți semnată.", en: "Training took place and there is a signed attendance list." },
  ]

  const exclusions = [
    { ro: "Nu include instalațiile de HVAC, sanitare și electrice de putere. Sistemul BMS comandă și monitorizează instalații executate de antreprenorii de specialitate.", en: "It does not include the HVAC, plumbing and power electrical installations. The BMS commands and monitors installations executed by the specialist contractors." },
    { ro: "Nu include alimentarea electrică până la tabloul de automatizare și nici tabloul general al clădirii.", en: "It does not include the electrical supply up to the automation panel, nor the building's main distribution board." },
    { ro: "Nu include automatizarea proprie a echipamentelor livrate cu control integrat. Chillerul, centrala de tratare a aerului și pompa de căldură rămân cu logica producătorului. Sistemul BMS o supraveghează și îi dă comenzi, prin protocol sau prin contacte.", en: "It does not include the built-in controls of equipment delivered with integrated control. The chiller, the air handling unit and the heat pump keep the manufacturer's logic. The BMS supervises it and sends it commands, over protocol or contacts." },
    { ro: "Nu include detecția și semnalizarea incendiului, controlul accesului și supravegherea video. Semnalele acestor sisteme pot fi preluate în BMS ca informație, dacă sunt disponibile pe protocol sau pe contacte.", en: "It does not include fire detection and alarm, access control and video surveillance. These systems' signals can be taken into the BMS as information, if available over protocol or contacts." },
    { ro: "Nu include tavane false, gips-carton, refaceri de finisaje și lucrări de construcții pentru trasee.", en: "It does not include false ceilings, drywall, finish repairs and construction works for routes." },
    { ro: "Nu include licențele de sistem de operare și hardware-ul de server al beneficiarului, dacă supervizarea rulează pe infrastructura acestuia.", en: "It does not include the client's operating system licences and server hardware, if supervision runs on the client's infrastructure." },
    { ro: "Nu include modificările cerute după recepție, care se tratează ca lucrări suplimentare sau prin contractul de întreținere.", en: "It does not include changes requested after acceptance, which are treated as additional works or through the maintenance contract." },
  ]

  const comparisonRows = [
    { elRo: "Punctele", elEn: "The points", cRo: "cablate și vizibile în sistem", cEn: "cabled and visible in the system", pRo: "verificate fizic unul câte unul, cu valoare confirmată față de o măsurătoare de referință", pEn: "physically verified one by one, with the value confirmed against a reference measurement" },
    { elRo: "Senzorii", elEn: "The sensors", cRo: "montați", cEn: "mounted", pRo: "verificați și, unde este cazul, calibrați", pEn: "verified and, where needed, calibrated" },
    { elRo: "Buclele de reglaj", elEn: "The control loops", cRo: "active cu parametri impliciți", cEn: "active with default parameters", pRo: "parametrizate pe clădirea reală și verificate pe trend-log", pEn: "tuned on the real building and verified on the trend log" },
    { elRo: "Secvențele", elEn: "The sequences", cRo: "programate", cEn: "programmed", pRo: "testate în regim normal, redus și de avarie, cu proces-verbal", pEn: "tested in normal, reduced and failure modes, with a signed report" },
    { elRo: "Alarmele", elEn: "The alarms", cRo: "generate", cEn: "generated", pRo: "prioritizate pe trei niveluri, cu destinatar, fără alarme active nejustificate", pEn: "prioritised on three levels, with recipients, with no unjustified active alarms" },
    { elRo: "Trend-logurile", elEn: "The trend logs", cRo: "eventual active", cEn: "possibly active", pRo: "configurate pe rezoluție și retenție declarate", pEn: "configured to a declared resolution and retention" },
    { elRo: "Documentația", elEn: "The documentation", cRo: "schemele de proiect", cEn: "the design diagrams", pRo: "As-built, verificat prin sondaj în teren", pEn: "As-built, spot-checked on site" },
    { elRo: "Echipa clădirii", elEn: "The building team", cRo: "-", cEn: "-", pRo: "instruită, cu listă de participanți", pEn: "trained, with an attendance list" },
  ]

  const faqs = [
    { qRo: "Cât costă execuția unui sistem BMS?", qEn: "How much does BMS execution cost?", aRo: "Un sistem BMS nou costă 4-18 EUR/mp ca bandă agregată pentru retail, birouri și hoteluri fără control pe cameră. Pe tipuri: 9-18 EUR/mp la birouri clasa A, 5-10 EUR/mp la birouri clasa B, 4-9 EUR/mp în retail, 3-8 EUR/mp industrial, 30-80 EUR/mp în pharma. Pe punct de date, banda este de 90-320 EUR.", aEn: "A new BMS costs 4-18 EUR/sqm as an aggregate band for retail, offices and hotels without room control. By type: 9-18 EUR/sqm for class A offices, 5-10 EUR/sqm for class B offices, 4-9 EUR/sqm in retail, 3-8 EUR/sqm industrial, 30-80 EUR/sqm in pharma. Per data point, the band is 90-320 EUR." },
    { qRo: "Cât durează execuția unui sistem BMS?", qEn: "How long does BMS execution take?", aRo: "Pentru o clădire de birouri de circa 10.000 mp, execuția durează 8-20 de săptămâni. Etapa cu cea mai mare variație este livrarea echipamentelor, iar factorul care dictează termenul final este accesul pe șantier pentru cablare, înainte de închiderea tavanelor.", aEn: "For an office building of around 10,000 sqm, execution takes 8-20 weeks. The stage with the greatest variation is equipment delivery, and the factor dictating the final deadline is site access for cabling, before the ceilings are closed." },
    { qRo: "Ce se predă la recepția unui sistem BMS?", qEn: "What is handed over at BMS acceptance?", aRo: "Documentația As-built cu scheme funcționale și scheme de tablou, lista de puncte finală în format editabil, programele controlerelor, backup-ul de configurație al controlerelor și al stației de supervizare, manualele de operare, procesul-verbal de punere în funcțiune cu protocolul de testare și parolele de nivel inginer.", aEn: "The As-built documentation with functional and panel diagrams, the final points list in editable format, the controller programs, the configuration backup of the controllers and the supervision station, the operating manuals, the commissioning report with the test protocol and the engineer-level passwords." },
    { qRo: "Se poate executa un sistem BMS pe un proiect făcut de altă firmă?", qEn: "Can a BMS be executed on another company's design?", aRo: "Da. Înainte de ofertare se verifică lista de puncte, secvențele de funcționare și compatibilitatea echipamentelor cu automatizare proprie. Dacă proiectul are lipsuri, ele se semnalează în ofertă, ca observații, nu se acoperă tăcut cu ipoteze care apar mai târziu ca lucrări suplimentare.", aEn: "Yes. Before quoting, the points list, the operating sequences and the compatibility of equipment with its own controls are checked. If the design has gaps, they are flagged in the offer as observations, not silently covered with assumptions that later resurface as additional works." },
    { qRo: "Se poate executa un BMS într-o clădire în funcțiune?", qEn: "Can a BMS be executed in an occupied building?", aRo: "Da, prin fazare pe zone și prin ferestre de lucru negociate. Instalațiile se opresc pe rând, nu simultan, iar sistemul vechi și cel nou coexistă pe perioada tranziției. Metoda este descrisă pe pagina de modernizare.", aEn: "Yes, through phasing by zone and negotiated work windows. The installations are stopped one at a time, not simultaneously, and the old and new systems coexist during the transition. The method is described on the modernisation page." },
  ]

  const related = [
    { href: "/servicii/proiectare-automatizari-bms", titleRo: "Proiectare automatizări și BMS", titleEn: "BMS and automation design", descRo: "Listă de puncte, caiet de sarcini, scheme de tablou", descEn: "Points list, technical specification, panel diagrams" },
    { href: "/servicii/intretinere-sisteme-bms", titleRo: "Întreținere sisteme BMS", titleEn: "BMS maintenance", descRo: "Contract cu verificări planificate și registru de intervenții", descEn: "Contract with planned checks and an intervention log" },
    { href: "/servicii/modernizare-sisteme-de-automatizare-si-bms", titleRo: "Modernizare sisteme de automatizare și BMS", titleEn: "Automation and BMS modernisation", descRo: "Migrare pe etape, fără oprirea clădirii", descEn: "Staged migration, without stopping the building" },
  ]

  const resources = [
    { href: "/resurse/cost-sistem-bms", ro: "Cât costă un sistem BMS în România", en: "How much a BMS costs in Romania" },
    { href: "/produse", ro: "Echipamentele SAUTER integrate", en: "The SAUTER equipment we integrate" },
    { href: "/referinte", ro: "Cele 25 de proiecte de referință", en: "The 25 reference projects" },
  ]

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <ServiceHero
        titleRo={"Execuție sisteme BMS: tablou, cablare, programe, HMI, punere în funcțiune, As-built"}
        titleEn={"BMS execution: panel, cabling, programs, HMI, commissioning, As-built"}
        leadRo={"Execuția unui sistem BMS acoperă șapte livrabile: sistemul de automatizare, tabloul electric de forță și automatizare, cablarea și instalarea echipamentelor, programele de control și monitorizare, interfața grafică HMI, punerea în funcțiune și documentarea As-built. Pentru o clădire de birouri de circa 10.000 mp, execuția durează 8-20 de săptămâni, în funcție de ritmul șantierului și de termenele de livrare."}
        leadEn={"BMS execution covers seven deliverables: the automation system, the power and automation electrical panel, cabling and equipment installation, the control and monitoring programs, the HMI graphical interface, commissioning and As-built documentation. For an office building of around 10,000 sqm, execution takes 8-20 weeks, depending on site pace and delivery lead times."}
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
                  <span className="font-light text-[#0D2E2B]">{t("8-20 săptămâni", "8-20 weeks")}</span>
                </div>
                <p className="text-xs text-[#888888] font-light mt-2">{t("pentru o clădire de birouri de circa 10.000 mp, cu 750-1.350 de puncte", "for an office building of around 10,000 sqm, with 750-1,350 points")}</p>
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
                  {t("Cere o ofertă pentru sistemul BMS", "Request a BMS quote")}
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
                  <ListOrdered className="h-4 w-4 text-[#1F6B4A]" />
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
                  <ListOrdered className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce livrează concret execuția unui sistem BMS", "What BMS execution concretely delivers")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Cele șapte livrabile de execuție, așa cum apar în contract și în procesul-verbal de recepție.", "The seven execution deliverables, as they appear in the contract and in the acceptance report.")}</p>
              <ol className="space-y-3">
                {deliverables.map((item, idx) => (
                  <li key={item.en} className="bg-white rounded-[2px] p-5 flex items-start gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D2E2B] text-white text-sm font-light shrink-0">{idx + 1}</span>
                    <span className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(item.ro, item.en)}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* Stages */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Target className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum decurge execuția, pe etape", "How execution proceeds, stage by stage")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Duratele sunt orientative, pentru o clădire de birouri de circa 10.000 mp, cu 750-1.350 de puncte.", "Durations are indicative, for an office building of around 10,000 sqm, with 750-1,350 points.")}</p>
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
                        <td className="p-4 text-[#1F6B4A] font-light">{t(s.durRo, s.durEn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-[#888888] font-light mt-4">{t("Etapele 2, 3 și 4 se suprapun în cea mai mare parte. Durata totală este dictată de termenele de livrare și de accesul pe șantier, nu de volumul de programare.", "Stages 2, 3 and 4 largely overlap. The total duration is dictated by delivery lead times and site access, not by the programming volume.")}</p>
            </section>

            {/* Client requirements */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce cere execuția din partea beneficiarului", "What execution requires from the client")}</h2>
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum se măsoară că execuția a ieșit bine", "How you measure that execution turned out well")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Criteriile de recepție. Se scriu în contract și se verifică punctual, nu prin impresie generală.", "The acceptance criteria. They are written into the contract and checked point by point, not by general impression.")}</p>
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce nu include execuția", "What execution does not include")}</h2>
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
                {t("Modificările de după recepție se tratează prin contractul de ", "Post-acceptance changes are handled through the ")}
                <Link href="/servicii/intretinere-sisteme-bms" className="text-[#1F6B4A] hover:underline">{t("întreținere", "maintenance contract")}</Link>.
              </p>
            </section>

            {/* Connected vs commissioned table */}
            <section>
              <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter mb-3">{t("Ce înseamnă „conectat\" și ce înseamnă „pus în funcțiune\"", "What \"connected\" means and what \"commissioned\" means")}</h2>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Distincția aceasta este locul în care două oferte cu preț diferit devin comparabile.", "This distinction is where two offers with different prices become comparable.")}</p>
              <div className="overflow-x-auto bg-white rounded-[2px]">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-[#0D2E2B]/10">
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Element", "Element")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Conectat", "Connected")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Pus în funcțiune", "Commissioned")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((r) => (
                      <tr key={r.elEn} className="border-b border-[#0D2E2B]/8 last:border-0 align-top">
                        <td className="p-4 text-[#0D2E2B] font-light">{t(r.elRo, r.elEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.cRo, r.cEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.pRo, r.pEn)}</td>
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
                {t("Ofertă de execuție, pe lista de puncte", "An execution offer, built on the points list")}
              </h2>
              <p className="text-white/60 font-light mb-7 max-w-xl mx-auto text-sm leading-relaxed">
                {t(
                  "O ofertă serioasă de execuție se construiește pe lista de puncte și pe secvențele de funcționare, nu pe suprafață. Sovitech Control ofertează pe proiectul existent și semnalează în ofertă ce lipsește din el.",
                  "A serious execution offer is built on the points list and the operating sequences, not on floor area. Sovitech Control quotes on the existing design and flags in the offer what is missing from it.",
                )}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0D2E2B] text-sm font-bold px-6 py-3 rounded-[2px] hover:bg-[#F5F4F0] transition-colors"
              >
                {t("Cere o ofertă pentru sistemul BMS", "Request a BMS quote")}
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
