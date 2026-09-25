"use client"

// LINKS-TO-REACTIVATE: Model de caiet de sarcini BMS, document editabil | interim /contact | final /instrumente/model-caiet-de-sarcini-bms
// TODO(confirm): duratele orientative pe etape si modul de tarifare, pe zile de lucru sau pe pachet
// TODO(confirm): tariful pe zi de consultanta si pachetele standard; pagina nu publica tarife pana la confirmare

import Link from "next/link"
import { Clock, CheckCircle2, Scale, Target, Users, ShieldCheck, XCircle, FileSearch, HelpCircle, ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { ServiceHero } from "@/components/service-hero"

export default function ConsultantaPage() {
  const { t } = useLanguage()

  const sidebarPoints = [
    { ro: "Raport scris, cu sferă stabilită înainte", en: "A written report, with the scope set beforehand" },
    { ro: "Comparare de oferte, pe aceeași sferă", en: "Bid comparison, aligned to the same scope" },
    { ro: "Verificarea obligației legale de automatizare", en: "Verification of the legal automation obligation" },
    { ro: "Revizuire de arhitectură și caiet de sarcini", en: "Architecture review and technical specification" },
    { ro: "Fără vânzare de echipamente în cadrul lucrării", en: "No equipment sold as part of the engagement" },
  ]

  const summaryPoints = [
    { ro: "Consultanța se poate contracta fără nicio lucrare ulterioară. Este o poziție incomodă pentru un integrator și exact motivul pentru care este utilă unui cumpărător.", en: "Consultancy can be contracted with no subsequent works. It is an uncomfortable position for an integrator, and exactly why it is useful to a buyer." },
    { ro: "Cea mai frecventă cerere este compararea a două oferte care arată identic pe prima pagină și diferă cu 40% la preț.", en: "The most frequent request is comparing two offers that look identical on the first page and differ by 40% in price." },
    { ro: "A doua cerere ca frecvență este verificarea obligației BACS: pragul de 290 kW din Legea 372/2005, cu termen 31.12.2024, deja depășit, și pragul de 70 kW din Directiva 2024/1275, cu termen 31.12.2029, încă netranspus în dreptul român.", en: "The second most frequent request is verifying the BACS obligation: the 290 kW threshold in Law 372/2005, with a 31.12.2024 deadline, already passed, and the 70 kW threshold in Directive 2024/1275, with a 31.12.2029 deadline, not yet transposed into Romanian law." },
    { ro: "Reperele de cost pentru validarea unei oferte: 4-18 EUR/mp ca bandă agregată, 90-320 EUR pe punct de date, 50-90 de puncte la 1.000 mp la birouri clasa A.", en: "The cost references for validating an offer: 4-18 EUR/sqm as an aggregate band, 90-320 EUR per data point, 50-90 points per 1,000 sqm for class A offices." },
    { ro: "Raportul este scris și verificabil. Nu conține procente de economie fără domeniu declarat și nu conține recomandări de marcă fără justificare tehnică.", en: "The report is written and verifiable. It contains no savings percentages without a declared domain and no brand recommendations without technical justification." },
    { ro: "Consultanța se facturează pe zile de lucru sau pe pachet, nu se recuperează dintr-o lucrare ulterioară.", en: "Consultancy is billed per working day or per package; it is not recouped from a later job." },
  ]

  const deliverables = [
    { ro: "Analiza comparativă a ofertelor primite, cu tabel de aliniere pe aceeași sferă, cu diferențele identificate și cu întrebările de pus fiecărui ofertant la clarificări.", en: "A comparative analysis of the offers received, with an alignment table on the same scope, the differences identified and the questions to put to each bidder at clarifications." },
    { ro: "Verificarea obligației legale, cu pragul aplicabil, cu articolul de lege și cu distincția între dreptul român în vigoare și obligația UE netranspusă.", en: "Verification of the legal obligation, with the applicable threshold, the article of law and the distinction between Romanian law in force and the untransposed EU obligation." },
    { ro: "Revizuirea arhitecturii propuse: protocoale, împărțirea pe controlere, rezerva de puncte, poziția supervizării, accesul la distanță, riscul de dependență de un singur furnizor.", en: "A review of the proposed architecture: protocols, controller split, points reserve, supervision placement, remote access, the risk of dependence on a single supplier." },
    { ro: "Evaluarea unui sistem existent, cu constatări separate în măsuri de configurare, care nu cer investiție, și măsuri care cer intervenție fizică.", en: "An assessment of an existing system, with findings split into configuration measures, which need no investment, and measures requiring physical intervention." },
    { ro: "Estimarea de cost pe benzi de piață, cu domeniul declarat pentru fiecare cifră.", en: "A cost estimate on market bands, with the domain declared for every figure." },
    { ro: "Caietul de sarcini sau revizuirea celui existent, unde beneficiarul urmează să lanseze o procedură de ofertare.", en: "The technical specification, or a review of the existing one, where the client is about to launch a bidding procedure." },
    { ro: "Grila de evaluare a ofertanților, cu criterii ponderate, pentru o procedură de selecție.", en: "A bidder evaluation grid, with weighted criteria, for a selection procedure." },
  ]

  const fivePlaces = [
    { titleRo: "1. Numărul de puncte fizice.", titleEn: "1. The number of physical points.", bodyRo: "O ofertă cu 800 de puncte și una cu 1.200 de puncte pentru aceeași clădire nu diferă la preț, ci la sferă. Reperul de verificare este densitatea: 50-90 de puncte la 1.000 mp la birouri clasa A, deci 750-1.350 de puncte pentru 15.000 mp. O ofertă mult sub bandă a scos puncte, iar punctele scoase reapar ca lucrări suplimentare.", bodyEn: "An offer with 800 points and one with 1,200 points for the same building do not differ in price, but in scope. The reference check is density: 50-90 points per 1,000 sqm for class A offices, so 750-1,350 points for 15,000 sqm. An offer far below the band has removed points, and removed points reappear as additional works." },
    { titleRo: "2. Ce înseamnă „integrare\" în oferta respectivă.", titleEn: "2. What \"integration\" means in that offer.", bodyRo: "Se cere lista echipamentelor integrate, numărul de puncte preluate de la fiecare și dacă modulele de comunicație sunt incluse. „Integrare cu chillerul\" poate însemna 40 de puncte pe Modbus sau două contacte de stare.", bodyEn: "Ask for the list of integrated equipment, the number of points taken from each and whether the communication modules are included. \"Integration with the chiller\" can mean 40 points over Modbus or two status contacts." },
    { titleRo: "3. Cine execută punerea în funcțiune și după ce protocol.", titleEn: "3. Who performs the commissioning and to what protocol.", bodyRo: "Se cere protocolul de testare funcțională, în scris, înainte de semnare. Diferența dintre „conectat\" și „pus în funcțiune\" este de obicei diferența de preț.", bodyEn: "Ask for the functional test protocol, in writing, before signing. The difference between \"connected\" and \"commissioned\" is usually the price difference." },
    { titleRo: "4. Ce se predă la recepție.", titleEn: "4. What is handed over at acceptance.", bodyRo: "Licențe pe numele cui, programe sursă sau doar executabil, parole de nivel inginer, backup, As-built, export de date istorice. Cele șase întrebări sunt detaliate pe pagina de modernizare.", bodyEn: "Licences in whose name, source programs or just executables, engineer-level passwords, backup, As-built, historical data export. The six questions are detailed on the modernisation page." },
    { titleRo: "5. Costul pe zece ani, nu pe factură.", titleEn: "5. The ten-year cost, not the invoice.", bodyRo: "Se adună la prețul de achiziție: contractul anual de întreținere, 4-7% din valoarea investiției pentru nivelul de bază și 7-12% pentru cel extins, taxa anuală de licență, 8-18% din valoarea componentei software, și costul previzibil al extinderii licenței. O ofertă cu 30% mai ieftină la achiziție poate fi mai scumpă pe zece ani.", bodyEn: "Add to the purchase price: the annual maintenance contract, 4-7% of the investment value at the base level and 7-12% at the extended level, the annual licence fee, 8-18% of the software component's value, and the predictable cost of extending the licence. An offer 30% cheaper at purchase can be more expensive over ten years." },
  ]

  const twelveQuestions = [
    { ro: "Câte puncte fizice conține oferta, pe tipuri de semnal, și care este rezerva declarată pe fiecare controler?", en: "How many physical points does the offer contain, by signal type, and what is the declared reserve on each controller?" },
    { ro: "Ce echipamente se integrează, prin ce protocol, cu câte puncte de la fiecare, și sunt modulele de comunicație incluse în preț?", en: "What equipment is integrated, over what protocol, with how many points from each, and are the communication modules included in the price?" },
    { ro: "Pe numele cui se emite licența software de supervizare?", en: "In whose name is the supervision software licence issued?" },
    { ro: "Se predau programele controlerelor în formă sursă sau doar încărcate în controler?", en: "Are the controller programs handed over in source form, or only loaded into the controller?" },
    { ro: "Cine deține parola de nivel inginer după recepție?", en: "Who holds the engineer-level password after acceptance?" },
    { ro: "Care este costul extinderii licenței cu 100 de puncte suplimentare?", en: "What is the cost of extending the licence by 100 additional points?" },
    { ro: "Există taxă anuală de licență și cât reprezintă?", en: "Is there an annual licence fee, and how much is it?" },
    { ro: "Care este protocolul de testare funcțională la punerea în funcțiune și cine îl semnează?", en: "What is the functional test protocol at commissioning, and who signs it?" },
    { ro: "Ce documente se predau la recepție, ca listă completă?", en: "What documents are handed over at acceptance, as a complete list?" },
    { ro: "Care este durata garanției și ce anume o suspendă?", en: "What is the warranty term, and what suspends it?" },
    { ro: "Care sunt timpii de răspuns pe fiecare severitate în contractul de întreținere și cum se măsoară?", en: "What are the response times per severity in the maintenance contract, and how are they measured?" },
    { ro: "Ce format are exportul datelor istorice și pe ce perioadă se păstrează la rezoluție completă?", en: "What format does the historical data export have, and for what period is it kept at full resolution?" },
  ]

  const stages = [
    { stageRo: "1. Stabilirea sferei", stageEn: "1. Setting the scope", whatRo: "Discuție de 30-60 de minute. Se stabilește întrebarea la care răspunde raportul și ce documente sunt disponibile.", whatEn: "A 30-60 minute discussion. The question the report answers, and what documents are available, are established.", durRo: "1 zi", durEn: "1 day" },
    { stageRo: "2. Preluarea documentelor", stageEn: "2. Receiving the documents", whatRo: "Oferte, proiecte, liste de puncte, facturi de energie, documentația sistemului existent.", whatEn: "Offers, designs, points lists, energy bills, the existing system's documentation.", durRo: "1-3 zile, depinde de beneficiar", durEn: "1-3 days, depending on the client" },
    { stageRo: "3. Vizita pe clădire, unde este cazul", stageEn: "3. The building visit, where applicable", whatRo: "Verificarea sistemului existent, a instalațiilor și a tablourilor.", whatEn: "Checking the existing system, the installations and the panels.", durRo: "1 zi", durEn: "1 day" },
    { stageRo: "4. Analiza și redactarea", stageEn: "4. Analysis and writing", whatRo: "Compararea, verificarea față de repere de piață și de praguri legale, redactarea raportului.", whatEn: "The comparison, checking against market references and legal thresholds, writing the report.", durRo: "3-7 zile lucrătoare", durEn: "3-7 working days" },
    { stageRo: "5. Prezentarea raportului", stageEn: "5. Presenting the report", whatRo: "Discuție de o oră, cu întrebări și cu ajustarea recomandărilor.", whatEn: "A one-hour discussion, with questions and adjustment of the recommendations.", durRo: "1 zi", durEn: "1 day" },
  ]

  const clientRequirements = [
    { ro: "Ofertele primite, complete, inclusiv anexele tehnice. O ofertă comparată pe rezumat nu se poate compara.", en: "The offers received, complete, including the technical annexes. An offer compared on its summary cannot be compared." },
    { ro: "Proiectul de instalații și proiectul de automatizare, dacă există.", en: "The services design and the controls design, if they exist." },
    { ro: "Lista de puncte, în orice formă existentă.", en: "The points list, in whatever form it exists." },
    { ro: "Datele clădirii: suprafață, regim de ocupare, tipul instalațiilor, puterea nominală utilă a sistemelor de încălzire și de climatizare, necesară pentru verificarea pragului legal.", en: "The building data: area, occupancy pattern, installation types, the effective rated output of the heating and air conditioning systems, needed to check the legal threshold." },
    { ro: "Ultimele 12-24 de luni de facturi de energie, dacă sfera include o estimare de economie.", en: "The last 12-24 months of energy bills, if the scope includes a savings estimate." },
    { ro: "Confidențialitate reciprocă, sub acord scris, pentru că analiza atinge oferte comerciale ale unor terți.", en: "Mutual confidentiality, under a written agreement, because the analysis touches third parties' commercial offers." },
  ]

  const successCriteria = [
    { ro: "Raportul răspunde la întrebarea din sferă, în prima pagină, nu în concluzii.", en: "The report answers the scoped question on the first page, not in the conclusions." },
    { ro: "Fiecare afirmație de cost are banda declarată și tipul de clădire la care se aplică.", en: "Every cost statement has its band declared and the building type it applies to." },
    { ro: "Fiecare afirmație de economie are domeniul declarat în aceeași propoziție: din consumul total al clădirii sau din consumul HVAC.", en: "Every savings statement has its domain declared in the same sentence: of the building's total consumption, or of HVAC consumption." },
    { ro: "Fiecare afirmație legală are articolul de lege și statutul lui, în vigoare în dreptul român sau obligație UE netranspusă.", en: "Every legal statement has its article of law and its status: in force in Romanian law, or an untransposed EU obligation." },
    { ro: "Recomandările sunt acționabile de beneficiar fără Sovitech Control. Un raport care se poate pune în practică doar de autorul lui este un instrument de vânzare, nu o consultanță.", en: "The recommendations are actionable by the client without Sovitech Control. A report that only its author can put into practice is a sales tool, not consultancy." },
    { ro: "Beneficiarul poate folosi raportul în discuția cu ceilalți ofertanți, fără restricții.", en: "The client can use the report in discussions with the other bidders, without restrictions." },
  ]

  const exclusions = [
    { ro: "Nu include proiectarea. Un raport de arhitectură nu ține loc de proiect tehnic și nu se poate executa direct.", en: "It does not include design. An architecture report does not stand in for a technical design and cannot be executed directly." },
    { ro: "Nu include verificarea tehnică a proiectului de către verificator atestat.", en: "It does not include technical verification of the design by a certified verifier." },
    { ro: "Nu include auditul energetic autorizat în sensul Legii 121/2014, care se execută de un auditor atestat.", en: "It does not include an authorised energy audit within the meaning of Law 121/2014, which is carried out by a certified auditor." },
    { ro: "Nu include expertize tehnice judiciare și nu se folosește ca probă într-un litigiu, decât cu acord scris prealabil.", en: "It does not include judicial technical expertise and is not used as evidence in litigation, except with prior written consent." },
    { ro: "Nu include evaluarea comercială a ofertanților: bonitate, situație financiară, capacitate de execuție. Analiza este tehnică și de conținut al ofertei.", en: "It does not include commercial evaluation of the bidders: creditworthiness, financial standing, execution capacity. The analysis is technical, on the offer's content." },
    { ro: "Nu include recomandarea unui ofertant anume. Raportul aliniază ofertele la aceeași sferă și arată diferențele. Decizia rămâne a beneficiarului.", en: "It does not include recommending a specific bidder. The report aligns the offers to the same scope and shows the differences. The decision stays with the client." },
  ]

  const workTypes = [
    { tRo: "Comparare de oferte", tEn: "Bid comparison", qRo: "Care ofertă acoperă ce și de unde vine diferența de preț?", qEn: "Which offer covers what, and where does the price difference come from?", dRo: "Tabel de aliniere, listă de întrebări la clarificări, semnale de alarmă", dEn: "An alignment table, a list of clarification questions, warning signs", durRo: "3-5 zile", durEn: "3-5 days" },
    { tRo: "Verificarea obligației legale", tEn: "Legal obligation check", qRo: "Intră clădirea sub obligația de automatizare și de la ce termen?", qEn: "Does the building fall under the automation obligation, and from what deadline?", dRo: "Notă de conformare, cu prag, articol de lege și statut", dEn: "A compliance note, with threshold, article of law and status", durRo: "1-3 zile", durEn: "1-3 days" },
    { tRo: "Revizuire de arhitectură", tEn: "Architecture review", qRo: "Este arhitectura propusă extensibilă și deschisă?", qEn: "Is the proposed architecture extensible and open?", dRo: "Raport de arhitectură, cu riscuri și alternative", dEn: "An architecture report, with risks and alternatives", durRo: "5-10 zile", durEn: "5-10 days" },
    { tRo: "Evaluarea unui sistem existent", tEn: "Existing system assessment", qRo: "Ce se poate face cu sistemul actual și ce nu?", qEn: "What can be done with the current system, and what cannot?", dRo: "Listă de constatări, separată în măsuri de configurare și de investiție", dEn: "A list of findings, split into configuration and investment measures", durRo: "5-10 zile", durEn: "5-10 days" },
  ]

  const referenceChecks = [
    { ro: "Numele clădirii și o persoană de contact care poate confirma.", en: "The name of the building and a contact person who can confirm." },
    { ro: "Numărul de puncte și echipamentele integrate în proiectul respectiv.", en: "The number of points and the equipment integrated in that project." },
    { ro: "Dacă beneficiarul acelui proiect a putut schimba ulterior furnizorul de service fără să schimbe sistemul. A treia întrebare este cea mai informativă și aproape nimeni nu o pune.", en: "Whether that project's client was later able to change the service provider without changing the system. The third question is the most informative, and almost nobody asks it." },
  ]

  const faqs = [
    { qRo: "Cât costă o lucrare de consultanță BMS?", qEn: "How much does a BMS consultancy engagement cost?", aRo: "Consultanța se tarifează pe zile de lucru sau pe pachet, în funcție de sferă, și se facturează independent de orice lucrare ulterioară. Tariful se stabilește la definirea sferei, înainte de începerea lucrării.", aEn: "Consultancy is priced per working day or per package, depending on the scope, and is billed independently of any subsequent works. The rate is set when the scope is defined, before the work starts." },
    { qRo: "Se poate cere consultanță fără să cumpăr nimic după aceea?", qEn: "Can I ask for consultancy without buying anything afterwards?", aRo: "Da, și aceasta este forma în care serviciul are sens. Consultanța nu se recuperează dintr-o lucrare ulterioară și nu condiționează raportul de o comandă. Un raport care recomandă implicit autorul lui nu are valoare pentru cumpărător.", aEn: "Yes, and this is the form in which the service makes sense. Consultancy is not recouped from a later job and does not tie the report to an order. A report that implicitly recommends its own author has no value for the buyer." },
    { qRo: "Cum știu dacă o ofertă de BMS este prea ieftină?", qEn: "How do I know if a BMS offer is too cheap?", aRo: "Se verifică patru repere: costul pe punct de date, care ar trebui să se încadreze în 90-320 EUR, densitatea de puncte, 50-90 la 1.000 mp la birouri clasa A, banda pe metru pătrat aplicabilă tipului de clădire, și dacă punerea în funcțiune, licențele și documentația sunt ofertate ca poziții cu valoare reală. O ofertă mult sub benzi a redus sfera, nu prețul.", aEn: "Check four references: the cost per data point, which should fall within 90-320 EUR, the point density, 50-90 per 1,000 sqm for class A offices, the per-square-metre band applicable to the building type, and whether commissioning, licences and documentation are quoted as items with real value. An offer far below the bands has cut the scope, not the price." },
    { qRo: "Sovitech Control poate compara și o ofertă primită de la un concurent direct?", qEn: "Can Sovitech Control also compare an offer received from a direct competitor?", aRo: "Da, iar analiza se face pe conținutul tehnic al ofertelor, cu sferă aliniată și cu criterii declarate. Raportul nu recomandă un ofertant, ci arată ce acoperă fiecare și ce întrebări rămân deschise. Beneficiarul poate folosi raportul în discuția cu toți ofertanții.", aEn: "Yes, and the analysis is done on the offers' technical content, with the scope aligned and the criteria declared. The report does not recommend a bidder; it shows what each covers and what questions remain open. The client can use the report in discussions with all bidders." },
    { qRo: "Clădirea mea intră sub obligația de automatizare?", qEn: "Does my building fall under the automation obligation?", aRo: "Pragul în vigoare în dreptul român este de 290 kW putere nominală utilă a sistemelor de încălzire, climatizare și ventilare, cu termen 31.12.2024, conform Legii 372/2005 art. 27 alin. (5) și art. 29 alin. (6). Termenul este deja depășit. Directiva 2024/1275 art. 13 alin. (9) lit. b) coboară pragul la 70 kW cu termen 31.12.2029, dar nu este încă transpusă în dreptul român.", aEn: "The threshold in force in Romanian law is 290 kW effective rated output of the heating, air conditioning and ventilation systems, with a 31.12.2024 deadline, per Law 372/2005 art. 27 para. (5) and art. 29 para. (6). The deadline has already passed. Directive 2024/1275 art. 13 para. (9) letter b) lowers the threshold to 70 kW with a 31.12.2029 deadline, but it has not yet been transposed into Romanian law." },
  ]

  const related = [
    { href: "/servicii/proiectare-automatizari-bms", titleRo: "Proiectare automatizări și BMS", titleEn: "BMS and automation design", descRo: "Listă de puncte, caiet de sarcini, scheme de tablou", descEn: "Points list, technical specification, panel diagrams" },
    { href: "/servicii/modernizare-sisteme-de-automatizare-si-bms", titleRo: "Modernizare sisteme de automatizare și BMS", titleEn: "Automation and BMS modernisation", descRo: "Migrare pe etape, fără oprirea clădirii", descEn: "Staged migration, without stopping the building" },
    { href: "/servicii/intretinere-sisteme-bms", titleRo: "Întreținere sisteme BMS", titleEn: "BMS maintenance", descRo: "Contract cu verificări planificate și registru de intervenții", descEn: "Contract with planned checks and an intervention log" },
  ]

  const resources = [
    { href: "/ghid/caiet-de-sarcini-bms", ro: "Caiet de sarcini pentru un sistem BMS: ghid complet", en: "Technical specification for a BMS: the complete guide" },
    { href: "/contact", ro: "Cere modelul de caiet de sarcini BMS", en: "Request the BMS specification template" },
    { href: "/resurse/obligatie-bacs-legea-372-2005", ro: "Obligația BACS: ce spune Legea 372/2005", en: "The BACS obligation: what Law 372/2005 says" },
    { href: "/resurse/cost-sistem-bms", ro: "Cât costă un sistem BMS în România", en: "How much a BMS costs in Romania" },
  ]

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <ServiceHero
        titleRo={"Consultanță BMS: compararea a două oferte, verificarea pragului de 290 kW, arhitectură"}
        titleEn={"BMS consultancy: comparing two offers, checking the 290 kW threshold, architecture"}
        leadRo={"Consultanța tehnică este singurul serviciu Sovitech Control care nu presupune vânzarea niciunui echipament. Acoperă compararea ofertelor primite de la alți furnizori, verificarea obligației legale de automatizare, revizuirea unei arhitecturi propuse, evaluarea unui sistem existent și redactarea caietului de sarcini. Rezultatul este un raport scris, livrat în 1-10 zile lucrătoare, în funcție de sferă."}
        leadEn={"Technical consultancy is the only Sovitech Control service that involves selling no equipment at all. It covers comparing offers received from other suppliers, verifying the legal automation obligation, reviewing a proposed architecture, assessing an existing system and writing the technical specification. The result is a written report, delivered in 1-10 working days, depending on scope."}
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
                  <span className="font-light text-[#0D2E2B]">{t("1-10 zile lucrătoare", "1-10 working days")}</span>
                </div>
                <p className="text-xs text-[#888888] font-light mt-2">{t("raport scris, în funcție de sferă", "a written report, depending on scope")}</p>
              </div>
              <div className="p-6 border-b border-[#0D2E2B]/8">
                <p className="text-xs text-[#888888] font-semibold tracking-widest uppercase mb-4">{t("Ce acoperă", "What it covers")}</p>
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
                  <FileSearch className="h-4 w-4 text-[#1F6B4A]" />
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
                  <FileSearch className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce livrează concret o lucrare de consultanță", "What a consultancy engagement concretely delivers")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Livrabilul este întotdeauna un document scris. Sfera se stabilește înainte, iar raportul răspunde exact la ea.", "The deliverable is always a written document. The scope is set beforehand, and the report answers it exactly.")}</p>
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

            {/* How to compare two offers */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Scale className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum se compară două oferte de BMS", "How to compare two BMS offers")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Două oferte de BMS devin comparabile abia după ce sunt aduse la aceeași sferă. Diferența de preț dispare, se mărește sau își schimbă sensul în cinci locuri, iar toate cinci se pot verifica înainte de semnare.", "Two BMS offers only become comparable once they are brought to the same scope. The price difference disappears, grows or changes sign in five places, and all five can be checked before signing.")}</p>
              <div className="space-y-4">
                {fivePlaces.map((p) => (
                  <div key={p.titleEn} className="bg-white rounded-[2px] p-6">
                    <h3 className="font-light text-[#0D2E2B] mb-2">{t(p.titleRo, p.titleEn)}</h3>
                    <p className="text-sm text-[#888888] font-light leading-relaxed">{t(p.bodyRo, p.bodyEn)}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-[2px] p-6 mt-4 border-l-2 border-[#1F6B4A]">
                <p className="text-sm text-[#0D2E2B] font-light leading-relaxed">
                  <span className="font-semibold">{t("Semnalele de alarmă într-o ofertă ieftină: ", "The warning signs in a cheap offer: ")}</span>
                  {t("lipsa listei de puncte, un cost pe punct mult sub banda de 90-320 EUR, punerea în funcțiune ofertată ca poziție simbolică, absența oricărei mențiuni despre licențe și parole, echivalări de echipamente fără caracteristici declarate, și un termen de execuție semnificativ mai scurt decât al celorlalți ofertanți fără o explicație tehnică.", "no points list, a per-point cost far below the 90-320 EUR band, commissioning quoted as a token line item, no mention at all of licences and passwords, equipment equivalences without declared characteristics, and an execution deadline significantly shorter than the other bidders' without a technical explanation.")}
                </p>
              </div>
            </section>

            {/* Twelve questions */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <HelpCircle className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce se întreabă un integrator înainte de semnare", "What to ask an integrator before signing")}</h2>
              </div>
              <p className="text-sm text-[#888888] font-light mb-6">{t("Douăsprezece întrebări, cu răspuns cerut în scris. Un ofertant care ocolește răspunsul scris la mai mult de două dintre ele a răspuns deja.", "Twelve questions, with answers requested in writing. A bidder who dodges a written answer to more than two of them has already answered.")}</p>
              <ol className="space-y-3">
                {twelveQuestions.map((q, idx) => (
                  <li key={q.en} className="bg-white rounded-[2px] p-4 flex items-start gap-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0D2E2B] text-white text-xs font-light shrink-0">{idx + 1}</span>
                    <span className="text-sm text-[#0D2E2B] font-light leading-relaxed">{t(q.ro, q.en)}</span>
                  </li>
                ))}
              </ol>
              <div className="bg-[#0D2E2B] rounded-[2px] p-8 mt-6">
                <p className="text-sm font-semibold text-[#C8E6C9] mb-4">{t("Ce se verifică în referințele ofertantului", "What to check in the bidder's references")}</p>
                <p className="text-sm text-white/60 font-light mb-4">{t("Nu numărul de proiecte, ci trei lucruri concrete:", "Not the number of projects, but three concrete things:")}</p>
                <ul className="space-y-2">
                  {referenceChecks.map((item) => (
                    <li key={item.en} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-[#C8E6C9] mt-0.5 shrink-0" />
                      <span className="text-sm text-white/80 font-light leading-relaxed">{t(item.ro, item.en)}</span>
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum decurge o lucrare de consultanță, pe etape", "How a consultancy engagement proceeds, stage by stage")}</h2>
              </div>
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
              <p className="text-sm text-[#888888] font-light mt-4">{t("Duratele sunt orientative. Modul de tarifare, pe zile de lucru sau pe pachet, se stabilește la definirea sferei.", "Durations are indicative. The pricing mode, per working day or per package, is set when the scope is defined.")}</p>
            </section>

            {/* Client requirements */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-[2px] bg-[#C8E6C9] flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#1F6B4A]" />
                </div>
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce cere consultanța din partea beneficiarului", "What consultancy requires from the client")}</h2>
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Cum se măsoară că o lucrare de consultanță a ieșit bine", "How you measure that a consultancy engagement turned out well")}</h2>
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
                <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter">{t("Ce nu include consultanța", "What consultancy does not include")}</h2>
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

            {/* Work types table */}
            <section>
              <h2 className="text-2xl font-light text-[#0D2E2B] tracking-tighter mb-6">{t("Patru tipuri de lucrare de consultanță", "Four types of consultancy engagement")}</h2>
              <div className="overflow-x-auto bg-white rounded-[2px]">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-[#0D2E2B]/10">
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Tip", "Type")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Întrebarea la care răspunde", "The question it answers")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Ce se predă", "What is handed over")}</th>
                      <th className="text-left p-4 text-xs font-semibold tracking-widest uppercase text-[#888888]">{t("Durată orientativă", "Indicative duration")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workTypes.map((r) => (
                      <tr key={r.tEn} className="border-b border-[#0D2E2B]/8 last:border-0 align-top">
                        <td className="p-4 text-[#0D2E2B] font-light">{t(r.tRo, r.tEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.qRo, r.qEn)}</td>
                        <td className="p-4 text-[#888888] font-light leading-relaxed">{t(r.dRo, r.dEn)}</td>
                        <td className="p-4 text-[#1F6B4A] font-light whitespace-nowrap">{t(r.durRo, r.durEn)}</td>
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
                {t("Raport scris, în 1-10 zile lucrătoare", "A written report, in 1-10 working days")}
              </h2>
              <p className="text-white/60 font-light mb-7 max-w-xl mx-auto text-sm leading-relaxed">
                {t(
                  "Sovitech Control compară ofertele primite de la alți furnizori, verifică obligația legală și revizuiește arhitectura propusă, fără să vândă niciun echipament în cadrul lucrării. Primul pas este o discuție de 30 de minute despre sfera raportului.",
                  "Sovitech Control compares offers received from other suppliers, checks the legal obligation and reviews the proposed architecture, without selling any equipment as part of the engagement. The first step is a 30-minute discussion about the report's scope.",
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
