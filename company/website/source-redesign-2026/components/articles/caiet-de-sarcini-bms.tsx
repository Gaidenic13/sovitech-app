import { ArticleDiagram, ArticleFaqBox, ArticleProse } from "@/components/article-prose"
import type { ArticleFaq, ArticleMeta } from "./index"

// LINKS-TO-REACTIVATE:
// materialele despre BMS, SCADA si integrare | interim /resurse/bms-scada-integrare | final /ghid/protocoale-automatizarea-cladirilor
// materialele despre modernizare si retrofit | interim /resurse/modernizare-retrofit | final /ghid/modernizare-bms
// materialele despre reglementari si conformare | interim /resurse/reglementari-conformare | final /ghid/conformare-cladiri-romania
// Cere modelul de caiet de sarcini BMS | interim /contact | final /instrumente/model-caiet-de-sarcini-bms
// cere o verificare a pragului de putere | interim /contact | final /instrumente/test-obligatie-bacs
// pagina pentru directorul tehnic | interim text fara link | final /pentru/director-tehnic
// sectiunea pentru proiectanti si antreprenori | interim text fara link | final /pentru/proiectanti-antreprenori

export const meta: ArticleMeta = {
  title: "Caiet de sarcini BMS: ghid complet + model | Sovitech Control",
  description:
    "Cum se scrie un caiet de sarcini BMS care produce oferte comparabile: structura pe 15 sectiuni, lista de puncte, secvente de functionare si model DOCX.",
  datePublished: "2026-08-17",
  dateModified: "2026-08-17",
}

export const faq: ArticleFaq[] = [
  {
    q: "Cat de lung trebuie sa fie un caiet de sarcini BMS?",
    a: "Nu lungimea contează, ci verificabilitatea. Un caiet de 25 de pagini cu listă de puncte și secvențe este mai util decât unul de 80 de pagini cu descrieri generale. Anexele sunt de obicei mai voluminoase decât corpul documentului.",
  },
  {
    q: "Se poate cere un anumit producator in caietul de sarcini?",
    a: "La achiziții private, da. La achiziții publice, indicarea unei mărci fără mențiunea „sau echivalent” este, în general, restrictivă. Soluția mai bună în ambele cazuri: se specifică funcții verificabile, nu produse. Concurența rămâne deschisă, iar rezultatul tehnic este același.",
  },
  {
    q: "Cine ar trebui să scrie lista de puncte?",
    a: "Proiectantul de automatizări, împreună cu proiectantul de instalații. Dacă proiectul nu are specialist de automatizări, lista de puncte poate fi elaborată de un integrator ca serviciu de consultanță, separat de execuție, pentru ca autorul specificației să nu fie și singurul ofertant posibil.",
  },
  {
    q: "Ce se face dacă instalațiile nu sunt încă proiectate complet?",
    a: "Caietul de sarcini se scrie pe listele de echipamente disponibile, cu o clauză de ajustare cantitativă: preț unitar ferm per punct DI, DO, AI, AO și per punct software, aplicabil la diferențele față de lista inițială.",
  },
  {
    q: "Ce se intampla daca lipsesc parolele de inginerie la preluarea unui sistem?",
    a: "Există două ieșiri, ambele scumpe. Prima: negocierea cu integratorul care a instalat sistemul, aflat acum în poziție de monopol. A doua: reprogramarea controlerelor de la zero, cu reconstruirea secvențelor de funcționare și pierderea istoricului de date. Clauza de predare a parolelor la recepție costă o singură frază în caietul de sarcini.",
  },
]

