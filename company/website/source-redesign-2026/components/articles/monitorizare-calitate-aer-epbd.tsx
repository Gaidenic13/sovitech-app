import { ArticleDiagram, ArticleFaqBox, ArticleProse } from "@/components/article-prose"
import type { ArticleFaq, ArticleMeta } from "./index"

// LINKS-TO-REACTIVATE: materialele despre reglementări și conformare | interim /resurse/reglementari-conformare | final /ghid/conformare-cladiri-romania
// LINKS-TO-REACTIVATE: materialele despre BMS, SCADA și integrare | interim /resurse/bms-scada-integrare | final /ghid/protocoale-automatizarea-cladirilor
// LINKS-TO-REACTIVATE: Cere checklistul de audit BMS | interim /contact | final /instrumente/checklist-audit-bms
// LINKS-TO-REACTIVATE: proprietari și investitori (text fără link în corp) | interim (fără link) | final /pentru/proprietari-si-investitori
// LINKS-TO-REACTIVATE: facility manager (text fără link în corp) | interim (fără link) | final /pentru/facility-manager

export const meta: ArticleMeta = {
  title: "Monitorizare calitate aer interior: ce cere EPBD | Sovitech Control",
  description:
    "Din 29 mai 2026 sistemele BACS trebuie sa poata monitoriza calitatea mediului interior. Ce se masoara, ce cere EPBD si ce nu e inca in legea romana.",
  datePublished: "2026-08-17",
  dateModified: "2026-08-17",
}

export const faq: ArticleFaq[] = [
  {
    q: "Este obligatorie monitorizarea calitatii aerului in cladiri in Romania?",
    a: "Nu încă. Cerința vine din art. 13 alin. (10) lit. d) al Directivei (UE) 2024/1275 și se aplică de la 29 mai 2026 la nivel european. România nu a transpus directiva și a primit scrisoare de punere în întârziere la 15 iulie 2026. În legea română rămâne doar obligația de BACS peste 290 kW pe familie de sisteme.",
  },
  {
    q: "Ce nivel de CO₂ este normal într-un birou?",
    a: "Aerul exterior are 400-450 ppm. Într-un spațiu bine ventilat, valorile stau de regulă sub 800-1.000 ppm, iar peste circa 1.400 ppm indică ventilație insuficientă față de numărul de ocupanți. Sunt repere orientative: pragurile naționale nu au fost încă stabilite.",
  },
  {
    q: "Cat timp se pastreaza datele de calitate a aerului?",
    a: "Minimum 24 de luni la rezoluție completă, cu eșantionare la 5-15 minute, plus arhivă agregată pe termen lung. Sub 24 de luni nu există comparație an la an, iar un singur sezon nu arată dacă o intervenție a schimbat ceva. Este aceeași regulă ca la punctele de energie, fiindcă alimentează același lanț de raportare.",
  },
  {
    q: "Cât de des trebuie verificați senzorii de CO₂?",
    a: "Senzorii NDIR derivează în timp, de regulă la 2-3 ani de la montaj. O verificare anuală, cu gaz de referință sau prin comparație cu un aparat etalonat, este practica uzuală. Autocalibrarea ajută doar în spații care ajung periodic la valori apropiate de cele exterioare.",
  },
  {
    q: "Monitorizarea calității aerului crește sau scade factura?",
    a: "Depinde de ce se face cu datele. Dacă valoarea doar se afișează, este un cost. Dacă intră în bucla de reglare a debitului de aer proaspăt, consumul scade, pentru că ventilarea urmează ocuparea reală. Economia se măsoară pe un sezon complet.",
  },
]

