// Per-persona intro copy for the /pentru/ role pages.
// Source: final copy doc C5 (copy_03_roluri.md), sections A1-A8.
// introRo = the role page's direct-answer paragraph; painsRo = the "Pe scurt" bullets.
// RO is the source of truth; EN is a faithful translation.

import type { Persona } from "./site-routes"

export type RoleCopy = {
  introRo: string
  introEn: string
  painsRo?: string[]
  painsEn?: string[]
}

export const roleCopy: Partial<Record<Persona, RoleCopy>> = {
  // A2. Proprietari, dezvoltatori si investitori
  P1: {
    introRo:
      "Clădirile nerezidențiale cu sisteme tehnice de peste 290 kW putere nominală utilă trebuiau dotate cu sisteme de automatizare și control până la 31 decembrie 2024, conform Legii 372/2005, art. 27 alin. (5) și art. 29 alin. (6). Termenul a trecut. Pentru un proprietar, întrebarea nu mai este dacă investește, ci cât costă întârzierea și ce se întâmplă la următoarea evaluare a activului.",
    introEn:
      "Non-residential buildings with technical systems above 290 kW of effective rated output had to be fitted with building automation and control systems by 31 December 2024, under Law 372/2005, art. 27 para. (5) and art. 29 para. (6). That deadline has passed. For an owner, the question is no longer whether to invest, but what the delay costs and what happens at the next valuation of the asset.",
    painsRo: [
      "Prag în vigoare astăzi: 290 kW putere nominală utilă a sistemelor tehnice, termen 31 decembrie 2024, lege română în vigoare.",
      "Prag viitor: 70 kW, termen 31 decembrie 2029, din Directiva (UE) 2024/1275. Obligație UE netranspusă încă în dreptul român.",
      "Costul de referință al unui sistem BMS: 4-18 EUR/mp ca bandă agregată, 9-18 EUR/mp pentru birouri clasa A și 5-10 EUR/mp pentru clasa B.",
      "Amortizare: 1-3 ani pentru optimizarea unui sistem existent și 3-6 ani pentru o modernizare de capital.",
      "Economie documentată: 5-15% din consumul total al clădirii, în studii independente pe peste 1.000 de proiecte. Cifra nu este o promisiune pentru o clădire anume.",
      "MEPS aduce renovarea celor mai slabe 16% dintre clădirile nerezidențiale până în 2030 și 26% până în 2033. Obligație UE, netranspusă.",
    ],
    painsEn: [
      "Threshold in force today: 290 kW effective rated output of the technical systems, deadline 31 December 2024, Romanian law in force.",
      "Next threshold: 70 kW, deadline 31 December 2029, from Directive (EU) 2024/1275. An EU obligation not yet transposed into Romanian law.",
      "Reference cost of a BMS: 4-18 EUR/sqm as an aggregate band, 9-18 EUR/sqm for class A offices and 5-10 EUR/sqm for class B.",
      "Payback: 1-3 years for optimising an existing system and 3-6 years for a capital modernisation.",
      "Documented savings: 5-15% of the building's total consumption, in independent studies covering over 1,000 projects. The figure is not a promise for any specific building.",
      "MEPS brings renovation of the worst performing 16% of non-residential buildings by 2030 and 26% by 2033. An EU obligation, not yet transposed.",
    ],
  },

  // A3. Property si asset manager
  P2: {
    introRo:
      "Un property sau asset manager răspunde în fața proprietarului cu cifre, iar în fața chiriașilor cu confort și cu facturi corecte. Sistemul BMS produce datele pentru ambele: consum pe zonă și pe chiriaș, orele de funcționare a instalațiilor, reclamațiile de confort corelate cu măsurători. Fără contorizare secundară, repartiția pe chiriaș rămâne o estimare, oricât de bun ar fi softul de administrare.",
    introEn:
      "A property or asset manager answers to the owner with numbers, and to the tenants with comfort and correct invoices. The BMS produces the data for both: consumption per zone and per tenant, plant running hours, comfort complaints correlated with measurements. Without submetering, tenant cost allocation remains an estimate, however good the administration software.",
    painsRo: [
      "Raportul lunar are nevoie de 10 indicatori, nu de 40. Fiecare cu definiție, formulă, sursă a datei în clădire și valoare de referință.",
      "Comparația an la an este cerința de bază a oricărei raportări. Ea presupune minimum 24 de luni de date la rezoluție completă.",
      "Rezoluția utilă pentru energie electrică este de 15 minute, pentru că este intervalul de decontare din piața de energie.",
      "Costul de operare al sistemului: 4-7% din valoarea investiției pentru contractul de bază, 7-12% pentru cel extins.",
      "Reclamațiile de confort se rezolvă cu măsurare, nu cu ajustări repetate de setpoint. Măsurarea presupune temperatură pe zone, CO2 și ore de ocupare.",
      "Economia documentată în literatura măsurată este de 5-15% din consumul total al clădirii pentru optimizare, cu amortizare de 1-3 ani.",
    ],
    painsEn: [
      "The monthly report needs 10 indicators, not 40. Each with a definition, a formula, the data source in the building and a reference value.",
      "Year-on-year comparison is the baseline requirement of any reporting. It needs at least 24 months of data at full resolution.",
      "The useful resolution for electricity is 15 minutes, because that is the settlement interval of the energy market.",
      "Operating cost of the system: 4-7% of the investment value for the basic contract, 7-12% for the extended one.",
      "Comfort complaints are solved by measuring, not by repeated setpoint adjustments. Measuring means zone temperatures, CO2 and occupancy hours.",
      "Savings documented in the measured literature are 5-15% of the building's total consumption for optimisation, with 1-3 year payback.",
    ],
  },

  // A1. Facility manager
  P3: {
    introRo:
      "Un facility manager operează clădirea cu sistemul pe care îl are deja, nu cu unul ideal. Primele economii nu vin din echipamente noi: vin din programe orare corectate, senzori recalibrați, bucle de reglaj reparate și o listă de alarme pe care cineva chiar o citește. În clădirile unde reglajul era deficitar, literatura măsurată indică 10-20% din consumul HVAC.",
    introEn:
      "A facility manager runs the building with the system it already has, not with an ideal one. The first savings do not come from new equipment: they come from corrected time schedules, recalibrated sensors, repaired control loops and an alarm list somebody actually reads. In buildings where control was poor, the measured literature indicates 10-20% of HVAC consumption.",
    painsRo: [
      "Problema zilnică nu este economia de energie, ci numărul de alarme. O matrice de alarme neprioritizată produce sute de evenimente pe zi și garantează că cele importante sunt ignorate.",
      "Programele orare sunt prima cauză de risipă într-o clădire cu BMS funcțional: ventilație pornită în weekend, pornire prea devreme, regim redus dezactivat manual și niciodată repus.",
      "Senzorii de CO2 se decalibrează în 2-3 ani și aproape nimeni nu îi verifică. Un senzor decalibrat produce fie disconfort, fie ventilație inutilă plătită la factură.",
      "Economia documentată în studii independente este de 5-15% din consumul total al clădirii pentru optimizare și recomisionare, cu amortizare de 1-3 ani.",
      "Mentenanța anuală costă 4-7% din valoarea investiției pentru un contract de bază și 7-12% pentru unul extins.",
      "Documentația As-built, lista de puncte și backup-ul de configurație sunt livrabile, nu favoruri. Fără ele, orice intervenție ulterioară începe cu o zi de reverse engineering.",
    ],
    painsEn: [
      "The daily problem is not energy savings but the number of alarms. An unprioritised alarm matrix produces hundreds of events a day and guarantees the important ones are ignored.",
      "Time schedules are the first cause of waste in a building with a working BMS: ventilation running at weekends, start-up too early, night setback disabled manually and never restored.",
      "CO2 sensors drift out of calibration in 2-3 years and almost nobody checks them. A drifted sensor produces either discomfort or useless ventilation paid on the bill.",
      "Savings documented in independent studies are 5-15% of the building's total consumption for optimisation and recommissioning, with 1-3 year payback.",
      "Annual maintenance costs 4-7% of the investment value for a basic contract and 7-12% for an extended one.",
      "As-built documentation, the point list and the configuration backup are deliverables, not favours. Without them, any later intervention starts with a day of reverse engineering.",
    ],
  },

  // A4. Director tehnic si inginer-sef
  P4: {
    introRo:
      "Un director tehnic decide arhitectura înainte de a decide furnizorul. Trei alegeri contează mai mult decât marca: unde stă inteligența de reglaj, ce protocoale traversează granițele dintre sisteme și cine deține, după recepție, programele și parolele de nivel inginer. Lista de puncte este primul lucru care lipsește din caietele de sarcini și ultimul care se cere la recepție.",
    introEn:
      "A technical director decides the architecture before deciding the vendor. Three choices matter more than the brand: where the control intelligence sits, which protocols cross the boundaries between systems, and who owns the programs and engineer-level passwords after handover. The point list is the first thing missing from specifications and the last thing asked for at handover.",
    painsRo: [
      "Diferența de preț între două oferte BMS vine, de cele mai multe ori, din numărul de puncte, nu din marcă. O ofertă cu 30% mai ieftină are de obicei cu 30% mai puține puncte.",
      "Densitatea de referință pentru birouri clasa A este de 50-90 de puncte la 1.000 mp. O clădire de 15.000 mp înseamnă 750-1.350 de puncte.",
      "Costul pe punct de date este de 90-320 EUR, în funcție de volum și de tipul punctului.",
      "Protocoalele deschise se cer în caietul de sarcini, altfel integrarea ulterioară costă mai mult decât sistemul.",
      "Punerea în funcțiune nu este conectare. Un punct conectat și afișat corect nu înseamnă o buclă de reglaj testată funcțional.",
      "Retenția minimă a datelor este de 24 de luni la rezoluție completă, pentru comparație an la an.",
    ],
    painsEn: [
      "The price difference between two BMS offers comes, most of the time, from the number of points, not the brand. An offer 30% cheaper usually has 30% fewer points.",
      "The reference density for class A offices is 50-90 points per 1,000 sqm. A 15,000 sqm building means 750-1,350 points.",
      "The cost per data point is 90-320 EUR, depending on volume and point type.",
      "Open protocols must be required in the specification, otherwise later integration costs more than the system.",
      "Commissioning is not wiring. A point connected and displayed correctly does not mean a functionally tested control loop.",
      "Minimum data retention is 24 months at full resolution, for year-on-year comparison.",
    ],
  },

  // A5. Manager ESG si sustenabilitate
  P5: {
    introRo:
      "Un raport de sustenabilitate se sprijină pe date care se nasc în clădire: contoare, senzori, controlere, sistem de supervizare, istoricizare. Lanțul are un singur punct slab care descalifică tot restul, iar acela este de obicei retenția prea scurtă sau rezoluția prea grosieră. Comparația an la an presupune minimum 24 de luni de date la rezoluție completă.",
    introEn:
      "A sustainability report rests on data born inside the building: meters, sensors, controllers, supervision system, historisation. The chain has a single weak link that disqualifies everything else, and that link is usually retention that is too short or resolution that is too coarse. Year-on-year comparison needs at least 24 months of data at full resolution.",
    painsRo: [
      "Lanțul de date are cinci verigi: senzor și contor, controler, sistem BMS, istoricizare, raport. O verigă lipsă face raportul necontrolabil.",
      "Rezoluția pentru energie electrică este de 15 minute, intervalul de decontare din piața de energie. Pentru mediul interior, 5-15 minute.",
      "Retenție minimă: 24 de luni la rezoluție completă, inclusiv pentru punctele de mediu interior. Arhiva agregată, 5-10 ani.",
      "Monitorizarea calității mediului interior devine cerință UE de la 29 mai 2026, prin art. 13 alin. (10) lit. d) din Directiva 2024/1275. Obligație netranspusă în dreptul român.",
      "CSRD se aplică, după Directiva (UE) 2026/470, entităților cu peste 1.000 de angajați și peste 450 mil. EUR cifră de afaceri, cu transpunere până la 19 martie 2027.",
      "Economia raportabilă are nevoie de metodologie declarată: 12 luni de referință, 12 luni de comparație, normalizare la grade-zile și la ore de ocupare, domeniu declarat.",
    ],
    painsEn: [
      "The data chain has five links: sensor and meter, controller, BMS, historisation, report. A missing link makes the report unverifiable.",
      "Resolution for electricity is 15 minutes, the settlement interval of the energy market. For indoor environment, 5-15 minutes.",
      "Minimum retention: 24 months at full resolution, including indoor environment points. Aggregated archive, 5-10 years.",
      "Indoor environmental quality monitoring becomes an EU requirement from 29 May 2026, under art. 13 para. (10) letter d) of Directive 2024/1275. Not yet transposed into Romanian law.",
      "After Directive (EU) 2026/470, CSRD applies to entities with over 1,000 employees and over 450 million EUR turnover, with transposition due by 19 March 2027.",
      "A reportable saving needs a declared methodology: 12 baseline months, 12 comparison months, normalisation to degree days and occupancy hours, and a declared domain.",
    ],
  },

  // A6. Manager industrial si pharma
  P6: {
    introRo:
      "Într-o unitate de producție farmaceutică sau industrială, sistemul de automatizare răspunde întâi de continuitate și de trasabilitate, apoi de energie. Diferența dintre un sistem de monitorizare validat și un set de dataloggere nu stă în senzori, ci în alarmare, în pista de audit, în controlul accesului și în documentația de calificare. Sovitech Control a livrat astfel de sisteme pentru Rompharm Co, Hyperion Pharma, Actavis și Monrol Eczacıbașı.",
    introEn:
      "In a pharmaceutical or industrial production unit, the automation system answers first for continuity and traceability, then for energy. The difference between a validated monitoring system and a set of dataloggers is not in the sensors but in alarming, the audit trail, access control and the qualification documentation. Sovitech Control has delivered such systems for Rompharm Co, Hyperion Pharma, Actavis and Monrol Eczacibasi.",
    painsRo: [
      "Un sistem EMS validat diferă de dataloggere prin patru elemente: alarmare în timp real, pistă de audit, control al accesului pe roluri, documentație de calificare.",
      "Costul unui sistem pentru zone farmaceutice este de 30-80 EUR/mp, pentru că include zone clasificate și monitorizare validată.",
      "Retenția datelor este dictată de conformare, nu de spațiul de stocare. Minimum 24 de luni la rezoluție completă și arhivă agregată pe 5-10 ani.",
      "Annex 1 din GMP cere monitorizare continuă pentru zonele clasificate, cu praguri de alertă și de acțiune definite.",
      "NIS2, prin OUG 155/2024, se aplică și sistemelor OT. Amenzile ajung la 10 mil. EUR sau 2% din cifra de afaceri mondială pentru entitățile esențiale.",
      "Referințe reale în sector: Rompharm Co, Rompharm Uzbekistan, Hyperion Pharma, Actavis, Monrol Eczacıbașı, NTN-SNR Fabrica de Rulmenți Sibiu, Moncler Bacău, BMTI Strabag.",
    ],
    painsEn: [
      "A validated EMS differs from dataloggers through four elements: real-time alarming, an audit trail, role-based access control and qualification documentation.",
      "The cost of a system for pharmaceutical areas is 30-80 EUR/sqm, because it includes classified areas and validated monitoring.",
      "Data retention is dictated by compliance, not by storage space. At least 24 months at full resolution and a 5-10 year aggregated archive.",
      "GMP Annex 1 requires continuous monitoring of classified areas, with defined alert and action limits.",
      "NIS2, through GEO 155/2024, also applies to OT systems. Fines reach 10 million EUR or 2% of worldwide turnover for essential entities.",
      "Real references in the sector: Rompharm Co, Rompharm Uzbekistan, Hyperion Pharma, Actavis, Monrol Eczacibasi, NTN-SNR bearing plant Sibiu, Moncler Bacau, BMTI Strabag.",
    ],
  },

  // A7. IT si OT manager
  P7: {
    introRo:
      "Sistemele de automatizare a clădirii sunt echipamente de rețea cu ciclu de viață de 15 ani, actualizate rar și proiectate pentru disponibilitate, nu pentru securitate. Integrarea lor cu infrastructura IT cere segmentare, acces la distanță controlat și jurnalizare. OUG 155/2024, care transpune NIS2, aduce amenzi de până la 10 mil. EUR sau 2% din cifra de afaceri mondială pentru entitățile esențiale.",
    introEn:
      "Building automation systems are network equipment with a 15-year lifecycle, rarely updated and designed for availability, not security. Integrating them with the IT infrastructure requires segmentation, controlled remote access and logging. GEO 155/2024, which transposes NIS2, brings fines of up to 10 million EUR or 2% of worldwide turnover for essential entities.",
    painsRo: [
      "Sistemele OT au alt ciclu de viață decât cele IT. Un controler rămâne în funcțiune 10-15 ani, iar o actualizare de firmware presupune oprirea instalației pe care o comandă.",
      "Segmentarea este prima măsură cu efect real. Rețeaua de automatizare se separă de rețeaua de birou, cu reguli explicite pe traficul care traversează.",
      "Accesul la distanță al integratorului se acordă controlat, pe sesiune, cu jurnalizare, nu prin conexiuni permanente.",
      "NIS2, prin OUG 155/2024, se aplică entităților esențiale și importante. Amenzi de 10 mil. EUR sau 2% pentru cele esențiale, 7 mil. EUR sau 1,4% pentru cele importante.",
      "IEC 62443 oferă cadrul tehnic pentru zone și conduite, aplicabil și clădirilor, nu doar industriei de proces.",
      "Retenția jurnalelor și a datelor de proces se stabilește pe cerința de conformare, cu minimum 24 de luni pentru punctele care alimentează raportarea.",
    ],
    painsEn: [
      "OT systems have a different lifecycle than IT systems. A controller stays in service 10-15 years, and a firmware update means stopping the plant it commands.",
      "Segmentation is the first measure with real effect. The automation network is separated from the office network, with explicit rules for the traffic that crosses.",
      "The integrator's remote access is granted in a controlled way, per session, with logging, not through permanent connections.",
      "NIS2, through GEO 155/2024, applies to essential and important entities. Fines of 10 million EUR or 2% for essential ones, 7 million EUR or 1.4% for important ones.",
      "IEC 62443 provides the technical framework of zones and conduits, applicable to buildings too, not just the process industry.",
      "Retention of logs and process data is set by the applicable compliance requirement, with at least 24 months for the points feeding reporting.",
    ],
  },

  // A8. Proiectant MEP si antreprenor general
  P8: {
    introRo:
      "Un proiectant MEP scrie documentul care decide licitația, iar un antreprenor general răspunde de ce se predă la recepție. Amândoi au aceeași problemă: partea de automatizare este specificată de obicei prea vag pentru a putea fi comparate ofertele și prea târziu pentru a mai putea fi coordonată cu celelalte specialități. Lista de puncte rezolvă ambele.",
    introEn:
      "An MEP designer writes the document that decides the tender, and a general contractor answers for what gets handed over at acceptance. Both share the same problem: the automation part is usually specified too vaguely for offers to be comparable and too late to still be coordinated with the other trades. The point list solves both.",
    painsRo: [
      "Lista de puncte este primul lucru care lipsește din caietele de sarcini și ultimul care se cere la recepție.",
      "Densitatea de referință pentru birouri clasa A este de 50-90 de puncte la 1.000 mp, folosită pentru estimare, nu pentru ofertare.",
      "Costul pe punct de date este de 90-320 EUR, iar diferența dintre două oferte vine de obicei din numărul de puncte incluse.",
      "Protocoalele se specifică explicit, împreună cu punctele pe care fiecare echipament trebuie să le expună.",
      "Documentația de predat la recepție se enumeră în caietul de sarcini, altfel se negociază la final, în cel mai prost moment.",
      "Sovitech Control livrează As-built ca parte a execuției, nu ca serviciu separat: scheme funcționale, scheme de tablou, liste de puncte, manuale de operare.",
    ],
    painsEn: [
      "The point list is the first thing missing from specifications and the last thing asked for at handover.",
      "The reference density for class A offices is 50-90 points per 1,000 sqm, used for estimating, not for bidding.",
      "The cost per data point is 90-320 EUR, and the difference between two offers usually comes from the number of points included.",
      "Protocols are specified explicitly, together with the points each piece of equipment must expose.",
      "The documentation to be handed over is listed in the specification, otherwise it gets negotiated at the end, at the worst possible moment.",
      "Sovitech Control delivers As-built documentation as part of execution, not as a separate service: functional diagrams, panel diagrams, point lists, operating manuals.",
    ],
  },
}
