import { ArticleDiagram, ArticleFaqBox, ArticleProse } from "@/components/article-prose"
import type { ArticleFaq, ArticleMeta } from "./index"

// LINKS-TO-REACTIVATE: materialele despre reglementări și conformare (secțiunea „Stadiul transpunerii”) | interim /resurse/reglementari-conformare | final /ghid/conformare-cladiri-romania
// LINKS-TO-REACTIVATE: arhiva de reglementări și conformare (blocul de CTA) | interim /resurse/reglementari-conformare | final /ghid/conformare-cladiri-romania
// LINKS-TO-REACTIVATE: materialele despre BMS, SCADA și integrare | interim /resurse/bms-scada-integrare | final /ghid/protocoale-automatizarea-cladirilor
// LINKS-TO-REACTIVATE: cere o verificare a pragului de putere pentru clădire | interim /contact | final /instrumente/test-obligatie-bacs
// LINKS-TO-REACTIVATE: cere o comparație a consumului clădirii cu valorile de referință din piață | interim /contact | final /instrumente/benchmark-kwh-mp
// LINKS-TO-REACTIVATE: Cere înscrierea la alertele de reglementare | interim /contact | final pagina de abonare dedicată (inexistentă încă)

export const meta: ArticleMeta = {
  title: "EPBD 2024 Romania: cladiri nerezidentiale | Sovitech Control",
  description:
    "Directiva EPBD 2024/1275 nu e inca transpusa in Romania. Vezi ce obligatii apar pentru cladirile nerezidentiale: BACS 70 kW, MEPS, ZEB si calendarul pe ani.",
  datePublished: "2026-08-17",
  dateModified: "2026-08-17",
}

export const faq: ArticleFaq[] = [
  {
    q: "Trebuie sa fac ceva acum, daca legea romana nu s-a schimbat inca?",
    a: "Da. Obligația de la 290 kW este deja în Legea 372/2005; termenul a fost 31 decembrie 2024 și este depășit. Pentru restul, acțiunea utilă acum este inventarul puterilor instalate și colectarea de date, lucruri care durează luni și pe care le cere orice variantă de transpunere.",
  },
  {
    q: "Pragul de 70 kW se aplică deja în România?",
    a: "Nu. Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b), și nu este încă transpus în legea română. Legea 372/2005 conține în prezent doar pragul de 290 kW, cu termen 31 decembrie 2024.",
  },
  {
    q: "Ce înseamnă „fezabil din punct de vedere tehnic și economic”?",
    a: "Este condiția din art. 13 alin. (9) al Directivei (UE) 2024/1275, preluată și în Legea 372/2005. Nu este o exceptare automată: proprietarul trebuie să poată prezenta o analiză care arată de ce instalarea nu se justifică. În lipsa documentului, condiția nu poate fi invocată în fața unui control.",
  },
  {
    q: "Cum se știe dacă o clădire intră în cele mai slabe 16% vizate de MEPS?",
    a: "Încă nu se poate ști. Art. 9 alin. (1) definește pragul relativ la fondul național, cu referință la 1 ianuarie 2020, iar clasificarea se va face prin legea de transpunere. Măsura utilă acum este consumul normalizat pe mp, comparat cu valori de referință din piață.",
  },
  {
    q: "Amenzile din Legea 238/2024 se aplică și pentru neinstalarea BACS?",
    a: "Legea 238/2024 a majorat regimul sancționator al Legii 372/2005, cu tranșe între 5.000 și 30.000 lei în funcție de faptă și de subiect. Încadrarea se face pe textul consolidat al legii, verificat pentru situația fiecărei clădiri.",
  },
]

