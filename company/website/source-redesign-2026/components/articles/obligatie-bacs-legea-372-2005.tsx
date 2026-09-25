import { ArticleDiagram, ArticleFaqBox, ArticleProse } from "@/components/article-prose"
import type { ArticleFaq, ArticleMeta } from "./index"

// LINKS-TO-REACTIVATE: reglementări și conformare | interim /resurse/reglementari-conformare | final /ghid/conformare-cladiri-romania
// LINKS-TO-REACTIVATE: materialele despre BMS, SCADA și integrare | interim /resurse/bms-scada-integrare | final /ghid/protocoale-automatizarea-cladirilor
// LINKS-TO-REACTIVATE: Cere checklistul de audit BMS | interim /contact | final /instrumente/checklist-audit-bms
// LINKS-TO-REACTIVATE: Cere o verificare a pragului de putere pentru clădirea evaluată | interim /contact | final /instrumente/test-obligatie-bacs
// LINKS-TO-REACTIVATE: pagina dedicată directorilor tehnici (text fără link în corp) | interim (fără link) | final /pentru/director-tehnic

export const meta: ArticleMeta = {
  title: "Obligatia BACS: Legea 372/2005 si pragul de 290 kW | Sovitech Control",
  description:
    "Cladirile nerezidentiale cu sisteme de peste 290 kW pe familie de sisteme trebuiau echipate cu automatizare pana la 31.12.2024. Cine intra sub obligatie.",
  datePublished: "2026-08-16",
  dateModified: "2026-08-16",
}

export const faq: ArticleFaq[] = [
  {
    q: "Pragul de 70 kW este deja obligatoriu in Romania?",
    a: "Nu. Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b), și nu este încă transpus în legea română. Obligația în vigoare astăzi în România rămâne cea de la 290 kW pe familie de sisteme, cu termen 31 decembrie 2024, din Legea 372/2005.",
  },
  {
    q: "O clădire cu centrală termică de 250 kW este în afara obligației?",
    a: "Astăzi, la încălzire, da: pragul din Legea 372/2005 este „peste 290 kW”, evaluat pe familia de sisteme de încălzire. Climatizarea se verifică însă separat, la art. 29 alin. (6), ca familie de sisteme distinctă. La transpunerea Directivei (UE) 2024/1275 pragul coboară la 70 kW, iar clădirea intră sub obligație.",
  },
  {
    q: "Ce înseamnă exact „putere nominală utilă”?",
    a: "Este puterea nominală a sistemului de încălzire, respectiv de climatizare, așa cum rezultă din documentația tehnică și din plăcuțele echipamentelor. Nu consumul anual de energie și nici puterea electrică contractată cu furnizorul. Se însumează sursele care alimentează aceeași familie de sisteme, iar rezultatul se compară cu pragul de 290 kW.",
  },
  {
    q: "Un sistem BMS instalat în 2012 este suficient?",
    a: "Depinde de ce face, nu de vechimea lui. Se verifică dacă înregistrează și analizează continuu consumul, dacă produce indicatori comparabili în timp, dacă detectează pierderile de eficiență și anunță un responsabil și dacă poate comunica cu echipamente de la producători diferiți. Dacă lipsește una dintre cele trei capabilități cerute de art. 27 alin. (5), sistemul nu acoperă cerința.",
  },
  {
    q: "Dacă echiparea chiar nu este fezabilă economic, ce se face?",
    a: "Se documentează. Legea 372/2005 permite excepția de fezabilitate tehnică și economică, dar nu o prezumă. Sunt necesare o analiză tehnică a limitărilor instalației, un calcul economic care raportează investiția la economia estimată și la durata rămasă de exploatare și o decizie datată și asumată de administrator.",
  },
]

