import { ArticleDiagram, ArticleFaqBox, ArticleProse } from "@/components/article-prose"
import type { ArticleFaq, ArticleMeta } from "./index"

// LINKS-TO-REACTIVATE:
//   materialele despre protocoale si integrare | interim /resurse/bms-scada-integrare | final /ghid/protocoale-automatizarea-cladirilor
//   materialele despre modernizare si retrofit | interim /resurse/modernizare-retrofit | final /ghid/modernizare-bms
//   cere un calcul de economie de energie pentru cladire | interim /contact | final /instrumente/calculator-economie-energie-bms
//   cere modelul de caiet de sarcini BMS | interim /contact | final /instrumente/model-caiet-de-sarcini-bms
//   pagina pentru proprietari si investitori (text fara link) | interim (fara link) | final /pentru/proprietari-si-investitori
//   pagina de asset manager (text fara link) | interim (fara link) | final /pentru/property-asset-manager

export const meta: ArticleMeta = {
  title: "Cat costa un sistem BMS: structura de pret | Sovitech Control",
  description:
    "Cat costa un sistem BMS in 2026: intervale pe punct de date, pe mp si ca procent din instalatii, trei exemple lucrate si cum compari doua oferte.",
  datePublished: "2026-08-16",
  dateModified: "2026-08-16",
}

export const faq: ArticleFaq[] = [
  {
    q: "Cat costa un sistem BMS pentru o cladire de birouri?",
    a: "Ca ordin de mărime orientativ pentru 2026, între 5 și 18 EUR pe metru pătrat de arie utilă, domeniu restrâns la clădirile de birouri: 5-10 EUR/mp la birouri clasa B și 9-18 EUR/mp la birouri clasa A, în funcție de câte agregate se automatizează și de cât de fină este contorizarea. Valorile stau în banda agregată de 4-18 EUR/mp folosită la începutul articolului pentru retail, birouri și hoteluri fără control pe cameră. Pentru o clădire de 8.000 mp cu instalații standard, banda uzuală este de 70.000-130.000 EUR fără TVA.",
  },
  {
    q: "Se poate da un preț pe metru pătrat?",
    a: "Ca verificare rapidă, da. Ca bază de contract, nu. Metrul pătrat nu spune nimic despre numărul de agregate, despre protocoale sau despre starea tablourilor, iar acestea determină bugetul. Prețul pe metru pătrat este util pentru a respinge o cifră aberantă, nu pentru a semna una.",
  },
  {
    q: "Cât durează până la o ofertă fermă?",
    a: "Cu planuri și listă de echipamente, o estimare pe intervale se face în 48 de ore. O ofertă fermă cere vizită în clădire și listă de puncte agreată, deci uzual una până la trei săptămâni, în funcție de mărimea clădirii și de documentația existentă.",
  },
  {
    q: "Cât costă mentenanța anuală a unui BMS?",
    a: "Orientativ 4-7% din valoarea sistemului pe an pentru un contract de bază și 7-12% pentru unul extins, cu reglaj sezonier și raportare. Se adaugă taxa de software, de regulă 8-18% din valoarea licențelor. Intervențiile punctuale ies aproape întotdeauna mai scump pe termen de trei ani.",
  },
  {
    q: "O ofertă mai ieftină cu 30% este o afacere bună?",
    a: "Doar dacă are aceeași listă de puncte. În practică, diferența vine din punerea în funcțiune cotată simbolic, grafica redusă la sinoptice generice, licențe limitate sau documentație lipsă. Comparația se face pe punct de date și pe conținut, cu cele zece verificări din acest articol.",
  },
  {
    q: "Cât economisește, concret, o clădire după instalare?",
    a: "Într-o clădire fără automatizare funcțională, reducerea uzuală este de 10-20% din consumul de energie asociat instalațiilor HVAC, sau de 5-15% din consumul total al clădirii, cu amortizare orientativă de 3-6 ani pentru o modernizare de capital. Economia reală depinde de disciplina de operare după punerea în funcțiune, la fel de mult ca de echipamentele montate.",
  },
]