export default function Body() {
  return (
    <ArticleProse>
      <p className="standfirst">
        Ce se aplică deja prin legea română, ce rămâne obligație UE și calendarul până în 2050.
      </p>

      <p>
        <strong>
          EPBD 2024 este Directiva (UE) 2024/1275 privind performanța energetică a clădirilor, încă netranspusă în legea
          română. Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9)
          lit. b), și nu este încă transpus în legea română.
        </strong>
      </p>

      <p>
        <strong>
          Pentru clădirile nerezidențiale, directiva aduce cinci obligații: pragul BACS coborât la 70 kW, cele patru
          capabilități cerute sistemului de automatizare, praguri minime de performanță energetică (MEPS) pentru cele
          mai slabe 16% până în 2030, standardul de clădire cu emisii zero din 1 ianuarie 2028 și monitorizarea
          calității mediului interior din 29 mai 2026.
        </strong>
      </p>

      <p>
        La 15 iulie 2026, Comisia Europeană a trimis scrisori de punere în întârziere tuturor celor 27 de state membre,
        inclusiv României, pentru netranspunerea directivei. Termenul expirase la 29 mai 2026, iar statele au două luni
        pentru a răspunde (
        <a
          href="https://energy.ec.europa.eu/news/commission-calls-eu-countries-transpose-reinforced-rules-energy-performance-buildings-2026-07-15_en"
          target="_blank"
          rel="noopener"
        >
          comunicatul Comisiei Europene, 15.07.2026
        </a>
        ). Din toată directiva, România a transpus până acum un singur element: art. 17 alin. (15), prin OG 16/2025.
      </p>

      <h2 id="pe-scurt">Pe scurt</h2>

      <ul>
        <li>
          Singura obligație BACS sancționabilă astăzi în România este pragul de 290 kW din Legea 372/2005; termenul a
          fost 31 decembrie 2024 și este depășit.
        </li>
        <li>
          Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b),
          și nu este încă transpus în legea română.
        </li>
        <li>
          Capabilitatea de monitorizare a calității mediului interior are termen propriu, 29 mai 2026, separat de restul
          cerințelor pentru BACS.
        </li>
        <li>
          MEPS vizează cele mai slabe 16% din fondul nerezidențial până în 2030 și cele mai slabe 26% până în 2033, cu
          referință la 1 ianuarie 2020.
        </li>
        <li>
          Standardul de clădire cu emisii zero se aplică din 1 ianuarie 2028 clădirilor publice noi și din 1 ianuarie
          2030 tuturor clădirilor noi.
        </li>
        <li>
          Amenzile majorate prin Legea 238/2024 merg până la 20.000 lei pentru operatori și până la 30.000 lei pentru
          autoritățile locale.
        </li>
      </ul>

      <h2 id="cuprins">Cuprins</h2>

      <nav aria-label="Cuprins">
        <ul>
          <li>
            <a href="#pe-scurt">Pe scurt</a>
          </li>
          <li>
            <a href="#stadiul-transpunerii-termen-29-mai-2026">
              Stadiul transpunerii în România: termen 29 mai 2026, depășit
            </a>
          </li>
          <li>
            <a href="#cele-cinci-obligatii-epbd">
              Cele cinci obligații EPBD care schimbă economia clădirii nerezidențiale
            </a>
          </li>
          <li>
            <a href="#calendarul-obligatiilor-2024-2050">Calendarul obligațiilor EPBD, de la 31.12.2024 la 2050</a>
          </li>
          <li>
            <a href="#epbd-peste-pragul-de-70-kw-birouri-industrie-sector-public">
              EPBD peste pragul de 70 kW: birouri, industrie si sector public
            </a>
          </li>
          <li>
            <a href="#legatura-cu-esg-csrd-1000-angajati-450-mil-eur">
              Legătura cu ESG: CSRD peste 1.000 de angajați și 450 mil. EUR
            </a>
          </li>
          <li>
            <a href="#sase-actiuni-pentru-urmatoarele-12-luni">Șase acțiuni pentru următoarele 12 luni</a>
          </li>
          <li>
            <a href="#ce-urmarim-dupa-punerea-in-intarziere-15-iulie-2026">
              Ce urmărim după punerea în întârziere din 15 iulie 2026
            </a>
          </li>
          <li>
            <a href="#intrebari-frecvente">Întrebări frecvente</a>
          </li>
          <li>
            <a href="#concluzie">Concluzie</a>
          </li>
          <li>
            <a href="#abonare-la-alertele-de-reglementare">Abonare la alertele de reglementare</a>
          </li>
        </ul>
      </nav>

      <h2 id="stadiul-transpunerii-termen-29-mai-2026">
        Stadiul transpunerii în România: termen 29 mai 2026, depășit
      </h2>

      <p>
        Termenul de transpunere a Directivei (UE) 2024/1275 a fost 29 mai 2026 și este depășit, iar procedura de
        infringement a început. Două planuri se confundă des.
      </p>

      <p>
        <strong>Planul UE.</strong> Directiva (UE) 2024/1275 este în vigoare. Termenul de transpunere a fost 29 mai
        2026, conform art. 35 alin. (1), cu o singură excepție: 1 ianuarie 2025 pentru art. 17 alin. (15) (
        <a
          href="https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:C_202506438"
          target="_blank"
          rel="noopener"
        >
          sinteza oficială a directivei
        </a>
        ).
      </p>

      <p>
        <strong>Planul național.</strong> Sancțiunile pe care le poate primi astăzi un proprietar din România nu vin din
        directivă, ci din{" "}
        <a href="https://legislatie.just.ro/Public/DetaliiDocument/66970" target="_blank" rel="noopener">
          Legea 372/2005
        </a>
        , așa cum a fost modificată prin{" "}
        <a href="https://legislatie.just.ro/public/DetaliiDocument/285769" target="_blank" rel="noopener">
          Legea 238/2024
        </a>{" "}
        (adoptată 19.07.2024, publicată în M. Of. la 25.07.2024). Legea 238/2024 a majorat amenzile cu până la
        aproximativ 400%: tranșe de 5.000-7.500 lei, 7.500-10.000 lei, 10.000-20.000 lei și 5.000-30.000 lei pentru
        autoritățile locale, plus sancțiunea complementară de suspendare 12-24 de luni pentru auditori.
      </p>

      <p>
        Regula practică: controlul și amenda se aplică pe textul românesc în vigoare. Ce este deja în Legea 372/2005 se
        sancționează acum; ce se află doar în Directiva (UE) 2024/1275 devine sancționabil la transpunere, iar
        transpunerea nu resetează termenele. Imaginea completă a obligațiilor suprapuse pe o clădire din România se
        construiește din <a href="/resurse/reglementari-conformare">materialele despre reglementări și conformare</a>.
      </p>

      <h2 id="cele-cinci-obligatii-epbd">Cele cinci obligații EPBD care schimbă economia clădirii nerezidențiale</h2>

      <h3 id="pragul-bacs-de-la-290-kw-la-70-kw-termen-31-12-2029">
        Pragul BACS: de la 290 kW la 70 kW, termen 31.12.2029
      </h3>

      <p>
        BACS înseamnă „sisteme de automatizare și control al clădirilor&rdquo;, termenul legal din Directiva (UE)
        2024/1275 și din legea română. Art. 13 alin. (9) stabilește două praguri pentru clădirile nerezidențiale cu
        sisteme de încălzire, de climatizare, sau combinate cu ventilare, pe familie de sisteme:
      </p>

      <ul>
        <li>
          <strong>peste 290 kW putere nominală utilă, până la 31 decembrie 2024;</strong>
        </li>
        <li>
          <strong>peste 70 kW putere nominală utilă, până la 31 decembrie 2029.</strong>
        </li>
      </ul>

      <p>
        Ambele sunt condiționate de fezabilitatea tehnică și economică (
        <a href="https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng" target="_blank" rel="noopener">
          textul Directivei (UE) 2024/1275
        </a>
        ). Condiția nu este o portiță: se documentează, nu se presupune.
      </p>

      <p>
        Diferența care contează: pragul de 290 kW este deja în legea română, la art. 27 alin. (5) și art. 29 alin. (6)
        din Legea 372/2005; termenul a fost 31 decembrie 2024 și este depășit. Pragul de 70 kW, cu termen 31 decembrie
        2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b), și nu este încă transpus în legea română.
      </p>

      <blockquote>
        <p>
          „Până la data de 31 decembrie 2024, clădirile nerezidențiale care au sisteme de încălzire sau sisteme
          combinate de încălzire și de ventilare a spațiului cu o putere nominală utilă de peste 290 kW vor fi echipate,
          dacă acest lucru este fezabil din punct de vedere tehnic și economic, cu sisteme de automatizare și de control
          pentru clădiri&rdquo;
        </p>
        <p>Legea 372/2005, art. 27 alin. (5)</p>
      </blockquote>

      <p>
        Textul integral, formularea identică de la art. 29 alin. (6) pentru climatizare și discuția despre sancțiuni
        sunt în articolul dedicat:{" "}
        <a href="/resurse/obligatie-bacs-legea-372-2005">obligația BACS și pragul de 290 kW</a>.
      </p>

      <p>
        Coborârea pragului la 70 kW multiplică populația de clădiri vizate. O clădire de birouri de 3.000-5.000 mp, un
        hotel de talie medie, o hală cu birouri administrative sau o clinică trec pragul fără efort. Puterea nominală
        utilă nu se citește dintr-o bază de date: se adună de pe plăcuțele cazanelor, chillerelor și centralelor de
        tratare a aerului, iar la clădirile cu mai multe surse însumarea pe familie de sisteme este prima sursă de
        dispută cu un organ de control. Pentru o clădire concretă se poate{" "}
        <a href="/contact">cere o verificare a pragului de putere pentru clădire</a>.
      </p>

      <h3 id="cele-patru-capabilitati-cerute-sistemului-cu-litera-d-din-29-mai-2026">
        Cele patru capabilități cerute sistemului, cu litera d) din 29 mai 2026
      </h3>

      <p>
        Directiva (UE) 2024/1275 nu cere un echipament, ci funcții. Art. 13 alin. (10) lit. a) la d) enumeră
        capabilitățile pe care trebuie să le aibă sistemul instalat.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Literă</th>
              <th>Capabilitate cerută</th>
              <th>Ce înseamnă în practică</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>a)</td>
              <td>Monitorizarea, înregistrarea, analiza și ajustarea continuă a consumului de energie</td>
              <td>
                Contorizare pe zone și pe utilități, istoricizare, buclă de reglaj care se corectează, nu simplă afișare
              </td>
            </tr>
            <tr>
              <td>b)</td>
              <td>Benchmarking al eficienței, detectarea pierderilor și informarea responsabilului</td>
              <td>Valori de referință, alarme de derivă, un destinatar nominalizat pentru notificări</td>
            </tr>
            <tr>
              <td>c)</td>
              <td>
                Comunicarea cu sistemele tehnice conectate și interoperabilitate între tehnologii proprietare diferite
              </td>
              <td>Protocoale deschise, BACnet, Modbus, KNX, M-Bus, și date exportabile</td>
            </tr>
            <tr>
              <td>d)</td>
              <td>
                <strong>Monitorizarea calității mediului interior, din 29 mai 2026</strong>
              </td>
              <td>Senzori de CO2, temperatură și umiditate, cu înregistrare, nu simplu afișaj local</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Monitorizarea calității mediului interior, cerută de art. 13 alin. (10) lit. d), are dată proprie, 29 mai 2026,
        deja trecută la nivel de directivă. Un sistem BMS, Building Management System, a nu se confunda cu Battery
        Management System, instalat acum fără senzori de calitate a aerului se completează ulterior, cu instalația în
        funcțiune și cu cost dublu.
      </p>

      <p>
        Din integrările executate de Sovitech Control, integrator de automatizări cu sediul în București, litera b)
        lipsește din aproape orice sistem pus în funcțiune înainte de 2018, chiar și acolo unde hardware-ul este în
        regulă: există trend loguri, dar nu și valori de referință, alarme de derivă sau un destinatar nominalizat.
        Litera c) decide dacă activul rămâne liber: un sistem de automatizare care nu comunică în afara ecosistemului
        producătorului blochează fiecare extindere (
        <a href="/resurse/bms-scada-integrare">materialele despre BMS, SCADA și integrare</a>).
      </p>

      <h3 id="meps-cele-mai-slabe-16-in-2030-26-in-2033">MEPS: cele mai slabe 16% în 2030, 26% în 2033</h3>

      <p>
        MEPS, standardele minime de performanță energetică, sunt obligația care schimbă cel mai mult economia unui
        portofoliu. Art. 9 alin. (1) din Directiva (UE) 2024/1275 cere statelor membre praguri minime, astfel încât:
      </p>

      <ul>
        <li>
          <strong>cele mai slabe 16%</strong> din fondul național de clădiri nerezidențiale să fie renovate{" "}
          <strong>până în 2030</strong>;
        </li>
        <li>
          <strong>cele mai slabe 26%</strong>, <strong>până în 2033</strong>;
        </li>
        <li>
          referința de calcul rămâne starea fondului la <strong>1 ianuarie 2020</strong>.
        </li>
      </ul>

      <p>
        Mecanismul este relativ, nu absolut. Nu contează consumul în valoare absolută, ci poziția față de restul
        fondului național. O clădire care astăzi pare acceptabilă poate ajunge în ultimele 16% pentru simplul motiv că
        restul pieței se modernizează mai repede.
      </p>

      <p>
        De aici vine expresia „risc de activ blocat&rdquo; (<em>stranded asset</em>). Pentru proprietar înseamnă o
        clădire oprită de la închiriere sau tranzacționare până la renovare, cu CapEx neplanificat și pierdere de venit.
        Pentru finanțator înseamnă altceva: băncile și fondurile evaluează deja portofoliile după expunerea la MEPS, iar
        o clădire în zona de risc primește condiții mai proaste. Efectul asupra valorii se produce înainte de termenul
        legal, când riscul devine vizibil în due diligence.
      </p>

      <p>
        Singura reacție utilă pentru proprietar este să știe unde se află față de cele mai slabe 16%, iar asta cere date
        normalizate, nu estimări. Limita de recunoscut: fără contorizare secundară, consumul pe chiriaș și pe zonă
        rămâne o estimare, oricât de bun ar fi softul. Punctul de plecare este consumul normalizat pe mp, cu istoric: se
        poate <a href="/contact">cere o comparație a consumului clădirii cu valorile de referință din piață</a>.
      </p>

      <h3 id="cladirile-cu-emisii-zero-1-ianuarie-2028-si-1-ianuarie-2030">
        Clădirile cu emisii zero: 1 ianuarie 2028 și 1 ianuarie 2030
      </h3>

      <p>Directiva (UE) 2024/1275 înlocuiește treptat nZEB cu ZEB, clădirea cu emisii zero. Calendarul:</p>

      <ul>
        <li>
          <strong>1 ianuarie 2028</strong>, clădirile noi deținute de organisme publice;
        </li>
        <li>
          <strong>1 ianuarie 2030</strong>, toate clădirile noi;
        </li>
        <li>
          <strong>2050</strong>, transformarea fondului existent.
        </li>
      </ul>

      <p>
        Există și o cerință tehnică punctuală, ușor de trecut cu vederea. Art. 13 alin. (5) prevede că clădirile
        nerezidențiale cu emisii zero se echipează cu dispozitive de măsurare și control al calității aerului interior,
        iar la clădirile existente cerința se aplică la renovare majoră, unde este fezabil.
      </p>

      <p>
        La orice renovare majoră planificată în următorii ani, calitatea aerului interior intră în pachetul de
        conformare, nu în lista de opțiuni de confort. Costul de a o include în proiect este mic; costul de a o adăuga
        peste doi ani, cu tavanele închise, nu este.
      </p>

      <h3 id="calitatea-mediului-interior-cerinta-ue-cu-termen-29-mai-2026">
        Calitatea mediului interior, cerință UE cu termen 29 mai 2026
      </h3>

      <p>
        Art. 13 alin. (4) din Directiva (UE) 2024/1275 cere standarde adecvate de calitate a mediului interior.
        Împreună cu art. 13 alin. (10) lit. d), cu termen 29 mai 2026, și cu art. 13 alin. (5), direcția este clară:
        clădirea demonstrează cu date înregistrate că mediul interior este controlat.
      </p>

      <p>
        Pentru proprietar, calitatea mediului interior este singura obligație din EPBD cu beneficiu comercial direct.
        Nivelurile de CO2 și temperatura sunt primele două reclamații ale chiriașilor, iar un istoric de date închide
        discuția în locul unei negocieri. Aceleași date alimentează indicatorii sociali din raportarea managerului ESG.
        O limită de care se lovește oricine operează astfel de senzori: elementele de CO2 se decalibrează în 2-3 ani,
        iar o cerință de monitorizare fără plan de recalibrare produce date, nu conformare.
      </p>

      <h2 id="calendarul-obligatiilor-2024-2050">Calendarul obligațiilor EPBD, de la 31.12.2024 la 2050</h2>

      <p>
        Coloana din dreapta separă riscul imediat de planificare: un singur rând este lege română în vigoare, restul
        sunt obligații UE netranspuse.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Termen</th>
              <th>Obligație</th>
              <th>Temei</th>
              <th>Statut în România</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>31.12.2024</td>
              <td>
                BACS la clădiri nerezidențiale peste 290 kW pe familie de sisteme (dacă e fezabil tehnic și economic)
              </td>
              <td>L. 372/2005, art. 27 alin. (5) și art. 29 alin. (6); EPBD art. 13 alin. (9)</td>
              <td>
                <strong>Lege română în vigoare, termen depășit</strong>
              </td>
            </tr>
            <tr>
              <td>29.05.2026</td>
              <td>Capabilitate de monitorizare a calității mediului interior în sistemul BACS</td>
              <td>EPBD art. 13 alin. (10) lit. d)</td>
              <td>Obligație UE, netranspusă</td>
            </tr>
            <tr>
              <td>29.05.2026</td>
              <td>Termen de transpunere a directivei</td>
              <td>EPBD art. 35 alin. (1)</td>
              <td>
                <strong>Depășit, punere în întârziere la 15.07.2026</strong>
              </td>
            </tr>
            <tr>
              <td>01.01.2028</td>
              <td>Clădiri publice noi, standard ZEB</td>
              <td>EPBD, cap. ZEB</td>
              <td>Obligație UE, netranspusă</td>
            </tr>
            <tr>
              <td>31.12.2029</td>
              <td>BACS la clădiri nerezidențiale peste 70 kW pe familie de sisteme</td>
              <td>EPBD art. 13 alin. (9) lit. b)</td>
              <td>Obligație UE, netranspusă</td>
            </tr>
            <tr>
              <td>01.01.2030</td>
              <td>Toate clădirile noi, standard ZEB</td>
              <td>EPBD, cap. ZEB</td>
              <td>Obligație UE, netranspusă</td>
            </tr>
            <tr>
              <td>2030</td>
              <td>MEPS, renovarea celor mai slabe 16% din fondul nerezidențial</td>
              <td>EPBD art. 9 alin. (1)</td>
              <td>Obligație UE, netranspusă</td>
            </tr>
            <tr>
              <td>2033</td>
              <td>MEPS, cele mai slabe 26%</td>
              <td>EPBD art. 9 alin. (1)</td>
              <td>Obligație UE, netranspusă</td>
            </tr>
            <tr>
              <td>2050</td>
              <td>Transformarea fondului existent în clădiri cu emisii zero</td>
              <td>EPBD</td>
              <td>Obligație UE, netranspusă</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ArticleDiagram
        src="/diagrame/A06-1-cronologie-si-fereastra-de-actiune.jpg"
        caption="Cronologia obligațiilor EPBD 2024-2050 și fereastra de acțiune pentru audit, buget și execuție."
      />

      <h2 id="epbd-peste-pragul-de-70-kw-birouri-industrie-sector-public">
        EPBD peste pragul de 70 kW: birouri, industrie si sector public
      </h2>

      <h3 id="proprietarul-unei-cladiri-de-birouri-inchiriate-peste-pragul-de-70-kw">
        Proprietarul unei clădiri de birouri închiriate, peste pragul de 70 kW
      </h3>

      <p>
        Expunerea vine pe trei fronturi simultan. MEPS poate bloca activul, chiriașii corporativi cer deja date de
        consum pe spațiul lor, iar pragul de 70 kW se atinge aproape sigur. Prioritatea nu este echipamentul, ci lanțul
        de date: contorizare pe chiriaș, consum normalizat pe mp, istoric de cel puțin 12 luni. Detalii pe pagina{" "}
        <a href="/expertiza/cladiri-de-birouri">clădiri de birouri</a>.
      </p>

      <h3 id="operatorul-industrial-hale-cu-cta-peste-pragul-de-70-kw">
        Operatorul industrial: hale cu CTA peste pragul de 70 kW
      </h3>

      <p>
        Partea de clădire, adică birouri, vestiare și hale cu HVAC (încălzire, ventilare și climatizare), intră sub
        EPBD, iar partea de proces intră sub alte regimuri. Pragul de 70 kW se atinge ușor la o hală cu centrale de
        tratare a aerului (CTA). Infrastructura de automatizare există deja de regulă, dar nu produce date consolidate,
        ci insule de trend loguri pe fiecare utilaj. Detalii în{" "}
        <a href="/expertiza/industrial">expertiza industrială</a>.
      </p>

      <h3 id="institutia-publica-zeb-din-1-ianuarie-2028-amenzi-pana-la-30-000-lei">
        Instituția publică: ZEB din 1 ianuarie 2028, amenzi până la 30.000 lei
      </h3>

      <p>
        Calendarul este cel mai strâns: clădirile publice noi trebuie să fie clădiri cu emisii zero (ZEB) de la 1
        ianuarie 2028, iar autoritățile locale au tranșa de amendă cea mai mare din Legea 238/2024, între 5.000 și
        30.000 lei. Finanțarea, în schimb, este activă acum, nu ipotetică.
      </p>

      <h2 id="legatura-cu-esg-csrd-1000-angajati-450-mil-eur">
        Legătura cu ESG: CSRD peste 1.000 de angajați și 450 mil. EUR
      </h2>

      <p>
        Datele cerute de Directiva (UE) 2024/1275 sunt aceleași date pe care le cere raportarea de sustenabilitate.
        Consum pe utilitate și pe zonă, serie temporală, valori de referință, detectarea abaterilor, calitatea mediului
        interior: art. 13 alin. (10) descrie, fără să o spună, infrastructura de colectare pentru un raport ESG
        credibil.
      </p>

      <p>
        Asta schimbă modul în care se justifică investiția. Un sistem BACS (sisteme de automatizare și control al
        clădirilor) instalat pentru conformare EPBD produce, ca efect secundar, datele auditabile pentru Scope 1 și 2.
        Legătura dintre sursele de date și indicatorii raportați este explicată în{" "}
        <a href="/ghid/date-esg-cladiri">ghidul despre datele pentru raportarea ESG</a>.
      </p>

      <p>
        Contextul de raportare s-a mai relaxat între timp.{" "}
        <a href="https://eur-lex.europa.eu/eli/dir/2026/470/oj/eng" target="_blank" rel="noopener">
          Directiva (UE) 2026/470
        </a>{" "}
        („pachetul Omnibus&rdquo;, în vigoare din 18.03.2026) restrânge sfera CSRD la întreprinderile cu peste 1.000 de
        angajați <em>și</em> peste 450 mil. EUR cifră de afaceri netă, iar{" "}
        <a href="https://legislatie.just.ro/Public/DetaliiDocument/278502" target="_blank" rel="noopener">
          OMF 85/2024, modificat prin OMF 1421/2025
        </a>
        , a amânat valurile 2 și 3 în România. Relaxarea privește cine raportează formal, nu cererea de date, care vine
        din lanțul de aprovizionare, de la bănci și de la chiriași.
      </p>

      <p>
        <strong>Finanțare disponibilă, pe scurt.</strong> Pentru clădiri publice: apelul 2.1.B „Creșterea eficienței
        energetice a clădirilor publice&rdquo; din Programele Regionale, lansat la 04.06.2026 în Regiunea Sud-Est, cu
        apeluri echivalente în celelalte șapte programe regionale (
        <a
          href="https://regiosudest.ro/ghiduri/prioritatea-2/apeluri-active/apel-lansat-2-1-b-cresterii-eficientei-energetice-a-cladirilor-publice-04-06-2026"
          target="_blank"
          rel="noopener"
        >
          ghidul apelului
        </a>
        ). Pentru industrie: programul de 150 mil. EUR din Fondul pentru Modernizare al Ministerului Energiei, pentru
        operatori industriali participanți la EU-ETS, până la 30 mil. EUR pe proiect, cu active eligibile care includ
        explicit „sisteme integrate de management al consumului de energie&rdquo; (
        <a
          href="https://energie.gov.ro/ministerul-energiei-lanseaza-cel-mai-ambitios-program-pentru-eficientizarea-energetica-a-industriei-romanesti-sprijinit-din-fondul-pentru-modernizare-cu-un-buget-total-de-150-de-milioane-de-euro/"
          target="_blank"
          rel="noopener"
        >
          anunțul Ministerului Energiei
        </a>
        ); ghidul era în consultare, deci statusul se verifică înainte de bugetare. PNRR C5 „Valul Renovării&rdquo;
        este, dimpotrivă, în fază terminală de implementare: o fereastră care se închide.
      </p>

      <h2 id="sase-actiuni-pentru-urmatoarele-12-luni">Șase acțiuni pentru următoarele 12 luni</h2>

      <p>Niciuna dintre cele șase acțiuni de mai jos nu presupune ca legea română de transpunere să fie deja publicată.</p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Acțiune</th>
              <th>De ce acum</th>
              <th>Orizont</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>
                Inventarierea puterii nominale utile a sistemelor de încălzire, ventilare și climatizare, per clădire și
                pe familie de sisteme
              </td>
              <td>
                Fără cifra asta nu se știe dacă o clădire este peste 290 kW (obligație actuală) sau doar peste 70 kW
                (obligație 2029)
              </td>
              <td>30 de zile</td>
            </tr>
            <tr>
              <td>2</td>
              <td>Verificarea capabilităților din art. 13 alin. (10) lit. a) la d) pe sistemul existent</td>
              <td>De regulă lipsesc b) și d), benchmarking și calitatea mediului interior</td>
              <td>60 de zile</td>
            </tr>
            <tr>
              <td>3</td>
              <td>Pornirea colectării de consum normalizat pe mp, cu istoric</td>
              <td>Poziția față de MEPS se demonstrează cu serii de date, nu cu declarații</td>
              <td>3 luni</td>
            </tr>
            <tr>
              <td>4</td>
              <td>Documentarea analizei de fezabilitate tehnică și economică acolo unde nu se instalează BACS</td>
              <td>
                Excepția din lege se probează cu un document, nu se invocă verbal, și se face pe clădire, nu pe
                portofoliu
              </td>
              <td>6 luni</td>
            </tr>
            <tr>
              <td>5</td>
              <td>Includerea senzorilor de calitate a aerului interior în orice proiect de renovare aflat pe masă</td>
              <td>Cost marginal mic acum, cost integral după 2028</td>
              <td>La următorul proiect</td>
            </tr>
            <tr>
              <td>6</td>
              <td>Alinierea bugetului de CapEx la fereastra 2028-2029 și verificarea eligibilității pentru finanțare</td>
              <td>Termenul de 31.12.2029 înseamnă execuție în 2028-2029, deci decizie de buget în 2027</td>
              <td>12 luni</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Pentru sistemele mai vechi de 10-12 ani, discuția nu este despre completare, ci despre{" "}
        <a href="/servicii/modernizare-sisteme-de-automatizare-si-bms">modernizarea sistemului de automatizare</a>,
        pentru că platformele vechi nu susțin cerințele de interoperabilitate de la art. 13 alin. (10) lit. c).
      </p>

      <h2 id="ce-urmarim-dupa-punerea-in-intarziere-15-iulie-2026">
        Ce urmărim după punerea în întârziere din 15 iulie 2026
      </h2>

      <ul>
        <li>
          <strong>Răspunsul României la scrisoarea de punere în întârziere</strong> din 15.07.2026 și pasul următor al
          Comisiei, avizul motivat.
        </li>
        <li>
          <strong>Proiectul de lege de transpunere</strong>, în special formularea pragului de 70 kW și criteriile de
          fezabilitate tehnică și economică.
        </li>
        <li>
          <strong>Definirea națională a pragului MEPS</strong>, care va spune concret ce clădiri intră în cele mai slabe
          16%.
        </li>
      </ul>

      <p>
        Articolul se actualizează la publicarea în Monitorul Oficial a legii de transpunere și la orice modificare a
        termenelor. Data ultimei verificări juridice este afișată la final.
      </p>

      <ArticleFaqBox items={faq} />

      <h2 id="concluzie">Concluzie</h2>

      <p>
        Statutul de directivă netranspusă amână sancțiunea, nu calendarul. Termenele rămân valabile indiferent de data
        la care România adoptă legea de transpunere, ceea ce lasă unui proprietar cu clădiri peste 70 kW aproximativ
        trei ani pentru audit, buget și execuție. Cine începe cu inventarul puterilor și cu seria de date ajunge la
        transpunere cu o listă de lucrări. Cine așteaptă textul de lege ajunge la ea cu o listă de întrebări.
      </p>

      <h2 id="abonare-la-alertele-de-reglementare">Abonare la alertele de reglementare</h2>

      <p>
        Urmărirea Monitorului Oficial nu este o sarcină de proprietar. Trimitem o alertă scurtă la fiecare schimbare
        care afectează clădirile nerezidențiale din România, cu o frază despre efectul practic.{" "}
        <a href="/contact">Cere înscrierea la alertele de reglementare</a>. Materialele publicate până acum sunt în{" "}
        <a href="/resurse/reglementari-conformare">arhiva de reglementări și conformare</a>, iar pentru portofolii
        există o <a href="/servicii/consultanta">evaluare de expunere</a>.
      </p>

      <p className="article-note">
        Articol publicat 17.08.2026, actualizat 19.08.2026. Informațiile juridice au fost verificate la 17.08.2026.
        Statutul transpunerii se poate schimba, deci sursele citate se verifică înainte de o decizie de investiție.
        Autor: Echipa de inginerie Sovitech Control. {/* TODO(author): replace with the signing engineer */}
      </p>
    </ArticleProse>
  )
}
