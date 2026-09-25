"use client"

// LINKS-TO-REACTIVATE: Checklist lunar de performanta BMS pentru facility manager | interim /resurse/performanta-cladirii | final /resurse/checklist-lunar-bms-facility-manager
// LINKS-TO-REACTIVATE: Alarme in BMS si SCADA: cum se prioritizeaza | interim /resurse/bms-scada-integrare | final /resurse/prioritizare-alarme-bms-scada
// LINKS-TO-REACTIVATE: 7 semne ca sistemul BMS a ajuns la finalul duratei de viata | interim /resurse/modernizare-retrofit | final /resurse/semne-bms-final-de-viata
// TODO(SLA): timpii de raspuns pe severitate, frecventa verificarilor planificate, banda de cost
// pentru nivelul Critic, intervalul orar exact al fiecarui nivel si tariful in afara programului
// sunt nerezolvate la nivel de firma. Pagina scrie "convenit prin contract" in loc de valori;
// nu se publica cifre pana la confirmare. Afirmatiile vechi "SLA 4h" si "95% uptime" au fost eliminate.
// TODO(confirm): duratele orientative pe etape la preluarea in intretinere

import Link from "next/link"
import { Clock, CheckCircle2, Target, Users, ShieldCheck, XCircle, ClipboardList, AlertTriangle, ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { ServiceHero } from "@/components/service-hero"

export default function IntretinerePage() {
  const { t } = useLanguage()

  const sidebarPoints = [
    { ro: "Verificări planificate, cu frecvență declarată", en: "Planned checks, at a declared frequency" },
    { ro: "Registru de intervenții actualizat", en: "An up-to-date intervention log" },
    { ro: "Backup de configurație păstrat la beneficiar", en: "Configuration backup kept by the client" },
    { ro: "Raport periodic cu alarme și consum", en: "Periodic report with alarms and consumption" },
    { ro: "Timpi de răspuns pe severitate, conveniți prin contract", en: "Response times by severity, agreed by contract" },
  ]

  const summaryPoints = [
    { ro: "Trei niveluri de contract: Bază, Extins și Critic, delimitate prin sferă, interval de disponibilitate și timp de răspuns pe severitate.", en: "Three contract levels: Base, Extended and Critical, delimited by scope, availability window and response time per severity." },
    { ro: "Costul anual este de 4-7% din valoarea investiției pentru contractul de bază și de 7-12% pentru cel extins. Pentru o clădire de birouri de 10.000 mp cu un sistem la 13 EUR/mp, ordinul de mărime este de 5.200-15.600 EUR pe an.", en: "The annual cost is 4-7% of the investment value for the base contract and 7-12% for the extended one. For a 10,000 sqm office building with a system at 13 EUR/sqm, the order of magnitude is 5,200-15,600 EUR per year." },
    { ro: "Timpul de răspuns nu este timpul de remediere. Sunt doi indicatori diferiți, măsurați din momente diferite, și orice contract serios îi definește separat.", en: "Response time is not fix time. They are two different indicators, measured from different moments, and any serious contract defines them separately." },
    { ro: "Severitatea se stabilește prin efectul asupra clădirii, nu prin cât de nervos este apelul: oprirea unei instalații critice nu este același lucru cu o alarmă repetitivă.", en: "Severity is set by the effect on the building, not by how angry the phone call is: a stopped critical installation is not the same thing as a repetitive alarm." },
    { ro: "Ce se întâmplă în afara programului este partea care diferențiază real cele trei niveluri și este scrisă explicit în contract.", en: "What happens outside working hours is the part that really differentiates the three levels, and it is written explicitly into the contract." },
    { ro: "Verificările planificate previn tiparul clasic: programe orare deviate, puncte lăsate pe manual, senzori decalibrați, bucle trecute pe manual și niciodată repuse.", en: "Planned checks prevent the classic pattern: drifted schedules, points left in manual, sensors out of calibration, loops switched to manual and never switched back." },
  ]

  const deliverables = [
    { ro: "Verificări planificate, cu frecvență declarată: programe orare față de ocuparea reală, puncte trecute pe manual, alarme active și repetitive, deriva senzorilor, starea comunicației pe magistrale, spațiul de stocare al istoricului.", en: "Planned checks, at a declared frequency: schedules against real occupancy, points switched to manual, active and repetitive alarms, sensor drift, bus communication status, history storage space." },
    { ro: "Registrul de intervenții, actualizat la fiecare vizită: ce s-a verificat, ce s-a constatat, ce s-a remediat, ce a rămas deschis și cu ce termen.", en: "The intervention log, updated at every visit: what was checked, what was found, what was fixed, what remains open and with what deadline." },
    { ro: "Intervenții la solicitare, în sfera și în intervalul declarate pe nivelul de contract.", en: "Interventions on request, within the scope and window declared for the contract level." },
    { ro: "Backup de configurație, refăcut periodic și păstrat la beneficiar, împreună cu procedura de restaurare testată.", en: "Configuration backup, periodically refreshed and kept by the client, together with a tested restore procedure." },
    { ro: "Actualizări de configurare cerute de schimbări de ocupare: program orar nou, zonă reamenajată, chiriaș nou, prag de alarmă modificat.", en: "Configuration updates required by occupancy changes: a new schedule, a refitted zone, a new tenant, a changed alarm threshold." },
    { ro: "Raport periodic, cu constatările verificării, intervențiile din perioadă, alarmele dominante și consumul față de perioada similară din anul anterior.", en: "A periodic report, with the check findings, the interventions in the period, the dominant alarms and consumption against the same period of the previous year." },
    { ro: "Recomandări de piese de schimb, cu termenele de livrare și cu poziția de stoc recomandată la beneficiar.", en: "Spare part recommendations, with delivery lead times and the stock position recommended at the client." },
    { ro: "Instruire de reîmprospătare pentru echipa de operare, cu durata și frecvența stabilite prin nivelul de contract.", en: "Refresher training for the operating team, with duration and frequency set by the contract level." },
  ]

  const levelRows = [
    { elRo: "Cost anual, din valoarea investiției", elEn: "Annual cost, of the investment value", bRo: "4-7%", bEn: "4-7%", eRo: "7-12%", eEn: "7-12%", cRo: "convenit prin contract", cEn: "agreed by contract" },
    { elRo: "Verificări planificate", elEn: "Planned checks", bRo: "frecvență convenită prin contract", bEn: "frequency agreed by contract", eRo: "frecvență convenită prin contract", eEn: "frequency agreed by contract", cRo: "frecvență convenită prin contract", cEn: "frequency agreed by contract" },
    { elRo: "Interval de disponibilitate pentru sesizări", elEn: "Availability window for requests", bRo: "program de lucru", bEn: "working hours", eRo: "program de lucru extins", eEn: "extended working hours", cRo: "permanent", cEn: "permanent" },
    { elRo: "Timp de răspuns, pe severitate", elEn: "Response time, by severity", bRo: "convenit prin contract", bEn: "agreed by contract", eRo: "convenit prin contract", eEn: "agreed by contract", cRo: "convenit prin contract", cEn: "agreed by contract" },
    { elRo: "Intervenție la fața locului", elEn: "On-site intervention", bRo: "contra cost, la solicitare", bEn: "chargeable, on request", eRo: "inclusă, în limita unui număr de vizite pe an", eEn: "included, up to a number of visits per year", cRo: "inclusă", cEn: "included" },
    { elRo: "Asistență la distanță", elEn: "Remote assistance", bRo: "inclusă, în program", bEn: "included, during working hours", eRo: "inclusă, în intervalul extins", eEn: "included, in the extended window", cRo: "inclusă, permanent", cEn: "included, permanently" },
    { elRo: "Modificări de configurare", elEn: "Configuration changes", bRo: "contra cost", bEn: "chargeable", eRo: "incluse, în limita unui buget de ore pe an", eEn: "included, up to an annual budget of hours", cRo: "incluse", cEn: "included" },
    { elRo: "Backup de configurație", elEn: "Configuration backup", bRo: "la fiecare vizită planificată", bEn: "at every planned visit", eRo: "la fiecare vizită și după fiecare modificare", eEn: "at every visit and after every change", cRo: "idem, plus test de restaurare", cEn: "the same, plus a restore test" },
    { elRo: "Raport periodic", elEn: "Periodic report", bRo: "la frecvența din contract", bEn: "at the contract frequency", eRo: "lunar", eEn: "monthly", cRo: "lunar, plus analiză de tendințe", cEn: "monthly, plus trend analysis" },
    { elRo: "Piese de schimb", elEn: "Spare parts", bRo: "contra cost", bEn: "chargeable", eRo: "contra cost, cu stoc recomandat", eEn: "chargeable, with a recommended stock", cRo: "contra cost, cu stoc convenit la beneficiar", cEn: "chargeable, with an agreed stock at the client" },
    { elRo: "Actualizări de firmware", elEn: "Firmware updates", bRo: "contra cost", bEn: "chargeable", eRo: "incluse, planificate", eEn: "included, planned", cRo: "incluse, planificate", cEn: "included, planned" },
  ]

  const severityRows = [
    { sRo: "1. Critică", sEn: "1. Critical", dRo: "O instalație esențială este oprită sau scăpată de sub control, iar activitatea din clădire este afectată sau riscă să fie afectată în orele următoare.", dEn: "An essential installation is stopped or out of control, and activity in the building is affected or at risk of being affected within hours.", exRo: "Centrala frigorifică oprită în plin sezon, pierderea totală a supervizării, control pierdut pe o zonă cu parametri critici, îngheț iminent pe o baterie", exEn: "The chiller plant stopped at peak season, total loss of supervision, lost control of a zone with critical parameters, imminent freezing of a coil" },
    { sRo: "2. Majoră", sEn: "2. Major", dRo: "Sistemul funcționează, dar o funcție importantă lipsește sau o zonă este afectată. Activitatea continuă, cu disconfort sau cu operare manuală.", dEn: "The system runs, but an important function is missing or a zone is affected. Activity continues, with discomfort or manual operation.", exRo: "O centrală de tratare a aerului fără reglaj automat, pierderea comunicației cu un controler, istoricizare oprită, alarme care nu ajung la destinatar", exEn: "An air handling unit without automatic control, lost communication with a controller, historisation stopped, alarms not reaching their recipient" },
    { sRo: "3. Minoră", sEn: "3. Minor", dRo: "Efect local, fără impact asupra activității. Se planifică.", dEn: "Local effect, no impact on activity. It gets scheduled.", exRo: "Un senzor cu derivă, o etichetă greșită în interfață, un raport care nu se generează, o alarmă repetitivă cu prag greșit", exEn: "A drifting sensor, a wrong label in the interface, a report that does not generate, a repetitive alarm with a wrong threshold" },
  ]

  const responseIndicators = [
    { ro: "Timpul de răspuns se măsoară din momentul înregistrării sesizării, pe canalul declarat în contract, până la primul contact tehnic al unui inginer cu beneficiarul, cu preluarea cazului și cu încadrarea în severitate.", en: "Response time is measured from the moment the request is logged, on the channel declared in the contract, to an engineer's first technical contact with the client, taking over the case and assigning the severity." },
    { ro: "Timpul de intervenție la distanță se măsoară din momentul preluării până la începerea analizei pe sistem, prin conexiunea securizată de acces la distanță.", en: "Remote intervention time is measured from case takeover to the start of analysis on the system, over the secured remote access connection." },
    { ro: "Timpul de prezență la fața locului se măsoară din momentul în care se stabilește că problema nu se poate rezolva la distanță, până la sosirea inginerului în clădire.", en: "On-site attendance time is measured from the moment it is established that the problem cannot be solved remotely, to the engineer's arrival in the building." },
  ]

  const afterHours = [
    { ro: "Contractul de bază acoperă sesizările primite în program. O sesizare făcută seara se preia la prima oră a următoarei zile lucrătoare, iar ceasul de răspuns pornește atunci. Intervențiile în afara programului se ofertează separat, la tarif de urgență.", en: "The base contract covers requests received during working hours. A request made in the evening is taken over first thing the next working day, and the response clock starts then. Out-of-hours interventions are quoted separately, at an emergency rate." },
    { ro: "Contractul extins acoperă un interval de disponibilitate mai larg și, pentru severitatea 1, o preluare în afara programului prin serviciu de permanență.", en: "The extended contract covers a wider availability window and, for severity 1, out-of-hours takeover through an on-call service." },
    { ro: "Contractul critic acoperă preluarea permanentă, inclusiv în weekend și în sărbători legale, cu timpi de răspuns identici indiferent de oră.", en: "The critical contract covers permanent takeover, including weekends and legal holidays, with identical response times regardless of the hour." },
  ]

  const stages = [
    { stageRo: "1. Analiza sistemului existent", stageEn: "1. Analysis of the existing system", whatRo: "O zi pe clădire: lista de puncte, programele orare, punctele pe manual, alarmele active, trend-logurile pe 30 de zile, accesul de nivel inginer, disponibilitatea pieselor.", whatEn: "One day in the building: the points list, the schedules, the points in manual, the active alarms, 30 days of trend logs, engineer-level access, parts availability.", durRo: "1 zi pe teren", durEn: "1 day on site" },
    { stageRo: "2. Raportul de constatări", stageEn: "2. Findings report", whatRo: "Lista constatărilor, separată în ce se rezolvă din configurare și ce cere intervenție fizică, cu efort estimat pe fiecare.", whatEn: "The list of findings, split into what can be fixed through configuration and what needs physical intervention, with the estimated effort for each.", durRo: "3-5 zile lucrătoare", durEn: "3-5 working days" },
    { stageRo: "3. Alegerea nivelului de contract", stageEn: "3. Choosing the contract level", whatRo: "Se stabilesc sfera, intervalul de disponibilitate, severitățile și timpii, în funcție de consecința unei opriri.", whatEn: "The scope, availability window, severities and times are set, based on the consequence of an outage.", durRo: "discuție de 1 oră", durEn: "a 1-hour discussion" },
    { stageRo: "4. Punerea la punct înainte de intrarea în contract", stageEn: "4. Tune-up before the contract starts", whatRo: "Corectarea programelor orare, prioritizarea alarmelor, refacerea backup-urilor, completarea listei de puncte. Se ofertează separat de contract.", whatEn: "Correcting the schedules, prioritising the alarms, refreshing the backups, completing the points list. Quoted separately from the contract.", durRo: "1-3 săptămâni", durEn: "1-3 weeks" },
    { stageRo: "5. Prima vizită planificată", stageEn: "5. First planned visit", whatRo: "Verificarea completă pe lista de control și deschiderea registrului de intervenții.", whatEn: "The full check against the checklist and the opening of the intervention log.", durRo: "1 zi", durEn: "1 day" },
    { stageRo: "6. Regim curent", stageEn: "6. Ongoing operation", whatRo: "Verificări planificate la frecvența din contract, intervenții la solicitare, raport periodic.", whatEn: "Planned checks at the contract frequency, interventions on request, the periodic report.", durRo: "pe toată durata contractului", durEn: "for the whole contract term" },
  ]

  const clientRequirements = [
    { ro: "Acces la sistem, fizic și la distanță, prin conexiunea securizată agreată cu echipa IT.", en: "Access to the system, physical and remote, over the secured connection agreed with the IT team." },
    { ro: "Documentația existentă: As-built, lista de puncte, schemele de tablou, backup-urile, dacă există.", en: "The existing documentation: As-built, points list, panel diagrams, backups, if they exist." },
    { ro: "Persoane de contact desemnate, cu drept de a declara severitatea și de a aproba intervenții.", en: "Designated contact persons, with the authority to declare the severity and approve interventions." },
    { ro: "Acces în clădire în intervalele convenite, inclusiv în spații închiriate, unde este necesar.", en: "Access to the building in the agreed windows, including leased spaces where necessary." },
    { ro: "Sesizări pe canalul din contract, nu pe canale personale, pentru ca timpii să fie măsurabili.", en: "Requests on the contract channel, not on personal channels, so the times are measurable." },
    { ro: "Informarea despre modificări: schimbări de ocupare, lucrări de amenajare, echipamente noi, intervenții ale altor furnizori asupra instalațiilor.", en: "Information about changes: occupancy changes, fit-out works, new equipment, other suppliers' interventions on the installations." },
  ]

  const successCriteria = [
    { ro: "Numărul de alarme active scade și rămâne scăzut. O listă de alarme pe care echipa clădirii chiar o citește este primul indicator de sănătate al sistemului.", en: "The number of active alarms drops and stays low. An alarm list the building team actually reads is the first indicator of system health." },
    { ro: "Numărul de puncte lăsate pe manual tinde spre zero și fiecare punct rămas pe manual are un motiv consemnat în registru.", en: "The number of points left in manual tends towards zero, and every point left in manual has a reason recorded in the log." },
    { ro: "Programele orare corespund ocupării reale, verificat la fiecare vizită planificată.", en: "The schedules match real occupancy, verified at every planned visit." },
    { ro: "Backup-ul de configurație există, este recent și a fost testat prin restaurare.", en: "The configuration backup exists, is recent and has been tested through a restore." },
    { ro: "Timpii din contract sunt respectați și raportați, cu istoricul sesizărilor disponibil beneficiarului.", en: "The contract times are met and reported, with the request history available to the client." },
    { ro: "Consumul se compară an la an, ceea ce presupune retenție de minimum 24 de luni la rezoluție completă și normalizare cel puțin la grade-zile și la ore de ocupare.", en: "Consumption is compared year on year, which requires at least 24 months of full-resolution retention and normalisation at least to degree days and occupancy hours." },
    { ro: "Registrul de intervenții este complet și poate fi predat oricând altui furnizor.", en: "The intervention log is complete and can be handed to another supplier at any time." },
  ]

  const exclusions = [
    { ro: "Nu include piesele de schimb și echipamentele, decât dacă sunt prevăzute explicit. Se ofertează separat, cu termen de livrare declarat.", en: "It does not include spare parts and equipment, unless explicitly provided for. They are quoted separately, with a declared delivery time." },
    { ro: "Nu include service-ul instalațiilor de HVAC, electrice și sanitare. Contractul acoperă sistemul de automatizare, nu chillerul, cazanul sau pompa.", en: "It does not include servicing the HVAC, electrical and plumbing installations. The contract covers the automation system, not the chiller, the boiler or the pump." },
    { ro: "Nu include remedierea defectelor produse de intervenții ale altor furnizori asupra sistemului sau ale beneficiarului asupra configurației.", en: "It does not include fixing faults caused by other suppliers' interventions on the system or the client's own changes to the configuration." },
    { ro: "Nu include extinderi de sistem: puncte noi, zone noi, echipamente noi. Se tratează ca lucrare separată.", en: "It does not include system extensions: new points, new zones, new equipment. These are treated as separate works." },
    { ro: "Nu include licențele de software și taxele anuale de licență, care se estimează la 8-18% din valoarea componentei software și se declară separat în ofertă.", en: "It does not include software licences and annual licence fees, estimated at 8-18% of the software component value and declared separately in the offer." },
    { ro: "Nu include modernizarea sistemului ajuns la finalul duratei de viață. Când piesele nu mai există, contractul de întreținere nu mai este soluția.", en: "It does not include modernising a system at the end of its life. When parts no longer exist, the maintenance contract is no longer the answer." },
    { ro: "Nu include garanția lucrării de execuție, care este un angajament distinct, cu durată proprie.", en: "It does not include the execution works warranty, which is a distinct commitment with its own term." },
  ]

  const faqs = [
    { qRo: "Cât costă un contract de întreținere BMS pe an?", qEn: "How much does a BMS maintenance contract cost per year?", aRo: "Contractul de bază costă 4-7% din valoarea investiției în sistem pe an, iar cel extins 7-12%. Pentru o clădire de birouri de 10.000 mp cu un sistem la 13 EUR/mp, adică o investiție de circa 130.000 EUR, ordinul de mărime este de 5.200-9.100 EUR pe an la nivelul de bază și de 9.100-15.600 EUR la cel extins.", aEn: "The base contract costs 4-7% of the system investment value per year, and the extended one 7-12%. For a 10,000 sqm office building with a system at 13 EUR/sqm, i.e. an investment of around 130,000 EUR, the order of magnitude is 5,200-9,100 EUR per year at the base level and 9,100-15,600 EUR at the extended level." },
    { qRo: "Ce înseamnă concret timp de răspuns într-un contract de BMS?", qEn: "What does response time concretely mean in a BMS contract?", aRo: "Timpul de răspuns se măsoară din momentul înregistrării sesizării pe canalul declarat în contract până la primul contact tehnic al unui inginer, care preia cazul și stabilește severitatea. Este diferit de timpul de prezență la fața locului și de timpul de remediere, care se măsoară din alte momente și se raportează separat.", aEn: "Response time is measured from the moment the request is logged on the channel declared in the contract to an engineer's first technical contact, taking over the case and setting the severity. It differs from on-site attendance time and fix time, which are measured from other moments and reported separately." },
    { qRo: "Se poate prelua în întreținere un sistem executat de altă firmă?", qEn: "Can you take over maintenance of a system executed by another company?", aRo: "Da. Preluarea începe cu o zi de analiză: lista de puncte, starea programelor, alarmele active, punctele pe manual, accesul de nivel inginer și disponibilitatea pieselor. Dacă parolele de inginerie sau programele controlerelor nu au fost predate la recepția inițială, acest lucru se constată și se cuantifică înainte de semnarea contractului.", aEn: "Yes. Takeover starts with one day of analysis: the points list, the state of the programs, the active alarms, the points in manual, engineer-level access and parts availability. If the engineering passwords or the controller programs were not handed over at the original acceptance, this is established and quantified before the contract is signed." },
    { qRo: "Ce se întâmplă dacă sistemul cade în weekend?", qEn: "What happens if the system fails at the weekend?", aRo: "Depinde de nivelul de contract. La nivelul de bază, sesizarea se preia în prima zi lucrătoare, iar intervenția în weekend se ofertează la tarif de urgență. La nivelul extins, severitatea 1 se preia prin serviciu de permanență. La nivelul critic, preluarea este permanentă, cu aceiași timpi indiferent de zi.", aEn: "It depends on the contract level. At the base level, the request is taken over on the first working day, and a weekend intervention is quoted at an emergency rate. At the extended level, severity 1 is taken over through an on-call service. At the critical level, takeover is permanent, with the same times regardless of the day." },
    { qRo: "Cine deține parolele și backup-urile în timpul contractului?", qEn: "Who owns the passwords and backups during the contract?", aRo: "Beneficiarul. Parolele de nivel inginer, backup-urile de configurație și programele controlerelor rămân la beneficiar pe toată durata contractului. Un furnizor de service care păstrează exclusiv aceste elemente transformă un contract anual într-o dependență permanentă.", aEn: "The client. The engineer-level passwords, the configuration backups and the controller programs stay with the client for the whole contract term. A service provider who keeps exclusive hold of these turns an annual contract into a permanent dependency." },
  ]

  const related = [
    { href: "/servicii/executie-sisteme-bms", titleRo: "Execuție sisteme BMS", titleEn: "BMS execution", descRo: "Tablou, cablare, programe, punere în funcțiune", descEn: "Panel, cabling, programs, commissioning" },
    { href: "/servicii/modernizare-sisteme-de-automatizare-si-bms", titleRo: "Modernizare sisteme de automatizare și BMS", titleEn: "Automation and BMS modernisation", descRo: "Migrare pe etape, fără oprirea clădirii", descEn: "Staged migration, without stopping the building" },
    { href: "/servicii/consultanta", titleRo: "Consultanță", titleEn: "Consultancy", descRo: "Evaluarea unui sistem existent, raport scris", descEn: "Assessment of an existing system, a written report" },
  ]

  const resources = [
    { href: "/resurse/performanta-cladirii", ro: "Materiale despre performanța clădirii, pentru facility manager", en: "Materials on building performance, for facility managers" },
    { href: "/resurse/bms-scada-integrare", ro: "Materiale despre alarme și integrare BMS-SCADA", en: "Materials on alarms and BMS-SCADA integration" },
    { href: "/resurse/modernizare-retrofit", ro: "Materiale despre modernizare și retrofit", en: "Materials on modernisation and retrofit" },
    { href: "/pentru/facility-manager", ro: "Pentru facility manager", en: "For the facility manager" },
  ]

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <ServiceHero
        titleRo={"Întreținere sisteme BMS: 4-7% pe an contract de bază, 7-12% contract extins"}
        titleEn={"BMS maintenance: 4-7% per year base contract, 7-12% extended contract"}
        leadRo={"Un contract de întreținere BMS costă 4-7% din valoarea investiției pe an pentru nivelul de bază și 7-12% pentru nivelul extins. Diferența dintre niveluri nu este numărul de vizite, ci ce se întâmplă când sistemul cedează: cine răspunde, în cât timp, în ce interval orar și ce se face dacă remedierea nu este posibilă imediat. Contractul se scrie pe severități, nu pe promisiuni."}
        leadEn={"A BMS maintenance contract costs 4-7% of the investment value per year at the base level and 7-12% at the extended level. The difference between levels is not the number of visits, but what happens when the system fails: who responds, how fast, in what window, and what is done if an immediate fix is not possible. The contract is written on severities, not on promises."}
      />

      <div className="container-site section-m">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[280px_1fr] lg:items-start">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20">
            <div className="bg-white rounded-[2px] overflow-hidden">
              <div className="p-6 border-b border-[#0D2E2B]/8">
                <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-3">{t("Cost anual", "Annual cost")}</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#1F6B4A]" />
                  <span className="font-light text-[#0D2E2B]">{t("4-7% bază, 7-12% extins", "4-7% base, 7-12% extended")}</span>
                </div>
                <p className="text-xs text-[#888888] font-light mt-2">{t("din valoarea investiției în sistem, pe an", "of the system investment value, per year")}</p>
              </div>
              <div className="p-6 border-b border-[#0D2E2B]/8">
                <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-4">{t("Ce include contractul", "What the contract includes")}</p>
                <ul className="space-y-3">
                  {sidebarPoints.map((item) => (
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
                  {t("Cere o analiză a sistemului existent", "Request an analysis of your existing system")}
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
                  <ClipboardList className="h-4 w-4 text-[#1F6B4A]" />
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce livrează concret un contract de întreținere BMS", "What a BMS maintenance contract concretely delivers")}</h2>
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

            {/* Contract levels */}
            <section>
              <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter mb-3">{t("Cele trei niveluri de contract și ce intră în fiecare", "The three contract levels and what each includes")}</h2>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Timpii de răspuns pe severitate, frecvența verificărilor și intervalul orar exact al fiecărui nivel se stabilesc și se scriu în contract, la contractare.", "Response times per severity, check frequency and the exact hours of each level are set and written into the contract, at signing.")}</p>
              <div className="overflow-x-auto bg-white rounded-[2px]">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-[#0D2E2B]/10">
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Element", "Element")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Bază", "Base")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Extins", "Extended")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Critic", "Critical")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelRows.map((r) => (
                      <tr key={r.elEn} className="border-b border-[#0D2E2B]/8 last:border-0 align-top">
                        <td className="p-4 text-[#0D2E2B] font-light">{t(r.elRo, r.elEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.bRo, r.bEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.eRo, r.eEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.cRo, r.cEn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-[#888888] font-light mt-4">{t("Nivelul potrivit se alege după consecința unei opriri, nu după dimensiunea clădirii. O clădire de birouri de 5.000 mp cu o sală de servere are nevoie de un nivel mai ridicat decât un depozit de 20.000 mp.", "The right level is chosen by the consequence of an outage, not by the size of the building. A 5,000 sqm office building with a server room needs a higher level than a 20,000 sqm warehouse.")}</p>
            </section>

            {/* Severity */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum se stabilește severitatea unei sesizări", "How the severity of a request is set")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Severitatea se determină prin efectul asupra clădirii și asupra activității din ea. Este singura definiție care nu se poate negocia la telefon, în mijlocul unui incident.", "Severity is determined by the effect on the building and the activity inside it. It is the only definition that cannot be negotiated over the phone, in the middle of an incident.")}</p>
              <div className="overflow-x-auto bg-white rounded-[2px]">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-[#0D2E2B]/10">
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Severitate", "Severity")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Definiție", "Definition")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Exemple", "Examples")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {severityRows.map((r) => (
                      <tr key={r.sEn} className="border-b border-[#0D2E2B]/8 last:border-0 align-top">
                        <td className="p-4 text-[#0D2E2B] font-light whitespace-nowrap">{t(r.sRo, r.sEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.dRo, r.dEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.exRo, r.exEn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Response time */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Clock className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum se măsoară timpul de răspuns", "How response time is measured")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Fără definiții, un „SLA de câteva ore\" nu înseamnă nimic. Cei trei indicatori de mai jos se măsoară din momente diferite și trebuie declarați separat în contract, cu valorile convenite la contractare.", "Without definitions, an \"SLA of a few hours\" means nothing. The three indicators below are measured from different moments and must be declared separately in the contract, with the values agreed at signing.")}</p>
              <div className="space-y-4">
                {responseIndicators.map((item) => (
                  <div key={item.en} className="bg-white rounded-[2px] p-5">
                    <p className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(item.ro, item.en)}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-[#888888] font-light mt-6 leading-relaxed">{t("Trei reguli fac diferența dintre un contract care funcționează și unul decorativ. Ceasul pornește la înregistrarea sesizării pe canalul din contract, nu la un apel telefonic către un număr personal. Ceasul se oprește la remedierea confirmată de beneficiar sau la trecerea pe o soluție provizorie agreată, consemnată în registru. Timpul de așteptare a unei piese de schimb se măsoară și se raportează separat, pentru că nu depinde de furnizorul de service.", "Three rules make the difference between a contract that works and a decorative one. The clock starts when the request is logged on the contract channel, not at a phone call to a personal number. The clock stops at a fix confirmed by the client or at an agreed provisional solution, recorded in the log. The waiting time for a spare part is measured and reported separately, because it does not depend on the service provider.")}</p>
              <div className="bg-white rounded-[2px] p-5 mt-4 border-l-2 border-[#1F6B4A]">
                <p className="text-sm text-[#0D2E2B] font-light leading-relaxed">
                  <span className="font-semibold">{t("Ce nu se garantează: ", "What is not guaranteed: ")}</span>
                  {t("un timp de remediere fix, indiferent de cauză. O piesă indisponibilă, un defect al unui echipament de instalații sau o lipsă de acces în clădire nu pot fi acoperite prin contractul de automatizare. Ce se garantează este timpul de răspuns, timpul de prezență și transparența asupra cauzei.", "a fixed fix time, regardless of cause. An unavailable part, a fault in a piece of plant equipment or a lack of building access cannot be covered by the automation contract. What is guaranteed is the response time, the attendance time and transparency about the cause.")}
                </p>
              </div>
            </section>

            {/* After hours */}
            <section>
              <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter mb-3">{t("Ce se întâmplă în afara programului de lucru", "What happens outside working hours")}</h2>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Aceasta este partea pe care majoritatea contractelor din piață o lasă nescrisă și în care apar cele mai multe conflicte.", "This is the part most contracts on the market leave unwritten, and where most conflicts appear.")}</p>
              <div className="space-y-4">
                {afterHours.map((item) => (
                  <div key={item.en} className="bg-white rounded-[2px] p-5">
                    <p className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(item.ro, item.en)}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-[#888888] font-light mt-4 leading-relaxed">{t("Trei elemente se stabilesc în contract, nu în timpul incidentului: canalul unic de sesizare și numărul de permanență, lista persoanelor din partea beneficiarului care pot declara severitatea 1, și tariful pentru intervențiile în afara sferei contractului.", "Three elements are set in the contract, not during the incident: the single request channel and the on-call number, the list of people on the client's side who can declare severity 1, and the rate for interventions outside the contract scope.")}</p>
            </section>

            {/* Onboarding stages */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Target className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum decurge preluarea în întreținere, pe etape", "How maintenance takeover proceeds, stage by stage")}</h2>
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
                        <td className="p-4 text-[#0D2E2B] font-light">{t(s.stageRo, s.stageEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(s.whatRo, s.whatEn)}</td>
                        <td className="p-4 text-[#1F6B4A] font-light">{t(s.durRo, s.durEn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-[#888888] font-light mt-4">{t("Etapa 4 este cea pe care majoritatea contractelor o sar. Un contract de întreținere care începe pe un sistem cu 400 de alarme active și cu jumătate din puncte pe manual consumă primul an doar ca să ajungă la punctul de plecare.", "Stage 4 is the one most contracts skip. A maintenance contract that starts on a system with 400 active alarms and half the points in manual spends its first year just getting back to the starting line.")}</p>
            </section>

            {/* Client requirements */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce cere contractul de întreținere din partea beneficiarului", "What the maintenance contract requires from the client")}</h2>
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

            {/* Success criteria */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum se măsoară că întreținerea a ieșit bine", "How you measure that maintenance turned out well")}</h2>
              </div>
              <ol className="space-y-3">
                {successCriteria.map((item, idx) => (
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce nu include contractul de întreținere", "What the maintenance contract does not include")}</h2>
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
                {t("Când piesele nu mai există, soluția este serviciul de ", "When parts no longer exist, the answer is the ")}
                <Link href="/servicii/modernizare-sisteme-de-automatizare-si-bms" className="text-[#1F6B4A] hover:underline">{t("modernizare sisteme de automatizare și BMS", "automation and BMS modernisation service")}</Link>.
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
                {t("Analiza sistemului existent, înainte de contract", "An analysis of the existing system, before the contract")}
              </h2>
              <p className="text-white/60 font-light mb-7 max-w-xl mx-auto text-sm leading-relaxed">
                {t(
                  "Un contract de întreținere se ofertează corect abia după ce se știe ce se preia: câte puncte, în ce stare, cu ce documentație și cu ce acces. Sovitech Control începe cu o zi de analiză pe clădire și cu o listă de constatări.",
                  "A maintenance contract can only be quoted correctly once you know what is being taken over: how many points, in what state, with what documentation and with what access. Sovitech Control starts with one day of analysis in the building and a list of findings.",
                )}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0D2E2B] text-sm font-bold px-6 py-3 rounded-[2px] hover:bg-[#F5F4F0] transition-colors"
              >
                {t("Cere o analiză a sistemului existent", "Request an analysis of your existing system")}
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