export default function Body() {
  return (
    <ArticleProse>
      <p className="standfirst">
        Structura pe 15 secțiuni, lista de puncte, secvențele de funcționare și checklistul de dinaintea licitației.
      </p>

      <p>
        Un caiet de sarcini BMS este documentul tehnic care descrie ce trebuie să facă sistemul de automatizare, nu ce
        marcă se cumpără. Descrie funcții verificabile la recepție: puncte de intrare și ieșire, secvențe, protocoale,
        livrabile, criterii de atribuire. Un document care specifică produse în loc de funcții produce oferte care nu
        se pot compara.
      </p>
      <p>
        Costul se plătește de două ori: la ofertare, unde prețurile nu sunt comparabile, și la recepție, unde tot ce nu
        a fost cerut devine lucrare suplimentară. BMS (Building Management System, a nu se confunda cu Battery
        Management System) apare în textele legale ca BACS, sisteme de automatizare și control al clădirilor.
      </p>

      <h2 id="pe-scurt">Pe scurt</h2>
      <ul>
        <li>
          Lista de puncte (I/O list) face ofertele comparabile: din ea rezultă controlerele, cablul și orele de
          programare.
        </li>
        <li>
          Diferența de preț între două oferte vine, de cele mai multe ori, din numărul de puncte, nu din marca
          echipamentelor.
        </li>
        <li>
          Legea nr. 372/2005, art. 27 alin. (5), cere automatizare peste 290 kW, cu termen depășit din 31 decembrie
          2024.
        </li>
        <li>
          Pragul de 70 kW și monitorizarea calității mediului interior vin din Directiva (UE) 2024/1275 și nu sunt
          încă în legea română.
        </li>
        <li>Punerea în funcțiune se bugetează separat: ce nu are preț în ofertă dispare din execuție.</li>
        <li>Opt formulări din secțiunea de interoperabilitate decid dacă furnizorul mai poate fi schimbat.</li>
      </ul>

      <h2 id="cuprins">Cuprins</h2>
      <nav aria-label="Cuprins">
        <ul>
          <li>
            <a href="#pe-scurt">Pe scurt</a>
          </li>
          <li>
            <a href="#cele-sapte-defecte-care-scumpesc-licitatia">
              Cele șapte defecte care scumpesc licitația de automatizări
            </a>
          </li>
          <li>
            <a href="#structura-pe-15-sectiuni">Structura caietului de sarcini BMS, pe 15 secțiuni</a>
          </li>
          <li>
            <a href="#pragul-de-290-kw-si-capabilitatile-cerute">
              Pragul de 290 kW și capabilitățile cerute de Directiva 2024/1275
            </a>
          </li>
          <li>
            <a href="#opt-formulari-impotriva-blocarii-la-un-furnizor">
              Opt formulări care previn blocarea la un singur furnizor
            </a>
          </li>
          <li>
            <a href="#clauze-licente-cod-sursa-parole-de-inginerie">
              Clauzele de licențe, cod sursă și parole de inginerie
            </a>
          </li>
          <li>
            <a href="#caietul-de-modernizare-patru-sectiuni-in-plus">
              Caietul de modernizare: patru secțiuni în plus față de construcția nouă
            </a>
          </li>
          <li>
            <a href="#checklist-de-20-de-puncte-inainte-de-licitatie">Checklist de 20 de puncte înainte de licitație</a>
          </li>
          <li>
            <a href="#ce-inseamna-pentru-directorul-tehnic-si-proiectantul-mep">
              Ce înseamnă pentru directorul tehnic și pentru proiectantul MEP
            </a>
          </li>
          <li>
            <a href="#intrebari-frecvente">Întrebări frecvente</a>
          </li>
          <li>
            <a href="#concluzie">Concluzie</a>
          </li>
          <li>
            <a href="#modelul-docx-de-caiet-de-sarcini-bms">Modelul DOCX de caiet de sarcini BMS</a>
          </li>
        </ul>
      </nav>

      <h2 id="cele-sapte-defecte-care-scumpesc-licitatia">
        Cele șapte defecte care scumpesc licitația de automatizări
      </h2>
      <p>
        Cele șapte defecte de mai jos apar în majoritatea caietelor de sarcini pentru automatizări și fiecare are un
        cost măsurabil la recepție. Explicația comună: caietele pentru automatizări se scriu sub presiune de timp, la
        finalul proiectului de instalații.
      </p>
      <ol>
        <li>
          <strong>Descriere copiată din fișa tehnică a unui producător.</strong> Scrie numele produsului fără să îl
          scrie, iar ofertanții care nu îl vând se retrag.
        </li>
        <li>
          <strong>Lipsa listei de puncte.</strong> Fiecare ofertant își inventează propriul număr de puncte, iar
          diferența se plătește la final.
        </li>
        <li>
          <strong>„Se va furniza un sistem BMS performant.”</strong> O cerință pe care o comisie nu o poate bifa nu
          este cerință.
        </li>
        <li>
          <strong>Lipsa secvențelor.</strong> Le scrie programatorul după licitație, în funcție de cât timp îi rămâne.
        </li>
        <li>
          <strong>Punerea în funcțiune nebugetată.</strong> Cine o include pare scump și pierde, cine o omite câștigă
          și apoi negociază.
        </li>
        <li>
          <strong>Documentația as-built necerută.</strong> Se predau schemele de proiect, nu cele reale.
        </li>
        <li>
          <strong>Licențele nespecificate.</strong> Puncte, utilizatori, drivere, licența de dezvoltare: nescrise,
          devin facturi anuale.
        </li>
      </ol>

      <h2 id="structura-pe-15-sectiuni">Structura caietului de sarcini BMS, pe 15 secțiuni</h2>
      <p>Cincisprezece secțiuni, în ordinea în care se scriu.</p>

      <h3 id="1-limitele-de-livrare-senzori-cablu-de-automatizare-racorduri-si-adrese-ip">
        1. Limitele de livrare: senzori, cablu de automatizare, racorduri și adrese IP
      </h3>
      <p>
        Aici se stabilește unde începe și unde se termină responsabilitatea integratorului. Majoritatea conflictelor de
        șantier nu sunt despre calitate, ci despre cine trebuia să facă ceva.
      </p>
      <ul>
        <li>cine furnizează și cine montează senzorii de conductă și de canal;</li>
        <li>cine trage cablul de automatizare și cine cablul de forță;</li>
        <li>cine racordează echipamentele cu automatizare proprie (chillere, cazane, UPS);</li>
        <li>cine asigură alimentarea tablourilor și adresele IP.</li>
      </ul>

      <h3 id="2-descrierea-instalatiilor-cta-surse-termice-si-frigorifice-contoare-cu-protocol">
        2. Descrierea instalațiilor: CTA, surse termice și frigorifice, contoare cu protocol
      </h3>
      <p>
        Descrierea instalațiilor este referința pe care se construiește lista de puncte, pentru că automatizarea nu se
        poate specifica în absența instalației.
      </p>
      <ul>
        <li>centralele de tratare a aerului (CTA), cu debite și baterii;</li>
        <li>sursele termice și frigorifice, cu puteri nominale;</li>
        <li>circuitele de distribuție, pompele, ventilarea de desfumare;</li>
        <li>contoarele existente, cu tip și protocol.</li>
      </ul>

      <h3 id="3-lista-de-puncte-i-o-list-di-do-ai-ao-si-punctele-software">
        3. Lista de puncte (I/O list): DI, DO, AI, AO și punctele software
      </h3>
      <p>
        Lista de puncte transformă o descriere narativă într-o cantitate. Din ea rezultă numărul de controlere,
        dimensiunea tablourilor, metrii de cablu și orele de programare. Este primul lucru care lipsește din caiete și
        ultimul care se cere la recepție.
      </p>
      <p>
        Formatul minim: număr curent, echipament, denumire, tip (DI, DO, AI, AO, SW), semnal, alarmă, istoricizare.
        Punctele software se listează separat: nu consumă intrări fizice, dar consumă licență și ore de configurare.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Echipament / zonă</th>
              <th>Denumire punct</th>
              <th>Tip</th>
              <th>Semnal</th>
              <th>Alarmă</th>
              <th>Istoric</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>CTA-01 birouri et. 1-3</td>
              <td>Temperatură aer refulare</td>
              <td>AI</td>
              <td>Ni1000, -20...+80 °C</td>
              <td>Da (dev. peste 3 K)</td>
              <td>15 min</td>
            </tr>
            <tr>
              <td>2</td>
              <td>CTA-01</td>
              <td>Temperatură aer exterior</td>
              <td>AI</td>
              <td>Ni1000, -30...+50 °C</td>
              <td>Nu</td>
              <td>15 min</td>
            </tr>
            <tr>
              <td>3</td>
              <td>CTA-01</td>
              <td>Comandă ventilator refulare</td>
              <td>AO</td>
              <td>0-10 V DC</td>
              <td>Nu</td>
              <td>1 h</td>
            </tr>
            <tr>
              <td>4</td>
              <td>CTA-01</td>
              <td>Confirmare funcționare ventilator</td>
              <td>DI</td>
              <td>Contact liber</td>
              <td>Da (prioritate 2)</td>
              <td>Eveniment</td>
            </tr>
            <tr>
              <td>5</td>
              <td>CTA-01</td>
              <td>Avarie convertizor de frecvență</td>
              <td>DI</td>
              <td>Contact NC</td>
              <td>Da (prioritate 1)</td>
              <td>Eveniment</td>
            </tr>
            <tr>
              <td>6</td>
              <td>CTA-01</td>
              <td>Comandă vană baterie încălzire</td>
              <td>AO</td>
              <td>0-10 V DC</td>
              <td>Nu</td>
              <td>15 min</td>
            </tr>
            <tr>
              <td>7</td>
              <td>CTA-01</td>
              <td>Termostat antiîngheț</td>
              <td>DI</td>
              <td>Contact NC, hardware</td>
              <td>Da (prioritate 1)</td>
              <td>Eveniment</td>
            </tr>
            <tr>
              <td>8</td>
              <td>CTA-01</td>
              <td>Presiune diferențială filtru</td>
              <td>DI</td>
              <td>Presostat reglabil</td>
              <td>Da (prioritate 3)</td>
              <td>Eveniment</td>
            </tr>
            <tr>
              <td>9</td>
              <td>Open space et. 2</td>
              <td>Concentrație CO2</td>
              <td>AI</td>
              <td>0-10 V, 0-2000 ppm</td>
              <td>Da (peste 1000 ppm)</td>
              <td>15 min</td>
            </tr>
            <tr>
              <td>10</td>
              <td>CTA-01</td>
              <td>Randament recuperator</td>
              <td>SW</td>
              <td>0-100 %</td>
              <td>Da (sub 55 %)</td>
              <td>15 min</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Lista reală a unei clădiri de birouri de 15.000 mp are, orientativ, 750-1.350 de puncte fizice, adică 50-90 de
        puncte la 1.000 mp, estimare din proiecte comparabile. Densitatea aceasta este cea folosită și în calculele de
        cost pe punct, de 90-320 EUR, din materialele despre prețul unui sistem BMS.
      </p>

      <h3 id="4-arhitectura-pe-trei-niveluri-si-granitele-de-protocol">
        4. Arhitectura pe trei niveluri și granițele de protocol
      </h3>
      <p>
        Trei niveluri: câmp, automatizare și supervizare. Logica de reglaj se cere în controler, nu în server: la
        căderea serverului, clădirea trebuie să rămână reglată.
      </p>
      <ul>
        <li>topologia magistralelor și numărul maxim de puncte per controler;</li>
        <li>rezervă de 15-20 % intrări și ieșiri libere;</li>
        <li>comportamentul la pierderea comunicației, redundanța serverului și a alimentării.</li>
      </ul>

      <ArticleDiagram
        src="/diagrame/A05-1-arhitectura-caiet-de-sarcini.jpg"
        caption="Arhitectura pe trei niveluri a sistemului BMS, cu granițele de protocol și segmentarea rețelei."
      />

      <h3 id="5-interoperabilitate-bacnet-ip-nativ-pics-la-ofertare-modbus-knx-m-bus">
        5. Interoperabilitate: BACnet/IP nativ, PICS la ofertare, Modbus, KNX, M-Bus
      </h3>
      <p>
        Interoperabilitatea decide dacă furnizorul mai poate fi schimbat peste cinci ani. Se cer capabilități native,
        verificabile la ofertare, nu compatibilitate declarată. Detalii în{" "}
        <a href="/resurse/bms-scada-integrare">materialele despre BMS, SCADA și integrare</a>.
      </p>
      <ul>
        <li>controlere cu BACnet/IP sau MS/TP nativ, cu PICS prezentat la ofertare;</li>
        <li>Modbus pentru echipamente terțe, KNX pentru iluminat, M-Bus pentru contorizare;</li>
        <li>toate punctele expuse ca obiecte BACnet standard, fără licență suplimentară.</li>
      </ul>

      <h3 id="6-secventele-de-functionare-scrise-ca-text-si-anexate-la-caiet">
        6. Secvențele de funcționare, scrise ca text și anexate la caiet
      </h3>
      <p>
        Secvența descrie în text comportamentul instalației în toate regimurile și se atașează ca anexă. Un programator
        care primește secvențe scrise nu improvizează, iar comisia de recepție are ce verifica. Pentru o centrală de
        tratare a aerului (CTA):
      </p>
      <ul>
        <li>condițiile de pornire și oprire, ordinea clapetelor și a ventilatoarelor, temporizările;</li>
        <li>reglajul în cascadă temperatură cameră spre refulare, free cooling, degivrarea recuperatorului;</li>
        <li>protecția la îngheț, interblocarea cu detecția de incendiu, regimul de avarie.</li>
      </ul>
      <p>
        <strong>Exemplu de secvență scrisă corect, CTA-01, protecție la îngheț:</strong>
      </p>
      <p>
        Termostatul antiîngheț montat după bateria de încălzire acționează pe două căi. Calea hardware: contactul NC
        deschis oprește direct ventilatoarele de refulare și evacuare, prin cablare independentă de controler, și
        închide clapetele de aer exterior în maximum 30 de secunde. Calea software: controlerul înregistrează alarma de
        prioritate 1, deschide vana bateriei la 100 % și pornește pompa de circulație, indiferent de programul orar.
      </p>
      <p>
        Repornirea nu se face automat. Este necesară confirmarea manuală din interfața de supervizare, după dispariția
        condiției de alarmă, cu înregistrarea utilizatorului și a momentului în jurnal. Când temperatura pe returul
        bateriei scade sub 8 °C timp de peste 5 minute în regim oprit, controlerul pornește pompa în regim de
        protecție, fără ventilatoare.
      </p>

      <h3 id="7-programe-orare-si-night-setback-setpoint-ocupat-si-setpoint-neocupat">
        7. Programe orare și night setback: setpoint ocupat și setpoint neocupat
      </h3>
      <p>
        Aici se scrie cum își reduce clădirea consumul când nu este folosită. Altfel, sistemul livrat funcționează 24/7
        la aceiași parametri. Limita de reținut: night setback nu se aplică în spații cu control de umiditate.
      </p>
      <ul>
        <li>câte programe orare independente și pe ce zone;</li>
        <li>setpoint-urile ocupat și neocupat, pe sezon, cu banda moartă;</li>
        <li>pornirea optimizată, sărbătorile, excepțiile (depozite farmaceutice, camere tehnice).</li>
      </ul>

      <h3 id="8-managementul-alarmelor-pe-patru-clase-de-la-p1-critica-la-p4-informativa">
        8. Managementul alarmelor pe patru clase, de la P1 critică la P4 informativă
      </h3>
      <p>
        Un sistem care generează 400 de alarme pe zi nu are management de alarme, are zgomot. Clasificarea se scrie în
        caiet, nu se lasă pe seama șantierului.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Clasă</th>
              <th>Tip de eveniment</th>
              <th>Destinatar</th>
              <th>Timp de răspuns</th>
              <th>Escaladare</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>P1 critică</td>
              <td>Antiîngheț, avarie sursă termică sau frigorifică, pierdere de comunicație</td>
              <td>Dispecerat, tehnician de serviciu (SMS)</td>
              <td>Imediat, 24/7</td>
              <td>La 15 minute fără confirmare, șef mentenanță</td>
            </tr>
            <tr>
              <td>P2 majoră</td>
              <td>Lipsă confirmare de funcționare, deviație peste 3 K mai mult de 30 de minute</td>
              <td>Facility manager (email)</td>
              <td>În aceeași tură</td>
              <td>La 4 ore fără confirmare, devine P1</td>
            </tr>
            <tr>
              <td>P3 mentenanță</td>
              <td>Filtru colmatat, ore de funcționare depășite, senzor în afara domeniului</td>
              <td>Echipa de mentenanță (raport zilnic)</td>
              <td>Intervenția planificată</td>
              <td>Raport săptămânal</td>
            </tr>
            <tr>
              <td>P4 informativă</td>
              <td>Schimbare de regim, modificare de setpoint, autentificare</td>
              <td>Doar jurnal</td>
              <td>Fără</td>
              <td>Fără</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Se mai scriu: temporizarea de anti-oscilație, gruparea alarmelor cu aceeași cauză și jurnalul needitabil.
      </p>

      <h3 id="9-istoricizare-la-15-minute-si-retentie-de-minimum-24-de-luni">
        9. Istoricizare la 15 minute și retenție de minimum 24 de luni
      </h3>
      <p>
        Datele care nu se înregistrează acum nu se pot recupera. Istoricizarea decide dacă, peste doi ani, clădirea
        produce un raport auditabil sau plătește pe cineva să citească contoare manual. Context în{" "}
        <a href="/ghid/date-esg-cladiri">ghidul despre datele pentru raportarea ESG</a>.
      </p>
      <ul>
        <li>ce se înregistrează: puncte de energie, temperaturi, stări, alarme;</li>
        <li>rezoluția: 15 minute pentru energie, la eveniment pentru stări;</li>
        <li>păstrare minimum 24 de luni online, export CSV și API;</li>
        <li>rapoarte automate pe zonă, kWh/mp, top 10 alarme, cu destinatari.</li>
      </ul>

      <ArticleDiagram
        src="/diagrame/A05-2-traseul-unui-punct-de-date.jpg"
        caption="Traseul unui punct de date, de la senzor sau contor până la linia dintr-un raport de sustenabilitate."
      />

      <h3 id="10-interfata-grafica-lista-sinopticelor-si-navigare-in-maximum-trei-clicuri">
        10. Interfața grafică: lista sinopticelor și navigare în maximum trei clicuri
      </h3>
      <p>
        Nivelul de detaliu al sinopticelor este o cantitate ofertabilă, deci se cere în cifre. „Interfață grafică
        intuitivă” nu înseamnă nimic la recepție.
      </p>
      <ul>
        <li>lista sinopticelor: ansamblu, câte o pagină pe centrală, surse, planuri de etaj, energie, alarme;</li>
        <li>navigare în maximum trei clicuri, denumiri în limba română;</li>
        <li>acces din browser fără plugin, cu drepturi pe roluri.</li>
      </ul>

      <h3 id="11-securitate-cibernetica-ot-vlan-dedicat-vpn-cu-doi-factori-conturi-nominale">
        11. Securitate cibernetică OT: VLAN dedicat, VPN cu doi factori, conturi nominale
      </h3>
      <p>
        Un sistem BMS (Building Management System) este, tehnic, o rețea industrială conectată la rețeaua clădirii.
        Pentru operatorii din sfera NIS2, transpusă prin{" "}
        <a href="https://legislatie.just.ro/public/DetaliiDocument/293121" target="_blank" rel="noopener">
          OUG nr. 155/2024
        </a>
        , aprobată prin Legea nr. 124/2025, obligațiile sunt neutre tehnologic și acoperă sistemele informatice
        folosite pentru furnizarea serviciului. Aplicarea lor la BMS este o interpretare practică, nu un articol de
        lege dedicat.
      </p>
      <ul>
        <li>VLAN dedicat automatizării, cu reguli de firewall documentate;</li>
        <li>fără controlere expuse în internet, acces la distanță doar prin VPN cu doi factori;</li>
        <li>conturi nominale, parole implicite schimbate la punerea în funcțiune;</li>
        <li>lista de adrese IP și servicii active, predată la recepție.</li>
      </ul>

      <h3 id="12-tablourile-de-automatizare-marcare-separare-de-forta-rezerva-de-20">
        12. Tablourile de automatizare: marcare, separare de forță, rezervă de 20 %
      </h3>
      <ul>
        <li>grad de protecție și clasă de execuție conform standardului aplicabil;</li>
        <li>marcare permanentă a bornelor și conductoarelor, corelată cu schemele;</li>
        <li>separarea circuitelor de forță de cele de semnal, comutatoare manual-oprit-automat;</li>
        <li>sursă neîntreruptibilă, rezervă de spațiu de 20 %, schema electrică în ușă.</li>
      </ul>

      <h3 id="13-punerea-in-functiune-bugetata-separat-cu-fat-si-sat-punct-cu-punct">
        13. Punerea în funcțiune bugetată separat, cu FAT și SAT punct cu punct
      </h3>
      <p>
        Punerea în funcțiune se bugetează ca poziție distinctă de deviz, în zile-om. Se cere FAT, testare în atelier pe
        tablou și pe program, apoi SAT pe instalația reală, punct cu punct.
      </p>
      <ul>
        <li>verificarea 100 % a punctelor, cu proces-verbal pe fiecare;</li>
        <li>testarea alarmelor prin provocare reală, nu prin forțare de valoare;</li>
        <li>reglaj fin pe două sezoane, cu raport.</li>
      </ul>
      <p>La o listă de 1.000 de puncte, verificarea integrală se planifică în săptămâni, nu în zile.</p>

      <h3 id="14-documentatia-as-built-instruirea-si-garantia-ca-livrabile-care-conditioneaza-receptia">
        14. Documentația as-built, instruirea și garanția, ca livrabile care condiționează recepția
      </h3>
      <p>
        Documentația se cere ca livrabil condiționat: fără ea, recepția nu se semnează. Sovitech Control, integrator de
        automatizări cu sediul în București, livrează curent documentație as-built ca parte din scopul de execuție,
        alături de programele de control.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Livrabil la recepție</th>
              <th>Format</th>
              <th>Criteriu de acceptare</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Scheme electrice as-built</td>
              <td>DWG + PDF</td>
              <td>Corespondență 1:1 cu execuția, sondaj pe 10 % din borne</td>
            </tr>
            <tr>
              <td>Lista de puncte finală</td>
              <td>XLSX editabil</td>
              <td>Adresă fizică, adresă de obiect și rezultat de test pe fiecare punct</td>
            </tr>
            <tr>
              <td>Secvențele implementate</td>
              <td>PDF + fișiere sursă</td>
              <td>Identice cu anexa din caiet sau cu abateri aprobate în scris</td>
            </tr>
            <tr>
              <td>Programele de aplicație</td>
              <td>Fișiere sursă</td>
              <td>Se deschid și se compilează pe stația beneficiarului</td>
            </tr>
            <tr>
              <td>Configurația de rețea</td>
              <td>XLSX + schemă</td>
              <td>IP, VLAN, porturi, servicii, conturi</td>
            </tr>
            <tr>
              <td>Licențe</td>
              <td>Certificate nominale</td>
              <td>Emise pe numele beneficiarului, nu al integratorului</td>
            </tr>
            <tr>
              <td>Procese-verbale FAT și SAT</td>
              <td>PDF semnat</td>
              <td>Toate punctele testate, fără poziții deschise</td>
            </tr>
            <tr>
              <td>Manual de operare în română</td>
              <td>PDF</td>
              <td>Acoperă sinopticele și procedurile de alarmă</td>
            </tr>
            <tr>
              <td>Instruire</td>
              <td>Sesiuni la fața locului</td>
              <td>Minimum 2 sesiuni x 4 ore, cu listă de prezență</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>Se mai cer: durata garanției, timpul de răspuns pe clase de alarmă și prețul mentenanței pe primii trei ani.</p>

      <h3 id="15-criterii-de-atribuire-pret-60-70-cost-de-operare-15-20">
        15. Criterii de atribuire: preț 60-70 %, cost de operare 15-20 %
      </h3>
      <p>
        Atribuirea exclusiv pe preț livrează exact ce s-a plătit. Calificarea filtrează ofertanții incapabili,
        atribuirea departajează ofertele valide.
      </p>
      <ul>
        <li>două proiecte similare ca număr de puncte în ultimii cinci ani, cu recomandări;</li>
        <li>lista de puncte completată și o secvență model, prezentate la ofertare;</li>
        <li>factori orientativi: preț 60-70 %, cost de operare pe cinci ani 15-20 %, interoperabilitate 10-15 %.</li>
      </ul>

      <h2 id="pragul-de-290-kw-si-capabilitatile-cerute">
        Pragul de 290 kW și capabilitățile cerute de Directiva 2024/1275
      </h2>
      <p>
        Legea română în vigoare este{" "}
        <a href="https://legislatie.just.ro/Public/DetaliiDocument/66970" target="_blank" rel="noopener">
          Legea nr. 372/2005
        </a>
        . Art. 27 alin. (5): până la 31 decembrie 2024, clădirile nerezidențiale cu sisteme de încălzire, de
        climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290 kW pe familie de sisteme, se
        echipează, dacă este fezabil tehnic și economic, cu sisteme de automatizare și control al clădirilor. Art. 29
        alin. (6) are formulare identică pentru climatizare. Termenul a fost 31 decembrie 2024 și este depășit, iar
        sancțiunile au fost majorate prin{" "}
        <a href="https://legislatie.just.ro/public/DetaliiDocument/285769" target="_blank" rel="noopener">
          Legea nr. 238/2024
        </a>
        .
      </p>
      <p>
        Capabilitățile cerute sunt enumerate în{" "}
        <a href="https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng" target="_blank" rel="noopener">
          Directiva (UE) 2024/1275
        </a>
        , art. 13 alin. (10): monitorizarea, înregistrarea, analiza și ajustarea continuă a consumului, evaluarea
        comparativă a eficienței cu detectarea pierderilor și informarea persoanei responsabile, comunicarea cu
        sistemele tehnice conectate și interoperabilitatea între tehnologii proprietare diferite. Transcrise în caietul
        de sarcini, devin verificabile: istoricizare la 15 minute pe energie, raport lunar de kWh/mp, alarmă la
        deviație de randament, obiecte BACnet standard.
      </p>
      <p>
        Ce vine, dar <strong>nu este încă în legea română</strong>: pragul de 70 kW, cu termen 31 decembrie 2029,
        provine din Directiva (UE) 2024/1275, art. 13 alin. (9) lit. b), și nu este încă transpus în legea română.
        Aceeași directivă adaugă, din 29 mai 2026, monitorizarea calității mediului interior (art. 13 alin. (10) lit.
        d). La 15 iulie 2026, Comisia Europeană a trimis{" "}
        <a
          href="https://energy.ec.europa.eu/news/commission-calls-eu-countries-transpose-reinforced-rules-energy-performance-buildings-2026-07-15_en"
          target="_blank"
          rel="noopener"
        >
          scrisori de punere în întârziere
        </a>{" "}
        tuturor celor 27 de state membre. În caietul de sarcini, cerințele acestea se scriu ca opțiuni pregătite:
        rezervă de puncte pentru senzori de CO2 și umiditate.
      </p>
      <p>
        Pentru încadrarea unei clădiri concrete se poate{" "}
        <a href="/contact">cere o verificare a pragului de putere pentru clădirea respectivă</a>, iar contextul de
        reglementare este strâns în{" "}
        <a href="/resurse/reglementari-conformare">materialele despre reglementări și conformare</a>.
      </p>

      <h2 id="opt-formulari-impotriva-blocarii-la-un-furnizor">
        Opt formulări care previn blocarea la un singur furnizor
      </h2>
      <p>Opt fraze gata de copiat, fiecare înlocuind o formulare care restrânge concurența.</p>
      <ol>
        <li>
          „Controlerele vor comunica nativ BACnet/IP sau BACnet MS/TP, fără gateway intermediar. Ofertantul prezintă
          documentul PICS al fiecărui tip de controler.”
        </li>
        <li>
          „Toate punctele fizice și software vor fi expuse ca obiecte BACnet standard, citibile de orice client terț,
          fără licență suplimentară și fără taxă per punct.”
        </li>
        <li>
          „Beneficiarul primește la recepție licența de dezvoltare a aplicației, emisă pe numele său, împreună cu
          programele sursă în format editabil.”
        </li>
        <li>
          „Orice modificare ulterioară va putea fi realizată de orice integrator instruit pe platforma ofertată.
          Ofertantul declară condițiile de acces la instruire.”
        </li>
        <li>
          „Istoricul de date va putea fi exportat integral în CSV și prin API documentat, la inițiativa beneficiarului,
          fără intervenția furnizorului.”
        </li>
        <li>
          „Nu se acceptă protocoale proprietare pe magistrala dintre controlere. Ele sunt admise doar în echipamentele
          cu automatizare proprie, cu expunerea parametrilor prin Modbus sau BACnet.”
        </li>
        <li>
          „Costul total de deținere pe cinci ani, cu licențe, mentenanță și extindere cu 10 % puncte, se prezintă
          defalcat și devine factor de atribuire.”
        </li>
        <li>
          „Senzorii și elementele de execuție vor fi standard, cu semnale 0-10 V, 4-20 mA sau Ni1000/Pt1000,
          înlocuibile cu produse echivalente, fără reprogramare.”
        </li>
      </ol>
      <p>
        Context: <a href="/ghid/sisteme-bms-cladiri">componentele unui sistem BMS</a> și{" "}
        <a href="/servicii/integrare-sisteme-knx-dali-modbus-mbus">integrarea KNX, DALI, Modbus și M-Bus</a>.
      </p>

      <h2 id="clauze-licente-cod-sursa-parole-de-inginerie">Clauzele de licențe, cod sursă și parole de inginerie</h2>
      <p>
        Licențele, codul sursă al aplicației și parolele de nivel inginerie sunt cele trei lucruri care decid dacă
        beneficiarul deține sistemul de automatizare sau doar îl folosește. Sunt și cele mai ieftin de obținut: costă
        o clauză scrisă înainte de licitație și devin aproape imposibil de obținut după recepție. Un caiet de sarcini
        BMS care le omite produce un sistem funcțional și un proprietar captiv.
      </p>
      <p>Clauzele de inclus, formulate ca livrabile verificabile:</p>
      <ul>
        <li>
          <strong>Licențe nominale.</strong> Toate licențele de server, de client, de driver de protocol și de puncte
          se emit pe numele beneficiarului, nu al integratorului, și se predau ca certificate la recepție. Cantitatea
          se scrie în cifre: număr de puncte licențiate, număr de utilizatori simultani, drivere incluse.
        </li>
        <li>
          <strong>Licența de dezvoltare.</strong> Beneficiarul primește licența cu care se modifică aplicația, nu doar
          licența de rulare. Fără ea, orice schimbare de secvență trece obligatoriu prin integratorul inițial.
        </li>
        <li>
          <strong>Taxa anuală de software, declarată la ofertare.</strong> Mentenanța de software se cuantifică la
          ofertare, ca procent din valoarea componentei software, tipic 8-18 % pe an, și intră în costul total de
          deținere pe cinci ani.
        </li>
        <li>
          <strong>Codul sursă al aplicației.</strong> Programele de control, sinopticele și configurațiile se predau
          în format editabil, cu dovada că se deschid și se compilează pe stația beneficiarului. Un fișier compilat,
          fără sursă, nu este documentație.
        </li>
        <li>
          <strong>Parolele de nivel inginerie.</strong> Se predau la recepție, în plic sigilat sau prin seif de parole,
          pentru toate nivelurile de acces: controler, server, stație de operare, echipamente de rețea. Se predau și
          conturile de service ale producătorului, dacă platforma le are.
        </li>
        <li>
          <strong>Interdicția blocărilor la distanță.</strong> Fără dispozitive de limitare temporală, fără chei
          hardware deținute de integrator, fără funcții care opresc sistemul la expirarea contractului de mentenanță.
        </li>
        <li>
          <strong>Exportul de date.</strong> Istoricul complet se exportă în CSV și prin API documentat, la inițiativa
          beneficiarului, fără intervenția furnizorului.
        </li>
      </ul>
      <p>
        Detaliul care se vede numai în proiecte de modernizare: parola de nivel inginerie lipsește din documentația
        predată în majoritatea clădirilor cu sistem existent, iar recuperarea ei înseamnă fie negociere cu integratorul
        care a plecat, fie reprogramarea completă a controlerelor. Sovitech Control a întâlnit situația în modernizări
        din București destul de des încât clauza aceasta să fie prima verificată la preluarea unui sistem.
      </p>

      <h2 id="caietul-de-modernizare-patru-sectiuni-in-plus">
        Caietul de modernizare: patru secțiuni în plus față de construcția nouă
      </h2>
      <p>
        La o clădire existentă riscul nu este tehnologia, ci necunoscutul. Caietul de sarcini pentru modernizare adaugă
        patru secțiuni față de cel pentru construcție nouă.
      </p>
      <p>
        <strong>Inventarul existent.</strong> Controlere, firmware, protocoale, starea cablajului, licențele și cine le
        deține. Detaliu de teren: senzorii de CO2 se decalibrează în 2-3 ani și aproape nimeni nu îi verifică, deci „se
        păstrează” este o decizie care se ia după măsurare.
      </p>
      <p>
        <strong>Etapizarea.</strong> Ce se înlocuiește și în ce ordine. Regula practică: sursele termice nu se ating
        iarna, instalația de frig nu se atinge în iulie.
      </p>
      <p>
        <strong>Funcționarea în paralel.</strong> Cât timp coexistă cele două sisteme, cine răspunde de fiecare zonă și
        cum se revine.
      </p>
      <p>
        <strong>Migrarea punctelor.</strong> Corespondența între denumirile vechi și cele noi, importul istoricului.
        Pașii de evaluare sunt în{" "}
        <a href="/resurse/modernizare-retrofit">materialele despre modernizare și retrofit</a>, execuția în pagina de{" "}
        <a href="/servicii/modernizare-sisteme-de-automatizare-si-bms">modernizare a sistemelor de automatizare</a>.
      </p>

      <h2 id="checklist-de-20-de-puncte-inainte-de-licitatie">Checklist de 20 de puncte înainte de licitație</h2>
      <ol>
        <li>Limitele de livrare sunt explicite, inclusiv racordurile electrice.</li>
        <li>Lista de puncte este completă, cu tip, semnal, alarmă și istoricizare.</li>
        <li>Punctele software sunt listate separat de cele fizice.</li>
        <li>Există rezervă de 15-20 % pe intrări și ieșiri.</li>
        <li>Secvențele de funcționare sunt scrise pentru fiecare tip de echipament.</li>
        <li>Protecțiile de siguranță au cale hardware, nu doar software.</li>
        <li>Interblocările cu detecția de incendiu sunt descrise.</li>
        <li>Cerințele de protocol sunt native, cu PICS cerut la ofertare.</li>
        <li>Nu apare niciun nume de produs fără mențiunea „sau echivalent”.</li>
        <li>Licențele sunt cuantificate: puncte, utilizatori, drivere, dezvoltare.</li>
        <li>Licențele se emit pe numele beneficiarului.</li>
        <li>Parolele de nivel inginerie și codul sursă sunt cerute ca livrabile la recepție.</li>
        <li>Exportul de date în CSV și prin API este cerut explicit.</li>
        <li>Clasele de alarmă, destinatarii și escaladarea sunt definite.</li>
        <li>Istoricizarea are rezoluție de 15 minute și retenție de minimum 24 de luni.</li>
        <li>Rapoartele automate sunt listate, cu destinatari și frecvență.</li>
        <li>Securitatea OT este inclusă: VLAN, VPN, conturi nominale.</li>
        <li>Punerea în funcțiune este poziție distinctă de deviz.</li>
        <li>
          FAT și SAT sunt cerute, cu proces-verbal pe fiecare punct, iar documentația as-built, instruirea și manualul
          condiționează recepția.
        </li>
        <li>Criteriile de atribuire includ costul de operare pe cinci ani.</li>
      </ol>

      <h2 id="ce-inseamna-pentru-directorul-tehnic-si-proiectantul-mep">
        Ce înseamnă pentru directorul tehnic și pentru proiectantul MEP
      </h2>
      <p>
        <strong>Pentru directorul tehnic și inginerul-șef</strong>, secțiunile decisive ale caietului de sarcini BMS
        sunt lista de puncte, secvențele de funcționare și criteriile de atribuire. Două zile alocate listei de puncte
        elimină aproape complet negocierea de după semnare. Resurse pe pagina pentru directorul tehnic.
      </p>
      <p>
        <strong>Pentru proiectantul MEP și antreprenorul general</strong>, caietul de sarcini protejează propriul
        contract: limitele de livrare scrise prost se întorc ca lucrări neprevăzute. Detalii în secțiunea pentru
        proiectanți și antreprenori și la{" "}
        <a href="/servicii/proiectare-automatizari-bms">proiectare de automatizări și BMS</a>.
      </p>

      <ArticleFaqBox items={faq} />

      <h2 id="concluzie">Concluzie</h2>
      <p>
        Un caiet de sarcini bun se recunoaște după o singură proprietate: fiecare cerință poate fi bifată de o comisie
        de recepție cu un instrument sau cu un document în mână. Lista de puncte, secvențele de funcționare, clauzele
        de licențe și parole și punerea în funcțiune bugetată separat produc mai multă economie decât orice negociere
        de preț.
      </p>

      <h2 id="modelul-docx-de-caiet-de-sarcini-bms">Modelul DOCX de caiet de sarcini BMS</h2>
      <p>
        Modelul DOCX conține cele 15 secțiuni ale caietului de sarcini BMS cu text comentat, tabelul de listă de
        puncte, cele opt formulări împotriva blocării la un singur furnizor și checklistul de 20 de puncte.
      </p>
      <p>
        <a href="/contact">
          <strong>Cere modelul de caiet de sarcini BMS</strong>
        </a>
        . Alternativ, inginerii noștri revizuiesc un caiet existent și returnează observațiile pe secțiuni, înainte de
        licitație.
      </p>

      <p className="article-note">
        Articol publicat 17.08.2026, actualizat 18.08.2026. Informațiile juridice au fost verificate la 17.08.2026.
        Legea 372/2005 se reverifică în textul consolidat înainte de publicare, iar articolul se actualizează la
        transpunerea Directivei (UE) 2024/1275. Autor: Echipa de inginerie Sovitech Control.
        {/* TODO(author): replace with the signing engineer */}
      </p>
    </ArticleProse>
  )
}
