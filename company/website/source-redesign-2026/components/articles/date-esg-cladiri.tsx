import { ArticleDiagram, ArticleFaqBox, ArticleProse } from "@/components/article-prose"
import type { ArticleFaq, ArticleMeta } from "./index"

// LINKS-TO-REACTIVATE:
// materialele despre BMS, SCADA si integrare (veriga 2, protocoale) | interim /resurse/bms-scada-integrare | final /ghid/protocoale-automatizarea-cladirilor
// materialele despre istoricizare si arhitectura sistemelor (veriga 3) | interim /resurse/bms-scada-integrare | final /resurse/istoricizare-date-bms-cat-timp
// materialele despre performanta cladirii (veriga 4, repere de consum) | interim /resurse/performanta-cladirii | final /resurse/benchmark-kwh-mp-birouri-romania
// materialele despre contorizare si raportare (limitele facturii) | interim /resurse/esg-energie-raportare | final /resurse/submetering-cladiri-multi-tenant
// materialele despre ESG, energie si raportare (Scope 1, 2 si 3) | interim /resurse/esg-energie-raportare | final /resurse/scope-1-2-3-date-cladire
// categoria ESG, energie si raportare (cine raporteaza) | interim /resurse/esg-energie-raportare | final /resurse/csrd-omnibus-cine-raporteaza
// materialele despre date si raportare (calitatea datelor din BMS) | interim /resurse/esg-energie-raportare | final /resurse/bms-date-credibile-esg
// materialele despre reglementari si conformare | interim /resurse/reglementari-conformare | final /ghid/conformare-cladiri-romania
// cere reperul de consum kWh/mp pentru cladiri de birouri | interim /contact | final /instrumente/benchmark-kwh-mp
// pagina managerilor ESG | interim text fara link | final /pentru/esg-sustenabilitate

export const meta: ArticleMeta = {
  title: "Raportare ESG cladiri: de unde vin datele | Sovitech Control",
  description:
    "Raportare ESG cladiri: datele de consum vin dintr-un lant cu 6 verigi, de la contor la indicator. Vezi unde se rupe si ce poate produce o cladire.",
  datePublished: "2026-08-17",
  dateModified: "2026-08-18",
}

export const faq: ArticleFaq[] = [
  {
    q: "Sunt suficiente facturile pentru raportarea ESG a unei cladiri?",
    a: "Pentru un total anual de consum, de multe ori da. Pentru orice altceva, nu. Factura este lunară, adică douăsprezece valori pe an, agregată pe branșament, întârziată cu 15-45 de zile și fără cauze. Risipa nu se identifică, consumul chiriașilor nu se separă, iar o îmbunătățire reală nu se poate demonstra.",
  },
  {
    q: "Ce rezoluție trebuie să aibă datele de consum?",
    a: "15 minute pentru energia electrică, fiindcă se aliniază cu intervalul de decontare din piața de energie și arată profilul de ocupare, vârfurile și consumul de bază de noapte. Pentru energie termică și apă, intervalul orar este de obicei suficient. Retenția minimă este de 24 de luni la rezoluție completă. Datele zilnice sau lunare nu permit analiză de cauză.",
  },
  {
    q: "Cine trebuie să raporteze CSRD după pachetul Omnibus?",
    a: "Conform Directivei (UE) 2026/470, în vigoare din 18 martie 2026: întreprinderile mari cu peste 1.000 de angajați și peste 450 de milioane EUR cifră de afaceri netă, ambele condiții cumulativ. IMM-urile listate sunt exceptate integral. Prima raportare vizează exercițiile financiare care încep de la 1 ianuarie 2027, iar termenul de transpunere este 19 martie 2027.",
  },
  {
    q: "Sunt standardele ESRS revizuite definitive?",
    a: "Nu. Comisia a adoptat actele delegate privind ESRS revizuit și standardul voluntar la începutul lunii iulie 2026, dar ele se află în perioada de scrutin al Parlamentului European și al Consiliului, deci nu sunt încă definitive. Cerințele detaliate rămân susceptibile de modificare.",
  },
  {
    q: "Ce se face cu consumul chiriașilor, în lipsa contoarelor separate?",
    a: "Consumul chiriașilor se estimează prin repartizare pe suprafață, cu marcare explicită în raport a metodei și a faptului că este o estimare. Acceptabil ca soluție temporară. Soluția durabilă este contorizarea separată pe unitate locativă, plus o clauză de partajare a datelor în contractul de închiriere.",
  },
]

