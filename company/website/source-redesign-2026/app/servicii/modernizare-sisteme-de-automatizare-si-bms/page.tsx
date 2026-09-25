"use client"

// LINKS-TO-REACTIVATE: Modernizarea unui sistem BMS: de la audit la plan de investitii pe etape | interim /resurse/modernizare-retrofit | final /ghid/modernizare-bms
// LINKS-TO-REACTIVATE: Cum se modernizeaza automatizarea unei cladiri fara oprirea activitatii | interim /resurse/modernizare-retrofit | final /resurse/modernizare-bms-fara-oprire-activitate
// LINKS-TO-REACTIVATE: Cum se auditeaza un sistem BMS existent inainte de modernizare | interim /resurse/modernizare-retrofit | final /resurse/audit-sistem-bms-existent
// LINKS-TO-REACTIVATE: Vendor lock-in: sisteme deschise versus proprietare | interim /resurse/bms-scada-integrare | final /resurse/vendor-lock-in-protocoale-deschise
// TODO(confirm): duratele orientative pe etape si termenele curente de livrare
// TODO(confirm): formularea juridica exacta a clauzelor de licenta, cod sursa si parole, de validat cu consilierul juridic inainte de publicare

import Link from "next/link"
import { Clock, CheckCircle2, KeyRound, Target, Users, ShieldCheck, XCircle, ClipboardList, RefreshCw, ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { ServiceHero } from "@/components/service-hero"

export default function ModernizarePage() {
  const { t } = useLanguage()

  const sidebarPoints = [
    { ro: "Audit al sistemului existent, cu lista de puncte reală", en: "Audit of the existing system, with the real points list" },
    { ro: "Plan de migrare pe etape, zonă cu zonă", en: "A staged migration plan, zone by zone" },
    { ro: "Clădirea rămâne în funcțiune pe durata lucrării", en: "The building stays in operation throughout" },
    { ro: "Licențe, programe sursă și parole predate", en: "Licences, source programs and passwords handed over" },
    { ro: "Documentație As-built completă", en: "Complete As-built documentation" },
  ]

  const summaryPoints = [
    { ro: "Costul unei modernizări este de 40-60% din costul unui sistem nou. Economia vine din traseele existente, din tablouri și din elementele de câmp care se pot păstra.", en: "The cost of a modernisation is 40-60% of the cost of a new system. The saving comes from the existing routes, the panels and the field devices that can be kept." },
    { ro: "Amortizarea unei modernizări de capital este de 3-6 ani, conform celor 11 cazuri europene documentate de eu.bac. Pentru măsurile de optimizare și recomisionare, care nu presupun echipamente noi, amortizarea este de 1-3 ani.", en: "The payback of a capital modernisation is 3-6 years, per the 11 European cases documented by eu.bac. For optimisation and recommissioning measures, which involve no new equipment, payback is 1-3 years." },
    { ro: "Economia documentată în studii independente este de 5-15% din consumul total al clădirii pentru optimizare și recomisionare, măsurată pe peste 1.000 de proiecte. Pe consumul HVAC, acolo unde reglajul era deficitar, banda este de 10-20%.", en: "The savings documented in independent studies are 5-15% of the building's total consumption for optimisation and recommissioning, measured across more than 1,000 projects. On HVAC consumption, where control was poor, the band is 10-20%." },
    { ro: "Migrarea se face pe etape, cu cele două sisteme în paralel. Clădirea rămâne în funcțiune.", en: "Migration is done in stages, with the two systems in parallel. The building stays in operation." },
    { ro: "Licențele, programele sursă și parolele de nivel inginer se predau la finalul proiectului. Este condiția pentru ca următoarea modernizare să poată fi făcută de oricine.", en: "Licences, source programs and engineer-level passwords are handed over at the end of the project. It is the condition for the next modernisation to be doable by anyone." },
    { ro: "Prima etapă nu este cumpărarea, ci auditul sistemului existent și lista de puncte reală.", en: "The first stage is not buying, but the audit of the existing system and the real points list." },
  ]

  const signs = [
    { ro: "Piesele de schimb nu se mai găsesc sau au termen de livrare de luni de zile.", en: "Spare parts can no longer be found, or have lead times of months." },
    { ro: "Stația de operare rulează pe un sistem de operare ieșit din suport, iar echipa IT nu o mai acceptă în rețea.", en: "The operator station runs on an operating system out of support, and the IT team no longer accepts it on the network." },
    { ro: "Nu se mai pot adăuga puncte fără înlocuirea controlerului sau fără extinderea licenței la un cost disproporționat.", en: "Points can no longer be added without replacing the controller or extending the licence at a disproportionate cost." },
    { ro: "Programele controlerelor nu sunt accesibile, pentru că nu au fost predate sau pentru că instrumentul de inginerie nu mai există.", en: "The controller programs are not accessible, because they were never handed over or because the engineering tool no longer exists." },
    { ro: "Datele istorice nu pot fi exportate într-un format utilizabil, ceea ce blochează orice raportare.", en: "Historical data cannot be exported in a usable format, which blocks any reporting." },
    { ro: "Costul anual de intervenții se apropie de o fracțiune semnificativă din valoarea sistemului.", en: "The annual cost of interventions approaches a significant fraction of the system's value." },
    { ro: "Sistemul nu poate acoperi o obligație nouă, cum este monitorizarea parametrilor de mediu interior sau contorizarea pe chiriași.", en: "The system cannot cover a new obligation, such as monitoring indoor environment parameters or tenant metering." },
  ]

  const deliverables = [
    { ro: "Auditul sistemului existent, cu lista de puncte reală, starea fiecărui element de câmp, starea programelor și inventarul de licențe.", en: "The audit of the existing system, with the real points list, the state of each field device, the state of the programs and the licence inventory." },
    { ro: "Planul de migrare pe etape, cu ordinea zonelor, ferestrele de lucru și punctele de reversibilitate ale fiecărei etape.", en: "The staged migration plan, with the order of the zones, the work windows and the reversibility points of each stage." },
    { ro: "Controlerele noi și modulele de extensie, dimensionate pe lista de puncte reală, cu rezerva declarată.", en: "The new controllers and extension modules, sized on the real points list, with a declared reserve." },
    { ro: "Reutilizarea elementelor de câmp, acolo unde starea și tipul de semnal permit. Fiecare element păstrat se verifică și se consemnează.", en: "Reuse of field devices, where their condition and signal type allow. Every kept device is checked and recorded." },
    { ro: "Retehnologizarea tabloului, cu păstrarea dulapului și a cablajului de forță, unde starea permite.", en: "Re-engineering of the panel, keeping the cabinet and the power wiring, where condition allows." },
    { ro: "Programele de control refăcute, cu secvențele documentate în text, nu doar implementate.", en: "The control programs rebuilt, with the sequences documented in text, not just implemented." },
    { ro: "Interfața grafică nouă, cu sinoptice, alarme prioritizate, programe orare și rapoarte de consum.", en: "A new graphical interface, with synoptics, prioritised alarms, schedules and consumption reports." },
    { ro: "Migrarea datelor istorice, unde exportul este posibil, sau consemnarea explicită a imposibilității.", en: "Migration of historical data, where export is possible, or the explicit recording of its impossibility." },
    { ro: "Documentația As-built completă și predarea integrală a licențelor, programelor sursă și parolelor.", en: "The complete As-built documentation and the full handover of licences, source programs and passwords." },
  ]

  const licencePoints = [
    { ro: "Licențele de software de supervizare se emit pe numele beneficiarului, nu pe numele integratorului. Certificatul de licență, cheia și dovada de achiziție se predau la recepție. Un beneficiar care nu are licența pe numele lui nu deține sistemul pe care l-a plătit.", en: "Supervision software licences are issued in the client's name, not the integrator's. The licence certificate, the key and the proof of purchase are handed over at acceptance. A client who does not hold the licence in their own name does not own the system they paid for." },
    { ro: "Programele controlerelor se predau în formă sursă, în formatul cu care pot fi deschise și modificate cu instrumentul de inginerie al platformei, nu doar ca executabil încărcat în controler.", en: "Controller programs are handed over in source form, in the format that can be opened and modified with the platform's engineering tool, not just as an executable loaded into the controller." },
    { ro: "Parolele de nivel inginer și de administrare se predau beneficiarului la recepție, împreună cu procedura de schimbare a lor. Sovitech Control nu păstrează acces exclusiv la niciun sistem predat.", en: "Engineer-level and administration passwords are handed to the client at acceptance, together with the procedure for changing them. Sovitech Control keeps no exclusive access to any handed-over system." },
    { ro: "Backup-ul complet de configurație al controlerelor și al stației de supervizare se predă pe suport al beneficiarului, cu procedura de restaurare testată.", en: "The complete configuration backup of the controllers and the supervision station is handed over on the client's own media, with a tested restore procedure." },
    { ro: "Documentația de integrare, inclusiv tabelele de mapare și, pe partea de KNX, fișierul de proiect ETS, se predă în format editabil.", en: "The integration documentation, including the mapping tables and, on the KNX side, the ETS project file, is handed over in editable format." },
    { ro: "Schimbarea furnizorului de service nu afectează licența. Licența aparține beneficiarului și rămâne validă indiferent cine execută întreținerea.", en: "Changing the service provider does not affect the licence. The licence belongs to the client and remains valid regardless of who performs the maintenance." },
    { ro: "Licențele pe număr de puncte se declară explicit în ofertă, cu numărul de puncte licențiate, numărul de puncte utilizate și costul extinderii. O extindere de clădire care depășește licența trebuie să fie o cheltuială previzibilă, nu o surpriză.", en: "Point-count licences are declared explicitly in the offer, with the number of licensed points, the number of points used and the cost of extension. A building extension that exceeds the licence should be a predictable expense, not a surprise." },
    { ro: "Taxa anuală de licență, unde există, se declară de la început. Reperul de piață este de 8-18% din valoarea componentei software pe an.", en: "The annual licence fee, where it exists, is declared from the start. The market reference is 8-18% of the software component's value per year." },
  ]

  const sixQuestions = [
    { ro: "Pe numele cui se emite licența.", en: "In whose name the licence is issued." },
    { ro: "Ce se predă din programele controlerelor, sursă sau executabil.", en: "What is handed over from the controller programs, source or executable." },
    { ro: "Cine deține parola de nivel inginer după recepție.", en: "Who holds the engineer-level password after acceptance." },
    { ro: "Ce se întâmplă cu licența la schimbarea furnizorului de service.", en: "What happens to the licence when the service provider changes." },
    { ro: "Cât costă extinderea licenței cu 100 de puncte.", en: "What it costs to extend the licence by 100 points." },
    { ro: "Ce format are exportul datelor istorice.", en: "What format the historical data export has." },
  ]

  const stages = [
    { stageRo: "1. Audit al sistemului existent", stageEn: "1. Audit of the existing system", whatRo: "Lista de puncte reală, starea elementelor de câmp, starea programelor, inventarul de licențe, accesul de inginerie, capacitatea de export a datelor.", whatEn: "The real points list, the state of the field devices, the state of the programs, the licence inventory, engineering access, the data export capability.", durRo: "1-2 săptămâni", durEn: "1-2 weeks" },
    { stageRo: "2. Plan de migrare și buget", stageEn: "2. Migration plan and budget", whatRo: "Ordinea zonelor, ce se păstrează și ce se înlocuiește, ferestrele de lucru, fazarea investiției pe ani bugetari.", whatEn: "The order of the zones, what is kept and what is replaced, the work windows, phasing of the investment across budget years.", durRo: "1-2 săptămâni", durEn: "1-2 weeks" },
    { stageRo: "3. Comanda echipamentelor", stageEn: "3. Ordering the equipment", whatRo: "Controlere, module, elemente de câmp de înlocuit.", whatEn: "Controllers, modules, field devices to be replaced.", durRo: "4-10 săptămâni", durEn: "4-10 weeks" },
    { stageRo: "4. Supervizarea nouă, în paralel", stageEn: "4. New supervision, in parallel", whatRo: "Se instalează stația nouă și se conectează la sistemul vechi, unde protocolul permite. Operarea continuă neîntrerupt.", whatEn: "The new station is installed and connected to the old system, where the protocol allows. Operation continues uninterrupted.", durRo: "2-3 săptămâni", durEn: "2-3 weeks" },
    { stageRo: "5. Migrare zonă cu zonă", stageEn: "5. Migration zone by zone", whatRo: "Fiecare zonă se trece pe controlerul nou într-o fereastră convenită, cu punct de revenire la sistemul vechi până la validare.", whatEn: "Each zone is switched to the new controller in an agreed window, with a fallback to the old system until validation.", durRo: "2-8 luni, în funcție de numărul de zone", durEn: "2-8 months, depending on the number of zones" },
    { stageRo: "6. Verificare și testare funcțională", stageEn: "6. Verification and functional testing", whatRo: "Verificare punct cu punct pe fiecare zonă migrată, testarea secvențelor și a regimurilor de avarie.", whatEn: "Point-by-point verification of each migrated zone, testing of the sequences and the failure modes.", durRo: "pe fiecare zonă, 2-5 zile", durEn: "per zone, 2-5 days" },
    { stageRo: "7. Scoaterea din funcțiune a sistemului vechi", stageEn: "7. Decommissioning the old system", whatRo: "După validarea ultimei zone. Se păstrează arhiva de configurație a sistemului vechi.", whatEn: "After the last zone is validated. The old system's configuration archive is kept.", durRo: "1 săptămână", durEn: "1 week" },
    { stageRo: "8. Documentație, licențe, instruire", stageEn: "8. Documentation, licences, training", whatRo: "As-built complet, predarea licențelor, a programelor sursă și a parolelor, instruirea echipei.", whatEn: "The complete As-built, handover of licences, source programs and passwords, team training.", durRo: "1-2 săptămâni", durEn: "1-2 weeks" },
  ]

  const clientRequirements = [
    { ro: "Accesul la sistemul existent, inclusiv la stația de operare și, unde există, la instrumentul de inginerie.", en: "Access to the existing system, including the operator station and, where it exists, the engineering tool." },
    { ro: "Documentația existentă, oricât de incompletă: scheme, liste de puncte, manuale, contracte de licență.", en: "The existing documentation, however incomplete: diagrams, points lists, manuals, licence contracts." },
    { ro: "Inventarul de licențe și dovada de achiziție, pentru a stabili ce se poate transfera și ce trebuie cumpărat din nou.", en: "The licence inventory and proof of purchase, to establish what can be transferred and what must be bought again." },
    { ro: "Ferestre de lucru negociate pe zone, inclusiv în afara programului acolo unde zona nu poate fi oprită în timpul activității.", en: "Work windows negotiated by zone, including outside working hours where a zone cannot be stopped during activity." },
    { ro: "Acces în spațiile închiriate, coordonat cu chiriașii, cu preaviz.", en: "Access to leased spaces, coordinated with the tenants, with notice." },
    { ro: "Decizia de buget pe faze, dacă modernizarea se întinde pe mai mulți ani bugetari.", en: "The phased budget decision, if the modernisation spans several budget years." },
    { ro: "Ultimele 12-24 de luni de facturi de energie, dacă se dorește o comparație de consum după modernizare.", en: "The last 12-24 months of energy bills, if a post-modernisation consumption comparison is wanted." },
  ]

  const successCriteria = [
    { ro: "Fiecare zonă migrată este verificată punct cu punct și testată funcțional înainte de trecerea la zona următoare.", en: "Each migrated zone is verified point by point and functionally tested before moving to the next zone." },
    { ro: "Clădirea nu a fost oprită, iar întreruperile pe zone s-au încadrat în ferestrele convenite.", en: "The building was not stopped, and zone interruptions stayed within the agreed windows." },
    { ro: "Datele istorice au fost migrate sau, unde exportul nu a fost posibil, imposibilitatea este consemnată în scris, cu motivul.", en: "Historical data was migrated or, where export was not possible, the impossibility is recorded in writing, with the reason." },
    { ro: "Licențele sunt pe numele beneficiarului, iar certificatele sunt predate.", en: "The licences are in the client's name, and the certificates are handed over." },
    { ro: "Programele sursă, backup-urile și parolele de nivel inginer sunt predate și au fost testate prin restaurare.", en: "The source programs, backups and engineer-level passwords are handed over and have been tested through a restore." },
    { ro: "Documentația As-built corespunde realității, verificată prin sondaj pe 10 puncte alese de beneficiar.", en: "The As-built documentation matches reality, spot-checked on 10 points chosen by the client." },
    { ro: "Consumul se poate compara an la an, ceea ce presupune retenție de minimum 24 de luni la rezoluție completă și normalizare cel puțin la grade-zile și la ore de ocupare. Fără normalizare, o lună caldă poate ascunde complet o economie reală.", en: "Consumption can be compared year on year, which requires at least 24 months of full-resolution retention and normalisation at least to degree days and occupancy hours. Without normalisation, a warm month can completely hide a real saving." },
  ]

  const exclusions = [
    { ro: "Nu include înlocuirea instalațiilor de HVAC. Un chiller la finalul duratei de viață rămâne un chiller la finalul duratei de viață și după modernizarea automatizării.", en: "It does not include replacing the HVAC installations. A chiller at the end of its life is still a chiller at the end of its life after the controls are modernised." },
    { ro: "Nu include recuperarea licențelor pierdute ale sistemului vechi. Dacă licența a fost emisă pe numele fostului integrator și acesta nu o cedează, singura soluție este o licență nouă, cu cost declarat în ofertă.", en: "It does not include recovering the old system's lost licences. If the licence was issued in the former integrator's name and they do not release it, the only solution is a new licence, with the cost declared in the offer." },
    { ro: "Nu include decompilarea programelor sistemului vechi, dacă acestea nu au fost predate. Ce nu există se rescrie, iar efortul se cuantifică în ofertă.", en: "It does not include decompiling the old system's programs, if they were never handed over. What does not exist is rewritten, and the effort is quantified in the offer." },
    { ro: "Nu include migrarea datelor istorice dintr-un sistem care nu permite export. Se consemnează, se propune o soluție de arhivare paralelă și se declară pierderea.", en: "It does not include migrating historical data from a system that allows no export. It is recorded, a parallel archiving solution is proposed and the loss is declared." },
    { ro: "Nu include lucrările de construcții pentru trasee noi, refacerile de tavane și finisajele.", en: "It does not include construction works for new routes, ceiling repairs and finishes." },
    { ro: "Nu include garanția pentru elementele de câmp păstrate din sistemul vechi. Fiecare element păstrat se verifică și se consemnează, dar vechimea lui rămâne a beneficiarului.", en: "It does not include a warranty for field devices kept from the old system. Every kept device is checked and recorded, but its age remains the client's." },
  ]

  const keepReplaceRows = [
    { elRo: "Trasee de cablu și cablu de semnal", elEn: "Cable routes and signal cable", kRo: "da", kEn: "yes", rRo: "numai unde este deteriorat sau insuficient", rEn: "only where damaged or insufficient", wRo: "cea mai mare parte a economiei de 40-60% vine de aici", wEn: "most of the 40-60% saving comes from here" },
    { elRo: "Dulapul de tablou", elEn: "The panel cabinet", kRo: "da", kEn: "yes", rRo: "dacă spațiul sau starea nu permit", rEn: "if space or condition does not allow", wRo: "retehnologizarea internă este mai ieftină decât un dulap nou", wEn: "internal re-engineering is cheaper than a new cabinet" },
    { elRo: "Aparataj de forță din tablou", elEn: "Power apparatus in the panel", kRo: "frecvent", kEn: "frequently", rRo: "dacă este uzat sau subdimensionat", rEn: "if worn or undersized", wRo: "se verifică individual", wEn: "checked individually" },
    { elRo: "Senzori de temperatură pasivi", elEn: "Passive temperature sensors", kRo: "frecvent", kEn: "frequently", rRo: "dacă tipul de semnal nu este compatibil", rEn: "if the signal type is not compatible", wRo: "se verifică prin comparație cu un etalon", wEn: "checked by comparison against a reference" },
    { elRo: "Senzori de CO2", elEn: "CO2 sensors", kRo: "rar", kEn: "rarely", rRo: "de regulă da", rEn: "usually yes", wRo: "se decalibrează în 2-3 ani, iar generațiile vechi au derivă mare", wEn: "they drift out of calibration in 2-3 years, and old generations drift heavily" },
    { elRo: "Servomotoare pe vane și clapete", elEn: "Actuators on valves and dampers", kRo: "uneori", kEn: "sometimes", rRo: "dacă nu răspund la semnal sau sunt gripate", rEn: "if they do not respond to the signal or are seized", wRo: "se testează în cursă completă", wEn: "tested over their full stroke" },
    { elRo: "Controlere", elEn: "Controllers", kRo: "nu", kEn: "no", rRo: "da", rEn: "yes", wRo: "sunt elementul care determină modernizarea", wEn: "they are the element that drives the modernisation" },
    { elRo: "Stația de supervizare și licențele", elEn: "The supervision station and licences", kRo: "nu", kEn: "no", rRo: "da", rEn: "yes", wRo: "motivul frecvent al modernizării este suportul ieșit", wEn: "the frequent reason for modernisation is expired support" },
  ]

  const faqs = [
    { qRo: "Cât costă modernizarea unui sistem BMS?", qEn: "How much does BMS modernisation cost?", aRo: "Modernizarea costă 40-60% din prețul unui sistem nou, pentru că traseele, tablourile și o parte din elementele de câmp se păstrează. Raportat la benzile de piață, pentru o clădire de birouri clasa A cu un sistem nou la 9-18 EUR/mp, modernizarea se încadrează orientativ în 3,6-10,8 EUR/mp. Amortizarea unei modernizări de capital este de 3-6 ani.", aEn: "Modernisation costs 40-60% of the price of a new system, because the routes, the panels and part of the field devices are kept. Against market bands, for a class A office building with a new system at 9-18 EUR/sqm, modernisation falls indicatively within 3.6-10.8 EUR/sqm. The payback of a capital modernisation is 3-6 years." },
    { qRo: "Se poate moderniza fără să opresc clădirea?", qEn: "Can I modernise without stopping the building?", aRo: "Da. Migrarea se face pe zone, cu sistemul vechi și cel nou funcționând în paralel pe perioada tranziției și cu un punct de revenire pentru fiecare zonă până la validare. Condițiile sunt o listă de puncte corectă înainte de start și ferestre de lucru convenite pe fiecare zonă.", aEn: "Yes. Migration is done by zone, with the old and new systems running in parallel during the transition and a fallback point for each zone until validation. The conditions are a correct points list before starting and agreed work windows for each zone." },
    { qRo: "Ce se întâmplă cu licențele la schimbarea integratorului?", qEn: "What happens to the licences when the integrator changes?", aRo: "Depinde de cine este titularul licenței. O licență emisă pe numele beneficiarului rămâne validă și utilizabilă indiferent cine execută service-ul. O licență emisă pe numele integratorului anterior nu se poate transfera fără acordul acestuia, iar dacă acordul lipsește, costul unei licențe noi se declară explicit în oferta de modernizare.", aEn: "It depends on who holds the licence. A licence issued in the client's name remains valid and usable regardless of who performs the service. A licence issued in the previous integrator's name cannot be transferred without their consent, and if consent is missing, the cost of a new licence is declared explicitly in the modernisation offer." },
    { qRo: "Primesc programele sursă ale controlerelor?", qEn: "Do I receive the controllers' source programs?", aRo: "Da. Sovitech Control predă programele controlerelor în forma în care pot fi deschise și modificate cu instrumentul de inginerie al platformei, împreună cu backup-ul de configurație și cu parolele de nivel inginer. Fără această predare, orice modernizare ulterioară începe cu rescrierea sistemului.", aEn: "Yes. Sovitech Control hands over the controller programs in the form in which they can be opened and modified with the platform's engineering tool, together with the configuration backup and the engineer-level passwords. Without this handover, any later modernisation starts with rewriting the system." },
    { qRo: "Cât de mult se economisește după o modernizare?", qEn: "How much is saved after a modernisation?", aRo: "Literatura măsurată pe peste 1.000 de proiecte indică 5-15% din consumul total al clădirii pentru optimizare și recomisionare, iar pe consumul HVAC 10-20% acolo unde reglajul era deficitar. Sunt cifre din studii independente, nu rezultate ale proiectelor Sovitech Control. Economia reală a unei clădiri anume se poate afirma doar cu perioadă de referință de minimum 12 luni, perioadă de comparație de minimum 12 luni și normalizare la grade-zile și la ocupare.", aEn: "The literature, measured across more than 1,000 projects, indicates 5-15% of the building's total consumption for optimisation and recommissioning, and 10-20% on HVAC consumption where control was poor. These are figures from independent studies, not results of Sovitech Control projects. The real saving of a specific building can only be stated with a reference period of at least 12 months, a comparison period of at least 12 months and normalisation to degree days and occupancy." },
  ]

  const related = [
    { href: "/servicii/intretinere-sisteme-bms", titleRo: "Întreținere sisteme BMS", titleEn: "BMS maintenance", descRo: "Contract cu verificări planificate și registru de intervenții", descEn: "Contract with planned checks and an intervention log" },
    { href: "/servicii/executie-sisteme-bms", titleRo: "Execuție sisteme BMS", titleEn: "BMS execution", descRo: "Tablou, cablare, programe, punere în funcțiune", descEn: "Panel, cabling, programs, commissioning" },
    { href: "/servicii/consultanta", titleRo: "Consultanță", titleEn: "Consultancy", descRo: "Evaluarea unui sistem existent, raport scris", descEn: "Assessment of an existing system, a written report" },
  ]

  const resources = [
    { href: "/resurse/modernizare-retrofit", ro: "Materiale despre modernizare și retrofit", en: "Materials on modernisation and retrofit" },
    { href: "/resurse/bms-scada-integrare", ro: "Materiale despre protocoale deschise și vendor lock-in", en: "Materials on open protocols and vendor lock-in" },
    { href: "/calculator-roi", ro: "Calculator ROI pentru automatizarea clădirii", en: "ROI calculator for building automation" },
  ]

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <ServiceHero
        titleRo={"Modernizare BMS: 40-60% din costul unui sistem nou, amortizare 3-6 ani"}
        titleEn={"BMS modernisation: 40-60% of the cost of a new system, 3-6 year payback"}
        leadRo={"Modernizarea unui sistem de automatizare costă 40-60% din prețul unui sistem nou, pentru că instalațiile, traseele de cablu, tablourile și o parte din elementele de câmp rămân pe loc. Amortizarea unei modernizări de capital este de 3-6 ani. Migrarea se face pe etape, zonă cu zonă, cu sistemul vechi și cel nou funcționând în paralel, fără oprirea clădirii."}
        leadEn={"Modernising an automation system costs 40-60% of the price of a new system, because the installations, the cable routes, the panels and part of the field devices stay in place. The payback of a capital modernisation is 3-6 years. Migration is done in stages, zone by zone, with the old and new systems running in parallel, without stopping the building."}
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
                  <span className="font-light text-[#0D2E2B]">{t("3-12 luni, pe etape", "3-12 months, staged")}</span>
                </div>
                <p className="text-xs text-[#888888] font-light mt-2">{t("pentru o clădire de birouri de circa 10.000 mp în funcțiune", "for an occupied office building of around 10,000 sqm")}</p>
              </div>
              <div className="p-6 border-b border-[#0D2E2B]/8">
                <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-4">{t("Livrabile principale", "Main deliverables")}</p>
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
                  <RefreshCw className="h-4 w-4 text-[#1F6B4A]" />
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

            {/* Licences, source code, passwords */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce se întâmplă cu licențele, codul sursă și parolele de inginerie", "What happens to the licences, the source code and the engineering passwords")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6 leading-relaxed">{t("Aceasta este întrebarea care decide contractul și pe care aproape nimeni din piață nu o pune în scris. Un director tehnic experimentat o pune ultima: după recepție, poate chema alt integrator sau este legat de furnizor?", "This is the question that decides the contract, and one almost nobody on the market puts in writing. An experienced technical director asks it last: after acceptance, can they call another integrator, or are they tied to the supplier?")}</p>
              <p className="text-sm font-semibold text-[#0D2E2B] mb-4">{t("Poziția Sovitech Control, scrisă în contract:", "Sovitech Control's position, written into the contract:")}</p>
              <div className="bg-white rounded-[2px] p-6 mb-6">
                <ul className="space-y-4">
                  {licencePoints.map((item) => (
                    <li key={item.en} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-[#1F6B4A] mt-1 shrink-0" />
                      <span className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(item.ro, item.en)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#0D2E2B] rounded-[2px] p-8">
                <p className="text-sm font-semibold text-[#C8E6C9] mb-4">{t("Ce trebuie cerut oricărui integrator, în scris, înainte de semnare", "What to ask any integrator, in writing, before signing")}</p>
                <ol className="space-y-2">
                  {sixQuestions.map((q, idx) => (
                    <li key={q.en} className="flex items-start gap-3">
                      <span className="text-xs font-bold text-[#C8E6C9] mt-0.5">{idx + 1}.</span>
                      <span className="text-sm text-white/80 font-light">{t(q.ro, q.en)}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-sm text-white/60 font-light mt-4">{t("Un furnizor care evită răspunsul scris la aceste șase întrebări a răspuns deja.", "A supplier who avoids a written answer to these six questions has already answered.")}</p>
              </div>
            </section>

            {/* When to modernise */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <ClipboardList className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Când merită modernizat și când merită doar reglat sistemul existent", "When it is worth modernising and when the existing system just needs tuning")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Răspunsul se ia pe șapte semne verificabile, nu pe vechimea sistemului. Un sistem de 12 ani cu piese disponibile și cu acces de inginerie este într-o poziție mai bună decât unul de 7 ani cu licență pierdută.", "The answer rests on seven verifiable signs, not on the system's age. A 12-year-old system with available parts and engineering access is in a better position than a 7-year-old one with a lost licence.")}</p>
              <div className="bg-white rounded-[2px] p-6">
                <ul className="space-y-4">
                  {signs.map((item) => (
                    <li key={item.en} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-[#1F6B4A] mt-1 shrink-0" />
                      <span className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(item.ro, item.en)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-[#888888] font-light mt-4 leading-relaxed">{t("Dacă niciunul dintre semne nu este prezent, măsura corectă este optimizarea, nu modernizarea: programe orare, calibrare, bucle de reglaj, matrice de alarme. Este partea ieftină, cu amortizare de 1-3 ani.", "If none of the signs is present, the right measure is optimisation, not modernisation: schedules, calibration, control loops, the alarm matrix. It is the cheap part, with a 1-3 year payback.")}</p>
            </section>

            {/* Deliverables */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <ClipboardList className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce livrează concret o modernizare de sistem BMS", "What a BMS modernisation concretely delivers")}</h2>
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum decurge modernizarea, pe etape", "How modernisation proceeds, stage by stage")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Duratele sunt orientative, pentru o clădire de birouri de circa 10.000 mp în funcțiune.", "Durations are indicative, for an occupied office building of around 10,000 sqm.")}</p>
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
            </section>

            {/* Client requirements */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce cere modernizarea din partea beneficiarului", "What modernisation requires from the client")}</h2>
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum se măsoară că modernizarea a ieșit bine", "How you measure that modernisation turned out well")}</h2>
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce nu include modernizarea", "What modernisation does not include")}</h2>
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

            {/* Keep vs replace table */}
            <section>
              <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter mb-6">{t("Ce se păstrează și ce se înlocuiește într-o modernizare", "What is kept and what is replaced in a modernisation")}</h2>
              <div className="overflow-x-auto bg-white rounded-[2px]">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-[#0D2E2B]/10">
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Element", "Element")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Se păstrează de regulă", "Usually kept")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Se înlocuiește de regulă", "Usually replaced")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("De ce", "Why")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keepReplaceRows.map((r) => (
                      <tr key={r.elEn} className="border-b border-[#0D2E2B]/8 last:border-0 align-top">
                        <td className="p-4 text-[#0D2E2B] font-light">{t(r.elRo, r.elEn)}</td>
                        <td className="p-4 text-[#888888] font-light">{t(r.kRo, r.kEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.rRo, r.rEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.wRo, r.wEn)}</td>
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
                {t("Audit al sistemului existent, înainte de orice decizie de buget", "An audit of the existing system, before any budget decision")}
              </h2>
              <p className="text-white/60 font-light mb-7 max-w-xl mx-auto text-sm leading-relaxed">
                {t(
                  "O modernizare începe cu lista de puncte reală, cu inventarul de licențe și cu verificarea accesului de inginerie, nu cu o ofertă de echipamente. Rezultatul auditului este un plan pe etape, cu buget pe faze.",
                  "A modernisation starts with the real points list, the licence inventory and a check of engineering access, not with an equipment offer. The result of the audit is a staged plan, with a phased budget.",
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