export default function Body() {
  return (
    <ArticleProse>
      <p className="standfirst">
        Pragul, cine intră sub obligație, capabilitățile cerute sistemului, sancțiunile, calendarul termenelor și ce se
        documentează atunci când echiparea nu este fezabilă.
      </p>

      <p>
        <strong>
          Clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere
          nominală utilă de peste 290 kW pe familie de sisteme trebuiau echipate, până la 31 decembrie 2024, cu sisteme
          de automatizare și control al clădirilor (BACS, Building Automation and Control System), dacă acest lucru este
          fezabil tehnic și economic. Obligația este în Legea 372/2005, art. 27 alin. (5) și art. 29 alin. (6). Termenul
          a fost 31 decembrie 2024 și este depășit.
        </strong>
      </p>

      <p>
        Aproape tot ce s-a scris în România despre automatizarea obligatorie a clădirilor vorbește despre 2029 și despre
        pragul de 70 kW. Este o discuție prematură. Faptul relevant nu este 2029, ci că un termen din legea română a
        expirat la 31 decembrie 2024 și că majoritatea clădirilor vizate nu l-au respectat, în bună parte pentru că
        proprietarii lor nu știu că obligația există.
      </p>

      <h2 id="pe-scurt">Pe scurt: 290 kW, 31 decembrie 2024, trei capabilități</h2>

      <ul>
        <li>
          Obligația în vigoare în România se aplică la o putere nominală utilă de peste 290 kW pe familie de sisteme, cu
          termen 31 decembrie 2024, depășit (Legea 372/2005, art. 27 alin. (5) și art. 29 alin. (6)).
        </li>
        <li>
          Pragul de 290 kW se evaluează separat pentru încălzire și pentru climatizare. Cele două familii de sisteme nu
          se însumează.
        </li>
        <li>
          Puterea nominală utilă se citește pe plăcuțele echipamentelor și în cartea tehnică, nu pe factura de energie.
        </li>
        <li>
          Legea cere trei capabilități cumulative: monitorizare și ajustare continuă a consumului, benchmarking cu
          detectarea pierderilor de eficiență, interoperabilitate între tehnologii proprietare diferite.
        </li>
        <li>
          Excepția de fezabilitate tehnică și economică din art. 27 alin. (5) există, dar se demonstrează printr-un dosar
          datat, nu se presupune.
        </li>
        <li>
          Pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b),
          și nu este încă transpus în legea română.
        </li>
      </ul>

      <h2 id="bacs-termenul-din-lege">BACS: termenul juridic din Legea 372/2005</h2>

      <p>
        <strong>BACS</strong> este acronimul pentru <em>Building Automation and Control System</em>, tradus în
        legislația românească prin <strong>„sisteme de automatizare și de control pentru clădiri&rdquo;</strong>. Este
        termenul juridic. Apare ca atare în Legea 372/2005 și în directiva europeană din care provine.
      </p>

      <p>
        În piață, același lucru se numește de obicei <strong>BMS</strong>, <em>Building Management System</em>, a nu se
        confunda cu Battery Management System. Diferența nu este tehnică, ci de registru: BMS este cuvântul comercial,
        BACS este cuvântul din lege. Fundamentele tehnice sunt în{" "}
        <a href="/ghid/sisteme-bms-cladiri">ghidul despre ce este un sistem BMS pentru clădiri</a>.
      </p>

      <p>
        Distincția contează practic: obligația nu se satisface cumpărând ceva care se <em>numește</em> „BMS&rdquo;, ci
        ceva care <em>face</em> lucrurile pe care legea le enumeră.
      </p>

      <h2 id="textul-exact-al-obligatiei-din-legea-372-2005">Textul din art. 27 alin. (5) și art. 29 alin. (6)</h2>

      <p>
        Obligația apare de două ori în Legea 372/2005, în articole diferite, pentru familii de sisteme diferite. Prima
        dată la articolul 27, pentru încălzire.
      </p>

      <blockquote>
        <p>
          „Până la data de 31 decembrie 2024, clădirile nerezidențiale care au sisteme de încălzire sau sisteme
          combinate de încălzire și de ventilare a spațiului cu o putere nominală utilă de peste 290 kW vor fi echipate,
          dacă acest lucru este fezabil din punct de vedere tehnic și economic, cu sisteme de automatizare și de control
          pentru clădiri...&rdquo;
        </p>
        <p>Legea 372/2005, art. 27 alin. (5)</p>
      </blockquote>

      <p>
        A doua oară la articolul 29, cu o formulare identică, pentru climatizare. Art. 29 alin. (6) reia aceeași cerință
        pentru clădirile nerezidențiale care au{" "}
        <strong>sisteme de climatizare sau sisteme combinate de climatizare și de ventilare a spațiului</strong> cu o
        putere nominală utilă de peste 290 kW.
      </p>

      <p>
        Sursa:{" "}
        <a href="https://legislatie.just.ro/Public/DetaliiDocument/66970" target="_blank" rel="noopener">
          Legea 372/2005 privind performanța energetică a clădirilor, pe portalul legislativ
        </a>
        . Înainte de construirea unui argument juridic pe acest text, se verifică forma consolidată la zi. Legea a fost
        modificată de mai multe ori.
      </p>

      <h3 id="evaluare-separata-pe-incalzire-si-pe-climatizare">Pragul de 290 kW se evaluează pe familie de sisteme</h3>

      <p>
        <strong>Pragul de 290 kW se evaluează pe fiecare familie de sisteme separat, nu pe clădire.</strong> Legea
        tratează distinct instalațiile de încălzire și cele de climatizare, fiecare cu propriul articol și cu propriul
        regim de inspecție, iar puterea nominală utilă se compară cu pragul în interiorul fiecărei familii.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Articol</th>
              <th>Ce sisteme acoperă</th>
              <th>Prag</th>
              <th>Termen</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Art. 27 alin. (5)</td>
              <td>Sisteme de încălzire; sisteme combinate de încălzire și ventilare a spațiului</td>
              <td>peste 290 kW putere nominală utilă, pe această familie de sisteme</td>
              <td>31 decembrie 2024</td>
            </tr>
            <tr>
              <td>Art. 29 alin. (6)</td>
              <td>Sisteme de climatizare; sisteme combinate de climatizare și ventilare a spațiului</td>
              <td>peste 290 kW putere nominală utilă, pe această familie de sisteme</td>
              <td>31 decembrie 2024</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        O clădire poate intra sub obligație pe un singur articol, cazul unui hotel cu centrală termică mare și
        climatizare modestă, sau pe amândouă. Încălzirea nu se însumează cu climatizarea pentru a trece pragul de 290
        kW; se evaluează fiecare familie de sisteme la puterea ei nominală utilă instalată.
      </p>

      <h2 id="cine-intra-sub-obligatie">Cine intră sub obligație: clădiri nerezidențiale peste 290 kW</h2>

      <p>Trei condiții, cumulative:</p>

      <ol>
        <li>
          <strong>Clădirea este nerezidențială:</strong> birouri, retail, hoteluri, spitale, școli, clădiri industriale
          cu spații ocupate, clădiri publice. Blocurile de locuințe nu intră.
        </li>
        <li>
          <strong>Puterea nominală utilă a familiei de sisteme depășește 290 kW.</strong> Nu consumul anual, nu puterea
          contractată la rețea, nu suma pe clădire a încălzirii și climatizării.
        </li>
        <li>
          <strong>Echiparea este fezabilă tehnic și economic.</strong> Singura poartă de ieșire lăsată deschisă de lege,
          și nu funcționează prin simpla afirmație.
        </li>
      </ol>

      <h3 id="unde-se-afla-puterea-nominala-utila">Puterea nominală utilă se citește pe plăcuță, nu pe factură</h3>

      <p>
        Puterea nominală utilă nu se citește pe factura de energie, ci pe echipament și în documentația tehnică. Ordinea
        în care merită căutată:
      </p>

      <ul>
        <li>plăcuțele de identificare ale cazanelor, chillerelor, pompelor de căldură și rooftop-urilor;</li>
        <li>cartea tehnică și proiectul de instalații HVAC;</li>
        <li>
          documentația <em>as-built</em> a ultimei modernizări, de obicei mai apropiată de realitate decât proiectul
          inițial;
        </li>
        <li>certificatul de performanță energetică și raportul de audit energetic, dacă există.</li>
      </ul>

      <p>
        În evaluările de conformare pe care Sovitech Control le face în clădiri aflate în exploatare, plăcuța și
        proiectul se contrazic mai des decât s-ar crede: cazanul înlocuit acum opt ani nu are aceeași putere ca cel din
        proiect, iar nimeni nu a actualizat cartea tehnică. Fotografia plăcuței, cu dată, valorează mai mult într-un
        dosar decât un tabel refăcut din memorie.
      </p>

      <p>Ce se însumează în calculul pragului de 290 kW și ce nu, regula practică aplicată în evaluări:</p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Element</th>
              <th>Intră în calculul pragului de 290 kW?</th>
              <th>Observație</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cazanele care alimentează sistemul de încălzire</td>
              <td>Da, însumat</td>
              <td>Inclusiv cazanul de rezervă, dacă poate funcționa în paralel.</td>
            </tr>
            <tr>
              <td>Pompe de căldură pentru încălzire</td>
              <td>Da, la putere termică nominală</td>
              <td>Puterea termică nu se confundă cu puterea electrică absorbită.</td>
            </tr>
            <tr>
              <td>Chillere și climatizare centralizată</td>
              <td>Da, dar la art. 29 alin. (6), nu la art. 27 alin. (5)</td>
              <td>Se evaluează separat de încălzire, ca familie de sisteme distinctă.</td>
            </tr>
            <tr>
              <td>Centrale de tratare a aerului (CTA) cu baterii de încălzire sau răcire</td>
              <td>Da, la sistemul combinat corespunzător</td>
              <td>Legea spune explicit „sisteme combinate ... și de ventilare a spațiului&rdquo;.</td>
            </tr>
            <tr>
              <td>Ventilație pură, fără tratare termică</td>
              <td>Nu, luată singură</td>
              <td>Relevantă doar ca parte a unui sistem combinat.</td>
            </tr>
            <tr>
              <td>Procese industriale (abur tehnologic, răcire de proces)</td>
              <td>În principiu nu</td>
              <td>
                Legea vizează încălzirea și climatizarea <em>spațiului</em>. Delimitarea se documentează.
              </td>
            </tr>
            <tr>
              <td>Puterea electrică contractată</td>
              <td>Nu</td>
              <td>Confuzia cea mai frecventă. Nu are legătură cu pragul de 290 kW.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Arborele de decizie, în proză, pentru cine îl citește o singură dată: dacă clădirea nu este nerezidențială,
        obligația nu se aplică; dacă este, se calculează separat puterea nominală utilă pe încălzire, inclusiv încălzire
        plus ventilare, și pe climatizare, inclusiv climatizare plus ventilare, iar fiecare familie care trece 290 kW
        generează o obligație distinctă; pentru fiecare obligație distinctă se verifică apoi dacă sistemul existent
        îndeplinește cele trei capabilități din art. 27 alin. (5), caz în care clădirea este conformă și rămâne de
        documentat, iar dacă nu le îndeplinește se verifică fezabilitatea tehnică și economică, cu două ieșiri posibile:
        obligație activă cu termen depășit din 31 decembrie 2024, sau excepție de fezabilitate, care se documentează în
        scris.
      </p>

      <ArticleDiagram
        src="/diagrame/A02-1-arbore-decizie-bacs.jpg"
        caption="Arbore de decizie: cum se stabilește dacă o clădire intră sub obligația BACS de la 290 kW."
      />

      <h3 id="exemple-de-cladiri-care-trec-pragul">Clădiri care trec pragul de 290 kW: birouri, hoteluri, retail</h3>

      <p>
        Încadrările de mai jos sunt <strong>estimative</strong>, bazate pe puterile instalate întâlnite curent în
        proiecte de acest tip în România. Nu înlocuiesc verificarea plăcuțelor din clădirea evaluată.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Tip de clădire</th>
              <th>Situație tipică</th>
              <th>Verdict orientativ față de pragul de 290 kW</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Clădire de birouri, 10.000-15.000 mp</td>
              <td>
                Chillere de câteva sute de kW, centrale de tratare a aerului pe zone, centrală termică pentru încălzire
                și apă caldă
              </td>
              <td>Trece pragul aproape sigur, adesea pe ambele articole</td>
            </tr>
            <tr>
              <td>Hotel de 150-250 de camere</td>
              <td>Centrală termică dimensionată și pentru apă caldă menajeră, climatizare pe camere și spații comune</td>
              <td>Trece pragul la încălzire; climatizarea depinde de soluție</td>
            </tr>
            <tr>
              <td>Hipermarket sau retail park</td>
              <td>Rooftop-uri multiple, perdele de aer, instalație frigorifică comercială separată</td>
              <td>Trece pragul la climatizare plus ventilare; atenție la delimitarea de frigul comercial</td>
            </tr>
            <tr>
              <td>Hală de producție cu zone administrative</td>
              <td>Încălzire de spațiu pe aeroterme sau centrale de tratare a aerului, plus utilități de proces</td>
              <td>Depinde de separarea dintre încălzirea spațiului și procesul tehnologic</td>
            </tr>
            <tr>
              <td>Școală, grădiniță, sediu administrativ mic</td>
              <td>Centrală termică sub 290 kW</td>
              <td>De regulă sub prag astăzi, dar intră sub pragul de 70 kW din Directiva (UE) 2024/1275</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 id="sensul-sintagmei-fezabil-din-punct-de-vedere-tehnic-si-economic">
        Excepția de fezabilitate din art. 27 alin. (5) se documentează
      </h3>

      <p>
        Excepția de fezabilitate tehnică și economică se demonstrează cu un dosar datat, nu se presupune. Este condiția
        pe care majoritatea proprietarilor o invocă implicit și pe care aproape nimeni nu o pune pe hârtie. Legea nu
        prezumă nefezabilitatea; o tratează ca pe o excepție. Susținerea că echiparea nu este fezabilă are nevoie de un
        dosar care arată <em>de ce</em>:
      </p>

      <ul>
        <li>constrângeri tehnice concrete: instalații fără posibilitate de reglaj, echipamente la final de viață;</li>
        <li>
          o analiză economică ce raportează investiția la economia estimată și la durata rămasă de exploatare;
        </li>
        <li>o decizie datată, asumată de administrator.</li>
      </ul>

      <p>
        Un dosar coerent este o poziție apărabilă. Absența oricărui dosar nu este. Diferența se vede abia la un control
        sau la un due diligence, adică exact atunci când nu mai poate fi construită retroactiv.
      </p>

      <h2 id="capabilitatile-pe-care-legea-le-cere-sistemului">Cele trei capabilități cerute de art. 27 alin. (5)</h2>

      <p>
        Legea cere trei capabilități cumulative, nu una: monitorizarea și ajustarea continuă a consumului de energie,
        benchmarking-ul eficienței cu detectarea pierderilor și informarea unui responsabil, și interoperabilitatea
        între tehnologii proprietare diferite. Aici se rupe cel mai des lanțul. Multe clădiri au „automatizare&rdquo; în
        sensul că un tablou pornește și oprește cazanul după un program orar, ceea ce nu acoperă niciuna dintre cele
        trei cerințe complet.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Cerința din lege</th>
              <th>Ce înseamnă la nivel de echipament</th>
              <th>Ce înseamnă la nivel de software</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>(a)</strong> Monitorizarea, înregistrarea, analizarea și ajustarea continuă a consumului de
                energie
              </td>
              <td>
                Contoare de energie pe consumatorii principali; senzori de temperatură, presiune și debit; elemente de
                execuție modulante (vane cu servomotor, variatoare de turație), nu doar contactoare
              </td>
              <td>
                Istoricizare cu pas fin, păstrată pe termen lung; reglaj după sarcină, nu doar după orar; valori de
                consemn modificabile central
              </td>
            </tr>
            <tr>
              <td>
                <strong>(b)</strong> Benchmarking al eficienței energetice, detectarea pierderilor de eficiență și
                informarea persoanei responsabile
              </td>
              <td>
                Contorizare secundară destul de granulară încât o derivă să fie localizabilă pe un subsistem, nu doar pe
                clădire
              </td>
              <td>
                Indicatori normalizați (kWh/mp/an, comparabili în timp); reguli de detectare a abaterilor; alarmare
                activă către un destinatar nominalizat
              </td>
            </tr>
            <tr>
              <td>
                <strong>(c)</strong> Comunicarea cu sistemele tehnice conectate și interoperabilitatea între tehnologii
                proprietare diferite
              </td>
              <td>Controlere cu protocoale deschise; gateway-uri către echipamentele cu protocol propriu</td>
              <td>Integrare în aceeași platformă de supervizare, cu punctele de date expuse și exportabile</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Sursa cerințelor funcționale:{" "}
        <a href="https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng" target="_blank" rel="noopener">
          Directiva (UE) 2024/1275, art. 13 alin. (10)
        </a>
        , care preia și continuă formularea din directiva anterioară transpusă în legea română.
      </p>

      <h3 id="de-ce-un-sistem-care-doar-porneste-si-opreste-nu-acopera-cerinta">
        Pornit-oprit nu acoperă cele trei capabilități cerute de lege
      </h3>

      <p>
        Un automat de pornire și oprire satisface, cel mult, parțial prima cerință din art. 27 alin. (5), și nici pe
        aceea, pentru că „ajustarea continuă&rdquo; presupune modulare, nu comutare. Nu produce înregistrări
        utilizabile, deci nu permite analiza. Nu are cu ce să compare, deci nu face benchmarking.
      </p>

      <p>
        Nu detectează nici pierderile de eficiență: o vană rămasă 15% deschisă vara, o centrală de tratare a aerului
        care încălzește și răcește simultan, un cazan care ciclează scurt. Îi lipsesc indicatorii și regulile. Și nu
        informează pe nimeni.
      </p>

      <p>
        Testul practic, de zece minute, fără consultant: se cere administratorului clădirii graficul de consum al
        ultimei luni, defalcat pe subsisteme, și lista alarmelor de eficiență din ultimul trimestru. Dacă nu există,
        sistemul nu îndeplinește cele trei capabilități cerute de lege, indiferent cum se numește. Punctele de
        verificare detaliate sunt grupate într-un checklist de audit BMS.{" "}
        <a href="/contact">Cere checklistul de audit BMS</a>.
      </p>

      <p>
        Cerința (c), interoperabilitatea, este cea mai subestimată. O clădire tipică are chillere de la un producător,
        centrale de tratare a aerului de la altul, contoare pe M-Bus, iluminat pe DALI și tablouri pe Modbus. Fără o
        strategie de integrare, fiecare rămâne o insulă. Vezi{" "}
        <a href="/resurse/bms-scada-integrare">materialele despre BMS, SCADA și integrare</a>.
      </p>

      <h2 id="ce-se-schimba-prin-epbd-2024-1275">EPBD 2024/1275: pragul de 70 kW și termenul 31 decembrie 2029</h2>

      <p>
        Directiva (UE) 2024/1275, reformarea EPBD, modifică regimul sistemelor de automatizare și control al clădirilor
        (BACS) în două privințe. Ambele sunt, la data acestui articol,{" "}
        <strong>obligații europene care nu se regăsesc încă în legea română</strong>.
      </p>

      <p>
        <strong>Pragul coboară de la 290 kW la 70 kW, cu termen 31 decembrie 2029.</strong> Aceeași obligație, aceeași
        condiție de fezabilitate, aplicată unei populații de clădiri mult mai mari: majoritatea clădirilor de birouri
        medii, a școlilor, a hotelurilor mici și a sediilor administrative aflate astăzi sub pragul de 290 kW vor intra
        sub obligație. Sursa:{" "}
        <a href="https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng" target="_blank" rel="noopener">
          Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b)
        </a>
        .
      </p>

      <p>
        <strong>
          Se adaugă o a patra capabilitate: monitorizarea calității mediului interior, de la 29 mai 2026.
        </strong>{" "}
        În practică, senzori de CO2, temperatură și umiditate în spațiile ocupate, cu date istoricizate (art. 13 alin.
        (10) lit. d)). Tot acolo, art. 13 alin. (5) cere ca noile clădiri nerezidențiale cu emisii zero să fie echipate
        cu dispozitive de măsurare și control al calității aerului interior, iar clădirile existente la renovare majoră,
        unde este fezabil.
      </p>

      <p>
        <strong>Ce nu s-a întâmplat încă.</strong> Termenul de transpunere a Directivei (UE) 2024/1275 este 29 mai 2026
        (art. 35 alin. 1), iar România nu a transpus directiva integral, ci doar art. 17 alin. (15), prin OG 16/2025. La{" "}
        <strong>
          15 iulie 2026, Comisia Europeană a trimis scrisori de punere în întârziere tuturor celor 27 de state membre
        </strong>
        , inclusiv României, cu termen de două luni pentru răspuns (
        <a
          href="https://energy.ec.europa.eu/news/commission-calls-eu-countries-transpose-reinforced-rules-energy-performance-buildings-2026-07-15_en"
          target="_blank"
          rel="noopener"
        >
          comunicatul Comisiei
        </a>
        ).
      </p>

      <p>
        Concluzia operațională:{" "}
        <strong>obligația legală de astăzi este la 290 kW pe familie de sisteme, nu la 70 kW.</strong> Pragul de 70 kW
        va ajunge însă în legea română, iar arhitectura aleasă acum decide dacă va urma o extindere sau o reluare de la
        zero. Contextul complet este în{" "}
        <a href="/resurse/reglementari-conformare">materialele despre reglementări și conformare</a>.
      </p>

      <h2 id="regimul-sanctionator-dupa-legea-238-2024">Amenzile din Legea 238/2024: de la 5.000 la 30.000 lei</h2>

      <p>
        Legea nr. 238/2024, adoptată la 19 iulie 2024 și publicată în Monitorul Oficial la 25 iulie 2024, modifică Legea
        372/2005 și majorează amenzile cu până la aproximativ 400% față de nivelurile anterioare. Tranșele merg de la
        5.000-7.500 lei până la 10.000-20.000 lei în regimul general, cu o tranșă distinctă de 5.000-30.000 lei pentru
        autoritățile administrației publice locale:
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Tranșă</th>
              <th>Cui se adresează</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>5.000-7.500 lei</td>
              <td>
                Contravenții privind obligațiile proprietarilor, administratorilor și celorlalți participanți la
                construire și exploatare, potrivit faptelor enumerate în articolul de sancțiuni
              </td>
            </tr>
            <tr>
              <td>7.500-10.000 lei</td>
              <td>Tranșă intermediară, pentru faptele mai grave din aceeași categorie</td>
            </tr>
            <tr>
              <td>10.000-20.000 lei</td>
              <td>Tranșa superioară din regimul general al legii</td>
            </tr>
            <tr>
              <td>5.000-30.000 lei</td>
              <td>Tranșă distinctă, pentru autoritățile administrației publice locale</td>
            </tr>
            <tr>
              <td>Suspendare 12-24 de luni (complementară)</td>
              <td>Auditori energetici pentru clădiri, pentru abateri profesionale</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Sursa:{" "}
        <a href="https://legislatie.just.ro/public/DetaliiDocument/285769" target="_blank" rel="noopener">
          Legea nr. 238/2024
        </a>
        .
      </p>

      <p>
        O precizare pe care alte texte o sar.{" "}
        <strong>
          Încadrarea fiecărei fapte într-o tranșă sau alta se face prin articolul de contravenții din legea consolidată,
          care trebuie citit direct înainte de orice evaluare de risc.
        </strong>{" "}
        Neechiparea cu sisteme de automatizare și control al clădirilor nu atrage automat tranșa maximă și nici invers.
        Cert este că regimul sancționator al Legii 372/2005 a fost întărit substanțial în 2024, în același an cu
        expirarea termenului de echipare.
      </p>

      <p>Pentru un proprietar instituțional, riscul financiar direct al amenzii nu este cel mai mare. Mai relevante sunt:</p>

      <ul>
        <li>constatarea neconformității într-un audit de due diligence la vânzare sau refinanțare;</li>
        <li>dificultatea de a răspunde cerințelor de raportare ale chiriașilor corporativi;</li>
        <li>imposibilitatea de a documenta performanța energetică atunci când este cerută.</li>
      </ul>

      <p>O clădire care nu își poate demonstra datele se evaluează mai prost.</p>

      <h2 id="calendarul-termenelor">Calendarul termenelor: 31 decembrie 2024, 29 mai 2026, 31 decembrie 2029</h2>

      <p>
        Două termene contează pentru bugetul următorilor ani: termenul de echipare la 290 kW pe familie de sisteme a
        fost 31 decembrie 2024 și este depășit, iar pragul de 70 kW, cu termen 31 decembrie 2029, provine din Directiva
        (UE) 2024/1275, art. 13 alin. (9) lit. b), și nu este încă transpus în legea română. Între ele stă 29 mai 2026,
        termenul de transpunere a directivei, nerespectat de România.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Termen</th>
              <th>Ce se întâmplă</th>
              <th>Sursă juridică</th>
              <th>Status în România</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>31.12.2024</strong>
              </td>
              <td>
                Clădiri nerezidențiale cu putere nominală utilă de peste 290 kW pe familie de sisteme: obligația de
                echipare cu sisteme de automatizare și control
              </td>
              <td>Legea 372/2005, art. 27 alin. (5) și art. 29 alin. (6)</td>
              <td>
                <strong>În vigoare, termen depășit</strong>
              </td>
            </tr>
            <tr>
              <td>
                <strong>29.05.2026</strong>
              </td>
              <td>
                Termen de transpunere a EPBD reformate; apare cerința de monitorizare a calității mediului interior
              </td>
              <td>Dir. (UE) 2024/1275, art. 35 alin. (1) și art. 13 alin. (10) lit. d)</td>
              <td>Netranspusă; punere în întârziere din 15.07.2026</td>
            </tr>
            <tr>
              <td>
                <strong>01.01.2028</strong>
              </td>
              <td>Clădirile noi ale organismelor publice: clădiri cu emisii zero (ZEB)</td>
              <td>Dir. (UE) 2024/1275 (capitolul privind ZEB)</td>
              <td>Obligație UE, netranspusă</td>
            </tr>
            <tr>
              <td>
                <strong>31.12.2029</strong>
              </td>
              <td>Pragul BACS coboară la 70 kW</td>
              <td>Dir. (UE) 2024/1275, art. 13 alin. (9) lit. b)</td>
              <td>Obligație UE, netranspusă</td>
            </tr>
            <tr>
              <td>
                <strong>01.01.2030</strong>
              </td>
              <td>Toate clădirile noi trebuie să fie clădiri cu emisii zero (ZEB)</td>
              <td>Dir. (UE) 2024/1275 (capitolul privind ZEB)</td>
              <td>Obligație UE, netranspusă</td>
            </tr>
            <tr>
              <td>
                <strong>2030</strong>
              </td>
              <td>MEPS: cele mai slabe 16% din fondul nerezidențial (referință 01.01.2020)</td>
              <td>Dir. (UE) 2024/1275, art. 9 alin. (1)</td>
              <td>Obligație UE, netranspusă</td>
            </tr>
            <tr>
              <td>
                <strong>2033</strong>
              </td>
              <td>MEPS: cele mai slabe 26% din fondul nerezidențial</td>
              <td>Dir. (UE) 2024/1275, art. 9 alin. (1)</td>
              <td>Obligație UE, netranspusă</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ArticleDiagram
        src="/diagrame/A02-2-cronologie-2024-2033.jpg"
        caption="Cronologia 2024-2033: termenul depășit din legea română și obligațiile UE netranspuse."
      />

      <h2 id="sase-pasi-practici">Șase pași, de la puterea nominală utilă la caietul de sarcini</h2>

      <ol>
        <li>
          <strong>Stabilirea puterii nominale utile instalate</strong>, separat pentru încălzire (inclusiv încălzire
          plus ventilare) și pentru climatizare (inclusiv climatizare plus ventilare), pentru că pragul de 290 kW se
          aplică pe familie de sisteme. Sursa este plăcuța echipamentului și cartea tehnică, nu factura. Cifrele se
          notează într-un document datat.
        </li>
        <li>
          <strong>Inventarul automatizării existente.</strong> Ce controlere există, ce protocoale vorbesc, ce puncte de
          date sunt efectiv citite, ce se istoricizează și pe ce perioadă, cine primește alarmele.
        </li>
        <li>
          <strong>Evaluarea sistemului față de cele trei capabilități din art. 27 alin. (5)</strong>, punct cu punct.
          Rezultatul nu este „da sau nu&rdquo;, ci o listă de lipsuri concrete: lipsesc contoare pe două circuite, nu
          există istoricizare peste 30 de zile, alarmele nu ajung la nimeni.
        </li>
        <li>
          <strong>Documentarea nefezabilității, dacă aceasta este poziția asumată.</strong> Analiză tehnică, analiză
          economică cu cifre, decizie datată și semnată. Un dosar întocmit după un control valorează mult mai puțin.
        </li>
        <li>
          <strong>Planificarea bugetului pe două orizonturi:</strong> conformarea la 290 kW, care este restantă din 31
          decembrie 2024, și extinderea la pragul de 70 kW, cu termen 31 decembrie 2029, plus monitorizarea calității
          mediului interior. O arhitectură deschisă, cu protocoale standard, face din a doua etapă o extindere, nu o
          refacere.
        </li>
        <li>
          <strong>Transformarea concluziilor într-o specificație tehnică</strong> înainte de cererea de oferte. Fără
          cerințe funcționale scrise, ofertele nu sunt comparabile. Structura se găsește în{" "}
          <a href="/ghid/caiet-de-sarcini-bms">ghidul de caiet de sarcini pentru un sistem BMS</a>.
        </li>
      </ol>

      <h2 id="ce-inseamna-pentru-fiecare-rol">Ce înseamnă pragul de 290 kW pentru proprietar și director tehnic</h2>

      <p>
        <strong>Pentru proprietar, dezvoltator și investitor.</strong> Un portofoliu obișnuit conține cel puțin o
        clădire care trebuia echipată până la 31 decembrie 2024, pentru că trece pragul de 290 kW pe cel puțin una
        dintre familiile de sisteme. Riscul imediat nu este amenda, ci ce se întâmplă la următoarea tranzacție sau
        refinanțare, când neconformitatea apare în due diligence și devine punct de negociere. Primul pas nu este
        cererea de oferte, ci aflarea cifrei, puterea nominală utilă, pentru fiecare activ. Vezi și{" "}
        <a href="/expertiza/cladiri-de-birouri">abordarea pentru clădirile de birouri</a>.
      </p>

      <p>
        <strong>Pentru directorul tehnic.</strong> Întrebările care vin de sus sunt cât costă și de ce nu s-a făcut.
        Răspunsul cere trei documente producibile în câteva săptămâni: inventarul puterilor instalate pe fiecare familie
        de sisteme, evaluarea automatizării existente față de cele trei capabilități din art. 27 alin. (5) și un plan
        etapizat cu buget orientativ. Discuția se mută astfel de la vină la calendar. Pentru un sistem funcțional dar
        incomplet, drumul obișnuit este{" "}
        <a href="/servicii/modernizare-sisteme-de-automatizare-si-bms">modernizarea automatizării existente</a>, nu
        înlocuirea. Alte resurse sunt grupate pe pagina dedicată directorilor tehnici.
      </p>

      <ArticleFaqBox items={faq} />

      <h2 id="concluzie">Concluzie: obligația de la 290 kW este o restanță din 2024</h2>

      <p>
        Obligația de echipare la o putere nominală utilă de peste 290 kW pe familie de sisteme nu este o temă de viitor,
        este o restanță. Termenul a fost 31 decembrie 2024 și este depășit, iar efectele apar în fiecare due diligence
        și în fiecare discuție de refinanțare. Cine își cunoaște puterea nominală utilă și starea reală a automatizării
        poate trata subiectul ca pe un plan de buget. Cine nu, îl va trata ca pe o surpriză, la un moment ales de
        altcineva.
      </p>

      <h2 id="discuta-conformarea-cu-un-inginer-sovitech">Discută conformarea cu un inginer Sovitech</h2>

      <p>
        Prima întrebare de lămurit este dacă o clădire intră sub obligație, iar răspunsul stă în puterea nominală utilă
        instalată, evaluată separat pe încălzire și pe climatizare.{" "}
        <a href="/contact">
          <strong>Cere o verificare a pragului de putere pentru clădirea evaluată</strong>
        </a>
        . Pe baza plăcuțelor de identificare și a cărții tehnice rezultă încadrarea față de pragul de 290 kW și lista
        documentelor de pregătit.
      </p>

      <p>
        Pentru cifrele deja adunate și o evaluare a lipsurilor față de cerințele legale, discutăm punctual prin{" "}
        <a href="/servicii/consultanta">serviciul de consultanță</a>. Rezultatul evaluării este o listă de lipsuri și un
        buget orientativ, nu o ofertă.
      </p>

      <p className="article-note">
        Articol publicat la 16 august 2026, revizuit la 18 august 2026. Informațiile juridice au fost verificate la 16
        august 2026, pe baza textelor publicate pe portalul legislativ al Ministerului Justiției și în Jurnalul Oficial
        al Uniunii Europene. Legea 372/2005 este un act modificat de mai multe ori: forma consolidată la zi se verifică
        înainte ca acest text să fie folosit într-o decizie de investiție sau într-un răspuns la control. Autor: Echipa
        de inginerie Sovitech Control. {/* TODO(author): replace with the signing engineer */}
      </p>
    </ArticleProse>
  )
}