export default function Body() {
  return (
    <ArticleProse>
      <p className="standfirst">
        Cele șase verigi ale lanțului de date, cum se rupe fiecare și ce poate produce infrastructura tehnică a unei
        clădiri.
      </p>

      <p>
        <strong>
          Datele pentru raportarea ESG a unei clădiri vin dintr-un lanț cu șase verigi: punctul de măsură, achiziția,
          istoricizarea, agregarea, verificarea și raportarea. Facturile acoperă doar ultima verigă. Consumul pe
          surse, intensitatea energetică și emisiile Scope 1-2 se produc în infrastructura tehnică a clădirii:
          contoare, controlere, BMS (Building Management System) și istoric de date.
        </strong>
      </p>
      <p>
        Fiecare raport de sustenabilitate are o notă de subsol care spune de unde vine cifra de kWh. Într-o bună parte
        din cazuri, răspunsul real este: din douăsprezece facturi adunate într-un fișier de calcul.
      </p>

      <h2 id="pe-scurt-sase-verigi-15-minute-24-de-luni">Pe scurt: șase verigi, 15 minute, 24 de luni</h2>
      <ul>
        <li>
          Datele de consum trec prin șase verigi: punct de măsură, achiziție, istoricizare, agregare, verificare,
          raportare.
        </li>
        <li>
          Factura acoperă o singură verigă și produce douăsprezece valori de consum pe an, agregate pe branșament.
        </li>
        <li>
          Rezoluția de referință pentru energia electrică este de 15 minute, cu retenție de minimum 24 de luni la
          rezoluție completă, pentru toate categoriile de puncte.
        </li>
        <li>
          Infrastructura tehnică a clădirii acoperă integral energia, apa și calitatea mediului interior, parțial
          emisiile și deloc deșeurile.
        </li>
        <li>
          Directiva (UE) 2026/470 restrânge sfera raportării CSRD la întreprinderile cu peste 1.000 de angajați și
          peste 450 de milioane EUR cifră de afaceri netă, ambele condiții cumulativ, cu prima raportare pentru
          exercițiile financiare începute de la 1 ianuarie 2027.
        </li>
      </ul>

      <h2 id="cele-sase-verigi-de-la-punctul-de-masura-la-kwh-mp-an">
        Cele șase verigi: de la punctul de măsură la kWh/mp/an
      </h2>
      <p>
        Între un cazan care arde gaz și rândul din raportul de sustenabilitate există un traseu cu șase verigi: punctul
        de măsură, achiziția pe magistrală, istoricizarea, agregarea și normalizarea, verificarea și raportarea.
        Fiecare se rupe în felul ei, iar când se rupe, cifra rămâne acolo. Doar că nu mai înseamnă ce pare.
      </p>

      <ArticleDiagram
        src="/diagrame/A09-1-lantul-de-date-esg.jpg"
        caption="Lanțul de date ESG: cele șase verigi, de la punctul de măsură la raportare, cu modul tipic de eșec al fiecăreia."
      />

      <h2 id="veriga-1-punctul-de-masura-contor-electric-de-gaz-de-apa-sonda">
        Veriga 1, punctul de măsură: contor electric, de gaz, de apă, sondă
      </h2>
      <p>
        Prima verigă a lanțului de date ESG este punctul de măsură: un contor de energie pe un plecare din tabloul
        general, un contor de gaz pe branșament, un debitmetru pe apă, o sondă pe tur. Dacă mărimea nu este măsurată
        aici, niciun software din amonte nu o poate produce.
      </p>
      <p>
        <strong>Ce merge prost la punctul de măsură:</strong> lipsește contorul pe consumatorul relevant; contorul are
        afișaj, dar nu și ieșire de comunicație; transformatoarele de curent supradimensionate pierd precizia la
        sarcini mici; clasa de precizie nu este documentată.
      </p>

      <h2 id="veriga-2-achizitia-modbus-m-bus-bacnet-knx-si-dali">
        Veriga 2, achiziția: Modbus, M-Bus, BACnet, KNX și DALI
      </h2>
      <p>
        A doua verigă a lanțului de date ESG este achiziția pe magistrală: un controler interoghează automat contoarele
        instalate la veriga 1, prin <strong>Modbus</strong> (RTU pe RS-485 sau TCP) pentru contoare și forță,{" "}
        <strong>M-Bus</strong> pentru energie termică și apă, <strong>BACnet</strong> pentru automatizare, plus KNX și
        DALI. Comparația între protocoale se află în{" "}
        <a href="/resurse/bms-scada-integrare">materialele despre BMS, SCADA și integrare</a>.
      </p>
      <p>
        <strong>Ce merge prost la achiziție:</strong> harta de registre lipsește; magistrala supraîncărcată produce
        timeout-uri și goluri în șirul de valori; după doi ani nimeni nu mai știe ce alimentează „Contor 7”; se citește
        doar puterea instantanee, nu indexul de energie cumulată, iar reconcilierea cu factura devine imposibilă.
      </p>

      <h2 id="veriga-3-istoricizarea-la-15-minute-cu-retentie-de-24-de-luni">
        Veriga 3, istoricizarea la 15 minute, cu retenție de 24 de luni
      </h2>
      <p>
        A treia verigă a lanțului de date ESG este istoricizarea, iar aici se decid trei lucruri care nu se mai repară
        retroactiv: rezoluția de salvare, durata de retenție și comportamentul sistemului când este oprit. Referința
        practică este de 15 minute pentru energia electrică și o retenție de minimum 24 de luni la rezoluție completă,
        pentru că sub 24 de luni nu există comparație an la an. O clădire care salvează la 15 minute poate răspunde la
        întrebarea despre consumul de noapte. Una care salvează o valoare pe zi, nu.
      </p>
      <p>
        <strong>Ce merge prost la istoricizare:</strong> rezoluție zilnică în loc de 15 minute; retenție de trei luni,
        deci fără comparație an la an; serverul s-a oprit în august, nimeni nu a observat, iar golul din șirul de
        valori este acum o gaură în raportul anual. Cât timp se păstrează datele și la ce rezoluție, în{" "}
        <a href="/resurse/bms-scada-integrare">materialele despre istoricizare și arhitectura sistemelor</a>.
      </p>

      <h2 id="veriga-4-agregarea-si-normalizarea-grade-zile-ore-de-ocupare-suprafata">
        Veriga 4, agregarea și normalizarea: grade-zile, ore de ocupare, suprafață
      </h2>
      <p>
        A patra verigă a lanțului de date ESG este agregarea cu normalizarea, pentru că un consum brut nu spune nimic
        singur. 1.400 MWh de energie finală pe an, pentru întreaga clădire, înseamnă mult sau puțin? Răspunsul cere
        trei normalizări. <strong>Grade-zilele</strong> corectează severitatea climatică a anului; fără ele, o iarnă
        blândă arată ca o îmbunătățire de performanță. <strong>Orele de ocupare</strong> explică de ce „economia” din
        2020-2021 a fost, în multe portofolii, doar absența oamenilor. <strong>Suprafața</strong> transformă consumul
        în intensitate energetică, exprimată în kWh/mp/an.
      </p>
      <p>
        <strong>Ce merge prost la agregare:</strong> se amestecă suprafețe de tipuri diferite la același numitor; se
        raportează kWh/mp/an fără să se precizeze dacă include consumul chiriașilor; comparația se face cu repere
        construite pe altă convenție de suprafață. Reperele de consum și metoda de comparație sunt tratate în{" "}
        <a href="/resurse/performanta-cladirii">materialele despre performanța clădirii</a>.
      </p>

      <h2 id="veriga-5-verificarea-reconcilierea-cu-factura-la-2-3-diferenta">
        Veriga 5, verificarea: reconcilierea cu factura, la 2-3% diferență
      </h2>
      <p>
        A cincea verigă a lanțului de date ESG este verificarea, iar instrumentul ei principal este{" "}
        <strong>reconcilierea cu factura</strong>: suma indexurilor de energie citite pe contoarele proprii trebuie să
        se apropie de cantitatea facturată de furnizor pentru aceeași perioadă. O diferență de 2-3% între suma
        contoarelor proprii și cantitatea facturată este explicabilă; una de 18% arată că lipsește un consumator din
        schema de contorizare sau că un contor citește greșit.
      </p>
      <p>
        <strong>Detecția valorilor imposibile</strong> cere cinci sau șase reguli automate aplicate pe șirul de valori
        istoricizate: index de energie care scade, putere negativă fără producție locală, temperatură de tur de 240 °C.
      </p>
      <p>
        <strong>Ce merge prost la verificare:</strong> nimeni nu compară suma contoarelor cu factura, erorile se
        compensează reciproc și par plauzibile, iar un an întreg de date se corectează manual în foaia de calcul, fără
        urmă a corecției.
      </p>

      <h2 id="veriga-6-raportarea-kwh-mp-an-si-tco2e">Veriga 6, raportarea: kWh/mp/an și tCO₂e</h2>
      <p>
        A șasea verigă a lanțului de date ESG este raportarea, iar abia acum se produc indicatorii finali: intensitatea
        energetică în kWh/mp/an și emisiile în tCO₂e. Consultantul ESG și platforma de raportare nu creează date, le
        formatează.
      </p>
      <p>
        <strong>Ce merge prost la raportare:</strong> export manual, o dată pe an, făcut de o persoană care apoi pleacă
        din companie; nicio pistă de audit; factorul de emisie folosit fără sursă și fără an de referință; ceea ce se
        raportează drept „măsurat” este, de fapt, estimat.
      </p>
      <p>Fiecare dintre cele șase verigi se verifică în zece minute, cu o singură cerere adresată echipei tehnice:</p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Verigă</th>
              <th>Cum se verifică în 10 minute</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1. Punct de măsură</td>
              <td>Se cere schema de contorizare. Dacă nu există, răspunsul e dat.</td>
            </tr>
            <tr>
              <td>2. Achiziție</td>
              <td>Se întreabă cine urcă în tablou să citească un index.</td>
            </tr>
            <tr>
              <td>3. Istoricizare</td>
              <td>Se cere graficul consumului pentru o zi de acum 14 luni.</td>
            </tr>
            <tr>
              <td>4. Agregare</td>
              <td>Se întreabă ce suprafață stă la numitorul kWh/mp/an.</td>
            </tr>
            <tr>
              <td>5. Verificare</td>
              <td>Se cere ultima reconciliere contor-factură, în scris.</td>
            </tr>
            <tr>
              <td>6. Raportare</td>
              <td>Se cere fișierul-sursă al raportului de anul trecut.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="limitele-facturii-12-valori-pe-an-agregate-pe-bransament">
        Limitele facturii: 12 valori pe an, agregate pe branșament
      </h2>
      <p>
        Factura de energie are patru limite structurale ca sursă de date de performanță, chiar dacă este un document
        contabil corect.
      </p>
      <ul>
        <li>
          <strong>Este lunară.</strong> Douăsprezece valori de consum pe an nu arată consumul de noapte și nici
          pornirile la ora 4 dimineața. Un profil la rezoluție de 15 minute înseamnă circa 35.000 de valori pe an,
          pentru același contor.
        </li>
        <li>
          <strong>Este agregată pe branșament.</strong> Arată cât a intrat în clădire, nu cât a consumat HVAC-ul,
          iluminatul sau chiriașul de la etajul 3. Vezi{" "}
          <a href="/resurse/esg-energie-raportare">materialele despre contorizare și raportare</a>.
        </li>
        <li>
          <strong>Este întârziată.</strong> Ajunge la 15-45 de zile după consum. O anomalie descoperită atunci a avut o
          lună să producă costuri.
        </li>
        <li>
          <strong>Nu conține cauze.</strong> Fără temperaturi de tur, poziții de clapete, ore de funcționare a pompelor
          sau setpoint-uri modificate manual în februarie și uitate acolo.
        </li>
      </ul>
      <p>
        <strong>Cu facturi se poate raporta, dar nu se poate îmbunătăți.</strong>
      </p>

      <h2 id="ce-poate-produce-infrastructura-tehnica-energie-apa-mediu-interior">
        Ce poate produce infrastructura tehnică: energie, apă, mediu interior
      </h2>
      <p>
        Infrastructura tehnică a unei clădiri, adică punctele de măsură plus BMS-ul (Building Management System),
        acoperă integral consumul de energie pe surse, consumul de apă și calitatea mediului interior, acoperă parțial
        emisiile și ponderea regenerabilelor și nu acoperă deloc deșeurile. Cerințele care nu apar cu „Da” în tabelul
        de mai jos rămân colectare administrativă, oricâte contoare s-ar monta.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ce se cere</th>
              <th>Ce înseamnă la nivel de clădire</th>
              <th>Poate produce infrastructura tehnică?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Consum de energie, pe surse</td>
              <td>Electricitate, gaz, termie din SACET, combustibil de generator, producție locală</td>
              <td>
                <strong>Da</strong>, cu contoare comunicante pe fiecare sursă
              </td>
            </tr>
            <tr>
              <td>Pondere din surse regenerabile</td>
              <td>Producție fotovoltaică autoconsumată plus componenta contractuală</td>
              <td>
                <strong>Parțial.</strong> Producția locală da; originea energiei din rețea vine din contract
              </td>
            </tr>
            <tr>
              <td>Intensitate energetică la suprafață</td>
              <td>kWh/mp/an, cu convenție declarată</td>
              <td>
                <strong>Da</strong>, dacă suprafața e definită o dată și folosită consecvent
              </td>
            </tr>
            <tr>
              <td>Intensitate energetică la cifra de afaceri</td>
              <td>MWh / milion EUR venituri</td>
              <td>
                <strong>Nu.</strong> Numărătorul da, numitorul vine din contabilitate
              </td>
            </tr>
            <tr>
              <td>Emisii pe categorii (Scope 1, 2, 3)</td>
              <td>Conversia consumurilor în tCO₂e</td>
              <td>
                <strong>Parțial.</strong> Datele de activitate da; factorii de emisie, nu
              </td>
            </tr>
            <tr>
              <td>Consum de apă</td>
              <td>Apă rece, apă caldă menajeră, apă de adaos, turnuri de răcire</td>
              <td>
                <strong>Da</strong>, cu contoare cu impuls sau M-Bus. În practică lipsesc
              </td>
            </tr>
            <tr>
              <td>Deșeuri</td>
              <td>Cantități pe fracții, destinație</td>
              <td>
                <strong>Nu.</strong> Nu există instrumentație
              </td>
            </tr>
            <tr>
              <td>Calitatea mediului interior</td>
              <td>CO₂, temperatură, umiditate în zonele ocupate</td>
              <td>
                <strong>Da</strong>, cu senzori în încăperi, nu pe tubulatura de retur
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Cerința ca o ofertă care promite „rezolvarea ESG-ului” să se încadreze pe rândurile tabelului de mai sus
        scurtează discuția comercială.
      </p>

      <h2 id="scope-1-2-si-3-la-nivel-de-cladire-gaz-retea-chiriasi">
        Scope 1, 2 și 3 la nivel de clădire: gaz, rețea, chiriași
      </h2>
      <ul>
        <li>
          <strong>Scope 1, ardere directă pe amplasament.</strong> Gazul ars în centrala proprie, motorina din
          generator, flota proprie, scăpările de agent frigorific din chillere și VRF. Date: contor de gaz, jurnalul
          generatorului, fișe de intervenție.
        </li>
        <li>
          <strong>Scope 2, energie achiziționată.</strong> Electricitatea din rețea și energia termică din
          termoficare. Date: indexuri de contor, ideal la rezoluția de 15 minute folosită pentru energia electrică
          sau, cel puțin, orară.
        </li>
        <li>
          <strong>Scope 3, restul lanțului valoric.</strong> Consumul chiriașilor, naveta angajaților, deșeurile,
          emisiile încorporate în materiale.
        </li>
      </ul>
      <p>
        Într-o clădire de birouri închiriată, cea mai mare parte a consumului se produce în spații pe care proprietarul
        nu le operează. Proprietarul are obligația de a raporta consumul chiriașilor la Scope 3, dar nu are nici
        contorul, nici accesul, nici pârghia contractuală. Consumul chiriașilor se estimează atunci prin repartizare pe
        suprafață, o ficțiune utilă, nu o măsurătoare: un chiriaș cu sală de servere și program non-stop este tratat
        identic cu unul care are birouri goale trei zile pe săptămână.
      </p>
      <p>
        Soluția tehnică pentru consumul chiriașilor este contorizarea separată pe unitate locativă, iar cea
        contractuală este clauza verde de închiriere. Contorizarea separată și clauza verde se decid devreme, fiindcă
        retrofitul într-o clădire ocupată e scump. Împărțirea pe Scope 1, 2 și 3 este detaliată în{" "}
        <a href="/resurse/esg-energie-raportare">materialele despre ESG, energie și raportare</a>.
      </p>

      <h2 id="cine-raporteaza-csrd-peste-1-000-de-angajati-si-450-mil-eur">
        Cine raportează CSRD: peste 1.000 de angajați și 450 mil. EUR
      </h2>

      <h3 id="sfera-europeana-dupa-directiva-ue-2026-470-in-vigoare-din-18-martie-2026">
        Sfera europeană după Directiva (UE) 2026/470, în vigoare din 18 martie 2026
      </h3>
      <p>
        <a href="https://eur-lex.europa.eu/eli/dir/2026/470/oj/eng" target="_blank" rel="noopener">
          Directiva (UE) 2026/470
        </a>{" "}
        din 24 februarie 2026, publicată în Jurnalul Oficial la 26 februarie 2026, a intrat în vigoare la{" "}
        <strong>18 martie 2026</strong>. Sfera nouă a raportării de sustenabilitate: întreprinderile mari cu{" "}
        <strong>peste 1.000 de angajați ȘI peste 450 de milioane EUR cifră de afaceri netă</strong>, ambele condiții
        cumulativ. <strong>IMM-urile listate sunt exceptate integral.</strong> Prima raportare: exercițiile financiare
        care încep de la <strong>1 ianuarie 2027</strong> (rapoarte în 2028). Termen de transpunere:{" "}
        <strong>19 martie 2027</strong>.
      </p>

      <h3 id="esrs-revizuit-inca-in-scrutin-pentru-exercitii-din-1-ianuarie-2027">
        ESRS revizuit, încă în scrutin, pentru exerciții din 1 ianuarie 2027
      </h3>
      <p>
        Comisia a adoptat actele delegate privind <strong>ESRS revizuit</strong> și standardul voluntar la începutul
        lunii iulie 2026 (
        <a
          href="https://www.efrag.org/en/news-and-calendar/news/european-commission-publishes-delegated-act-on-revised-esrs-and-voluntary-sustainability-reporting"
          target="_blank"
          rel="noopener"
        >
          anunț EFRAG, 3 iulie 2026
        </a>
        ). Actele delegate privind ESRS revizuit se află în{" "}
        <strong>perioada de scrutin al Parlamentului European și al Consiliului, deci nu sunt încă definitive</strong>.
        Aplicare vizată: exercițiile financiare care încep de la 1 ianuarie 2027, cu adoptare timpurie posibilă pentru
        2026. Standardele sectoriale au fost eliminate.
      </p>

      <h3 id="romania-transpunerea-directivei-ue-2026-470-pana-la-19-martie-2027">
        România: transpunerea Directivei (UE) 2026/470 până la 19 martie 2027
      </h3>
      <p>
        CSRD a fost transpusă în România prin{" "}
        <a href="https://legislatie.just.ro/Public/DetaliiDocument/278502" target="_blank" rel="noopener">
          OMF nr. 85/2024
        </a>
        . OMF nr. 1421/2025, publicat la 22 august 2025, a aplicat „stop-the-clock”: valul 2 amânat la 2028
        (exercițiul 2027), valul 3 la 2029 (exercițiul 2028).{" "}
        <strong>România nu a transpus încă Directiva (UE) 2026/470</strong>, termenul de transpunere fiind 19 martie
        2027.
      </p>
      <p>
        Numărul companiilor obligate direct s-a redus prin pragul de 1.000 de angajați și 450 de milioane EUR, iar
        calendarul s-a mutat mai departe. Cererea de date nu a scăzut. Evoluția sferei de raportare este urmărită în{" "}
        <a href="/resurse/esg-energie-raportare">categoria ESG, energie și raportare</a>.
      </p>

      <h2 id="cererea-de-date-in-afara-pragului-de-1-000-de-angajati-trei-cai">
        Cererea de date în afara pragului de 1.000 de angajați: trei căi
      </h2>
      <p>
        Chiar și pentru o companie aflată sub pragul CSRD de 1.000 de angajați și 450 de milioane EUR cifră de afaceri
        netă, cererea de date ajunge la proprietarul clădirii pe trei căi. O companie care raportează are nevoie de
        datele furnizorilor pentru propriul Scope 3, deci chestionarul vine indiferent de prag. Într-o refinanțare,
        performanța energetică a clădirii intră în due diligence, iar în lipsa datelor se lucrează cu ipoteze
        conservatoare, adică în preț. Un chiriaș corporate cere date pentru spațiul închiriat, uneori ca anexă
        contractuală.
      </p>
      <p>Niciunul dintre aceste trei canale nu produce amenzi. Toate produc, în timp, cost de capital.</p>

      <h2 id="sapte-moduri-de-a-produce-date-esg-proaste">Șapte moduri de a produce date ESG proaste</h2>
      <ol>
        <li>
          <strong>Contorizare doar pe branșamentul general.</strong> Un total raportabil, fără atribuire pe zone și
          fără cauze.
        </li>
        <li>
          <strong>Contoare necitite automat.</strong> Pentru raportare, echivalentul unei facturi: douăsprezece valori
          pe an.
        </li>
        <li>
          <strong>Puncte necalibrate.</strong> La contoarele de energie termică nu se știe adesea dacă perechea de
          sonde a fost potrivită. Cifra există, fără trasabilitate.
        </li>
        <li>
          <strong>Goluri în istoric.</strong> Se completează prin interpolare, iar interpolarea nu e marcată nicăieri.
          Raportul spune „măsurat” unde realitatea e „estimat”.
        </li>
        <li>
          <strong>Suprafețe raportate inconsistent.</strong> Cea mai frecventă și mai invizibilă eroare. GLA, GIA,
          suprafața utilă și cea încălzită pot diferi între ele cu 15-30% pentru aceeași clădire, iar o schimbare de
          convenție de suprafață între doi ani consecutivi „îmbunătățește” intensitatea energetică în kWh/mp/an fără
          ca vreo instalație să fi fost atinsă.
        </li>
        <li>
          <strong>Lipsa separării pe chiriași.</strong> Fără contorizare pe unități locative, costurile nu se
          recuperează corect.
        </li>
        <li>
          <strong>Imposibilitatea exportului.</strong> Fără export automat, fără API, fără acces la baza de date.
          Datele există și sunt inaccesibile.
        </li>
      </ol>

      <h2 id="elementele-unei-infrastructuri-de-date-cinci-niveluri-15-minute-24-de-luni">
        Elementele unei infrastructuri de date: cinci niveluri, 15 minute, 24 de luni
      </h2>

      <h3 id="arborele-de-contorizare-pe-cinci-niveluri-cu-inchidere-la-plus-minus-3">
        Arborele de contorizare pe cinci niveluri, cu închidere la plus minus 3%
      </h3>
      <p>
        Contorizarea unei clădiri se construiește ca un arbore cu cinci niveluri, nu ca o colecție de contoare:
        branșament, clădire, zonă sau sistem, chiriaș și echipament major. Fiecare nivel răspunde la altă întrebare,
        iar regula de închidere care ține arborele în picioare este simplă:{" "}
        <strong>
          suma contoarelor de pe nivelul n+1 trebuie să fie egală cu valoarea citită pe nivelul n, cu o toleranță de
          plus minus 3%.
        </strong>{" "}
        Dacă suma contoarelor de zonă nu se închide în contorul general al clădirii cu această toleranță, lipsește un
        contor din schemă sau unul dintre ele citește greșit.
      </p>

      <ArticleDiagram
        src="/diagrame/A09-2-arborele-de-contorizare.jpg"
        caption="Arborele de contorizare al unei clădiri, pe cinci niveluri, cu regula de închidere la plus minus 3%."
      />

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nivel</th>
              <th>Ce se contorizează</th>
              <th>Ce întrebare permite</th>
              <th>Rezoluție minimă</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>0: Branșament</td>
              <td>Contorul fiscal al furnizorului</td>
              <td>Cât se plătește și cât se facturează?</td>
              <td>Lunar; orar cu curba de sarcină</td>
            </tr>
            <tr>
              <td>1: Clădire</td>
              <td>Contor general propriu pe fiecare sursă</td>
              <td>Cât consumă clădirea și se potrivește cu factura?</td>
              <td>15 min electric; orar termic și apă</td>
            </tr>
            <tr>
              <td>2: Zonă / sistem</td>
              <td>HVAC, iluminat, prize comune, pompe, ascensoare</td>
              <td>Pe ce se duce energia? Care sistem crește?</td>
              <td>15 minute</td>
            </tr>
            <tr>
              <td>3: Chiriaș</td>
              <td>Fiecare spațiu închiriat, separat</td>
              <td>Ce controlează proprietarul și ce controlează chiriașul?</td>
              <td>15 min (orar la apă și termie)</td>
            </tr>
            <tr>
              <td>4: Echipament major</td>
              <td>Chiller, centrală de tratare a aerului (CTA), cazan, compresor, pompă de căldură</td>
              <td>Funcționează la eficiența proiectată?</td>
              <td>1-15 min, plus mărimi de proces</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        În clădirile de birouri din București în care Sovitech Control a refăcut contorizarea, nivelul care lipsea
        aproape întotdeauna era nivelul 2, zona: existau contorul fiscal și contorul general al clădirii, dar nimic
        între ele și echipamente, deci nicio cale de a spune pe ce sistem crește consumul.
      </p>

      <h3 id="rezolutia-de-15-minute-si-retentia-de-24-de-luni">Rezoluția de 15 minute și retenția de 24 de luni</h3>
      <p>
        <strong>Rezoluția de 15 minute pentru energia electrică</strong> este referința practică: se aliniază cu
        intervalul de decontare din piața de energie și arată profilul de ocupare, vârfurile și consumul de bază de
        noapte. Pentru energia termică și pentru apă, intervalul orar este de obicei suficient. Retenția minimă este de{" "}
        <strong>24 de luni la rezoluție completă</strong>, pentru toate categoriile de puncte, inclusiv cele de mediu
        interior, plus o arhivă agregată de 5-10 ani. Sub 24 de luni nu există comparație an la an, iar comparația an
        la an este cerința de bază a oricărei raportări. Rezoluția și retenția se decid la punerea în funcțiune,
        pentru că datele nesalvate nu se recuperează.
      </p>

      <h3 id="exportul-automat-prin-csv-api-sau-acces-la-baza-de-date">
        Exportul automat, prin CSV, API sau acces la baza de date
      </h3>
      <p>
        Datele trebuie să iasă din sistem fără intervenție umană: export programat în CSV, acces la baza de date sau
        API. Dacă raportul anual depinde de disponibilitatea unei persoane, procesul nu este auditabil.
      </p>
      <p>
        Pentru orice cifră publicată trebuie să se poată spune din ce puncte de măsură provine, ce corecții i s-au
        aplicat și cine le-a făcut. Marcarea datelor estimate față de cele măsurate nu este o slăbiciune, este exact
        ce caută un verificator.
      </p>

      <h3 id="guvernanta-un-responsabil-reconciliere-lunara-conventie-de-suprafata-scrisa">
        Guvernanța: un responsabil, reconciliere lunară, convenție de suprafață scrisă
      </h3>
      <p>
        Guvernanța datelor înseamnă un responsabil desemnat, reconciliere lunară a contoarelor cu factura, o procedură
        scrisă de tratare a golurilor din istoric și o convenție de suprafață fixată în scris. Partea care nu costă
        nimic și lipsește cel mai des.
      </p>

      <h2 id="zece-intrebari-pentru-firma-de-mentenanta-cu-raspuns-in-scris">
        Zece întrebări pentru firma de mentenanță, cu răspuns în scris
      </h2>
      <p>
        Într-o clădire cu BMS (Building Management System, a nu se confunda cu Battery Management System) jumătate din
        infrastructura de date există deseori deja. Cele zece întrebări de mai jos se trimit firmei de mentenanță, cu
        răspuns în scris.
      </p>
      <ol>
        <li>Câte puncte de măsură de energie sunt integrate și pe ce niveluri ale arborelui de contorizare?</li>
        <li>La ce interval sunt salvate valorile de energie și unde se verifică asta?</li>
        <li>Cât timp se păstrează datele la rezoluție completă?</li>
        <li>Se poate obține graficul consumului electric pe o zi de acum 14 luni, fără pregătire prealabilă?</li>
        <li>Există goluri în istoricul ultimelor 24 de luni? Cât de mari și când?</li>
        <li>Se poate exporta automat un set de date, fără ca cineva să deschidă interfața?</li>
        <li>Sistemul are API, acces la baza de date sau interfață de integrare documentată?</li>
        <li>Se citește indexul de energie cumulată sau doar puterea instantanee?</li>
        <li>Există un document care leagă fiecare contor de consumatorul măsurat?</li>
        <li>Cine a comparat ultima dată suma contoarelor cu factura și când?</li>
      </ol>
      <p>
        Dacă răspunsul la întrebarea despre graficul de acum 14 luni durează peste 24 de ore, problema este la veriga
        3, istoricizarea la 15 minute cu retenție de 24 de luni. Verificarea credibilității datelor produse de un BMS
        este tratată în <a href="/resurse/esg-energie-raportare">materialele despre date și raportare</a>, iar
        arhitectura sistemelor, în <a href="/ghid/sisteme-bms-cladiri">ghidul complet BMS</a>.
      </p>

      <h2 id="acelasi-buget-doua-obligatii-bacs-la-290-kw-si-datele-esg">
        Același buget, două obligații: BACS la 290 kW și datele ESG
      </h2>
      <p>
        <a href="https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng" target="_blank" rel="noopener">
          Directiva (UE) 2024/1275
        </a>
        , art. 13 alin. (10), cere ca un sistem de automatizare și control al clădirilor (BACS, Building Automation
        and Control System) să asigure: (a) monitorizarea, înregistrarea, analiza și ajustarea continuă a consumului;
        (b) benchmarking-ul eficienței, detectarea pierderilor și informarea persoanei responsabile; (c) comunicarea
        cu sistemele tehnice conectate și interoperabilitatea între tehnologii proprietare diferite; iar din 29 mai
        2026, (d) monitorizarea calității mediului interior.
      </p>
      <p>
        Lista de capabilități se suprapune peste lanțul de date ESG: monitorizarea și înregistrarea continuă a
        consumului este veriga 3, istoricizarea; benchmarking-ul și detectarea pierderilor sunt verigile 4 și 5,
        agregarea cu normalizarea și verificarea prin reconciliere cu factura; interoperabilitatea este veriga 2,
        achiziția pe magistrală.
      </p>
      <p>
        În legea română, obligația de echipare există deja:{" "}
        <a href="/resurse/obligatie-bacs-legea-372-2005">Legea 372/2005, art. 27 alin. (5) și art. 29 alin. (6)</a>{" "}
        cere echiparea cu sisteme de automatizare și control a clădirilor nerezidențiale cu sisteme de încălzire, de
        climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme.
        Termenul a fost 31 decembrie 2024 și este depășit. Pragul de 70 kW, cu termen 31 decembrie 2029, provine din
        Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b), și{" "}
        <strong>nu este încă transpus în legea română</strong>. Contextul complet, în{" "}
        <a href="/resurse/reglementari-conformare">materialele despre reglementări și conformare</a>.
      </p>
      <p>
        <a href="https://eur-lex.europa.eu/eli/dir/2023/1791/oj?locale=ro" target="_blank" rel="noopener">
          Directiva (UE) 2023/1791
        </a>{" "}
        leagă auditul energetic de praguri de consum, iar auditul cere aceleași date de contorizare ca raportarea ESG.
        Nici Directiva (UE) 2023/1791 nu este transpusă în România; Legea 121/2014 rămâne în vigoare, cu pragul de
        1.000 tep/an pentru manager energetic atestat și audit energetic la 4 ani.
      </p>
      <p>
        <strong>Argumentul de buget:</strong> dacă echiparea cu BACS la pragul de 290 kW pe familie de sisteme este
        oricum necesară, contoarele și istoricizarea montate acolo sunt exact sursa datelor pentru raportarea ESG. Un
        proiect, două obligații. Invers nu funcționează.
      </p>

      <h2 id="plan-in-cinci-pasi-de-la-inventarul-punctelor-la-rutina-lunara">
        Plan în cinci pași, de la inventarul punctelor la rutina lunară
      </h2>
      <ol>
        <li>
          <strong>Inventarul punctelor de măsură existente (1-2 săptămâni).</strong> Ce contoare există fizic, ce
          comunică, ce se citește manual, ce lipsește. Rezultat: o schemă de contorizare. Fără ea, orice ofertă e o
          ghicitoare.
        </li>
        <li>
          <strong>Definirea indicatorilor țintă (1 săptămână).</strong> Se pornește de la ce trebuie raportat și se
          merge înapoi: ce indicatori, ce numitori, ce granularitate. Convenția de suprafață pentru kWh/mp/an se
          fixează în scris.
        </li>
        <li>
          <strong>Analiza de diferență și arhitectura (2-3 săptămâni).</strong> Rezultă lista punctelor de măsură
          lipsă, pe cele cinci niveluri ale arborelui de contorizare, plus protocoalele, rezoluția de 15 minute și
          retenția de 24 de luni. Livrabilul e un caiet de sarcini.
        </li>
        <li>
          <strong>Execuția pe etape (2-6 luni).</strong> Prioritatea 1: nivelul clădire, pe toate sursele, care dă
          imediat reconcilierea cu factura. Apoi zona, apoi chiriașii și echipamentele majore.
        </li>
        <li>
          <strong>Rutina lunară.</strong> Reconciliere contor-factură, verificarea golurilor din istoric, controlul
          valorilor imposibile, un raport de o pagină.
        </li>
      </ol>

      <h2 id="ce-inseamna-cele-sase-verigi-pentru-managerul-esg-si-property-manager">
        Ce înseamnă cele șase verigi pentru managerul ESG și property manager
      </h2>
      <p>
        Pentru managerul ESG, acțiunea utilă nu este citirea unui standard, ci cererea adresată echipei tehnice pentru
        graficul consumului electric pe o zi de acum 14 luni, adică testul verigii 3. Un fișier cu douăsprezece
        rânduri, adică douăsprezece valori de consum pe an, înseamnă estimări prezentate ca măsurători, iar riscul îl
        semnează managerul ESG.
      </p>
      <p>
        Pentru property managerul sau asset managerul unei clădiri, infrastructura de contorizare pe cinci niveluri
        rezolvă trei sarcini din fișa postului: raportul lunar către proprietar, repartizarea utilităților către
        chiriași și chestionarele chiriașilor corporate. Nu sunt trei proiecte, e unul singur. Context, pe pagina
        managerilor ESG.
      </p>

      <ArticleFaqBox items={faq} />

      <h2 id="concluzie-cele-sase-verigi-se-verifica-in-cateva-ore">
        Concluzie: cele șase verigi se verifică în câteva ore
      </h2>
      <p>
        Raportarea ESG a unei clădiri este o problemă de instrumentație înainte de a fi una de reglementare. O
        platformă cumpărată peste o clădire fără contorizare produce rapoarte, nu date. Verificarea celor șase verigi,
        de la punctul de măsură la raportarea în kWh/mp/an, durează câteva ore și nu costă nimic. Rezultatul ei arată
        dacă cifrele semnate anul trecut ar fi rezistat la o verificare independentă.
      </p>

      <h2 id="discuta-lantul-de-date-cu-un-inginer-sovitech">Discută lanțul de date cu un inginer Sovitech</h2>
      <p>
        Parcurgem cele șase verigi pe clădirea în cauză și livrăm un document de două pagini: punctele de măsură
        lipsă, pe cele cinci niveluri ale arborelui de contorizare, și indicatorul pe care îl face posibil fiecare.{" "}
        <strong>Evaluarea este gratuită și durează o vizită plus o discuție de două ore.</strong>
      </p>
      <p>
        Vezi și <a href="/servicii/consultanta">serviciul de consultanță</a>,{" "}
        <a href="/servicii/integrare-sisteme-knx-dali-modbus-mbus">integrarea KNX, DALI, Modbus și M-Bus</a> pentru
        veriga 2, achiziția pe magistrală, și{" "}
        <a href="/contact">cere reperul de consum kWh/mp pentru clădiri de birouri</a>.
      </p>

      <p className="article-note">
        Articol publicat 17.08.2026, revizuit 18.08.2026. Informațiile juridice au fost verificate la 17.08.2026.
        Statusul actelor delegate ESRS și al transpunerii Directivei (UE) 2026/470 se modifică; sursele citate se
        verifică înainte de o decizie. Autor: Echipa de inginerie Sovitech Control.
        {/* TODO(author): replace with the signing engineer */}
      </p>
    </ArticleProse>
  )
}
