import { ArticleDiagram, ArticleFaqBox, ArticleProse } from "@/components/article-prose"
import type { ArticleFaq, ArticleMeta } from "./index"

// LINKS-TO-REACTIVATE:
//   materialele despre BMS, SCADA si integrare | interim /resurse/bms-scada-integrare | final /ghid/protocoale-automatizarea-cladirilor
//   cere o verificare a pragului de putere pentru cladire | interim /contact | final /instrumente/test-obligatie-bacs
//   dictionarul tehnic (text fara link) | interim (fara link) | final /dictionar
//   proprietarilor si investitorilor (text fara link) | interim (fara link) | final /pentru/proprietari-si-investitori
//   facility manageri (text fara link) | interim (fara link) | final /pentru/facility-manager
//   rolul de manager ESG (text fara link) | interim (fara link) | final /pentru/esg-sustenabilitate

export const meta: ArticleMeta = {
  title: "Ce este un sistem BMS: definitie si ce nu este | Sovitech Control",
  description:
    "Un sistem BMS (Building Management System) monitorizeaza si controleaza instalatiile unei cladiri. Vezi ce face, din ce e format si cu ce se confunda.",
  datePublished: "2026-08-17",
  dateModified: "2026-08-17",
}

export const faq: ArticleFaq[] = [
  {
    q: "BMS ce inseamna, mai exact?",
    a: "BMS înseamnă Building Management System, sistemul de management al clădirii. A nu se confunda cu Battery Management System, electronica de supraveghere a acumulatorilor. În textele legale românești apare denumirea BACS: sisteme de automatizare și control al clădirilor.",
  },
  {
    q: "Ce diferenta este intre BMS si automatizarea unei centrale termice?",
    a: "Automatizarea centralei termice controlează un singur echipament, local. Un BMS coordonează mai multe instalații, înregistrează istoricul și generează alarme și rapoarte la nivel de clădire. Automatizarea locală poate fi integrată ulterior, dacă are protocol deschis.",
  },
  {
    q: "O clădire mică are nevoie de BMS?",
    a: "Decizia ține de instalații, nu de suprafață. Cu o centrală murală și încălzire electrică, sistemul nu se justifică. Cu centrale de tratare a aerului, chiller sau contorizare pe chiriași, se justifică oricât de mică ar fi clădirea. Ca reper de practică, sub circa 100 de puncte de date un controler local acoperă de regulă operarea.",
  },
  {
    q: "Un BMS reduce factura la energie?",
    a: "Da, prin operare. Economia vine din orare corecte, valori de consemn revizuite, oprirea instalațiilor care funcționează în gol și detectarea defectelor ascunse. Un sistem lăsat pe setările din fabrică produce puțin. Rezultatele apar când cineva citește datele lunar.",
  },
  {
    q: "Se poate integra un BMS cu echipamente de la producători diferiți?",
    a: "Da, dacă echipamentele comunică prin protocoale deschise precum BACnet, Modbus, KNX, DALI sau M-Bus. Problemele apar la sistemele proprietare închise, unde e nevoie de gateway-uri sau de înlocuirea controlerului.",
  },
  {
    q: "Cine proiectează și cine execută un sistem BMS?",
    a: "Proiectarea revine unui inginer de automatizări, iar execuția unui integrator care realizează tabloul, cablarea, programarea, interfața grafică și punerea în funcțiune. Ideal, aceeași echipă asigură și mentenanța, pentru că sistemul are nevoie de reglaj continuu.",
  },
]