export default function Body() {
  return (
    <ArticleProse>
      <p className="standfirst">
        Metode de estimare, benzi de preț pe punct și pe metru pătrat, linii de cost, mentenanță
        anuală și compararea a două oferte.
      </p>

      <p>
        <strong>
          Prețul unui sistem BMS se calculează pe numărul și tipul de puncte de date, nu pe metru
          pătrat. Pentru retail, birouri clasa B, birouri clasa A și hoteluri fără control pe
          cameră, ordinul de mărime orientativ pentru 2026 este 4-18 EUR/mp sau 4-11% din valoarea
          instalațiilor HVAC și electrice. Pharma și hotelurile cu control pe cameră depășesc
          semnificativ aceste valori.
        </strong>
      </p>

      <p>
        BMS înseamnă Building Management System, a nu se confunda cu Battery Management System. În
        reglementări apare ca BACS, sisteme de automatizare și control al clădirilor.
      </p>

      <p>
        Toate cifrele din acest articol sunt ordine de mărime orientative pentru anul 2026,
        exprimate în EUR fără TVA. Ele variază semnificativ de la proiect la proiect, în funcție de
        instalațiile existente, de nivelul de integrare cerut și de starea documentației. Nu sunt
        ofertă și nu pot fi folosite ca bază contractuală.
      </p>

      <h2 id="pe-scurt">Pe scurt</h2>

      <ul>
        <li>
          Un preț real iese dintr-o listă de puncte, nu dintr-o suprafață: două clădiri de birouri
          de 8.000 mp pot diferi cu 60% în buget.
        </li>
        <li>
          Banda orientativă pe punct fizic complet coboară de la 180-320 EUR sub 150 de puncte la
          90-160 EUR peste 1.500 de puncte.
        </li>
        <li>
          Pe metru pătrat, banda agregată pentru retail, birouri clasa B, birouri clasa A și hotel
          fără control pe cameră este de 4-18 EUR/mp.
        </li>
        <li>Punerea în funcțiune valorează 6-12% din investiție și este prima linie tăiată la negociere.</li>
        <li>
          Mentenanța anuală se așază la 4-7% din valoarea sistemului pentru un contract de bază și
          la 7-12% pentru unul extins, plus 8-18% din valoarea licențelor ca taxă anuală de
          software.
        </li>
        <li>
          Un retrofit costă frecvent 40-60% dintr-un sistem nou echivalent, cu condiția ca peste 40%
          din instalația existentă să fie refolosibilă.
        </li>
        <li>
          Diferența dintre două oferte vine de cele mai multe ori din numărul de puncte incluse, nu
          din marca echipamentelor.
        </li>
      </ul>

      <h2 id="cuprins">Cuprins</h2>

      <nav aria-label="Cuprins">
        <ul>
          <li>
            <a href="#datele-din-care-iese-un-pret">Cele șase informații din care iese un preț</a>
          </li>
          <li>
            <a href="#cele-trei-metode-de-estimare">
              Costul unui BMS: 4-18 EUR/mp și 90-320 EUR pe punct
            </a>
          </li>
          <li>
            <a href="#structura-interna-a-costului">
              Cele nouă linii de cost: echipamente 20-30%, punere în funcțiune 6-12%
            </a>
          </li>
          <li>
            <a href="#costuri-uitate-in-bugetele-de-investitie">
              Opt costuri uitate în buget: licențele și taxa anuală de 8-18%
            </a>
          </li>
          <li>
            <a href="#costul-anual-al-mentenantei">
              Mentenanța anuală: 4-7% contract de bază, 7-12% extins
            </a>
          </li>
          <li>
            <a href="#trei-scenarii-ilustrative-de-buget">
              Trei scenarii: birouri 8.000 mp, hotel 120 de camere, hală 12.000 mp
            </a>
          </li>
          <li>
            <a href="#modernizare-sau-sistem-nou">
              Modernizarea costă 40-60% dintr-un sistem nou echivalent
            </a>
          </li>
          <li>
            <a href="#compararea-a-doua-oferte">Cele zece verificări la compararea a două oferte</a>
          </li>
          <li>
            <a href="#finantare-si-context-de-reglementare">
              Finanțare de 150 mil. EUR și pragul legal de 290 kW
            </a>
          </li>
          <li>
            <a href="#ce-inseamna-asta-pentru-proprietar-si-pentru-asset-manager">
              Ce înseamnă pentru proprietar și asset manager: rezervă de 8-12%
            </a>
          </li>
          <li>
            <a href="#intrebari-frecvente">Întrebări frecvente</a>
          </li>
        </ul>
      </nav>

      <h2 id="datele-din-care-iese-un-pret">Cele șase informații din care iese un preț</h2>

      <p>
        Prețul unui sistem BMS iese din șase informații despre clădire, iar suprafața nu este
        niciuna dintre ele. Întrebarea „cât costă un BMS pentru 8.000 de metri pătrați" nu conține
        informația care determină prețul. O clădire are două centrale de tratare a aerului, CTA, și
        ventiloconvectoare, alta are patru CTA, recuperare de căldură, VAV pe zonă și contorizare pe
        chiriaș. Suprafața e aceeași, bugetul diferă cu 60%.
      </p>

      <p>Pentru o ofertă serioasă, cineva trebuie să fi văzut cel puțin următoarele:</p>

      <ul>
        <li>
          <strong>Lista de puncte</strong>: inventarul intrărilor și ieșirilor, agregat cu agregat.
          Singurul document din care iese un preț real și primul care lipsește din caietele de
          sarcini.
        </li>
        <li>
          <strong>Schema instalațiilor</strong>: HVAC, termic, sanitar, electric. Ce agregate
          există, ce debite, câte zone.
        </li>
        <li>
          <strong>Tablourile existente</strong>: dacă se refolosesc, dacă mai au spațiu, dacă
          aparatajul e conform.
        </li>
        <li>
          <strong>Ce se integrează</strong>: chiller, centrale termice, UPS, generator, contoare,
          ascensoare, detecție de incendiu. Fiecare integrare prin protocol are cost și risc
          propriu.
        </li>
        <li>
          <strong>Nivelul de grafică</strong>: sinoptice simple sau planuri de etaj navigabile, cu
          stări în timp real.
        </li>
        <li>
          <strong>Cerințele de raportare</strong>: un dashboard operațional costă altceva decât
          rapoarte auditabile pentru ESG, cu istoricizare pe ani și export.
        </li>
      </ul>

      <p>
        În proiectele de modernizare executate de Sovitech Control, lista de puncte a lipsit din
        documentația predată în majoritatea cazurilor, iar refacerea ei a fost prima lucrare plătită
        înainte de orice ofertă.
      </p>

      <p>
        Un preț dat fără aceste informații nu este ofertă, ci un semn de intrare pe listă. Diferența
        se plătește ulterior, la lucrări suplimentare. Documentele sunt detaliate în{" "}
        <a href="/ghid/caiet-de-sarcini-bms">ghidul de caiet de sarcini pentru un sistem BMS</a>.
      </p>

      <h2 id="cele-trei-metode-de-estimare">Costul unui BMS: 4-18 EUR/mp și 90-320 EUR pe punct</h2>

      <p>
        Costul unui sistem BMS se estimează prin trei metode. Pe punct de date, la 90-320 EUR pe
        punct fizic complet. Pe metru pătrat, la 4-18 EUR/mp pentru retail, birouri și hoteluri fără
        control pe cameră. Ca procent din valoarea instalațiilor, la 4-11% pentru o clădire
        nerezidențială obișnuită.
      </p>

      <h3 id="estimarea-pe-punct-de-date-90-320-eur-pe-punct">
        Estimarea pe punct de date: 90-320 EUR pe punct
      </h3>

      <p>
        Un punct este o singură informație schimbată între clădire și sistem. Există patru tipuri
        fizice, DI, DO, AI și AO, plus punctele citite prin protocol.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Tip de punct</th>
              <th>Ce înseamnă</th>
              <th>Exemplu concret</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>DI, intrare digitală</td>
              <td>O stare de tip da/nu</td>
              <td>
                Confirmare de funcționare ventilator, presostat de filtru murdar, stare disjunctor
              </td>
            </tr>
            <tr>
              <td>DO, ieșire digitală</td>
              <td>O comandă de tip pornit/oprit</td>
              <td>Pornirea unei pompe, comanda unui contactor de iluminat</td>
            </tr>
            <tr>
              <td>AI, intrare analogică</td>
              <td>O valoare măsurată continuu</td>
              <td>Temperatură tur, CO2 în sală, presiune diferențială, umiditate</td>
            </tr>
            <tr>
              <td>AO, ieșire analogică</td>
              <td>O comandă proporțională</td>
              <td>Poziția unui servomotor de vană, turația unui ventilator prin invertor</td>
            </tr>
            <tr>
              <td>Punct de bus sau virtual</td>
              <td>O valoare citită prin protocol, fără cablu propriu</td>
              <td>Contor de energie pe M-Bus, chiller pe Modbus, invertor pe BACnet</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Prețul pe punct scade cu volumul, pentru că o parte din cost este fixă: stația de
        supervizare, licența de bază, proiectul, deplasările, documentația. Pe un sistem mic, aceste
        costuri se împart la 100 de puncte. Pe unul mare, la 2.000. Banda merge de la 180-320 EUR pe
        punct sub 150 de puncte până la 90-160 EUR peste 1.500 de puncte, iar un punct citit prin
        protocol costă 25-70 EUR.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Volum total de puncte</th>
              <th>
                Ordin de mărime EUR/punct fizic, complet (echipament de câmp, cablare, I/O,
                programare, punere în funcțiune)
              </th>
              <th>Observație</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>sub 150</td>
              <td>180-320</td>
              <td>
                Costurile fixe domină; sub 60-80 de puncte, un BMS clasic rareori se justifică
                economic
              </td>
            </tr>
            <tr>
              <td>150-500</td>
              <td>140-240</td>
              <td>
                Zona tipică pentru o clădire de birouri medie sau un hotel fără automatizare pe
                cameră
              </td>
            </tr>
            <tr>
              <td>500-1.500</td>
              <td>110-190</td>
              <td>Efectul de scară devine vizibil; costul de programare pe punct scade cel mai mult</td>
            </tr>
            <tr>
              <td>peste 1.500</td>
              <td>90-160</td>
              <td>Se justifică standardizarea pe tipuri de agregate și biblioteci reutilizabile</td>
            </tr>
            <tr>
              <td>puncte citite prin protocol</td>
              <td>25-70</td>
              <td>
                Nu au cablu și senzor propriu; costul este de configurare și testare a comunicației
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Prețul pe punct urcă la trasee dificile în clădire existentă, execuție în etape cu clădirea
        în funcțiune, senzori speciali de CO2 sau debit, zone clasificate și redundanță. Coboară la
        agregate repetitive, tablouri noi cu spațiu, un singur protocol pe toată clădirea și
        execuție într-o singură etapă.
      </p>

      <h3 id="estimarea-pe-metru-patrat-banda-agregata-de-4-18-eur-mp">
        Estimarea pe metru pătrat: banda agregată de 4-18 EUR/mp
      </h3>

      <p>
        Un sistem BMS costă 9-18 EUR/mp la birouri clasa A, 5-10 EUR/mp la birouri clasa B, 6-13
        EUR/mp la hotel fără control pe cameră și 4-9 EUR/mp la retail, ceea ce dă banda agregată de
        4-18 EUR/mp. Densitatea de puncte care produce aceste valori este de 50-90 de puncte la
        1.000 mp la birouri clasa A și de 15-35 la retail.
      </p>

      <p>
        Metoda pe metru pătrat servește la prescreening, nu la contractare: arată dacă un buget avut
        în minte se află în galaxia corectă și atât. Densitatea de puncte, nu suprafața, este ceea
        ce diferă între tipurile de clădiri.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Tip de clădire</th>
              <th>Densitate uzuală de puncte / 1.000 mp</th>
              <th>Ordin de mărime EUR/mp arie utilă</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Birouri clasa A, sistem nou complet</td>
              <td>50-90</td>
              <td>9-18</td>
            </tr>
            <tr>
              <td>Birouri clasa B, automatizare de bază pe agregate</td>
              <td>25-45</td>
              <td>5-10</td>
            </tr>
            <tr>
              <td>Hotel, fără automatizare pe cameră</td>
              <td>30-55</td>
              <td>6-13</td>
            </tr>
            <tr>
              <td>Hotel, cu control pe fiecare cameră</td>
              <td>90-160</td>
              <td>18-38</td>
            </tr>
            <tr>
              <td>Retail sau centru comercial</td>
              <td>15-35</td>
              <td>4-9</td>
            </tr>
            <tr>
              <td>Industrial, utilități și contorizare</td>
              <td>10-30</td>
              <td>3-8</td>
            </tr>
            <tr>
              <td>Pharma, zone clasificate, monitorizare de mediu</td>
              <td>100-250</td>
              <td>30-80</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Banda de 30-80 EUR/mp pentru pharma nu este o eroare de tipar. Acolo nu se plătește
        automatizare, ci trasabilitate: istoricizare, audit trail, calificare documentată.
      </p>

      <h3 id="estimarea-ca-procent-din-valoarea-instalatiilor-4-11">
        Estimarea ca procent din valoarea instalațiilor: 4-11%
      </h3>

      <p>
        Un sistem BMS reprezintă 4-7% din valoarea instalațiilor HVAC, adică încălzire, ventilare și
        climatizare, și electrice la o clădire nouă cu automatizare standard, și 7-11% la cerințe
        ridicate de contorizare și de raportare. Este metoda folosită în bugetarea de proiect, când
        există deja o estimare pentru instalații.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Situație</th>
              <th>BMS ca % din valoarea instalațiilor HVAC + electrice</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Clădire nouă, automatizare standard pe agregate</td>
              <td>4-7%</td>
            </tr>
            <tr>
              <td>
                Clădire cu cerințe ridicate: contorizare fină, raportare ESG, detectarea defectelor
              </td>
              <td>7-11%</td>
            </tr>
            <tr>
              <td>Industrial cu utilități și contorizare pe linii</td>
              <td>3-6%</td>
            </tr>
            <tr>
              <td>Pharma cu monitorizare de mediu și calificare</td>
              <td>10-18%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        O ofertă care iese la 2% din valoarea instalațiilor pentru o clădire de birouri nu este o
        afacere, ci o ofertă din care lipsește ceva: punerea în funcțiune, grafica sau licențele.
      </p>

      <h2 id="structura-interna-a-costului">
        Cele nouă linii de cost: echipamente 20-30%, punere în funcțiune 6-12%
      </h2>

      <p>
        Investiția într-un sistem BMS se împarte pe nouă linii de cost. Echipamentele de câmp iau
        20-30%, cablarea și montajul de câmp 12-20%, programarea și grafica 10-18%, iar punerea în
        funcțiune 6-12%.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Linie de cost</th>
              <th>Pondere orientativă</th>
              <th>Ce include și ce o mișcă</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Echipamente de câmp</td>
              <td>20-30%</td>
              <td>
                Senzori, traductoare, servomotoare, vane de reglaj. Vanele mari de la centrala
                termică pot singure să mute procentul cu câteva puncte.
              </td>
            </tr>
            <tr>
              <td>Controlere</td>
              <td>12-18%</td>
              <td>
                Automate libere programabile și module de I/O. Aici se decide capacitatea de
                extindere: o rezervă de 15-20% costă puțin acum și mult mai târziu.
              </td>
            </tr>
            <tr>
              <td>Tablouri de automatizare</td>
              <td>10-18%</td>
              <td>
                Dulapuri, aparataj, cablaj intern, etichetare, verificări. Scade dacă se refolosesc
                tablourile existente, crește dacă forța și automatizarea intră în același dulap.
              </td>
            </tr>
            <tr>
              <td>Cablare și montaj de câmp</td>
              <td>12-20%</td>
              <td>
                Cel mai imprevizibil capitol într-o clădire existentă. Trasee, tuburi, jgheaburi,
                manoperă la înălțime, lucru în afara programului.
              </td>
            </tr>
            <tr>
              <td>Software de supervizare și licențe</td>
              <td>5-12%</td>
              <td>
                Stația de supervizare, licența pe număr de puncte sau de utilizatori, modulele de
                raportare și de acces web.
              </td>
            </tr>
            <tr>
              <td>Programare, configurare, grafică</td>
              <td>10-18%</td>
              <td>
                Secvențele de funcționare, alarmele, orarele, sinopticele. Grafica pe planuri de
                etaj costă vizibil mai mult decât sinopticele standard.
              </td>
            </tr>
            <tr>
              <td>Punere în funcțiune și reglaj</td>
              <td>6-12%</td>
              <td>
                Testarea fiecărui punct, verificarea sensului de acțiune, reglajul buclelor.
                Capitolul cel mai des tăiat din ofertele ieftine și cel care decide dacă sistemul
                chiar economisește energie.
              </td>
            </tr>
            <tr>
              <td>Documentație as-built și instruire</td>
              <td>2-5%</td>
              <td>
                Scheme conforme cu execuția, lista finală de puncte, manual de operare, sesiuni cu
                echipa tehnică.
              </td>
            </tr>
            <tr>
              <td>Management de proiect și garanție</td>
              <td>3-6%</td>
              <td>
                Coordonarea cu ceilalți executanți, testele de recepție, perioada de garanție.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ArticleDiagram
        src="/diagrame/A04-1-structura-costului.jpg"
        caption="Structura costului unui sistem BMS pe cele nouă linii, în varianta de sistem nou și în varianta de retrofit."
      />

      <p>
        Punerea în funcțiune este prima linie tăiată la negociere, pentru că nu se vede ca obiect
        fizic în listă, și prima care se plătește ulterior, în ore de intervenție facturate separat,
        când bucla oscilează și nimeni nu a verificat sensul de acțiune al vanei.
      </p>

      <h2 id="costuri-uitate-in-bugetele-de-investitie">
        Opt costuri uitate în buget: licențele și taxa anuală de 8-18%
      </h2>

      <p>
        Opt linii lipsesc frecvent din bugetul de investiție al unui sistem BMS, iar cea mai
        costisitoare dintre ele este taxa anuală de mentenanță software, 8-18% din valoarea
        licențelor, pe an.
      </p>

      <ul>
        <li>
          <strong>Licențele pe punct sau pe utilizator.</strong> Multe platforme se licențiază pe
          număr de puncte, iar valoarea lor apare în ofertă abia la a doua rundă de clarificări.
          Extinderea cu 200 de puncte peste cinci ani poate însemna o treaptă nouă de licență, peste
          costul de hardware.
        </li>
        <li>
          <strong>Taxa anuală de mentenanță software.</strong> Uzual 8-18% din valoarea licențelor,
          pe an. Fără ea, actualizarea se blochează la un moment dat, iar o migrare forțată costă
          mult mai mult.
        </li>
        <li>
          <strong>Protocoalele proprietare.</strong> Un chiller sau un grup de pompare poate cere o
          placă de comunicație opțională, comandată separat de la producător.
        </li>
        <li>
          <strong>Gateway-urile.</strong> Fiecare protocol străin adus în sistem înseamnă o
          conversie. Echipamentele cu protocoale deschise, BACnet sau Modbus, evită plata de două
          ori a aceleiași informații; criteriile de alegere sunt tratate în{" "}
          <a href="/resurse/bms-scada-integrare">materialele despre protocoale și integrare</a>.
        </li>
        <li>
          <strong>Refacerea documentației lipsă.</strong> În clădirile de peste 10 ani, releveul
          tablourilor și al traseelor este o lucrare reală, nu o formalitate.
        </li>
        <li>
          <strong>Orele de reglaj fin după punerea în funcțiune.</strong> Un sistem pus în funcțiune
          în februarie nu a fost niciodată testat pe regim de răcire. Bugetul trebuie să prevadă o
          revenire în sezonul opus.
        </li>
        <li>
          <strong>Extinderile ulterioare.</strong> Rezerva de I/O, spațiul în tablou și capacitatea
          de licență sunt ieftine la montaj și scumpe la adăugare.
        </li>
        <li>
          <strong>Rețeaua și accesul la distanță.</strong> Switch-uri industriale, segmentare, VPN.
          Nu sunt buget de IT, sunt parte din sistem.
        </li>
      </ul>

      <h2 id="costul-anual-al-mentenantei">Mentenanța anuală: 4-7% contract de bază, 7-12% extins</h2>

      <p>
        Mentenanța anuală a unui sistem BMS costă 4-7% din valoarea sistemului pentru un contract de
        bază și 7-12% pentru unul extins, cu reglaj sezonier și raportare lunară. La ambele se
        adaugă taxa de software, 8-18% din valoarea licențelor.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Formă de întreținere</th>
              <th>Ce include</th>
              <th>Cost anual orientativ (% din valoarea sistemului)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Fără contract, intervenții punctuale</td>
              <td>Doar reparații la cerere, tarif de urgență, deplasare facturată separat</td>
              <td>3-15%, imprevizibil, plus energia pierdută între defecțiuni</td>
            </tr>
            <tr>
              <td>Contract de bază</td>
              <td>
                2 vizite planificate pe an, verificare hardware, backup-uri, actualizări critice,
                suport telefonic
              </td>
              <td>4-7%</td>
            </tr>
            <tr>
              <td>Contract extins</td>
              <td>
                4 vizite pe an, reglaj sezonier, analiza alarmelor, raport lunar de performanță,
                timp de intervenție garantat
              </td>
              <td>7-12%</td>
            </tr>
            <tr>
              <td>Taxa de software, separat</td>
              <td>Actualizări de platformă și de securitate</td>
              <td>8-18% din valoarea licențelor</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Un contract iese mai ieftin decât intervențiile punctuale din trei motive. Tariful
        planificat este sub cel de urgență. Un sistem neîntreținut derivează: setpointuri modificate
        manual și niciodată readuse, senzori dezetalonați, orare dezactivate „temporar" acum trei
        ani, iar derivația se plătește lunar în factura de energie, nu în cea de service. Fără
        backup verificat, o defecțiune de controler se transformă din intervenție de două ore în
        reprogramare de o săptămână. Acoperirea exactă este descrisă la{" "}
        <a href="/servicii/intretinere-sisteme-bms">contractul de întreținere pentru sisteme BMS</a>
        .
      </p>

      <h2 id="trei-scenarii-ilustrative-de-buget">
        Trei scenarii: birouri 8.000 mp, hotel 120 de camere, hală 12.000 mp
      </h2>

      <p>
        Cele trei scenarii lucrate se așază între 45.000 și 260.000 EUR, la 350-2.500 de puncte de
        date, cu amortizare orientativă de 3-6 ani pentru o modernizare de capital.
      </p>

      <p>
        Scenariile de mai jos sunt exerciții ilustrative construite pentru acest articol, nu oferte
        și nu proiecte reale. Economiile sunt estimative și depind de starea instalațiilor, de
        prețul energiei și de disciplina de operare.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Scenariu</th>
              <th>Ce se automatizează</th>
              <th>Ordin de mărime puncte</th>
              <th>Bandă de cost orientativă</th>
              <th>Economie anuală estimată, cu domeniul declarat</th>
              <th>Amortizare orientativă</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>A. Birouri, aproximativ 8.000 mp</strong>, cu 2 centrale de tratare a
                aerului, CTA, chiller, centrală termică
              </td>
              <td>
                Cele 2 CTA cu recuperare, chillerul și pompele, centrala termică și circuitele,
                zonele de ventiloconvectoare, contorizare electrică și termică, iluminatul zonelor
                comune, orare și regim redus de noapte
              </td>
              <td>450-700</td>
              <td>70.000-130.000 EUR</td>
              <td>
                10-20% din consumul HVAC, acolo unde reglajul era deficitar, adică aproximativ
                12.000-28.000 EUR/an
              </td>
              <td>3-6 ani</td>
            </tr>
            <tr>
              <td>
                <strong>B. Hotel de 4 stele, aproximativ 120 de camere</strong>
              </td>
              <td>
                CTA zone comune, spa și piscină, centrală termică, chiller, ventilație bucătărie,
                hidrofor, contorizare. Varianta extinsă adaugă control pe fiecare cameră, cu regim
                de neocupare
              </td>
              <td>500-800 fără control pe cameră; 1.500-2.500 cu control pe cameră</td>
              <td>60.000-110.000 EUR fără cameră; 140.000-260.000 EUR cu cameră</td>
              <td>
                5-15% din consumul total al clădirii pe zonele comune; 10-20% din consumul HVAC pe
                camerele neocupate, adică aproximativ 15.000-45.000 EUR/an
              </td>
              <td>3-6 ani</td>
            </tr>
            <tr>
              <td>
                <strong>C. Hală de producție, aproximativ 12.000 mp</strong>, utilități și
                contorizare
              </td>
              <td>
                Compresoare de aer, aeroterme și centrale termice, ventilație, stații de pompare,
                contorizare electrică pe linii, aer comprimat, apă, gaz, alarmare pe parametri
                critici
              </td>
              <td>350-600</td>
              <td>45.000-95.000 EUR</td>
              <td>
                5-15% din consumul total al clădirii: detectarea pierderilor de aer comprimat,
                oprirea utilităților în afara schimburilor, alocarea pe centre de cost, adică
                aproximativ 15.000-40.000 EUR/an
              </td>
              <td>3-6 ani</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Benzile de economie folosite în cele trei scenarii sunt cele canonice, cu domeniul declarat
        lângă fiecare cifră: 5-15% din consumul total al clădirii, valoare măsurată în literatura
        independentă (Crowe et al. 2020, LBNL), și 10-20% din consumul HVAC acolo unde programele
        orare, calibrarea senzorilor sau reglajul erau deficitare (ACEEE). Amortizarea de 3-6 ani
        este banda pentru o modernizare BACS de capital, adică pentru sisteme de automatizare și
        control al clădirilor înlocuite integral, nu pentru o simplă optimizare de setări, care se
        amortizează mai repede.
      </p>

      <p>
        Ipotezele proprii se verifică pe datele reale ale clădirii:{" "}
        <a href="/contact">cere un calcul de economie de energie pentru clădire</a>. Proiecte
        comparabile apar în <a href="/referinte">lista de referințe</a>. Particularități de segment:{" "}
        <a href="/expertiza/cladiri-de-birouri">clădiri de birouri</a>,{" "}
        <a href="/expertiza/horeca">HORECA</a> și <a href="/expertiza/industrial">industrial</a>.
      </p>

      <h2 id="modernizare-sau-sistem-nou">Modernizarea costă 40-60% dintr-un sistem nou echivalent</h2>

      <p>
        Un retrofit costă frecvent 40-60% dintr-un sistem nou echivalent. Motivul este simplu: în
        majoritatea clădirilor se păstrează partea scumpă la montaj, adică cablarea de câmp, o parte
        din senzori, vanele și servomotoarele mari, uneori dulapurile. Se înlocuiesc controlerele,
        supervizarea, grafica și logica de funcționare, exact partea care s-a învechit.
      </p>

      <p>
        Retrofitul nu merge peste tot. Sub pragul de 40% instalație refolosibilă devine mai scump
        decât pare, pentru că fiecare surpriză se decontează în manoperă. Semnalele clare: cablare
        fără documentație și fără etichetare, echipamente de câmp mai vechi de 15-20 de ani, un bus
        proprietar pentru care producătorul nu mai livrează nici piese, nici gateway, tablouri
        neconforme care oricum trebuie refăcute. Etapizarea investiției este tratată în{" "}
        <a href="/resurse/modernizare-retrofit">materialele despre modernizare și retrofit</a>.
      </p>

      <h2 id="compararea-a-doua-oferte">Cele zece verificări la compararea a două oferte</h2>

      <p>
        O diferență de 30% între două oferte de sistem BMS este aproape întotdeauna o diferență de
        conținut, nu de preț, și vine din numărul de puncte incluse, nu din marca echipamentelor.
        Verificarea se face în această ordine:
      </p>

      <ol>
        <li>
          <strong>Același număr de puncte.</strong> Lista de puncte anexată la ofertă este
          obligatorie; fără ea, comparația nu există.
        </li>
        <li>
          <strong>Aceleași agregate.</strong> Centrala termică, chillerul, contorizarea și iluminatul
          sunt incluse în ambele sau doar în una.
        </li>
        <li>
          <strong>Licențele.</strong> Pe câte puncte, pe câți utilizatori, pe câte sesiuni web
          simultane.
        </li>
        <li>
          <strong>Grafica și nivelul ei.</strong> Sinoptice de agregat sau și planuri de etaj
          navigabile.
        </li>
        <li>
          <strong>Punerea în funcțiune, cotată separat.</strong> Câte zile-om și cine testează
          fiecare punct.
        </li>
        <li>
          <strong>Documentația as-built și instruirea.</strong> Câte ore de instruire și pentru câte
          persoane.
        </li>
        <li>
          <strong>Protocoale deschise sau dependență de furnizor.</strong> Dacă un alt integrator
          poate prelua sistemul peste cinci ani fără să reînceapă de la zero.
        </li>
        <li>
          <strong>Garanția și componentele acoperite.</strong> Hardware, software și manoperă pot
          avea termene diferite.
        </li>
        <li>
          <strong>Timpul de intervenție asumat.</strong> În ore, în scris, cu program de acoperire.
        </li>
        <li>
          <strong>Costul anului doi.</strong> Valoarea contractului de întreținere și a taxei de
          software, cerută explicit înainte de semnare.
        </li>
      </ol>

      <p>
        Cerințele sunt deja formulate în modelul editabil de caiet de sarcini pentru BMS, ca
        ofertele să vină comparabile: <a href="/contact">cere modelul de caiet de sarcini BMS</a>.
      </p>

      <h2 id="finantare-si-context-de-reglementare">
        Finanțare de 150 mil. EUR și pragul legal de 290 kW
      </h2>

      <p>
        Finanțare există pentru anumite categorii. Programul de 150 de milioane de euro al
        Ministerului Energiei, din Fondul pentru Modernizare, se adresează operatorilor economici
        industriali participanți la EU-ETS, cu până la 30 de milioane de euro pe proiect, iar
        activele eligibile includ explicit „sisteme integrate de management al consumului de
        energie" (
        <a
          href="https://energie.gov.ro/ministerul-energiei-lanseaza-cel-mai-ambitios-program-pentru-eficientizarea-energetica-a-industriei-romanesti-sprijinit-din-fondul-pentru-modernizare-cu-un-buget-total-de-150-de-milioane-de-euro/"
          target="_blank"
          rel="noopener"
        >
          sursa: Ministerul Energiei
        </a>
        ). Programul a fost anunțat în 2025, cu ghidul în consultare, deci statusul se verifică la
        zi. Pentru clădirile publice, programele regionale au apeluri dedicate; în Regiunea Sud-Est,
        apelul 2.1.B a fost lansat la 4 iunie 2026 (
        <a
          href="https://regiosudest.ro/ghiduri/prioritatea-2/apeluri-active/apel-lansat-2-1-b-cresterii-eficientei-energetice-a-cladirilor-publice-04-06-2026"
          target="_blank"
          rel="noopener"
        >
          sursa: ADR Sud-Est
        </a>
        ), cu apeluri echivalente în celelalte programe regionale.
      </p>

      <p>
        Un element de context pentru bugetare: legea română cere deja sisteme de automatizare și
        control al clădirilor, BACS, pentru clădirile nerezidențiale cu sisteme de încălzire, de
        climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie
        de sisteme. Termenul a fost 31 decembrie 2024 și este depășit (
        <a
          href="https://legislatie.just.ro/Public/DetaliiDocument/66970"
          target="_blank"
          rel="noopener"
        >
          Legea 372/2005, art. 27 alin. (5) și art. 29 alin. (6)
        </a>
        ). Pragul de 70 kW, cu termen 31 decembrie 2029, provine din{" "}
        <a href="https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng" target="_blank" rel="noopener">
          Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b)
        </a>{" "}
        și nu este încă transpus în legea română.
      </p>

      <h2 id="ce-inseamna-asta-pentru-proprietar-si-pentru-asset-manager">
        Ce înseamnă pentru proprietar și asset manager: rezervă de 8-12%
      </h2>

      <p>
        Proprietarul și investitorul folosesc procentul din valoarea instalațiilor pentru bugetul de
        fezabilitate și rezervă 8-12% peste estimare pentru surprizele din clădirea existentă.
        Valoarea anului doi, întreținere plus software, se cere de la început: intră în randamentul
        activului, nu în CapEx. Detalii pe pagina pentru proprietari și investitori.
      </p>

      <p>
        Property managerul și asset managerul cer lista de puncte ca anexă obligatorie și o
        transformă în criteriu de comparație. Este singurul mod de a arăta proprietarului că oferta
        mai scumpă este, pe punct, mai ieftină. Detalii pe pagina de asset manager și în{" "}
        <a href="/ghid/sisteme-bms-cladiri">ghidul complet despre sistemele BMS</a>.
      </p>

      <ArticleFaqBox items={faq} />

      <h2 id="concluzie">Concluzie</h2>

      <p>
        Bugetul unui sistem BMS se apără cu o listă de puncte, nu cu o negociere de procente. Cine
        intră în discuția de preț fără acest document plătește diferența mai târziu: lucrări
        suplimentare, licențe descoperite pe parcurs, ore de reglaj nefacturate inițial. Cele trei
        metode de aici validează un ordin de mărime, nu fixează o cifră. Cifra reală apare după
        inventarul punctelor și o vizită în clădire.
      </p>

      <h2 id="cere-o-estimare-de-buget-in-48-de-ore">Cere o estimare de buget în 48 de ore</h2>

      <p>
        Pe baza planurilor de arhitectură, a schemei instalațiilor sau, în lipsa lor, a unei liste
        cu agregatele principale și suprafața clădirii rezultă, în 48 de ore, o estimare pe trei
        scenarii, minim funcțional, recomandat și extins cu contorizare și raportare, fiecare cu
        interval de cost, listă preliminară de puncte și estimarea costului anual de operare.{" "}
        <a href="/contact">Cere o estimare de buget</a>.
      </p>

      <p>
        <em>
          Toate valorile din acest articol sunt ordine de mărime orientative pentru 2026, în EUR
          fără TVA. Ele nu constituie ofertă. Prețul real al unui sistem se poate stabili numai pe
          baza unei liste de puncte agreate și a unei vizite în clădire.
        </em>
      </p>

      <p className="article-note">
        Articol publicat 16.08.2026, actualizat 19.08.2026. Informațiile juridice au fost verificate
        la 16.08.2026. Autor: Echipa de inginerie Sovitech Control.{" "}
        {/* TODO(author): replace with the signing engineer */}
      </p>
    </ArticleProse>
  )
}