export default function Body() {
  return (
    <ArticleProse>
      <p className="standfirst">
        Ce cere art. 13 din EPBD, ce se măsoară, de la ce dată și ce este în vigoare în România.
      </p>

      <p>
        Directiva (UE) 2024/1275 cere ca, din 29 mai 2026, sistemele de automatizare și control al clădirilor (BACS) să
        fie capabile de monitorizarea calității mediului interior. În practică: senzori de CO₂, temperatură și
        umiditate, citiți în BMS, cu istoric și cu alarme. Cerința se aplică sistemului, nu fiecărei încăperi.
      </p>

      <p>
        România nu a transpus prevederea. La 15 iulie 2026, Comisia Europeană a trimis scrisori de punere în întârziere
        tuturor celor 27 de state membre, inclusiv României.
      </p>

      <h2 id="pe-scurt">Pe scurt</h2>

      <ul>
        <li>
          Art. 13 alin. (10) lit. d) din Directiva (UE) 2024/1275 adaugă monitorizarea calității mediului interior în
          lista capabilităților BACS, din 29 mai 2026. Este a patra capabilitate, alături de cele trei existente.
        </li>
        <li>
          Art. 13 alin. (4) lasă pragurile numerice în seama statelor membre: directiva nu fixează valori, iar toate
          valorile numerice din articol sunt repere de proiectare, orientative, nu praguri legale.
        </li>
        <li>
          Art. 13 alin. (5) cere dispozitive de măsurare și control al calității aerului în clădirile nerezidențiale cu
          emisii zero, iar la cele existente la renovare majoră, unde e fezabil tehnic și economic.
        </li>
        <li>
          Nimic din aceste prevederi nu este transpus în legea română. În vigoare rămâne obligația din Legea 372/2005
          pentru clădirile nerezidențiale cu sisteme de încălzire, de climatizare, sau combinate cu ventilare, cu putere
          nominală utilă de peste 290 kW pe familie de sisteme; termenul a fost 31 decembrie 2024 și este depășit.
        </li>
        <li>
          Datele de mediu interior se istoricizează la 5-15 minute și se păstrează minimum 24 de luni la rezoluție
          completă: sub 24 de luni nu există comparație an la an.
        </li>
        <li>
          Senzorii NDIR de CO₂ se decalibrează în 2-3 ani, iar verificarea lipsește din majoritatea contractelor de
          mentenanță.
        </li>
      </ul>

      <h2 id="art-13-alin-10-lit-d-monitorizarea-ieq-din-29-mai-2026">
        Art. 13 alin. (10) lit. d): monitorizarea IEQ din 29 mai 2026
      </h2>

      <p>
        Nu există un articol separat „BACS&rdquo; în directivă. Cerințele stau în{" "}
        <strong>art. 13 alin. (9) și (10)</strong> din{" "}
        <a href="https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng" target="_blank" rel="noopener">
          Directiva (UE) 2024/1275
        </a>
        , la capitolul despre sistemele tehnice ale clădirilor. Alineatul (10) enumeră capabilitățile sistemului, iar
        litera d) este cea nouă:{" "}
        <strong>
          din 29 mai 2026, sistemul trebuie să fie capabil de monitorizarea calității mediului interior (IEQ, Indoor
          Environmental Quality)
        </strong>
        . Două prevederi completează imaginea:
      </p>

      <ul>
        <li>
          <strong>Art. 13 alin. (4):</strong> statele membre stabilesc cerințe pentru standarde adecvate de calitate a
          mediului interior. Pragurile concrete se fixează la nivel național.
        </li>
        <li>
          <strong>Art. 13 alin. (5):</strong> clădirile nerezidențiale cu emisii zero se echipează cu dispozitive de
          măsurare și control al calității aerului interior. La cele <em>existente</em>, cerința se aplică la renovare
          majoră, unde este fezabil tehnic și economic.
        </li>
      </ul>

      <p>
        Distincția contează la buget: lit. d) vizează <em>capabilitatea sistemului</em>, alin. (5){" "}
        <em>dispozitivele fizice</em>.
      </p>

      <h2 id="legea-372-2005-in-vigoare-epbd-netranspusa-in-legea-romana">
        Legea 372/2005 în vigoare, EPBD netranspusă în legea română
      </h2>

      <p>
        <strong>Nimic din cele de mai sus nu este în vigoare în România.</strong> Din Directiva 2024/1275 a fost preluat
        doar art. 17 alin. (15), prin OG 16/2025. Scrisoarea de punere în întârziere din 15 iulie 2026 a mers către
        toate cele 27 de state membre (
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
        În vigoare rămâne obligația de BACS din{" "}
        <a href="https://legislatie.just.ro/Public/DetaliiDocument/66970" target="_blank" rel="noopener">
          Legea 372/2005
        </a>
        , art. 27 alin. (5):
      </p>

      <blockquote>
        <p>
          „Până la data de 31 decembrie 2024, clădirile nerezidențiale care au sisteme de încălzire sau sisteme
          combinate de încălzire și de ventilare a spațiului cu o putere nominală utilă de peste 290 kW vor fi echipate,
          dacă acest lucru este fezabil din punct de vedere tehnic și economic, cu sisteme de automatizare și de control
          pentru clădiri.&rdquo;
        </p>
        <p>Legea 372/2005, art. 27 alin. (5)</p>
      </blockquote>

      <p>
        Formularea de reținut, aceeași în toate materialele: clădirile nerezidențiale cu sisteme de încălzire, de
        climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme.
        Termenul a fost 31 decembrie 2024 și este depășit. Pragul de 70 kW, cu termen 31 decembrie 2029, provine din
        Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b), și nu este încă transpus în legea română. Formularea
        identică de la art. 29 alin. (6), pentru climatizare, este tratată în articolul despre{" "}
        <a href="/resurse/obligatie-bacs-legea-372-2005">obligația BACS și pragul de 290 kW</a>.
      </p>

      <p>
        Pentru proprietari și investitori: cerința de monitorizare a calității mediului interior nu este opozabilă prin
        lege națională, iar{" "}
        <a href="https://legislatie.just.ro/public/DetaliiDocument/285769" target="_blank" rel="noopener">
          Legea 238/2024
        </a>{" "}
        a majorat regimul sancționator al Legii 372/2005 <em>în general</em>, fără o tranșă dedicată BACS. Context
        complet, în <a href="/resurse/reglementari-conformare">materialele despre reglementări și conformare</a>.
      </p>

      <h2 id="parametrii-ieq-si-valorile-orientative-co2-sub-1-000-ppm-20-26-c">
        Parametrii IEQ și valorile orientative: CO₂ sub 1.000 ppm, 20-26 °C
      </h2>

      <p>
        Textul român folosește „calitatea mediului interior&rdquo;, adică IEQ (Indoor Environmental Quality), termen mai
        larg decât IAQ: aerul, confortul termic, umiditatea și, după cerințele naționale, iluminatul și acustica.
      </p>

      <p>
        Reperele uzuale de proiectare, toate orientative: aerul exterior are 400-450 ppm CO₂, un spațiu bine ventilat
        stă sub 800-1.000 ppm, iar peste circa 1.400 ppm ventilația este insuficientă față de numărul de ocupanți.
        Temperatura operativă se ține la 20-24 °C iarna și 23-26 °C vara, iar umiditatea relativă între 30% și 60% în
        birouri. Pentru particule, COV, radon și zgomot, tabelul dă ordinul de mărime, nu o valoare de conformare.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Parametru</th>
              <th>De ce contează</th>
              <th>Cum se măsoară</th>
              <th>Unde se amplasează senzorul</th>
              <th>Ordin de mărime (orientativ)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CO₂</td>
              <td>Indicator indirect al ratei de aer proaspăt pe ocupant</td>
              <td>Senzor NDIR, în zonă sau pe retur</td>
              <td>Perete, la 1,1-1,7 m, departe de uși</td>
              <td>Exterior 400-450 ppm; bine ventilat sub 800-1.000 ppm; peste circa 1.400 ppm, ventilație insuficientă</td>
            </tr>
            <tr>
              <td>Temperatură operativă</td>
              <td>Cauza numărul unu a reclamațiilor</td>
              <td>Senzor de aer sau de glob</td>
              <td>Zona ocupată, ferit de soare</td>
              <td>Iarnă 20-24 °C, vară 23-26 °C</td>
            </tr>
            <tr>
              <td>Umiditate relativă</td>
              <td>Prea joasă: disconfort. Prea înaltă: condens</td>
              <td>Senzor capacitiv, în corp comun cu temperatura</td>
              <td>Ca la temperatură</td>
              <td>30-60% în birouri</td>
            </tr>
            <tr>
              <td>Particule PM2.5 / PM10</td>
              <td>Trafic, șantiere; arată starea filtrelor</td>
              <td>Senzor optic; gravimetric pentru referință</td>
              <td>Zona ocupată și priza de aer proaspăt</td>
              <td>Unități sau zeci de µg/m³; EPBD nu stabilește praguri pentru clădiri</td>
            </tr>
            <tr>
              <td>COV (compuși organici volatili)</td>
              <td>Emisii din mobilier, finisaje, curățenie</td>
              <td>Senzor MOS sau PID, nespecific: măsoară o sumă</td>
              <td>Spații nou amenajate</td>
              <td>Sute de µg/m³ ca TVOC; se urmărește tendința, nu cifra izolată</td>
            </tr>
            <tr>
              <td>Radon</td>
              <td>Relevant la subsol și la parter</td>
              <td>Detectoare pasive, expuse luni de zile</td>
              <td>Subsol, parter</td>
              <td>Bq/m³; cerințe naționale separate de EPBD</td>
            </tr>
            <tr>
              <td>Zgomot</td>
              <td>Confort perceput; adesea din instalație</td>
              <td>Sonometru, campanii punctuale</td>
              <td>Open space, sub tubulatură</td>
              <td>35-45 dB(A) ca reper de proiectare</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        <strong>Valorile sunt orientative, nu praguri legale.</strong> Pragurile naționale urmează să fie stabilite în
        baza art. 13 alin. (4). Până atunci servesc ca referință de proiectare, nu ca test de conformare.
      </p>

      <h2 id="co2-ca-indicator-al-aerului-proaspat-400-450-ppm-in-exterior">
        CO₂ ca indicator al aerului proaspăt: 400-450 ppm în exterior
      </h2>

      <p>
        CO₂ nu se măsoară pentru că ar fi toxic; la concentrațiile dintr-un birou nu este un contaminant periculos. Se
        măsoară pentru că aproximează, indirect, rata de ventilație pe ocupant, plecând de la valoarea din exterior,
        400-450 ppm.
      </p>

      <p>
        Fiecare persoană expiră CO₂ într-un ritm relativ constant. Când concentrația crește, se produce mai mult CO₂
        decât se evacuează, deci debitul pe persoană este prea mic. Numărul de ocupanți nu trebuie cunoscut: concentrația
        dă direct rezultatul. De aici pornește lanțul care contează financiar: CO₂, debit de aer proaspăt, consum.
      </p>

      <h2 id="ventilatia-controlata-dupa-cerere-dcv-debitul-urmeaza-ocuparea">
        Ventilatia controlata dupa cerere (DCV): debitul urmeaza ocuparea
      </h2>

      <p>
        Ventilația controlată după cerere (DCV, Demand Controlled Ventilation) pleacă de la ce arată un senzor de CO₂:
        dacă debitul de aer proaspăt corespunde numărului de oameni din încăpere. Concentrația care urcă peste valoarea
        din exterior, 400-450 ppm, înseamnă prea puțin aer proaspăt pe ocupant, iar una care rămâne joasă într-un spațiu
        gol înseamnă aer introdus degeaba. Senzorul de CO₂ încetează astfel să fie un cost de conformare și devine
        intrarea unei bucle care scade consumul: debitul urmează ocuparea, fără să coboare sub minimul garantat.
      </p>

      <p>
        DCV se justifică acolo unde raportul dintre ocuparea de vârf și cea medie este mare: săli de ședințe,
        amfiteatre, săli de curs, retail. Nu se justifică în spații tehnice, depozite și arhive, unde programul orar
        este mai ieftin, și nu se aplică în pharma, medical și laboratoare, unde debitul și cascada de presiuni sunt
        impuse de proces.
      </p>

      <ArticleDiagram
        src="/diagrame/A10-1-bucla-ventilatie-co2.jpg"
        caption="Bucla de reglare DCV: ocupare, senzor de CO₂, controler BMS, element de execuție, debit livrat."
      />

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Tip de spațiu</th>
              <th>Tipar de ocupare</th>
              <th>Potrivire DCV</th>
              <th>De ce</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Săli de ședințe</td>
              <td>Goale ore întregi, apoi pline</td>
              <td>Foarte bună</td>
              <td>Cel mai mare raport vârf/medie din clădire</td>
            </tr>
            <tr>
              <td>Amfiteatre, săli de curs, conferințe</td>
              <td>Intensă, pe intervale scurte</td>
              <td>Foarte bună</td>
              <td>Debit de proiect mare, folosit rar</td>
            </tr>
            <tr>
              <td>Open space de birouri</td>
              <td>Variabilă pe zile și zone</td>
              <td>Bună, pe zone</td>
              <td>Un senzor pe etaj mediază și pierde efectul</td>
            </tr>
            <tr>
              <td>Retail, restaurante</td>
              <td>Variabilă, cu vârfuri previzibile</td>
              <td>Bună</td>
              <td>CO₂ nu acoperă mirosurile</td>
            </tr>
            <tr>
              <td>Spații tehnice, depozite, arhive</td>
              <td>Ocupare aproape nulă</td>
              <td>Slabă</td>
              <td>Nu există ce reduce; programul orar e mai ieftin</td>
            </tr>
            <tr>
              <td>Pharma, medical, laboratoare</td>
              <td>Constantă prin proiectare</td>
              <td>Nu se aplică</td>
              <td>Debitul și cascada de presiuni sunt impuse de proces</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="patru-masuri-reglaj-pe-co2-recuperare-programe-orare-free-cooling">
        Patru măsuri: reglaj pe CO₂, recuperare, programe orare, free cooling
      </h2>

      <p>Peste un debit rezonabil pe ocupant, CO₂ nu mai scade semnificativ, dar factura crește liniar. Patru măsuri țin echilibrul.</p>

      <ul>
        <li>
          <strong>Reglaj pe CO₂, pe zone</strong>, cu debit minim garantat.
        </li>
        <li>
          <strong>Recuperare de căldură.</strong> Multe recuperatoare merg cu by-pass-ul blocat deschis și nimeni nu
          observă până la analiza consumului.
        </li>
        <li>
          <strong>Programe orare curate.</strong> Ventilare cu o oră înainte de ocupare, oprire la final, regim redus în
          weekend. În multe clădiri programul nu a mai fost revizuit de la punerea în funcțiune.
        </li>
        <li>
          <strong>Free cooling</strong>, când aerul exterior permite.
        </li>
      </ul>

      <h2 id="cele-patru-capabilitati-bacs-din-art-13-alin-10">Cele patru capabilități BACS din art. 13 alin. (10)</h2>

      <p>
        Un afișaj cu valoarea de CO₂ în lobby nu înseamnă monitorizare. Art. 13 alin. (10) cere patru capabilități:
        monitorizarea, înregistrarea, analiza și ajustarea continuă a consumului de energie (lit. a); evaluarea
        eficienței, detectarea pierderilor și informarea persoanei responsabile (lit. b); comunicarea cu sistemele
        tehnice conectate și interoperabilitatea între tehnologii proprietare diferite (lit. c); iar din 29 mai 2026,
        monitorizarea calității mediului interior (lit. d). Litera d) se sprijină pe celelalte trei: fără istoricizare,
        fără alarmare și fără protocol deschis, senzorul rămâne un afișaj.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Capabilitate</th>
              <th>Ce cere</th>
              <th>Ce înseamnă pentru IEQ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>a)</td>
              <td>Monitorizarea, înregistrarea, analiza și ajustarea continuă a consumului de energie</td>
              <td>Datele de IEQ corelate cu consumul: cât costă o reducere de ppm.</td>
            </tr>
            <tr>
              <td>b)</td>
              <td>Benchmarking al eficienței, detectarea pierderilor, informarea responsabilului</td>
              <td>
                Comparare cu o referință și <strong>alarmare</strong>: senzor blocat, valoare înghețată, zonă sub
                setpoint.
              </td>
            </tr>
            <tr>
              <td>c)</td>
              <td>Comunicare cu sistemele conectate și interoperabilitate între tehnologii proprietare diferite</td>
              <td>
                Senzorii trebuie citibili din BMS prin BACnet, Modbus, KNX sau M-Bus, protocoale comparate în{" "}
                <a href="/resurse/bms-scada-integrare">materialele despre BMS, SCADA și integrare</a>, nu blocați
                într-o aplicație separată.
              </td>
            </tr>
            <tr>
              <td>d)</td>
              <td>Din 29.05.2026: monitorizarea calității mediului interior</td>
              <td>Măsurare, istoricizare, comparare, alarmare și, unde are sens, reglare automată.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>Fără istoricizare nu există nici raportare, nici dovadă.</p>

      <h2 id="opt-puncte-de-verificare-integrare-in-bms-istoricizare-24-de-luni-calibrare">
        Opt puncte de verificare: integrare în BMS, istoricizare 24 de luni, calibrare
      </h2>

      <p>
        În inventarele de senzori pe care Sovitech Control le-a făcut în clădiri de birouri din București, rezultatul
        cel mai frecvent nu a fost lipsa senzorilor, ci senzori montați și neintegrați în sistemul BMS: valoarea se vede
        pe display, dar nu există punct în BMS, deci nu există nici istoric, nici alarmă, nici export. Cele opt
        verificări de mai jos se fac în această ordine.
      </p>

      <ol>
        <li>
          <strong>Există senzori de CO₂?</strong> Verificarea se face fizic, nu în caietul de sarcini. Multe clădiri au
          senzori montați și nepuși în funcțiune.
        </li>
        <li>
          <strong>În ce zone sunt montați?</strong> Un senzor pe returul comun al unei CTA (centrală de tratare a
          aerului) care deservește etajul nu dă informație pe zonă.
        </li>
        <li>
          <strong>Sunt integrați în BMS sau doar afișați local?</strong> Un display fără punct în BMS nu produce date.
        </li>
        <li>
          <strong>Se istoricizează?</strong> Trend log activ, eșantionare la 5-15 minute, retenție de minimum 24 de luni
          la rezoluție completă. Sub 24 de luni nu există comparație an la an, deci nu se poate arăta dacă un sezon a
          fost mai bun decât cel precedent.
        </li>
        <li>
          <strong>Se folosesc în reglare?</strong> Sau doar se afișează, iar clapetele merg pe program fix? Aici stă
          diferența dintre cost și economie.
        </li>
        <li>
          <strong>Sunt calibrați?</strong> Senzorii NDIR derivează. Se verifică autocalibrarea și dacă mediul o permite.
        </li>
        <li>
          <strong>Când au fost verificați ultima dată?</strong> Se cer data și documentul. „Nu știm&rdquo; este deja un
          rezultat.
        </li>
        <li>
          <strong>Sunt în contractul de mentenanță?</strong> Verificarea periodică trebuie să fie poziție explicită în{" "}
          <a href="/servicii/intretinere-sisteme-bms">contractul de întreținere BMS</a>, cu frecvență și raport scris.
        </li>
      </ol>

      <p>
        <a href="/contact">Cere checklistul de audit BMS</a> pentru varianta extinsă a acestor verificări.
      </p>

      <h2 id="limitele-monitorizarii-deriva-de-200-ppm-la-2-3-ani-si-amplasare-gresita">
        Limitele monitorizării: derivă de 200 ppm la 2-3 ani și amplasare greșită
      </h2>

      <p>
        Senzorii de CO₂ se decalibrează în 2-3 ani și aproape nimeni nu îi verifică. Un senzor cu derivă de 200 ppm ține
        clapeta deschisă degeaba sau lasă sala de ședințe subventilată, iar raportul arată la fel de bine în ambele
        cazuri.
      </p>

      <p>
        Amplasarea contează cât precizia. Într-o clădire cu senzori montați pe perete lângă ușă, valorile descriu aerul
        de pe hol, nu zona ocupată; sala plină de la capătul celălalt al etajului rămâne invizibilă în trend log. Două
        limite se recunosc de la început:
      </p>

      <ul>
        <li>
          CO₂ nu acoperă mirosurile, COV-urile din finisaje sau particulele din exterior. Un spațiu la 600 ppm poate
          avea o problemă de filtrare.
        </li>
        <li>
          În spații cu control de umiditate sau cu cascadă de presiuni, debitul este impus de proces, iar reglarea pe
          CO₂ nu se aplică.
        </li>
      </ul>

      <h2 id="raportarea-esg-export-de-date-ieq-pe-24-de-luni">Raportarea ESG: export de date IEQ pe 24 de luni</h2>

      <p>
        „E aer stătut în sala mare&rdquo; este a doua reclamație ca frecvență, după cele de temperatură. Cu un trend log
        de CO₂ pe 30 de zile discuția devine tehnică: fie se confirmă problema, fie se arată că ventilația a lucrat în
        parametri. Vezi și <a href="/expertiza/cladiri-de-birouri">clădirile de birouri</a>.
      </p>

      <p>
        Aceiași senzori produc date cerute la due diligence și în raportare. O clădire care livrează un export de date
        IEQ pe 24 de luni răspunde altfel decât una care trimite pe cineva să citească un display. Un export pe 12 luni
        arată un singur sezon și nu permite comparația an la an, care este cerința de bază a oricărei raportări.
        Contează lanțul: senzor, controler, BMS, istoric, export. Detaliat în ghidul despre{" "}
        <a href="/ghid/date-esg-cladiri">datele pentru raportarea ESG a unei clădiri</a>.
      </p>

      <h2 id="primele-12-luni-inventar-calibrare-istoricizare-dcv">
        Primele 12 luni: inventar, calibrare, istoricizare, DCV
      </h2>

      <ol>
        <li>
          <strong>Inventarul senzorilor:</strong> tip, poziție, an de montaj, integrare în BMS. O zi de teren pentru o
          clădire medie.
        </li>
        <li>
          <strong>Verificarea și calibrarea</strong> a ceea ce există. Cea mai ieftină acțiune din listă și cea care
          rezolvă adesea jumătate din reclamații.
        </li>
        <li>
          <strong>Pornirea istoricizării</strong> pentru toate punctele de IEQ, cu retenție de minimum 24 de luni la
          rezoluție completă. Sub 24 de luni nu există comparație an la an, iar punctele de mediu interior alimentează
          același lanț de raportare ca și cele de energie, unde retenția de 24 de luni este deja regula.
        </li>
        <li>
          <strong>Completarea acoperirii</strong> pe zonele cu ocupare variabilă: săli de ședințe, conferințe, retail.
          Nu peste tot.
        </li>
        <li>
          <strong>Trecerea de la afișare la reglare</strong> unde DCV se justifică, cu măsurarea efectului pe un sezon.
          Vezi ce presupune o{" "}
          <a href="/servicii/modernizare-sisteme-de-automatizare-si-bms">modernizare a automatizărilor</a>.
        </li>
      </ol>

      <p>
        Primele trei puncte se acoperă cu <a href="/ghid/sisteme-bms-cladiri">sistemul BMS</a> existent, de regulă prin
        facility manager (BMS, Building Management System, a nu se confunda cu Battery Management System).
      </p>

      <ArticleFaqBox items={faq} />

      <h2 id="concluzie">Concluzie</h2>

      <p>
        Cerința scoate la iveală cât de puțin se știe despre ce măsoară deja clădirea. Aproape orice clădire de birouri
        modernă are senzori montați, dar puține pot exporta date pe 24 de luni. Diferența se acoperă cu o zi de inventar
        și o revizuire de contract, nu cu o investiție nouă. Transpunerea va veni cu un termen scurt, așa cum s-a
        întâmplat cu pragul de 290 kW.
      </p>

      <h2 id="discuta-evaluarea-senzorilor-cu-un-inginer-sovitech">
        Discută evaluarea senzorilor cu un inginer Sovitech
      </h2>

      <p>
        Evaluarea acoperă inventarul pe zone al senzorilor de CO₂, temperatură și umiditate, integrarea în BMS,
        istoricizarea, calibrarea și un raport față de art. 13 alin. (10) lit. d). O zi de teren pentru o clădire medie,
        iar rezultatul este o listă de lucrări, nu o ofertă.
      </p>

      <p className="article-note">
        Articol publicat 17.08.2026. Actualizat 19.08.2026. Informațiile juridice au fost verificate la 17.08.2026. Se
        actualizează la transpunerea Directivei (UE) 2024/1275 în legea română. Autor: Echipa de inginerie Sovitech
        Control. {/* TODO(author): replace with the signing engineer */}
      </p>
    </ArticleProse>
  )
}
