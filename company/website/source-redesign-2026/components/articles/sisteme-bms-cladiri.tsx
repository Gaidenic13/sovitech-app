import { ArticleDiagram, ArticleFaqBox, ArticleProse } from "@/components/article-prose"
import type { ArticleFaq, ArticleMeta } from "./index"

// LINKS-TO-REACTIVATE:
// materialele despre BMS, SCADA si integrare | interim /resurse/bms-scada-integrare | final /ghid/protocoale-automatizarea-cladirilor
// materialele despre reglementari si conformare | interim /resurse/reglementari-conformare | final /ghid/conformare-cladiri-romania
// materialele despre modernizare si retrofit | interim /resurse/modernizare-retrofit | final /ghid/modernizare-bms
// Cere modelul de caiet de sarcini BMS | interim /contact | final /instrumente/model-caiet-de-sarcini-bms
// cere o verificare a pragului de putere | interim /contact | final /instrumente/test-obligatie-bacs
// Cere checklistul de audit BMS | interim /contact | final /instrumente/checklist-audit-bms
// cere un calcul de economie | interim /contact | final /instrumente/calculator-economie-energie-bms
// cere o comparatie a indicatorilor cu reperele de piata | interim /contact | final /instrumente/benchmark-kwh-mp
// pagina pentru proprietari si investitori | interim text fara link | final /pentru/proprietari-si-investitori
// pagina pentru facility manageri | interim text fara link | final /pentru/facility-manager
// pagina pentru directori tehnici | interim text fara link | final /pentru/director-tehnic
// dictionarul de termeni | interim text fara link | final /dictionar

export const meta: ArticleMeta = {
  title: "Sistem BMS cladiri: ghid complet 2026 | Sovitech Control",
  description:
    "Ghid complet despre sistemele BMS pentru cladiri: componente, arhitectura, protocoale, obligatia BACS de la 290 kW si etapele unui proiect BMS corect.",
  datePublished: "2026-08-16",
  dateModified: "2026-08-16",
}

export const faq: ArticleFaq[] = [
  {
    q: "Care este diferența dintre BMS și BACS?",
    a: "Este același lucru, în două registre. BMS (Building Management System) este termenul comercial și tehnic uzual. BACS, sisteme de automatizare și control al clădirilor, este termenul juridic, folosit în Legea 372/2005 și în directiva europeană. În documentele de conformare se scrie BACS, în discuțiile cu furnizorii se folosește BMS.",
  },
  {
    q: "Ce ordin de marime are investitia intr-un sistem BMS?",
    a: "Orientativ, o clădire de birouri se încadrează în 9-18 EUR/mp la clasa A și 5-10 EUR/mp la clasa B, fără TVA, pentru echipamente, execuție și punere în funcțiune. Reperul alternativ este costul pe punct de date, 90-320 EUR/punct. Nu este o ofertă; intervalele complete, mentenanța și exemplele lucrate sunt în articolul dedicat costurilor.",
  },
  {
    q: "Se poate moderniza un sistem BMS vechi fără înlocuirea completă?",
    a: "De regulă da. Senzorii, cablarea și elementele de execuție funcționale se păstrează frecvent. Se înlocuiesc controlerele ieșite din suport și stratul de supervizare, cu coexistență temporară prin gateway. Migrarea etapizată reduce atât costul, cât și întreruperile în exploatare.",
  },
  {
    q: "Cât durează implementarea?",
    a: "Pentru o clădire de birouri de dimensiune medie, între 3 și 6 luni de la contract la recepție, în funcție de disponibilitatea instalațiilor și de coordonarea cu celelalte specialități. La o clădire în exploatare, lucrările se etapizează pe zone, ceea ce lungește durata calendaristică.",
  },
  {
    q: "Este obligatoriu un sistem BMS în România?",
    a: "Pentru clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme, Legea 372/2005 prevedea echiparea cu BACS până la 31 decembrie 2024, dacă este fezabil tehnic și economic; termenul a fost 31 decembrie 2024 și este depășit. Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b), și nu este încă transpus în legea română.",
  },
  {
    q: "Un BMS înlocuiește sistemul de detecție și stingere a incendiilor?",
    a: "Nu. Sistemele de securitate la incendiu rămân independente și certificate separat. Sistemul BMS monitorizează stările relevante, cum sunt pompa în funcțiune, avaria sau nivelul în rezervor, și poate reacționa informațional, dar nu preia funcții de comandă în regim de securitate la incendiu.",
  },
]