export default function Body() {
  return (
    <ArticleProse>
      <p className="standfirst">
        Definiția, cele trei sensuri ale acronimului, funcțiile, componentele și pragul de
        obligativitate.
      </p>

      <p>
        <strong>
          Un sistem BMS (Building Management System) este sistemul de automatizare și supervizare
          care măsoară, comandă și înregistrează centralizat funcționarea instalațiilor tehnice ale
          unei clădiri: încălzire, ventilare, climatizare, iluminat, pompe și contorizare. Nu are
          legătură cu Battery Management System, electronica de supraveghere a unui acumulator, care
          ocupă primele poziții în căutările în limba română. În legislația română și europeană,
          aceeași categorie de sisteme apare sub denumirea BACS, sisteme de automatizare și control
          al clădirilor.
        </strong>
      </p>

      <p>
        Acronimul este folosit în trei domenii fără legătură între ele. Building Management System
        înseamnă instalațiile unei clădiri, Battery Management System înseamnă electronica unui
        acumulator, iar a treia utilizare, ca nume comercial, nu are conținut tehnic. De aici vine
        confuzia din rezultatele de căutare.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ce înseamnă BMS</th>
              <th>Domeniu</th>
              <th>Despre ce este vorba</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Building Management System</strong> (subiectul acestui articol)
              </td>
              <td>Clădiri, instalații, facility management</td>
              <td>
                Sistemul care controlează instalațiile unei clădiri: HVAC, centrale termice,
                chillere, iluminat, contorizare. Termenul legal echivalent este{" "}
                <strong>BACS</strong>.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Battery Management System</strong>
              </td>
              <td>Electronică de putere, stocare de energie, vehicule electrice</td>
              <td>
                Electronica ce supraveghează celulele unui acumulator: tensiune, curent,
                temperatură, echilibrare. Nicio legătură cu instalațiile unei clădiri.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Denumiri comerciale fără legătură</strong>
              </td>
              <td>Business, software, servicii</td>
              <td>
                În mediul de business românesc, BMS apare ca abreviere pentru nume de firme sau
                pentru „business management system". Context comercial, fără conținut tehnic.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>Articolul se referă exclusiv la prima linie.</p>

      <h2 id="pe-scurt">Pe scurt</h2>

      <ul>
        <li>BMS înseamnă Building Management System. Battery Management System este alt domeniu.</li>
        <li>
          Termenul din Legea 372/2005 și din directivele europene este BACS, sisteme de automatizare
          și control al clădirilor.
        </li>
        <li>Un BMS măsoară, reglează, programează, alarmează, înregistrează și raportează.</li>
        <li>
          Legea 372/2005 cere sisteme de automatizare și control la clădirile nerezidențiale cu
          sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă
          de peste 290 kW pe familie de sisteme. Termenul a fost 31 decembrie 2024 și este depășit.
        </li>
        <li>
          Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art.
          13 alin. (9) lit. b), și nu este încă transpus în legea română.
        </li>
        <li>Un termostat inteligent, un smart home și un tablou de automatizare nu sunt BMS.</li>
      </ul>

      <h2 id="ce-este-un-sistem-bms">Definiția unui sistem BMS: senzori, controlere, supervizare</h2>

      <p>
        Un sistem BMS (Building Management System) leagă senzorii, controlerele și stația de
        supervizare într-un singur lanț. Într-o clădire fără BMS, fiecare instalație funcționează
        izolat, iar oprirea unui ventilator se află de la primul chiriaș care sună. Cu BMS, aceleași
        echipamente sunt măsurate, comandate după program și supravegheate din același loc.
      </p>

      <p>
        Lanțul este simplu: senzorii măsoară, rețeaua transportă valorile, controlerele decid și
        comandă, iar stația de supervizare este locul din care se intervine.
      </p>

      <p>Aceeași categorie de sisteme apare în documentație sub mai multe denumiri:</p>

      <ul>
        <li>
          <strong>BACS</strong>, Building Automation and Control System. Termenul din legislația
          română și europeană, cuvântul de căutat într-un text de lege.
        </li>
        <li>
          <strong>BAS</strong>, Building Automation System. Sinonim din piața nord-americană.
        </li>
        <li>
          <strong>BEMS</strong>, Building Energy Management System. Accent pe energie.
        </li>
        <li>
          <strong>BMCS</strong>, Building Management and Control System. Formulare din caiete de
          sarcini.
        </li>
      </ul>

      <p>Acronimele domeniului sunt definite în dicționarul tehnic.</p>

      <h2 id="cele-sase-functii-ale-unui-sistem-bms">
        Cele șase funcții: măsoară, reglează, programează, alarmează, înregistrează, raportează
      </h2>

      <p>
        Un sistem BMS face șase lucruri: măsoară, reglează, programează, alarmează, înregistrează și
        raportează. Fără ultimele două, clădirea nu are nici istoric, nici rapoarte de consum, deci
        nu are cu ce răspunde la o cerere de raportare. Un sistem care doar pornește și oprește
        instalațiile după un orar acoperă două funcții din șase.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Funcție</th>
              <th>Ce înseamnă concret</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Măsoară</strong>
              </td>
              <td>
                Citește permanent valori: temperaturi, umiditate, CO₂, presiuni, debite, stări,
                energie.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Reglează</strong>
              </td>
              <td>
                Comandă echipamentele ca valorile să ajungă la consemn: deschide o vană, modulează
                un ventilator.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Programează</strong>
              </td>
              <td>
                Pornește și oprește instalațiile după orare: zi de lucru, weekend, sărbători, regim
                de noapte.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Alarmează</strong>
              </td>
              <td>
                Semnalează abaterile în timp real, cu prioritate, și le trimite către dispecerat sau
                echipa de mentenanță.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Înregistrează</strong>
              </td>
              <td>
                Salvează istoricul valorilor și al evenimentelor, pentru comparații între luni,
                sezoane și ani.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Raportează</strong>
              </td>
              <td>
                Transformă datele în rapoarte de consum, disponibilitate și conformare, exportabile
                către alte sisteme.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Primele trei țin de operare. Ultimele trei transformă clădirea într-un activ măsurabil și
        sunt, de regulă, cele care lipsesc din caietul de sarcini.
      </p>

      <h2 id="componentele-unui-sistem-bms">
        Cele cinci componente: senzori, controlere DDC, execuție, rețea, supervizare
      </h2>

      <p>
        Un sistem BMS are cinci categorii de componente: senzori și traductoare, controlere DDC
        (Direct Digital Control), elemente de execuție, rețeaua cu protocoalele ei și stația de
        supervizare. Controlerele DDC păstrează logica de reglare local, deci instalația continuă să
        funcționeze și dacă rețeaua cade. Protocoalele uzuale de transport al datelor sunt BACnet,
        Modbus, KNX și M-Bus.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Componentă</th>
              <th>Rol</th>
              <th>Exemple</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Senzori și traductoare</td>
              <td>Măsoară mărimile fizice</td>
              <td>Sonde de temperatură, senzori CO₂, presostate, contoare</td>
            </tr>
            <tr>
              <td>Controlere (DDC)</td>
              <td>Execută logica de reglare local, chiar dacă rețeaua cade</td>
              <td>Automate de clădire, controlere de zonă, module I/O</td>
            </tr>
            <tr>
              <td>Elemente de execuție</td>
              <td>Acționează fizic asupra instalației</td>
              <td>Servomotoare, vane cu motor, convertizoare de frecvență</td>
            </tr>
            <tr>
              <td>Rețea și protocoale</td>
              <td>Transportă datele către supervizare</td>
              <td>BACnet, Modbus, KNX, M-Bus, rețea IP dedicată</td>
            </tr>
            <tr>
              <td>Stația de supervizare</td>
              <td>Interfața din care se vede și se comandă clădirea</td>
              <td>Server BMS, sinoptice HMI, dispecerat, acces web</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ArticleDiagram
        src="/diagrame/A07-1-bucla-de-reglare.jpg"
        caption="Bucla de reglare a unui sistem BMS: senzori, controlere DDC și elemente de execuție, legate prin rețea de stația de supervizare."
      />

      <p>
        Elementul care decide dimensiunea sistemului nu apare în tabel: lista de puncte. Este primul
        lucru care lipsește din caietele de sarcini și ultimul care se cere la recepție, deși
        diferența de preț dintre două oferte vine, de regulă, din numărul de puncte, nu din marcă.
        Redundanța și dimensionarea punctelor sunt detaliate în{" "}
        <a href="/ghid/sisteme-bms-cladiri">ghidul complet despre sistemele BMS pentru clădiri</a>,
        iar alegerea protocoalelor în{" "}
        <a href="/resurse/bms-scada-integrare">materialele despre BMS, SCADA și integrare</a>.
      </p>

      <h2 id="instalatiile-pe-care-le-controleaza-un-sistem-bms">
        HVAC comandat direct, detecția incendiului și controlul accesului doar integrate
      </h2>

      <p>
        Un sistem BMS nu controlează tot ce are curent electric. Comandă direct instalațiile HVAC
        (încălzire, ventilare, climatizare), centralele termice, chillerele, centralele de tratare a
        aerului (CTA), iluminatul tehnic și pompele. Cu detecția incendiului, controlul accesului,
        supravegherea video, ascensoarele, grupurile electrogene și detecția gazelor doar schimbă
        informații: preia stări și alarme, fără să le înlocuiască logica proprie.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ce controlează direct</th>
              <th>Ce integrează, dar nu înlocuiește</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Instalațiile HVAC: încălzire, ventilare, climatizare</td>
              <td>
                Detecția incendiului: BMS preia alarma și oprește ventilația, dar centrala rămâne
                autonomă
              </td>
            </tr>
            <tr>
              <td>Centrale termice, cazane, schimbătoare</td>
              <td>
                Controlul accesului: BMS poate primi starea ușilor, fără să administreze drepturile
              </td>
            </tr>
            <tr>
              <td>Chillere, turnuri de răcire, circuite de apă răcită</td>
              <td>Supravegherea video (CCTV): sistem separat, se corelează evenimentele</td>
            </tr>
            <tr>
              <td>Centrale de tratare a aerului (CTA), ventiloconvectoare, VAV</td>
              <td>Ascensoare: se preiau stări și alarme din controlerul liftului</td>
            </tr>
            <tr>
              <td>Iluminat tehnic și de zonă, prin DALI sau KNX</td>
              <td>Grupuri electrogene și UPS: monitorizare, fără comandă</td>
            </tr>
            <tr>
              <td>Pompe, stații de hidrofor, contorizarea energiei și a apei</td>
              <td>Detecția gazelor: interblocare, cu logică proprie păstrată</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Regula practică: instalațiile cu funcție de siguranța vieții își păstrează logica proprie.
        BMS le vede și reacționează, fără să le înlocuiască.
      </p>

      <h2 id="ce-nu-este-un-sistem-bms">
        Termostatul inteligent, smart home și tabloul de automatizare nu sunt BMS
      </h2>

      <p>
        Cinci sisteme sunt confundate curent cu un BMS: termostatul inteligent, smart home-ul,
        sistemul de securitate, software-ul de facility management (CAFM sau CMMS) și tabloul de
        automatizare. Niciunul nu are, simultan, supervizare centrală, istoricizare și alarme
        prioritizate pentru o echipă de operare. Tabloul de automatizare este o componentă a
        sistemului, nu sistemul.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Se confundă cu</th>
              <th>Ce face de fapt</th>
              <th>De ce nu este BMS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Termostat inteligent</td>
              <td>Reglează temperatura într-un spațiu, cu program orar și aplicație</td>
              <td>Un singur punct, fără supervizare centrală, istoric sau integrare</td>
            </tr>
            <tr>
              <td>Smart home</td>
              <td>Automatizează confortul într-o locuință: lumini, prize, jaluzele</td>
              <td>
                Proiectat pentru un utilizator, nu pentru o echipă de operare. Fără alarme
                prioritizate sau raportare
              </td>
            </tr>
            <tr>
              <td>Sistem de securitate</td>
              <td>Detectează efracția, controlează accesul, înregistrează video</td>
              <td>Alt obiectiv, alte standarde. Se integrează cu BMS, dar rămâne distinct</td>
            </tr>
            <tr>
              <td>Software de facility management (CAFM / CMMS)</td>
              <td>Gestionează cereri de intervenție, contracte, mentenanță</td>
              <td>
                Lucrează cu procese și documente, nu cu echipamente în timp real. Ideal, primește
                alarmele din BMS
              </td>
            </tr>
            <tr>
              <td>Tablou de automatizare</td>
              <td>Conține aparatajul și circuitele de forță ale unei instalații</td>
              <td>
                Este o componentă, nu sistemul. Fără supervizare și istoricizare rămâne automatizare
                locală
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        În cererile de ofertă pe care Sovitech Control le primește la București, cea mai frecventă
        confuzie nu este cea cu SCADA, ci cea cu sistemul de detecție și semnalizare a incendiului.
        Caietul de sarcini cere ca BMS-ul să „gestioneze" incendiul, deși centrala de incendiu
        rămâne autonomă, iar sistemul BMS preia semnalul și oprește ventilația. Diferența se vede la
        buget: interfața de preluare a alarmei costă cât câteva puncte de date, în timp ce o
        centrală de incendiu este un contract separat, cu alt proiectant și altă recepție.
      </p>

      <p>
        <strong>
          Pragul practic de la care o clădire are nevoie de sistem propriu se măsoară în puncte de
          date, nu în metri pătrați, și stă în jurul a 100 de puncte.
        </strong>{" "}
        Cifra este o estimare de practică Sovitech Control, din evaluări de instrumentare, nu o
        valoare preluată dintr-o sursă publicată. Sub 100 de puncte, ele aparțin de regulă unui
        singur agregat, iar un controler local cu program orar și afișaj propriu acoperă operarea: o
        persoană parcurge toată lista pe ecran și leagă o abatere de echipamentul care a produs-o,
        fără să aibă nevoie de supervizare.
      </p>

      <p>
        Peste acest prag, punctele se împart pe mai multe agregate și pe mai multe zone, nimeni nu
        le mai urmărește manual, iar istoricizarea și alarmele prioritizate devin singurul mod de a
        ști ce s-a întâmplat noaptea trecută. La densitatea uzuală de 50-90 de puncte la 1.000 mp
        dintr-o clădire de birouri clasa A, pragul cade undeva între 1.100 și 2.000 mp. Este un prag
        de operare, nu unul economic: justificarea financiară se calculează separat, pe numărul de
        puncte, în articolul despre{" "}
        <a href="/resurse/cost-sistem-bms">cât costă un sistem BMS</a>.
      </p>

      <h2 id="diferenta-dintre-bms-si-scada">
        Diferența BMS și SCADA: clădiri față de procese industriale
      </h2>

      <p>
        Ambele sunt sisteme de supervizare și achiziție de date, dar vin din medii diferite. BMS
        vine din lumea clădirilor, optimizat pentru HVAC, confort, orare și energie. SCADA
        (Supervisory Control and Data Acquisition) vine din industrie, mai generic, potrivit pentru
        procese tehnologice, unde continuitatea și trasabilitatea contează mai mult decât confortul.
      </p>

      <p>
        În practică, o clădire de birouri primește BMS, o fabrică primește SCADA, iar un spital sau
        o platformă pharma le are pe amândouă. Comparația detaliată este în articolul{" "}
        <a href="/resurse/scada-vs-bms">SCADA vs BMS</a>.
      </p>

      <h2 id="ce-inseamna-un-bms-pentru-fiecare-rol">
        Ce cer de la BMS proprietarul, facility managerul și managerul ESG
      </h2>

      <p>
        <strong>Pentru proprietar și investitor</strong>, sistemul BMS dă consumurile reale ale
        activului și susține raportările cerute la vânzare sau la refinanțare.
      </p>

      <p>
        <strong>Pentru facility manager</strong>, este instrumentul zilnic: alarma ajunge înainte de
        telefonul chiriașului. Un sistem prost configurat produce însă sute de alarme pe care nu le
        mai citește nimeni.
      </p>

      <p>
        <strong>Pentru managerul ESG</strong>, sistemul este sursa primară de date: consumuri pe
        utilități și pe chiriași, ore de funcționare, indicatori de eficiență. Într-o clădire fără
        contorizare secundară, repartiția pe chiriaș rămâne o estimare, oricât de bun ar fi softul.
      </p>

      <h2 id="obligatia-legala-din-romania">
        Obligația din Legea 372/2005: peste 290 kW, termen 31 decembrie 2024
      </h2>

      <p>
        Obligația există și are un termen deja depășit.{" "}
        <a
          href="https://legislatie.just.ro/Public/DetaliiDocument/66970"
          target="_blank"
          rel="noopener"
        >
          Legea 372/2005
        </a>
        , la art. 27 alin. (5) și, cu formulare identică pentru climatizare, la art. 29 alin. (6),
        cere ca clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu
        ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme, să fie echipate
        cu sisteme de automatizare și control pentru clădiri, dacă este fezabil tehnic și economic.
        Termenul a fost 31 decembrie 2024 și este depășit.
      </p>

      <p>
        Legea nu cere o cutie, ci trei capabilități: monitorizarea, înregistrarea, analiza și
        ajustarea continuă a consumului de energie; evaluarea eficienței, detectarea pierderilor și
        informarea persoanei responsabile; comunicarea cu sistemele tehnice conectate și
        interoperabilitatea între tehnologii proprietare diferite. Un sistem care doar pornește și
        oprește instalațiile după un orar nu îndeplinește niciuna dintre cele trei. A patra
        capabilitate, monitorizarea calității mediului interior, se adaugă de la 29 mai 2026 prin{" "}
        <a href="https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng" target="_blank" rel="noopener">
          Directiva (UE) 2024/1275
        </a>
        , art. 13 alin. (10) lit. d), și nu se află încă în legea română.
      </p>

      <p>
        Textul integral și sancțiunile sunt în articolul despre{" "}
        <a href="/resurse/obligatie-bacs-legea-372-2005">obligația BACS din Legea 372/2005</a>.
        Separat, pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275,
        art. 13 alin. (9) lit. b), și nu este încă transpus în legea română.
      </p>

      <h2 id="structura-costului">Costul unui BMS: 4-18 EUR/mp și 90-320 EUR pe punct</h2>

      <p>
        Nu există un preț pe metru pătrat valabil universal: costul depinde de numărul de puncte, de
        complexitatea instalațiilor și de infrastructura existentă. Ca <strong>estimare</strong>, un
        sistem nou complet costă <a href="/resurse/cost-sistem-bms">4-18 EUR/mp</a>, bandă agregată
        care acoperă retail, birouri clasa B, birouri clasa A și hotel fără control pe cameră, iar
        un punct de date costă între 90 și 320 EUR, în funcție de volum. O modernizare care
        păstrează cablarea și elementele de execuție costă semnificativ mai puțin decât un sistem
        nou.
      </p>

      <p>
        Logica de preț, cu intervale pe tipuri de clădiri, este în articolul despre{" "}
        <a href="/resurse/cost-sistem-bms">cât costă un sistem BMS în România</a>.
      </p>

      <ArticleFaqBox items={faq} />

      <h2 id="concluzie">Concluzie</h2>

      <p>
        Cea mai scumpă confuzie nu este cea dintre BMS și SCADA, ci dintre un sistem de management
        al clădirii și un set de automatizări locale care nu comunică între ele. A doua variantă
        costă aproape la fel și nu produce nici date, nici rapoarte, nici conformare. Diferența se
        vede la prima cerere de raportare energetică, când cineva trebuie să spună de unde vine
        cifra.
      </p>

      <h2 id="discuta-proiectul-cu-un-inginer-sovitech">Discută proiectul cu un inginer Sovitech</h2>

      <p>
        Nivelul următor de detaliu, de la arhitectură la criteriile de alegere a furnizorului, este
        în <a href="/ghid/sisteme-bms-cladiri">ghidul complet despre sistemele BMS pentru clădiri</a>
        . Pentru pragul legal,{" "}
        <a href="/contact">cere o verificare a pragului de putere pentru clădire</a>, iar pentru
        etapa de implementare, pagina despre{" "}
        <a href="/servicii/executie-sisteme-bms">execuția unui sistem BMS</a>.
      </p>

      <p className="article-note">
        Articol publicat 17.08.2026. Actualizat 19.08.2026. Informațiile juridice au fost verificate
        la 17.08.2026, pe textul Legii 372/2005 și pe Directiva (UE) 2024/1275, netranspusă la data
        verificării. Intervalul de cost este aliniat la /resurse/cost-sistem-bms. Pragul de circa 100 de puncte de date este o estimare de practică proprie, nu o cifră
        preluată dintr-o sursă publicată. Autor: Echipa de inginerie Sovitech Control.{" "}
        {/* TODO(author): replace with the signing engineer */}
      </p>
    </ArticleProse>
  )
}