export default function Body() {
  return (
    <ArticleProse>
      <p className="standfirst">
        Componente, arhitectură pe trei niveluri, protocoale, obligația legală de la 290 kW, ordinul de mărime al
        costului și etapele unui proiect executat corect.
      </p>

      <p>
        <strong>
          Un sistem BMS pentru clădiri (Building Management System, a nu se confunda cu Battery Management System) este
          infrastructura care măsoară, comandă și înregistrează funcționarea instalațiilor unei clădiri: încălzire,
          ventilare, climatizare, iluminat, pompe, contorizare. Reunește senzori, controlere, tablouri de automatizare
          și o stație de supervizare într-un sistem care produce date verificabile.
        </strong>
      </p>

      <p>
        Termenul se folosește în trei sensuri diferite în aceeași ședință. Proiectantul înțelege o arhitectură de
        controlere, proprietarul înțelege o linie de buget, iar facility managerul înțelege ecranul de pe care primește
        alarme la trei dimineața. Ghidul acoperă toate trei sensurile, în ordinea în care contează pentru cine decide.
        Este scris de echipa Sovitech Control, cu sediul în București, care execută astfel de sisteme din 2017, în
        clădiri de birouri, hoteluri, spitale și fabrici de medicamente.
      </p>

      <h2 id="pe-scurt">Pe scurt</h2>
      <ul>
        <li>
          Legea română cere sisteme de automatizare și control al clădirilor, BACS, la clădirile nerezidențiale cu
          sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe
          familie de sisteme; termenul a fost 31 decembrie 2024 și este depășit (Legea 372/2005, art. 27 alin. (5) și
          art. 29 alin. (6)).
        </li>
        <li>
          Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit.
          b), și nu este încă transpus în legea română.
        </li>
        <li>
          Un sistem BMS se citește pe trei niveluri: câmp, automatizare, supervizare. Fiecare nivel are propriul risc de
          cost.
        </li>
        <li>
          Unitatea de măsură a unui proiect este punctul de date. După el se dimensionează controlerele, licențele și,
          în bună parte, prețul.
        </li>
        <li>
          Ordin de mărime orientativ pentru o clădire de birouri: 9-18 EUR/mp la clasa A și 5-10 EUR/mp la clasa B,
          fără TVA.
        </li>
        <li>
          Trei clauze decid costul pe zece ani: comunicație nativă deschisă, predarea proiectului software și a
          hărților de puncte, licențe pe numele beneficiarului.
        </li>
      </ul>

      <h2 id="definitia-tehnica-a-unui-sistem-bms">
        Definiția tehnică a unui sistem BMS: comandă, măsurare, înregistrare
      </h2>
      <p>
        Un sistem BMS, Building Management System, este stratul de comandă și măsurare dintre instalațiile unei clădiri
        și oamenii care răspund de ele. Fără el, fiecare echipament funcționează după propria automatizare locală,
        izolat: centrala termică știe de centrala termică, chillerul știe de chiller, iar nimeni nu știe dacă amândouă
        merg simultan într-o zi de aprilie.
      </p>
      <p>
        Cu el, instalațiile devin puncte de date într-un singur sistem, comandate după o logică unitară și înregistrate
        în timp. Diferența practică apare la prima reclamație de confort. Fie există istoric și se poate verifica ce
        s-a întâmplat, fie rămâne cuvântul unui om împotriva cuvântului altuia.
      </p>
      <p>
        O limită de spus din start: un sistem BMS nu repară o instalație subdimensionată și nu compensează o hidraulică
        proastă. Dacă bateria de încălzire este prea mică pentru debitul de aer, sistemul o va comanda la 100% și va
        raporta corect că nu atinge valoarea de consemn. Automatizarea face problema vizibilă, nu o rezolvă.
      </p>

      <h2 id="acronimele-care-se-confunda">BMS, BACS, SCADA și EMS: patru acronime care se confundă</h2>
      <p>
        <strong>BMS</strong> are două înțelesuri fără legătură între ele. În clădiri înseamnă Building Management
        System. În industria bateriilor și a vehiculelor electrice înseamnă Battery Management System, adică
        electronica ce supraveghează celulele unui acumulator. Pentru că o clădire poate avea și stocare pe baterii, în
        documentele de proiect se scrie întotdeauna „sistem BMS pentru clădire”.
      </p>
      <p>
        <strong>BACS</strong> este termenul juridic: sisteme de automatizare și control al clădirilor. Formularea apare
        identic în Legea 372/2005 și în directiva europeană privind performanța energetică a clădirilor. În discuțiile
        de conformare se folosește BACS, în discuțiile cu furnizorii se folosește BMS. Este același obiect tehnic.
      </p>
      <p>
        <strong>SCADA</strong>, supervisory control and data acquisition, descrie același tip de arhitectură, dar în
        context industrial, cu accent pe proces și pe achiziția rapidă de date. <strong>EMS</strong> înseamnă fie
        sistem de management energetic, fie, în farmaceutică, sistem de monitorizare a mediului, de aceea se califică
        întotdeauna. Un sistem BMS bine făcut acoperă funcții de EMS energetic. Nu înlocuiește un EMS validat GMP.
      </p>

      <h2 id="componentele-unui-sistem-bms">Cele trei niveluri: câmp, automatizare, supervizare</h2>
      <p>
        Un sistem BMS se citește pe trei niveluri: câmp, automatizare, supervizare. Discuția de cost, de risc și de
        deschidere se poartă în raport cu aceste trei niveluri.
      </p>

      <ArticleDiagram
        src="/diagrame/A01-1-arhitectura-trei-niveluri.jpg"
        caption="Arhitectura unui sistem BMS pe trei niveluri: câmp, automatizare și supervizare."
      />

      <p>
        Două cifre din tabelul de mai jos merită scoase în text, pentru că se verifică la achiziție: rezerva liberă de
        puncte pe controlerele DDC, adică pe regulatoarele digitale directe, se cere la minimum 15-20%, iar senzorii de
        CO2 se decalibrează în 2-3 ani și aproape nimeni nu îi verifică.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nivel</th>
              <th>Componentă</th>
              <th>Ce face</th>
              <th>Ce se verifică la achiziție</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Câmp</td>
              <td>Senzori și traductoare</td>
              <td>
                Măsoară temperatură, umiditate, CO2, presiune diferențială, debit, calitatea aerului, nivel, curent.
                Convertesc mărimea fizică într-un semnal electric standard (0-10 V, 4-20 mA, rezistiv) sau digital.
              </td>
              <td>
                Clasa de precizie și domeniul de măsură, nu doar marca. Senzorii de CO2 se decalibrează în 2-3 ani și
                aproape nimeni nu îi verifică; cei cu autocalibrare rămân utilizabili mai mult. Poziția de montaj
                contează mai mult decât specificația.
              </td>
            </tr>
            <tr>
              <td>Câmp</td>
              <td>Servomotoare, vane de reglaj, clapete</td>
              <td>
                Execută comanda: modulează debitul de agent termic, poziționează clapetele de aer, izolează circuite.
              </td>
              <td>
                Cuplu suficient pentru dimensiunea vanei, timp de cursă, comportare la avarie de tensiune (revenire cu
                arc, unde este critic), semnal de retur de poziție.
              </td>
            </tr>
            <tr>
              <td>Câmp</td>
              <td>Contoare de energie</td>
              <td>
                Contorizare de energie electrică, termică, apă, gaz, pe consumatori sau pe zone. Baza oricărei
                raportări.
              </td>
              <td>
                Ieșire de comunicație reală (M-Bus, Modbus), nu doar impuls. Clasa de exactitate. Amplasarea la nivel
                de consumator relevant, nu doar pe branșamentul general.
              </td>
            </tr>
            <tr>
              <td>Automatizare</td>
              <td>Controlere DDC</td>
              <td>
                Citesc intrările, execută secvențele de reglare și de blocare, comandă ieșirile. Funcționează autonom
                și când legătura cu serverul cade.
              </td>
              <td>
                Numărul și tipul de puncte I/O, rezerva liberă (minimum 15-20%), capacitatea de a rula secvențele
                local, protocoalele native, disponibilitatea pieselor peste 10 ani.
              </td>
            </tr>
            <tr>
              <td>Automatizare</td>
              <td>Tabloul de automatizare</td>
              <td>
                Găzduiește controlerele, sursele, releele, protecțiile și, unde e cazul, partea de forță pentru
                pornirea motoarelor.
              </td>
              <td>
                Etichetare completă, schemele în ușă, rezervă de spațiu pentru module viitoare, separarea circuitelor
                de forță de cele de semnal, sursă neîntreruptibilă pentru controlere.
              </td>
            </tr>
            <tr>
              <td>Comunicație</td>
              <td>Rețeaua BMS</td>
              <td>
                Transportă datele între controlere și server și către echipamentele cu automatizare proprie.
              </td>
              <td>
                Rețea dedicată sau VLAN separat de rețeaua de birou. Documentarea adreselor. Punctele de acces la
                distanță, controlate.
              </td>
            </tr>
            <tr>
              <td>Supervizare</td>
              <td>Server și stație de operare (HMI)</td>
              <td>
                Afișează sinopticele, centralizează alarmele, păstrează istoricul, generează rapoarte, gestionează
                utilizatorii.
              </td>
              <td>
                Unde stă baza de date și cine o poate exporta. Numărul de utilizatori simultani. Accesul din browser
                fără instalare locală.
              </td>
            </tr>
            <tr>
              <td>Supervizare</td>
              <td>Licențe software</td>
              <td>
                Dau dreptul de utilizare pe număr de puncte, de drivere de integrare, de clienți conectați, de module
                (rapoarte, energie, mentenanță).
              </td>
              <td>
                <strong>Cel mai des uitat capitol de buget.</strong> Se cere explicit: ce e perpetuu, ce e pe
                abonament, ce se întâmplă la depășirea numărului de puncte, cât costă extinderea cu încă 200 de puncte
                peste cinci ani.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        La nivel de echipamente, Sovitech Control lucrează ca partener autorizat SAUTER: controlere Modulo 6 și Modulo
        5/ECOS, senzori de CO2 și de temperatură din seriile EGQ și EGH, vane și servomotoare, supervizare Sauter
        Vision Center sau ModuWeb Vision. Gama este pe <a href="/produse">pagina de produse</a>. Principiul rămâne
        același indiferent de marcă: contează arhitectura și deschiderea, nu logoul de pe controler.
      </p>
      <p>
        Un detaliu de comparare a ofertelor. Diferența de preț dintre două propuneri vine, de cele mai multe ori, din
        numărul de puncte și din orele de punere în funcțiune incluse, nu din marca de controler. Două oferte care par
        să difere cu o treime descriu, la citire atentă, două sisteme diferite.
      </p>

      <h2 id="cele-cinci-notiuni-care-explica-functionarea">
        Cele cinci noțiuni: punct de date, buclă, secvență, orare, interblocări
      </h2>
      <p>Cinci noțiuni acoperă practic tot ce face un sistem BMS. Cine le înțelege poate citi orice caiet de sarcini.</p>
      <p>
        <strong>Punctul de date.</strong> Unitatea elementară. Un punct este o valoare cu adresă: temperatura pe tur la
        circuitul de radiatoare, starea de funcționare a pompei P2, comanda de deschidere a vanei V4. Punctele sunt
        fizice (legate de un senzor sau de o ieșire) sau software (o valoare calculată, un setpoint, o alarmă). Numărul
        total de puncte este principala unitate de măsură a unui sistem BMS.
      </p>
      <p>
        <strong>Bucla de reglare.</strong> Sistemul compară valoarea măsurată cu valoarea de consemn și acționează
        asupra unui element de execuție până când diferența dispare. O centrală de tratare a aerului, CTA, măsoară
        temperatura aerului refulat, o compară cu 20 °C și modulează vana bateriei de încălzire. Regulatorul este de
        obicei de tip PID, iar acordarea lui, nu alegerea lui, decide dacă instalația oscilează sau este stabilă.
        Majoritatea plângerilor de tip „BMS-ul nu funcționează” sunt, de fapt, bucle neacordate.
      </p>
      <p>
        <strong>Secvența de funcționare.</strong> Descrierea în cuvinte a comportamentului unui echipament în toate
        stările: pornire, funcționare normală, trecere între moduri, oprire, avarie. Este documentul cel mai important
        al unui proiect BMS și cel mai des absent. Fără secvențe scrise, programatorul inventează logica pe șantier,
        iar beneficiarul nu are cu ce compara rezultatul la recepție.
      </p>
      <p>
        <strong>Programele orare.</strong> Calendarul de funcționare: ore de ocupare pe zile, zile libere, sărbători,
        excepții. Aici se produce cea mai ieftină economie dintr-o clădire. Un sistem lăsat pe „permanent” pentru că
        „așa e mai simplu” pierde bani în fiecare noapte, tăcut. Reducerea nocturnă nu se aplică însă peste tot: în
        spații cu control de umiditate, în arhive, în camerele tehnice IT sau în zonele clasificate din farmaceutică,
        programul rămâne continuu și economia se caută în altă parte.
      </p>
      <p>
        <strong>Interblocările.</strong> Condițiile care nu se negociază: ventilatorul nu pornește dacă clapeta de aer
        proaspăt nu e deschisă; bateria de încălzire cu apă intră în protecție la îngheț și oprește ventilatorul; pompa
        de circulație nu pornește fără confirmarea debitului. Sunt partea din program pe care nimeni nu o vede și fără
        de care o centrală de tratare a aerului se poate distruge într-o noapte de ianuarie.
      </p>

      <ArticleDiagram
        src="/diagrame/A01-2-flux-date-senzor-raport.jpg"
        caption="Fluxul datelor de la senzor la raport, în șase etape, cu punctele în care datele se pot pierde."
      />

      <h2 id="instalatiile-care-se-conecteaza-la-bms">Cele opt instalații conectate la BMS: HVAC, contorizare, iluminat</h2>
      <p>
        Opt familii de instalații se conectează la un sistem BMS, iar prima dintre ele, HVAC, adică încălzirea,
        ventilarea și climatizarea, produce majoritatea consumului.
      </p>
      <ul>
        <li>
          <strong>HVAC.</strong> Nucleul sistemului: centrale de tratare a aerului, ventiloconvectoare, sisteme VRF,
          ventilații de desfumare în regim de test. Aici se produc majoritatea consumurilor și majoritatea
          reclamațiilor de confort.
        </li>
        <li>
          <strong>Centrala termică.</strong> Cazane, distribuitoare, pompe, vane de amestec, compensare după
          temperatura exterioară, prepararea apei calde menajere cu regimurile de tratament termic aferente.
        </li>
        <li>
          <strong>Chillerele și producția de frig.</strong> Pornire în cascadă, secvențierea pompelor primare și
          secundare, gestiunea temperaturii de retur, oprirea mecanică atunci când free-coolingul acoperă cererea.
        </li>
        <li>
          <strong>Iluminatul.</strong> De regulă prin integrare cu un sistem DALI sau KNX, nu prin comandă directă din
          BMS: senzori de prezență, reglare după lumina naturală, scenarii, programe orare pe zone.
        </li>
        <li>
          <strong>Contorizarea.</strong> Energie electrică, termică, apă, gaz, pe consumatori și pe chiriași.
          Componenta care transformă BMS-ul dintr-un sistem de confort într-un sistem de date. Detaliat în ghidul
          despre <a href="/ghid/date-esg-cladiri">datele pentru raportarea ESG</a>.
        </li>
        <li>
          <strong>Pompele și stațiile de pompare.</strong> Pompe de circulație, de recirculare, de epuisment;
          funcționare alternantă, egalizarea orelor de funcționare, alarme de avarie.
        </li>
        <li>
          <strong>Stația de pompare pentru incendiu.</strong> Atenție la limită: sistemul BMS <strong>monitorizează</strong>{" "}
          starea (pompă în funcțiune, avarie, nivel în rezervor, poziția vanelor), dar <strong>nu comandă</strong> și
          nu înlocuiește automatizarea dedicată de securitate la incendiu, care rămâne un sistem independent, cu regim
          propriu de verificare.
        </li>
        <li>
          <strong>Controlul accesului, efracția și supravegherea video.</strong> Se integrează, nu se înlocuiesc.
          Integrarea utilă este informațională: semnalul de „prima persoană a intrat pe etajul 4” pornește tratarea
          aerului pe zona respectivă, iar starea de „clădire armată” trece instalațiile în regim redus. Sistemele de
          securitate rămân autonome și certificate separat.
        </li>
      </ul>

      <h2 id="protocoalele-si-miza-deschiderii">BACnet, Modbus, KNX, DALI, M-Bus și LON: miza deschiderii</h2>
      <p>
        Șase protocoale contează într-o clădire: BACnet pe magistrala principală, Modbus pentru echipamentele terțe,
        KNX și DALI pentru iluminat și comanda în cameră, M-Bus pentru contoare și LON în clădirile echipate între 2000
        și 2015. Protocolul este limba în care vorbesc echipamentele. Alegerea lui nu este o preferință tehnică, ci o
        decizie comercială pe zece ani. Dacă sistemul vorbește doar limba unui singur producător, toate extinderile
        viitoare vor fi ofertate de acel producător, la prețul lui. Subiectul este acoperit pe larg în{" "}
        <a href="/resurse/bms-scada-integrare">materialele despre BMS, SCADA și integrare</a>.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Protocol</th>
              <th>Unde se folosește</th>
              <th>Statut</th>
              <th>Puncte tari</th>
              <th>Limitări</th>
              <th>Ce se cere în caiet de sarcini</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>BACnet</strong> (IP și MS/TP)
              </td>
              <td>Magistrala principală a sistemului: controlere, CTA, chillere, centrale termice</td>
              <td>Standard deschis, dedicat clădirilor</td>
              <td>
                Obiecte standardizate (analog input, schedule, trend log, alarmă). Interoperabilitate reală între
                mărci. Descoperire automată a dispozitivelor.
              </td>
              <td>Implementările diferă în profunzime. „Compatibil BACnet” poate însemna zece obiecte sau două sute.</td>
              <td>
                Profilul BACnet (BTL) și lista completă de obiecte expuse, pe echipament. Fără listă, nu există
                interoperabilitate garantată.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Modbus</strong> (RTU și TCP)
              </td>
              <td>Echipamente terțe: chillere, UPS, analizoare de rețea, grupuri electrogene, invertoare</td>
              <td>Deschis, foarte răspândit</td>
              <td>Simplu, robust, implementat aproape peste tot. Ieftin de integrat.</td>
              <td>
                Fără semantică: transmite numere, nu înțelesuri. Fiecare furnizor își face propria hartă de registre.
              </td>
              <td>
                Harta de registre în format editabil, cu unități de măsură și factori de scalare, înainte de recepție.
              </td>
            </tr>
            <tr>
              <td>
                <strong>KNX</strong>
              </td>
              <td>Iluminat, jaluzele, comandă în cameră, spații de birouri și rezidențial premium</td>
              <td>Standard deschis</td>
              <td>Ecosistem foarte larg, funcționare descentralizată, instalare flexibilă.</td>
              <td>Nu este gândit pentru instalații termice complexe. Necesită instrumente și competențe proprii.</td>
              <td>Proiectul ETS și fișierul de configurare, predate ca parte din documentația as-built.</td>
            </tr>
            <tr>
              <td>
                <strong>DALI</strong> (și DALI-2)
              </td>
              <td>Corpuri de iluminat adresabile</td>
              <td>Standard deschis</td>
              <td>
                Adresare individuală, reglare fină, raportare de defect pe corp, autotest pentru iluminatul de
                siguranță.
              </td>
              <td>
                Limitat la iluminat. Lungimea magistralei și numărul de dispozitive per linie sunt constrângeri reale.
              </td>
              <td>
                Topologia liniilor, adresarea și scenariile documentate, plus modul de raportare a lămpilor defecte în
                BMS.
              </td>
            </tr>
            <tr>
              <td>
                <strong>M-Bus</strong> (și wireless M-Bus)
              </td>
              <td>Contoare de energie termică, apă, gaz</td>
              <td>Standard deschis</td>
              <td>
                Gândit pentru citirea contoarelor. Alimentare pe aceeași pereche de fire. Ieftin pe număr mare de
                puncte.
              </td>
              <td>Lent, unidirecțional în practică. Nu este potrivit pentru reglare.</td>
              <td>
                Fiecare contor cu modul de comunicație de la montaj. Retrofitarea ulterioară costă mai mult decât
                contorul.
              </td>
            </tr>
            <tr>
              <td>
                <strong>LON</strong> (LonWorks)
              </td>
              <td>Clădiri echipate în anii 2000-2015; se întâlnește frecvent la modernizări</td>
              <td>Standard deschis, în declin</td>
              <td>A funcționat bine și încă funcționează. Baza instalată este mare.</td>
              <td>Ecosistem în restrângere, piese tot mai greu de găsit, competențe rare.</td>
              <td>
                La o clădire existentă cu LON: strategie de coexistență, gateway către BACnet și înlocuire etapizată,
                nu demolare totală.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Un sistem închis nu se vede ca o problemă în anul unu. Se vede în anul cinci, când proprietarul vrea să adauge
        40 de puncte pentru un etaj reamenajat și primește o singură ofertă. Formula minimă care merită impusă în
        specificație: comunicație nativă BACnet/IP la nivel de automatizare, integrare Modbus pentru echipamentele
        terțe, predarea completă a hărților de puncte și a proiectului software, licențe pe numele beneficiarului.
      </p>
      <p>
        Harta de registre Modbus este documentul cel mai des uitat la recepție și primul care lipsește când se schimbă
        integratorul. Fără ea, o integrare care a durat două zile se reface în două săptămâni.
      </p>

      <h2 id="rezultatele-masurabile-ale-unui-sistem-bms">
        Rezultate măsurabile: 10-20% din consumul HVAC și 3-6 ani amortizare
      </h2>
      <p>
        Un sistem BMS produce rezultate în șase direcții: energie, mentenanță, confort, durata de viață a
        echipamentelor, amortizare și date pentru raportare.
      </p>
      <p>
        Cifrele de mai jos sunt <strong>estimări</strong>, bazate pe proiecte executate și pe intervalele uzuale din
        piață. Rezultatul real depinde de starea instalațiilor, de calitatea punerii în funcțiune și, mai ales, de
        nivelul de la care pornește clădirea. O clădire care are deja programe orare corecte nu obține aceleași
        câștiguri ca una care funcționează permanent.
      </p>

      <h3 id="energie-10-20-din-consumul-hvac-5-15-din-consumul-total">
        Energie: 10-20% din consumul HVAC, 5-15% din consumul total
      </h3>
      <p>
        Pentru o clădire fără automatizare coordonată, unde se implementează programe orare reale, compensare după
        temperatura exterioară, oprirea concomitentă a încălzirii și răcirii, reducere nocturnă și free-cooling,
        reducerea consumului aferent instalațiilor HVAC, adică încălzire, ventilare și climatizare, se situează,
        estimativ, în intervalul <strong>10-20%</strong>. La nivelul consumului total al clădirii, măsurat pe facturi
        normalizate, banda susținută de literatură este de <strong>5-15%</strong>. Câștigul cel mai mare vine din
        lucruri banale: echipamente care nu mai funcționează când clădirea este goală. Pentru o clădire concretă se
        poate <a href="/contact">cere un calcul de economie</a>, pe consumul real și pe starea actuală a instalațiilor.
      </p>

      <h3 id="mentenanta-15-30-mai-putine-interventii-neplanificate">
        Mentenanță: 15-30% mai puține intervenții neplanificate
      </h3>
      <p>
        Trecerea de la intervenție reactivă la intervenție planificată. Sistemul contorizează orele de funcționare,
        semnalează derivele înainte să devină avarii și înregistrează contextul fiecărei alarme. Efectul observat în
        clădirile cu contract de service: mai puține intervenții de urgență și diagnostic mai rapid, pentru că
        tehnicianul vine știind ce caută. Estimativ, o reducere de 15-30% a intervențiilor neplanificate în primii doi
        ani de operare disciplinată.
      </p>

      <h3 id="confort-istoric-la-15-minute-pentru-fiecare-reclamatie">
        Confort: istoric la 15 minute pentru fiecare reclamație
      </h3>
      <p>
        Reclamațiile de temperatură scad pentru că devin verificabile. Când cineva spune „e frig la etajul 3”, există
        istoricul pe 15 minute al temperaturii din zonă și se poate distinge între o problemă reală, un setpoint
        modificat manual și o percepție individuală. În practică, aceasta este o economie de timp administrativ.
      </p>

      <h3 id="durata-de-viata-a-echipamentelor-mai-putine-porniri-capex-amanat">
        Durata de viață a echipamentelor: mai puține porniri, CapEx amânat
      </h3>
      <p>
        Pornirile și opririle repetate, funcționarea în afara plajei nominale și lipsa interblocărilor scurtează viața
        compresoarelor, pompelor și ventilatoarelor. Egalizarea orelor de funcționare între echipamentele redundante și
        limitarea numărului de porniri pe oră sunt funcții ieftine de programat, cu efect în CapEx amânat.
      </p>

      <h3 id="amortizare-1-3-ani-la-optimizare-3-6-ani-la-modernizare-de-capital">
        Amortizare: 1-3 ani la optimizare, 3-6 ani la modernizare de capital
      </h3>
      <p>
        Un pachet de optimizare pe un sistem existent, cu cost mic, se recuperează de regulă în <strong>1-3 ani</strong>
        . O modernizare BACS de capital, cu înlocuire de controlere și de supervizare, se recuperează în{" "}
        <strong>3-6 ani</strong>. Cele două nu se amestecă într-un singur număr.
      </p>

      <h3 id="date-pentru-raportare-kwh-mp-pe-zona-si-pe-consumator">
        Date pentru raportare: kWh/mp, pe zonă și pe consumator
      </h3>
      <p>
        Consecința cea mai subestimată. Fără contorizare și istoricizare, orice raport de consum este o reconstrucție
        din facturi. Cu ele, există valori pe zonă, pe consumator și pe interval, exportabile, cu marcarea golurilor de
        date. De aici pleacă indicatorii de tip kWh/mp, recuperarea costurilor de la chiriași și raportarea de
        sustenabilitate. Pentru o clădire în exploatare se poate{" "}
        <a href="/contact">cere o comparație a indicatorilor cu reperele de piață</a>.
      </p>
      <p>
        O limită onestă: într-o clădire fără contorizare secundară, repartizarea consumului pe chiriaș rămâne o
        estimare, oricât de bun ar fi softul de raportare. Contoarele lipsă nu se compensează prin algoritm.
      </p>

      <h2 id="obligatia-legala-in-romania">Obligația legală: 290 kW în legea română, 70 kW în directivă</h2>
      <p>
        Legea română cere sisteme de automatizare și control al clădirilor, BACS, la clădirile nerezidențiale cu
        sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe
        familie de sisteme, iar termenul a fost 31 decembrie 2024 și este depășit. Pragul de 70 kW, cu termen 31
        decembrie 2029, provine din directiva europeană și nu este încă transpus în legea română. Aici circulă cea mai
        frecventă confuzie din piață: două praguri, două regimuri juridice diferite.
      </p>

      <h3 id="legea-372-2005-pragul-de-290-kw-termen-31-decembrie-2024">
        Legea 372/2005: pragul de 290 kW, termen 31 decembrie 2024
      </h3>
      <p>
        <a href="https://legislatie.just.ro/Public/DetaliiDocument/66970" target="_blank" rel="noopener">
          Legea 372/2005
        </a>
        , la art. 27 alin. (5) și, cu formulare identică pentru climatizare, la art. 29 alin. (6), cere ca până la 31
        decembrie 2024 clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu
        putere nominală utilă de peste 290 kW pe familie de sisteme, să fie echipate cu sisteme de automatizare și
        control pentru clădiri, dacă acest lucru este fezabil din punct de vedere tehnic și economic. Textul integral,
        cine intră sub obligație și cum se demonstrează fezabilitatea sunt în articolul despre{" "}
        <a href="/resurse/obligatie-bacs-legea-372-2005">obligația BACS din Legea 372/2005</a>.
      </p>
      <p>
        Două observații care contează. Prima: <strong>termenul a fost 31 decembrie 2024 și este depășit.</strong> Nu
        este o obligație viitoare, este o obligație scadentă. A doua: condiția de fezabilitate tehnică și economică nu
        este o portiță automată, ci o concluzie care se demonstrează.
      </p>

      <h3 id="directiva-ue-2024-1275-pragul-de-70-kw-termen-31-decembrie-2029">
        Directiva (UE) 2024/1275: pragul de 70 kW, termen 31 decembrie 2029
      </h3>
      <p>
        <a href="https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng" target="_blank" rel="noopener">
          Directiva (UE) 2024/1275
        </a>
        , la art. 13 alin. (9) lit. b), coboară pragul la <strong>70 kW, cu termen 31 decembrie 2029</strong>. Acest
        prag <strong>nu este încă transpus în legea română</strong>. Termenul de transpunere a fost 29 mai 2026, iar
        la 15 iulie 2026 Comisia Europeană a trimis{" "}
        <a
          href="https://energy.ec.europa.eu/news/commission-calls-eu-countries-transpose-reinforced-rules-energy-performance-buildings-2026-07-15_en"
          target="_blank"
          rel="noopener"
        >
          scrisori de punere în întârziere tuturor celor 27 de state membre
        </a>
        , inclusiv României. Pragul de 70 kW va ajunge în legea română, dar nu poate fi invocat astăzi ca obligație
        internă.
      </p>

      <h3 id="cele-patru-capabilitati-cerute-de-art-13-alin-10">Cele patru capabilități cerute de art. 13 alin. (10)</h3>
      <p>
        Art. 13 alin. (10) din Directiva (UE) 2024/1275 enumeră ce trebuie să poată face sistemul de automatizare și
        control al clădirii:
      </p>
      <ul>
        <li>(a) monitorizarea, înregistrarea, analizarea și ajustarea continuă a consumului de energie;</li>
        <li>
          (b) evaluarea comparativă a eficienței, detectarea pierderilor de eficiență și informarea persoanei
          responsabile;
        </li>
        <li>
          (c) comunicarea cu sistemele tehnice conectate și interoperabilitatea între tehnologii proprietare diferite;
        </li>
        <li>(d) de la 29 mai 2026, monitorizarea calității mediului interior.</li>
      </ul>
      <p>
        Merită citite ca listă de cerințe funcționale la achiziție, indiferent de stadiul transpunerii. Un sistem care
        nu le îndeplinește va trebui oricum completat.
      </p>

      <h3 id="sanctiuni-amenzi-majorate-cu-pana-la-400-prin-legea-238-2024">
        Sancțiuni: amenzi majorate cu până la 400% prin Legea 238/2024
      </h3>
      <p>
        <a href="https://legislatie.just.ro/public/DetaliiDocument/285769" target="_blank" rel="noopener">
          Legea 238/2024
        </a>
        , adoptată la 19 iulie 2024 și publicată în Monitorul Oficial la 25 iulie 2024, a modificat Legea 372/2005 și a
        majorat amenzile cu până la aproximativ 400%, pe tranșe de 5.000-7.500 lei, 7.500-10.000 lei, 10.000-20.000 lei
        și 5.000-30.000 lei pentru autoritățile locale, cu sancțiunea complementară a suspendării dreptului de practică
        pentru auditori, între 12 și 24 de luni.
      </p>
      <p>
        Imaginea de ansamblu a reglementărilor aplicabile clădirilor se află în{" "}
        <a href="/resurse/reglementari-conformare">materialele despre reglementări și conformare</a>. Pentru un răspuns
        rapid pe o clădire concretă se poate <a href="/contact">cere o verificare a pragului de putere</a>.
      </p>

      <h2 id="structura-costului">Ordinul de mărime al costului: 4-18 EUR/mp</h2>
      <p>
        Ordinul de mărime agregat, care acoperă retailul, birourile de clasă B și A și hotelurile fără control pe
        cameră, este de 4-18 EUR/mp fără TVA, cu un reper alternativ de 90-320 EUR pe punct de date; o clădire de
        birouri clasa A se așază la 9-18 EUR/mp, iar una de clasă B la 5-10 EUR/mp. Mentenanța anuală adaugă 4-7% din
        valoarea investiției pentru un <a href="/servicii/intretinere-sisteme-bms">contract de întreținere</a> de bază
        și 7-12% pentru unul extins, plus o taxă anuală de licențe de 8-18% din valoarea componentei software. Peste
        acestea se adaugă capitolele care se uită sistematic din buget: licențele de supervizare, integrarea sistemelor
        terțe, punerea în funcțiune și documentația as-built. Intervalele complete pe tipuri de clădiri, densitățile de
        puncte, structura pe linii de cost și exemplele lucrate sunt în articolul dedicat,{" "}
        <a href="/resurse/cost-sistem-bms">cât costă un sistem BMS</a>, care este sursa de adevăr pentru toate cifrele
        de preț de pe acest site.
      </p>

      <h2 id="etapele-unui-proiect-bms-corect">Cele 11 etape ale unui proiect BMS executat corect</h2>
      <p>
        Un proiect BMS are unsprezece etape, de la analiza instalațiilor existente până la optimizarea de după primul
        sezon de încălzire. Ordinea lor nu este birocrație: fiecare etapă sărită se plătește în etapa următoare.
      </p>
      <ol>
        <li>
          <strong>Analiza cerințelor și a instalațiilor existente.</strong> Ce echipamente există, ce automatizări
          proprii au, ce comunică, ce documentație există. La o clădire în exploatare, aici se descoperă de obicei că
          jumătate din echipamente nu sunt cele din proiectul inițial.
        </li>
        <li>
          <strong>Caietul de sarcini.</strong> Lista de puncte, descrierea secvențelor de funcționare, cerințele de
          protocol, cerințele de licențiere, criteriile de recepție. Documentul care decide dacă ofertele vor fi
          comparabile între ele. Se poate construi pornind de la{" "}
          <a href="/ghid/caiet-de-sarcini-bms">ghidul de caiet de sarcini pentru BMS</a>.
        </li>
        <li>
          <strong>Proiectarea.</strong> Arhitectura sistemului, schemele de automatizare, schemele de tablou, planurile
          de amplasare a senzorilor, traseele de cablu, dimensionarea controlerelor cu rezervă. Vezi serviciul de{" "}
          <a href="/servicii/proiectare-automatizari-bms">proiectare automatizări și BMS</a>.
        </li>
        <li>
          <strong>Execuția tabloului electric de forță și automatizare.</strong> Confecționare, cablare internă,
          etichetare, testare la banc înainte de livrarea pe șantier.
        </li>
        <li>
          <strong>Cablarea și montajul echipamentelor de câmp.</strong> Senzori, servomotoare, contoare, magistrale.
          Etapa cu cel mai mare impact asupra calității pe termen lung și cea mai des grăbită.
        </li>
        <li>
          <strong>Programarea și configurarea.</strong> Implementarea secvențelor în controlere, configurarea
          comunicației, integrarea echipamentelor terțe.
        </li>
        <li>
          <strong>Interfața grafică HMI.</strong> Sinoptice pe instalație, arborele de navigare, structura de alarme cu
          priorități, înregistrările de tendință, rapoartele. Un HMI bun se judecă după cât de repede ajunge un
          operator de la alarmă la cauză.
        </li>
        <li>
          <strong>Punerea în funcțiune.</strong> Verificare punct cu punct, testarea fiecărei secvențe, acordarea
          buclelor, testele de interblocare, simularea avariilor. Se încheie cu un proces-verbal care conține
          rezultate, nu doar semnături.
        </li>
        <li>
          <strong>Instruirea personalului de exploatare.</strong> Minimum două sesiuni: una la punerea în funcțiune,
          una după primul sezon complet.
        </li>
        <li>
          <strong>Documentația as-built.</strong> Tot ce s-a executat, așa cum s-a executat: scheme actualizate, liste
          de puncte finale, descrierea secvențelor implementate, copiile de siguranță ale programelor, licențele pe
          numele beneficiarului.
        </li>
        <li>
          <strong>Perioada de garanție și optimizarea sezonieră.</strong> Un sistem acordat în august nu este acordat
          pentru ianuarie. Revizuirea după primul sezon de încălzire este parte din livrare, nu extraopțiune.
        </li>
      </ol>
      <p>
        Parcursul se vede pe proiecte concrete în{" "}
        <a href="/servicii/executie-sisteme-bms">execuția de sisteme BMS</a> și în{" "}
        <a href="/referinte">lista de referințe</a>.
      </p>

      <h3 id="lista-de-verificare-inainte-de-semnarea-receptiei">Cele 14 verificări înainte de semnarea recepției</h3>
      <ul>
        <li>Lista finală de puncte, comparată cu cea din contract, cu diferențele explicate în scris.</li>
        <li>Fiecare punct fizic verificat individual, cu proces-verbal, nu prin sondaj.</li>
        <li>Fiecare secvență de funcționare testată în condiții reale, inclusiv trecerea între moduri.</li>
        <li>Interblocările de protecție testate prin simulare de avarie, nu doar declarate.</li>
        <li>Programele orare configurate cu orele reale de ocupare, sărbătorile și excepțiile clădirii.</li>
        <li>
          Alarmele clasificate pe priorități, cu destinatari nominali; alarmele false eliminate înainte de predare.
        </li>
        <li>
          Istoricizarea activă pentru punctele importante: se exportă o lună de date și se verifică rezoluția și
          golurile.
        </li>
        <li>Copiile de siguranță ale programelor și configurațiilor, predate pe suport, în format editabil.</li>
        <li>Licențele emise pe numele beneficiarului, cu condițiile de extindere clarificate în scris.</li>
        <li>
          Conturile de administrator predate, cu parolele implicite schimbate și accesul de la distanță documentat.
        </li>
        <li>Hărțile de puncte ale tuturor integrărilor terțe, în format editabil.</li>
        <li>Documentația as-built completă, verificată prin sondaj față de teren.</li>
        <li>Instruirea efectuată, cu listă de participanți și înregistrarea sesiunii.</li>
        <li>Contractul de mentenanță semnat, cu timp de răspuns și perimetru definite.</li>
      </ul>
      <p>
        Pentru un sistem deja în funcțiune, starea lui se poate evalua pe baza unui checklist de audit BMS.{" "}
        <a href="/contact">Cere checklistul de audit BMS</a>.
      </p>

      <h2 id="greselile-care-se-repeta">Cele opt greșeli care se repetă la un proiect BMS</h2>
      <p>
        Opt greșeli se repetă de la un proiect la altul, iar cea mai scumpă dintre ele este punerea în funcțiune tăiată
        din buget.
      </p>
      <ul>
        <li>
          <strong>Caiet de sarcini copiat de la alt proiect.</strong> Rezultatul: puncte care nu există în clădire,
          secvențe pentru echipamente care nu au fost montate, oferte care nu se pot compara.
        </li>
        <li>
          <strong>Sistem dimensionat fix, fără rezervă.</strong> Controlerele umplute la ultimul punct înseamnă că
          prima modificare cere un modul nou, un tablou modificat și o licență suplimentară. Rezerva de 15-20% costă
          puțin la achiziție și mult la retrofit.
        </li>
        <li>
          <strong>Punere în funcțiune tăiată din buget.</strong> Cea mai scumpă economie posibilă. Un sistem instalat,
          dar nereglat, consumă la fel ca lipsa lui și, în plus, generează neîncredere în tehnologie.
        </li>
        <li>
          <strong>Alarme necalibrate.</strong> Un sistem care generează 400 de alarme pe zi nu are 400 de probleme; are
          o configurare greșită. După două săptămâni, operatorii le ignoră pe toate, inclusiv pe cea reală.
        </li>
        <li>
          <strong>Contorizare montată fără comunicație.</strong> Contoare corecte, dar fără modul de citire, citite
          manual o dată pe lună. Modulul costă puțin la montaj și mult mai mult la retrofit, pentru că instalația
          trebuie golită a doua oară.
        </li>
        <li>
          <strong>Sistem închis, acceptat fără să se observe.</strong> Se semnează pentru că oferta e cea mai ieftină
          și se plătește timp de un deceniu, la fiecare extindere.
        </li>
        <li>
          <strong>Documentație as-built lipsă sau formală.</strong> Fără ea, sistemul devine o cutie neagră în momentul
          în care pleacă persoana care l-a programat.
        </li>
        <li>
          <strong>Fără proprietar al sistemului în organizație.</strong> Un sistem BMS la care nu se uită nimeni
          săptămânal se degradează previzibil: setpointuri modificate manual și uitate, programe orare dezactivate
          „temporar”, puncte defecte netratate. La 18 luni, clădirea funcționează din nou pe manual.
        </li>
      </ul>

      <h2 id="diferentele-pe-tipuri-de-cladiri">Diferențele pe șase tipuri de clădiri: birouri, hotel, retail, pharma</h2>
      <p>
        Șase tipuri de clădiri cer arhitecturi diferite ale aceluiași sistem BMS, iar diferența nu vine din marcă, ci
        din ce se contorizează și din regimul de funcționare.
      </p>
      <p>
        <strong>Birouri.</strong> Prioritatea este raportul dintre confort și cost de operare, plus contorizarea pe
        chiriaș pentru recuperarea corectă a cheltuielilor. Programele orare și zonarea fină aduc cel mai mare câștig.
        Detalii pe pagina de <a href="/expertiza/cladiri-de-birouri">clădiri de birouri</a>.
      </p>
      <p>
        <strong>Hoteluri.</strong> Funcționare 24/7, sarcină foarte variabilă, apă caldă menajeră critică și un capitol
        de spa sau wellness cu tratare de aer specială. Interfața cu sistemul de recepție permite trecerea camerelor
        neocupate în regim redus. Diferența de anvergură și de cost dintre un hotel fără control pe cameră și unul cu
        control pe cameră este majoră. Vezi <a href="/expertiza/horeca">HORECA</a>.
      </p>
      <p>
        <strong>Retail.</strong> Multe unități, contorizare separată obligatorie pentru facturare, program de
        funcționare lung și uniform, iluminat cu pondere mare în consum. Vezi <a href="/expertiza/retail">retail</a>.
      </p>
      <p>
        <strong>Industrial și logistic.</strong> Granița dintre clădire și proces se definește explicit în caietul de
        sarcini, altfel apar zone fără responsabil. Interesează disponibilitatea, ventilarea pe zone și, tot mai des,
        monitorizarea consumului pe linie de producție. Vezi <a href="/expertiza/industrial">industrial</a>.
      </p>
      <p>
        <strong>Pharma.</strong> Presiunile diferențiale, temperatura și umiditatea din spațiile clasificate sunt
        parametri de calitate, cu cerințe de monitorizare continuă, înregistrare și trasabilitate. Sistemul de
        monitorizare a mediului este de regulă separat de sistemul BMS de confort, tocmai pentru a nu supune întreaga
        automatizare regimului de calificare. Vezi <a href="/expertiza/pharma">pharma</a>.
      </p>
      <p>
        <strong>Medical.</strong> Blocuri operatorii și terapie intensivă cu cerințe de presiune și filtrare,
        redundanță, disponibilitate ridicată și, aproape întotdeauna, execuție etapizată într-o clădire care nu se
        poate opri. Vezi <a href="/expertiza/medical">medical</a>.
      </p>

      <h2 id="zece-intrebari-pentru-integrator-inainte-de-semnare">
        Zece întrebări pentru integrator: protocoale, licențe, rezervă de 15%
      </h2>
      <p>
        Zece întrebări separă o ofertă completă de una din care lipsesc licențele, orele de punere în funcțiune sau
        documentația. Se pun înainte de semnare, iar răspunsurile se cer în scris.
      </p>
      <ol>
        <li>
          <strong>Ce protocoale sunt native pe controlerele propuse și ce se face prin gateway?</strong> Un gateway în
          plus este un punct de defect și o dependență în plus.
        </li>
        <li>
          <strong>
            Cui aparțin licențele după recepție și cât costă extinderea cu încă 200 de puncte peste cinci ani?
          </strong>{" "}
          Cifra se cere în scris, în ofertă.
        </li>
        <li>
          <strong>Se predă proiectul software în format editabil, cu copii de siguranță?</strong> Dacă răspunsul este
          nu, sistemul nu aparține beneficiarului.
        </li>
        <li>
          <strong>Cine scrie secvențele de funcționare și când pot fi văzute?</strong> Înainte de programare, nu după
          punerea în funcțiune.
        </li>
        <li>
          <strong>Câte ore de punere în funcțiune sunt incluse și ce se testează concret?</strong> Se cere lista de
          teste, nu o valoare globală.
        </li>
        <li>
          <strong>Ce rezervă de puncte are arhitectura propusă?</strong> Sub 15% înseamnă modificări plătite din primul
          an.
        </li>
        <li>
          <strong>Cine răspunde la 2 noaptea, în cât timp și ce înseamnă exact în contract?</strong> Diferența dintre
          „intervenție în 4 ore” și „preluare în 4 ore” este esențială.
        </li>
        <li>
          <strong>Trei clădiri similare puse în funcțiune de aceeași echipă, nu de aceeași firmă.</strong> Referințele
          companiei nu spun nimic despre echipa alocată proiectului.
        </li>
        <li>
          <strong>Ce se întâmplă dacă furnizorul dispare?</strong> Poate altcineva prelua sistemul, cu ce instrumente,
          ce competențe și ce documentație?
        </li>
        <li>
          <strong>Cum se conectează sistemul la rețea și cine are acces de la distanță?</strong> Segmentare, conturi
          nominale, jurnal de acces. Un sistem BMS este un sistem OT conectat, nu un aparat izolat.
        </li>
      </ol>
      <p>
        Pentru un sistem vechi, dilema dintre modernizare și înlocuire este tratată separat în{" "}
        <a href="/resurse/modernizare-retrofit">materialele despre modernizare și retrofit</a>. Pentru integrări între
        sisteme deja existente, vezi{" "}
        <a href="/servicii/integrare-sisteme-knx-dali-modbus-mbus">integrarea KNX, DALI, Modbus și M-Bus</a>.
      </p>

      <h2 id="ce-inseamna-asta-pentru-fiecare-rol">Ce înseamnă pentru proprietar, facility manager și director tehnic</h2>
      <p>
        <strong>Pentru proprietar și investitor.</strong> Un sistem BMS este o măsură de reducere a riscului de
        reglementare și de protejare a valorii activului. Pragul de 290 kW pe familie de sisteme din legea română a
        devenit scadent la 31 decembrie 2024, iar cel european de 70 kW va urma. Trei întrebări de pus intern: care
        este puterea nominală instalată pe clădirile din portofoliu, ce sisteme de automatizare există efectiv și ce
        date despre consum se pot produce astăzi. Aceleași întrebări sunt tratate și pe pagina pentru proprietari și
        investitori.
      </p>
      <p>
        <strong>Pentru facility manager.</strong> Câștigul imediat nu vine dintr-un sistem nou, ci din exploatarea
        corectă a celui existent: programe orare reale, alarme curățate, bucle reacordate, puncte defecte reparate.
        Aceste patru lucruri se fac de obicei în câteva zile de lucru și produc rezultate măsurabile într-o lună.
        Detaliile operaționale sunt grupate pe pagina pentru facility manageri.
      </p>
      <p>
        <strong>Pentru directorul tehnic și inginerul-șef.</strong> Câștigul este în specificație, nu în execuție. Trei
        clauze schimbă echilibrul pe zece ani: comunicație nativă deschisă la nivel de automatizare, predarea completă
        a proiectului software și a hărților de puncte, licențe pe numele beneficiarului cu preț de extindere fixat din
        start. Criteriile de specificație sunt grupate pe pagina pentru directori tehnici.
      </p>

      <ArticleFaqBox items={faq} />

      <h2 id="concluzie">Concluzie</h2>
      <p>
        Un sistem BMS nu se cumpără, se specifică. Clădirile care ajung să funcționeze bine sunt cele în care lista de
        puncte și secvențele de funcționare au fost scrise înainte de prima cerere de ofertă. Pragul de 290 kW pe
        familie de sisteme este scadent din 31 decembrie 2024, iar cel de 70 kW este pe drum, deci întrebarea nu mai
        este dacă, ci cu ce arhitectură. Un sistem închis, acceptat pentru diferența de preț de la semnare, se plătește
        la fiecare extindere din deceniul următor.
      </p>

      <h2 id="discuta-proiectul-cu-un-inginer-sovitech">Discută proiectul cu un inginer Sovitech</h2>
      <p>
        Pentru un sistem care urmează să fie scos la ofertare, pasul util nu este cererea de prețuri, ci definirea a
        ceea ce se cumpără.{" "}
        <a href="/contact">
          <strong>Cere modelul de caiet de sarcini BMS</strong>
        </a>
        , document editabil cu structura listei de puncte, formatul secvențelor de funcționare, clauzele de protocol și
        de licențiere și criteriile de recepție.
      </p>
      <p>
        Pentru o a doua opinie asupra unui sistem existent sau pentru verificarea încadrării la 290 kW, discutăm
        punctual în cadrul serviciului de <a href="/servicii/consultanta">consultanță</a>. Termenii tehnici din acest
        ghid sunt explicați pe scurt în dicționarul de termeni.
      </p>

      <p className="article-note">
        Articol publicat 16.08.2026. Informațiile juridice au fost verificate la 16.08.2026, față de textele publicate
        pe legislatie.just.ro și EUR-Lex. Intervalele de cost, benzile de economie și amortizarea au fost aliniate la
        registrul de cifre și la articolul de referință /resurse/cost-sistem-bms la 17.08.2026. Titlurile de secțiune
        au fost optimizate pentru regăsire la 18.08.2026. Legea 372/2005 se recitește în versiune consolidată înainte
        de fiecare actualizare; pragul de 70 kW din Directiva (UE) 2024/1275 va fi mutat în secțiunea de drept intern
        la momentul transpunerii. Autor: Echipa de inginerie Sovitech Control.
        {/* TODO(author): replace with the signing engineer */}
      </p>
    </ArticleProse>
  )
}
