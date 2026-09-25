import { ArticleDiagram, ArticleFaqBox, ArticleProse } from "@/components/article-prose"
import type { ArticleFaq, ArticleMeta } from "./index"

// LINKS-TO-REACTIVATE:
//   Cere template-ul de raport lunar | interim /contact | final /instrumente/template-raport-lunar-cladire
//   cere la publicare (rezultatele de benchmark) | interim /contact | final /instrumente/benchmark-kwh-mp
//   materialele despre performanta cladirii (sectiunea introductiva) | interim /resurse/performanta-cladirii | final /resurse/benchmark-kwh-mp-birouri-romania
//   materialele despre reglajul si performanta cladirii (KPI 7) | interim /resurse/performanta-cladirii | final /resurse/incalzire-si-racire-simultana
//   materialele despre contorizare si raportare (KPI 4) | interim /resurse/esg-energie-raportare | final /resurse/submetering-cladiri-multi-tenant
//   Facility managerul (text fara link) | interim (fara link) | final /pentru/facility-manager
//   Property sau asset managerul (text fara link) | interim (fara link) | final /pentru/property-asset-manager
//   Responsabilul de sustenabilitate (text fara link) | interim (fara link) | final /pentru/esg-sustenabilitate

export const meta: ArticleMeta = {
  title: "KPI cladire comerciala: 10 indicatori de urmarit | Sovitech Control",
  description:
    "Cei 10 KPI pe care ar trebui sa ii urmareasca orice cladire comerciala din Romania: formula, sursa datelor din BMS, interval de referinta si ce se face la abatere.",
  datePublished: "2026-08-17",
  dateModified: "2026-08-19",
}

export const faq: ArticleFaq[] = [
  {
    q: "De unde se incepe daca nu exista niciun KPI configurat?",
    a: "Din consumul de bază. Este nevoie de un trend log de putere activă pe contorul general, la 15 minute, timp de 30 de zile. Se configurează într-o oră și arată imediat cât consumă clădirea când este goală.",
  },
  {
    q: "Există un benchmark românesc oficial pe clase de clădiri?",
    a: "Nu există un benchmark public pe clase de clădiri comerciale din România și nici un reper publicat pentru Europa Centrală și de Est. Intervalele din articol sunt estimări de piață, din proiecte proprii și din literatura tehnică internațională. Este în lucru un benchmark kWh/mp pe portofoliu anonimizat, iar rezultatele se pot cere la publicare.",
  },
  {
    q: "Se pot calcula acești indicatori fără un sistem BMS?",
    a: "Parțial. Cu contoare inteligente și citiri automate se obțin intensitatea energetică (KPI 1), consumul de bază (KPI 3) și costul energetic (KPI 4). Randamentul instalației de frig, orele de funcționare și încălzirea și răcirea simultană cer poziții de vane, confirmări de funcționare și temperaturi pe circuite, disponibile doar într-un sistem de automatizare cu istoricizare.",
  },
  {
    q: "Cine răspunde de acești KPI într-o clădire?",
    a: "Facility managerul răspunde de indicatorii tehnici, asset managerul de cost și de intensitatea energetică, responsabilul de sustenabilitate de completitudinea datelor. Fiecare cifră are un proprietar declarat și cel puțin un utilizator. Fără proprietar, indicatorul dispare din raport după trei luni.",
  },
]

export default function Body() {
  return (
    <ArticleProse>
      <p className="standfirst">
        Pentru fiecare indicator: ce măsoară, formula, sursa datelor din BMS, intervalul orientativ
        și ce se face la abatere.
      </p>

      <p>
        <strong>
          O clădire comercială din România, birouri, retail sau hotel, poate fi condusă cu zece
          indicatori de performanță (KPI, key performance indicators): intensitatea energetică în
          kWh/mp/an, consumul pe oră ocupată, consumul de bază, costul pe metru pătrat, randamentul
          instalației de frig, orele de funcționare, orele de încălzire și răcire simultană, rata de
          alarme, calitatea mediului interior și completitudinea datelor. Restul sunt detalii.
        </strong>
      </p>

      <p>
        Toate cele zece se citesc dintr-un sistem BMS (Building Management System, sistemul de
        management al clădirii, a nu se confunda cu Battery Management System) sau din contoarele
        conectate la el. Intervalele de referință din articol sunt estimări de piață: pentru
        clădirile comerciale din România nu există un benchmark publicat pe clase de clădiri.
      </p>

      <h2 id="pe-scurt">Pe scurt</h2>

      <ul>
        <li>
          Cei zece indicatori de performanță (KPI) acoperă energia, costul, funcționarea tehnică,
          confortul și datele.
        </li>
        <li>
          Consumul de bază, puterea trasă când clădirea este goală, se configurează într-o oră și
          arată prima risipă.
        </li>
        <li>
          Intervalele de referință sunt estimări de piață: un benchmark public românesc pe clase de
          clădiri comerciale nu există.
        </li>
        <li>KPI 10, completitudinea datelor, decide dacă celelalte nouă sunt cifre sau opinii.</li>
        <li>
          Din 29 mai 2026, Directiva (UE) 2024/1275 cere ca BACS să monitorizeze și calitatea
          mediului interior, obligație UE netranspusă în legea română.
        </li>
        <li>
          Fiecare indicator are un singur proprietar: facility manager, asset manager sau
          responsabil ESG.
        </li>
      </ul>

      <h2 id="doua-roluri-doua-seturi-de-cifre">
        Două roluri, două seturi de cifre: facility manager și asset manager
      </h2>

      <p>
        Scena se repetă în orice clădire de birouri din România. Facility managerul spune că a
        reglat programele orare și că instalația merge bine. Asset managerul se uită la factură și
        vede o creștere de 9%.
      </p>

      <p>
        Amândoi au dreptate. Unul măsoară comportamentul instalației, celălalt costul. Unul se uită
        la o săptămână, celălalt la douăsprezece luni. Unul citește din{" "}
        <a href="/ghid/sisteme-bms-cladiri">sistemul BMS (Building Management System)</a>, celălalt
        din contabilitate.
      </p>

      <p>
        Setul de zece indicatori de mai jos este puntea dintre cele două roluri. Intervalele de
        referință sunt <strong>estimări de piață</strong>, până la publicarea unui benchmark kWh/mp
        pentru birourile din România. Vezi și{" "}
        <a href="/resurse/performanta-cladirii">materialele despre performanța clădirii</a>.
      </p>

      <h2 id="energie-si-cost-kpi-1-4">Energie și cost: KPI 1-4, de la kWh/mp la lei/mp</h2>

      <h3 id="kpi-1-intensitatea-energetica-120-180-kwh-mp-an">
        KPI 1. Intensitatea energetică, 120-180 kWh/mp/an
      </h3>

      <ul>
        <li>
          <strong>Ce măsoară:</strong> consumul clădirii raportat la suprafața deservită.
        </li>
        <li>
          <strong>Formulă:</strong> energie anuală (kWh) / suprafață (mp), separat electric și
          termic.
        </li>
        <li>
          <strong>Sursa datelor:</strong> contorul general electric și cel termic, citite prin M-Bus
          sau Modbus și istoricizate în sistemul BMS (Building Management System); suprafața din
          fișa tehnică, nu din contract.
        </li>
        <li>
          <strong>Referință, estimare de piață:</strong> orientativ 120-180 kWh/mp/an pentru birouri
          clasa A din București, ca{" "}
          <strong>
            energie finală, pe întreaga clădire, inclusiv părțile comune și spațiile închiriate,
            raportată la aria construită desfășurată
          </strong>
          , cu electric și termic însumate; clădirile prost reglate depășesc 220 kWh/mp/an.
        </li>
        <li>
          <strong>La abatere:</strong> se defalcă electric și termic. Abaterea pe electric trimite
          la consumul de bază (KPI 3) și la randamentul instalației de frig (KPI 5), cea pe termic
          la orele de funcționare (KPI 6) și la încălzirea și răcirea simultană (KPI 7).
        </li>
      </ul>

      <p>
        Intervalul de 120-180 kWh/mp/an este o <strong>estimare de piață</strong>, nu un reper
        publicat, pentru că pentru Europa Centrală și de Est nu există un benchmark publicat pe
        clase de clădiri. Reperul extern verificabil cel mai apropiat este{" "}
        <a
          href="https://www.betterbuildingspartnership.co.uk/sites/default/files/media/attachment/REEB%202023%20Benchmarks_0.pdf"
          target="_blank"
          rel="noopener"
        >
          Real Estate Environmental Benchmark 2023 al Better Buildings Partnership
        </a>
        , care dă 120 kWh/mp/an mediană pentru un birou climatizat, pe 472 de clădiri, cu domeniul
        declarat identic: energie finală, întreaga clădire, arie construită. Formula de mai sus cere
        calculul separat pe electric și pe termic, iar comparația cu ambele referințe se face pe
        suma celor două.
      </p>

      <h3 id="kpi-2-consumul-specific-in-kwh-pe-ora-ocupata-si-pe-utilizator">
        KPI 2. Consumul specific, în kWh pe oră ocupată și pe utilizator
      </h3>

      <ul>
        <li>
          <strong>Ce măsoară:</strong> consumul clădirii pentru fiecare oră de folosire efectivă.
        </li>
        <li>
          <strong>Formulă:</strong> kWh lunar / ore de ocupare și kWh lunar / utilizatori.
        </li>
        <li>
          <strong>Sursa datelor:</strong> contorul general; orele de ocupare din programul orar al
          sistemului BMS sau, mai bine, din senzorii de prezență.
        </li>
        <li>
          <strong>Referință, estimare:</strong> indicatorul se compară cu el însuși. Țintă: variație
          sub 10% de la lună la lună, în plus sau în minus.
        </li>
        <li>
          <strong>La abatere:</strong> se compară orele de ocupare declarate cu orele reale de
          funcționare a echipamentelor (KPI 6).
        </li>
      </ul>

      <h3 id="kpi-3-consumul-de-baza-baseload-sub-25-30-din-varf">
        KPI 3. Consumul de bază (baseload), sub 25-30% din vârf
      </h3>

      <ul>
        <li>
          <strong>Ce măsoară:</strong> cât trage clădirea când nu e nimeni în ea. Arată risipa
          direct.
        </li>
        <li>
          <strong>Formulă:</strong> putere medie între 01:00 și 04:00 în zilele nelucrătoare (kW),
          ca procent din vârful zilei lucrătoare.
        </li>
        <li>
          <strong>Sursa datelor:</strong> un trend log de putere activă pe contorul general, la 15
          minute, pe 30 de zile. Ideal, și pe plecările principale.
        </li>
        <li>
          <strong>Referință, estimare:</strong> orientativ sub 25-30% din vârf pentru birouri fără
          funcțiuni continue; peste 40% este aproape întotdeauna risipă.
        </li>
        <li>
          <strong>La abatere:</strong> se caută ce nu se oprește niciodată: centrale de tratare a
          aerului (CTA) permanente, pompe fără comandă de oprire, iluminat fără senzori.
        </li>
      </ul>

      <h3 id="kpi-4-costul-energetic-in-lei-pe-mp-si-in-procent-din-opex">
        KPI 4. Costul energetic, în lei pe mp și în procent din OPEX
      </h3>

      <ul>
        <li>
          <strong>Ce măsoară:</strong> traducerea în bani a intensității energetice (KPI 1) și
          legătura cu service charge-ul.
        </li>
        <li>
          <strong>Formulă:</strong> cost energie / mp / an și cost energie / cost total OPEX (%).
        </li>
        <li>
          <strong>Sursa datelor:</strong> facturile furnizorilor și contorizarea secundară pe
          chiriași, tratată în{" "}
          <a href="/resurse/esg-energie-raportare">materialele despre contorizare și raportare</a>.
          Fără ea, repartiția pe cotă-parte rămâne contestabilă.
        </li>
        <li>
          <strong>Referință, estimare:</strong> orientativ, energia reprezintă 25-40% din costul de
          operare al unei clădiri de birouri din România, în funcție de prețul contractat.
        </li>
        <li>
          <strong>La abatere:</strong> se recalculează anul curent la prețul anului anterior. Dacă
          diferența rămâne, problema este tehnică.
        </li>
      </ul>

      <h2 id="functionare-tehnica-kpi-5-8">Funcționare tehnică: KPI 5-8, de la COP la rata de alarme</h2>

      <h3 id="kpi-5-randamentul-instalatiei-de-frig-in-kwh-frig-pe-kwh-electric">
        KPI 5. Randamentul instalației de frig, în kWh frig pe kWh electric
      </h3>

      <ul>
        <li>
          <strong>Ce măsoară:</strong> energia frigorifică livrată pe kWh electric consumat,
          exprimată ca COP sau EER sezonier.
        </li>
        <li>
          <strong>Formulă:</strong> kWh frig livrat / kWh electric la chiller și auxiliare, lunar și
          sezonier.
        </li>
        <li>
          <strong>Sursa datelor:</strong> contor de energie termică pe apa răcită și contor electric
          dedicat pe chiller. Dacă unul lipsește, indicatorul nu se poate calcula.
        </li>
        <li>
          <strong>Referință, estimare:</strong> orientativ 3,0-5,0 în regim sezonier la chillere
          răcite cu aer. Valorile de catalog sunt sistematic mai mari decât cele reale.
        </li>
        <li>
          <strong>La abatere:</strong> se verifică consemnul pe apa răcită, sarcina parțială,
          curățenia condensatoarelor și debitul pompelor.
        </li>
      </ul>

      <h3 id="kpi-6-orele-de-functionare-in-ore-pe-luna-si-abatere-in-procente">
        KPI 6. Orele de funcționare, în ore pe lună și abatere în procente
      </h3>

      <ul>
        <li>
          <strong>Ce măsoară:</strong> cât au funcționat echipamentele față de cât ar fi trebuit.
        </li>
        <li>
          <strong>Formulă:</strong> ore de funcționare pe lună per echipament și abatere = (ore
          reale minus ore programate) / ore programate (%).
        </li>
        <li>
          <strong>Sursa datelor:</strong> contorizarea orelor din controlerele de câmp, pe
          confirmarea de funcționare (releu de curent sau presostat), nu pe comandă. Comanda spune
          ce s-a cerut, confirmarea ce s-a întâmplat.
        </li>
        <li>
          <strong>Referință, estimare:</strong> abatere sub 5%, în plus sau în minus. Peste 15%
          înseamnă funcționare manuală neînregistrată sau programe orare suprascrise local.
        </li>
        <li>
          <strong>La abatere:</strong> se revizuiesc programele orare și se limitează comenzile
          manuale. Regimul redus de noapte nu se aplică în spații cu control de umiditate.
        </li>
      </ul>

      <h3 id="kpi-7-incalzirea-si-racirea-simultana-in-ore-pe-luna">
        KPI 7. Încălzirea și răcirea simultană, în ore pe lună
      </h3>

      <ul>
        <li>
          <strong>Ce măsoară:</strong> câte ore pe lună aceeași centrală de tratare a aerului (CTA)
          încălzește și răcește simultan. Risipă invizibilă pe factură.
        </li>
        <li>
          <strong>Formulă:</strong> ore/lună în care poziția vanei de baterie caldă și cea de
          baterie rece depășesc simultan un prag (de exemplu 5%), pe același agregat.
        </li>
        <li>
          <strong>Sursa datelor:</strong> trend logurile pe comenzile celor două vane din CTA, la
          5-15 minute, plus temperatura de refulare.
        </li>
        <li>
          <strong>Referință, estimare:</strong> ținta este zero, în afara tranzițiilor scurte. Peste
          20 de ore pe lună indică o buclă de reglaj greșit configurată, subiect tratat în{" "}
          <a href="/resurse/performanta-cladirii">
            materialele despre reglajul și performanța clădirii
          </a>
          .
        </li>
        <li>
          <strong>La abatere:</strong> se reconfigurează secvența cu zonă neutră și se verifică dacă
          vanele închid complet la comandă zero.
        </li>
      </ul>

      <h3 id="kpi-8-rata-de-alarme-in-numar-de-alarme-si-ore-pana-la-inchidere">
        KPI 8. Rata de alarme, în număr de alarme și ore până la închidere
      </h3>

      <ul>
        <li>
          <strong>Ce măsoară:</strong> cât zgomot produce sistemul de automatizare și cât de repede
          reacționează echipa. Indicator al operării, nu al instalației.
        </li>
        <li>
          <strong>Formulă:</strong> alarme active la sfârșit de lună, repetate (aceeași sursă de
          peste trei ori), confirmate fără acțiune (%), timp mediu de închidere.
        </li>
        <li>
          <strong>Sursa datelor:</strong> jurnalul de alarme al supervizorului, exportat lunar. Fără
          marcaj de confirmare și de închidere, indicatorul nu se poate construi.
        </li>
        <li>
          <strong>Referință, estimare:</strong> sub 10 alarme active permanente, sub 5% repetate,
          închidere medie sub 48 de ore la cele necritice. Estimări din practica de{" "}
          <a href="/servicii/intretinere-sisteme-bms">întreținere</a>.
        </li>
        <li>
          <strong>La abatere:</strong> întâi curățenie în praguri și în alarmele false, apoi
          prioritizare. O listă cu 400 de alarme active înseamnă zero alarme.
        </li>
      </ul>

      <h2 id="confort-si-date-kpi-9-10">
        Confort și date: KPI 9-10, calitatea mediului interior și completitudinea
      </h2>

      <h3 id="kpi-9-calitatea-mediului-interior-in-procent-din-orele-ocupate">
        KPI 9. Calitatea mediului interior, în procent din orele ocupate
      </h3>

      <ul>
        <li>
          <strong>Ce măsoară:</strong> dacă spațiul livrat respectă parametrii contractați de
          calitate a mediului interior (IEQ, indoor environmental quality) și cât de des se plâng
          oamenii.
        </li>
        <li>
          <strong>Formulă:</strong> % din orele ocupate cu CO2 sub 1.000 ppm, cu temperatura de zonă
          în banda contractată și cu umiditatea în interval; reclamații / 1.000 mp / lună.
        </li>
        <li>
          <strong>Sursa datelor:</strong> senzori de CO2 (la Sauter, seria EGQ), sonde de
          temperatură și de umiditate istoricizate în sistemul BMS (Building Management System),
          plus reclamațiile din helpdesk.
        </li>
        <li>
          <strong>Referință, estimare:</strong> peste 95% din orele ocupate în interval. Sub 90%
          înseamnă că cineva se plânge deja, chiar dacă nu a scris încă.
        </li>
        <li>
          <strong>La abatere:</strong> se verifică debitul de aer proaspăt, poziția senzorului (unul
          montat lângă ușă sau în soare minte constant) și calibrarea. Senzorii de CO2 se
          decalibrează în 2-3 ani și aproape nimeni nu îi verifică.
        </li>
      </ul>

      <p>
        Calitatea mediului interior este acum și cerință europeană. Directiva (UE) 2024/1275 prevede
        la <strong>art. 13 alin. (10) lit. d)</strong> că, <strong>din 29 mai 2026</strong>,
        sistemele BACS (sisteme de automatizare și control al clădirilor) trebuie să asigure și
        monitorizarea calității mediului interior. Tot art. 13 cere, la <strong>alin. (4)</strong>,
        standarde adecvate de calitate a mediului interior, iar la <strong>alin. (5)</strong>, ca{" "}
        <strong>
          clădirile nerezidențiale cu emisii zero să aibă dispozitive de măsurare și control al
          calității aerului
        </strong>
        , cele existente la renovare majoră, unde este fezabil (
        <a href="https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng" target="_blank" rel="noopener">
          textul directivei
        </a>
        ).
      </p>

      <p>
        Este o <strong>obligație UE, nu o prevedere din legea română în vigoare</strong>: România nu
        a transpus încă Directiva (UE) 2024/1275 și a primit, la 15 iulie 2026, o scrisoare de
        punere în întârziere de la Comisia Europeană (
        <a
          href="https://energy.ec.europa.eu/news/commission-calls-eu-countries-transpose-reinforced-rules-energy-performance-buildings-2026-07-15_en"
          target="_blank"
          rel="noopener"
        >
          comunicatul Comisiei
        </a>
        ). Pe larg, în articolul despre{" "}
        <a href="/resurse/monitorizare-calitate-aer-epbd">
          monitorizarea calității aerului interior
        </a>
        .
      </p>

      <h3 id="kpi-10-completitudinea-datelor-peste-98-din-punctele-de-masura">
        KPI 10. Completitudinea datelor, peste 98% din punctele de măsură
      </h3>

      <ul>
        <li>
          <strong>Ce măsoară:</strong> ce procent din punctele de măsură ale clădirii au raportat
          valori valide pe toată luna.
        </li>
        <li>
          <strong>Formulă:</strong> (puncte cu serie completă și plauzibilă / total puncte definite)
          x 100; separat, % de valori lipsă și respinse la validare.
        </li>
        <li>
          <strong>Sursa datelor:</strong> baza de date de istoricizare a sistemului BMS: intervale
          lipsă, valori blocate, valori negative pe contoare cumulative, salturi imposibile.
        </li>
        <li>
          <strong>Referință, estimare:</strong> peste 98% pentru punctele care intră în raportare.
          Sub 95%, orice cifră derivată din ele se prezintă cu rezervă explicită.
        </li>
        <li>
          <strong>La abatere:</strong> se identifică punctele problemă, se verifică comunicația și
          se documentează perioada afectată.
        </li>
      </ul>

      <p>
        Un consum de 143 kWh/mp/an calculat dintr-o serie cu 12% valori lipsă nu este 143, ci o
        estimare cu eroare necunoscută. Într-un raport de sustenabilitate, diferența dintre
        „măsurat" și „estimat" este o problemă de auditabilitate.
      </p>

      <h2 id="tabelul-de-sinteza-si-proprietarul-fiecarei-cifre">
        Tabelul de sinteză al celor 10 KPI și proprietarul fiecărei cifre
      </h2>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Indicator</th>
              <th>Unitate</th>
              <th>Sursa datelor</th>
              <th>Frecvență</th>
              <th>Cine urmărește</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Intensitate energetică</td>
              <td>kWh/mp/an</td>
              <td>Contor general electric + termic</td>
              <td>Lunar și anual</td>
              <td>AM, ESG</td>
            </tr>
            <tr>
              <td>2</td>
              <td>Consum pe oră ocupată / utilizator</td>
              <td>kWh/h ocupată; kWh/utilizator</td>
              <td>Contor general + program orar BMS</td>
              <td>Lunar</td>
              <td>AM, FM</td>
            </tr>
            <tr>
              <td>3</td>
              <td>Consum de bază (baseload)</td>
              <td>kW și % din vârf</td>
              <td>Trend log putere activă, 15 min</td>
              <td>Lunar și săptămânal</td>
              <td>FM</td>
            </tr>
            <tr>
              <td>4</td>
              <td>Cost energetic pe mp și pondere în OPEX</td>
              <td>lei-EUR/mp/an; %</td>
              <td>Facturi + contorizare secundară</td>
              <td>Lunar și anual</td>
              <td>AM</td>
            </tr>
            <tr>
              <td>5</td>
              <td>Randament instalație de frig</td>
              <td>kWh frig / kWh el.</td>
              <td>Contor termic apă răcită + contor electric chiller</td>
              <td>Lunar, în sezon</td>
              <td>FM, AM</td>
            </tr>
            <tr>
              <td>6</td>
              <td>Ore de funcționare și abatere de program</td>
              <td>h; %</td>
              <td>Confirmare de funcționare din controlere</td>
              <td>Lunar</td>
              <td>FM</td>
            </tr>
            <tr>
              <td>7</td>
              <td>Încălzire și răcire simultană</td>
              <td>h/lună</td>
              <td>Trend log poziții vane baterie caldă / rece</td>
              <td>Lunar</td>
              <td>FM</td>
            </tr>
            <tr>
              <td>8</td>
              <td>Rata de alarme</td>
              <td>nr.; %; h</td>
              <td>Jurnal de alarme al supervizorului</td>
              <td>Lunar și săptămânal</td>
              <td>FM</td>
            </tr>
            <tr>
              <td>9</td>
              <td>Calitatea mediului interior + reclamații</td>
              <td>% ore în interval; nr./1.000 mp</td>
              <td>Senzori CO2, temperatură, umiditate; helpdesk</td>
              <td>Lunar</td>
              <td>FM, AM, ESG</td>
            </tr>
            <tr>
              <td>10</td>
              <td>Completitudinea datelor</td>
              <td>%</td>
              <td>Baza de date de istoricizare</td>
              <td>Lunar, la raport</td>
              <td>ESG, AM</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        <em>FM = facility manager · AM = property &amp; asset manager · ESG = responsabil
        sustenabilitate.</em>{" "}
        Primul rol menționat răspunde de cifră, al doilea o folosește.
      </p>

      <h2 id="structura-unui-raport-lunar-o-pagina-10-cifre-3-grafice">
        Structura unui raport lunar: o pagină, 10 cifre, 3 grafice
      </h2>

      <p>O pagină. Zece cifre. Trei grafice. Trei acțiuni.</p>

      <ul>
        <li>
          <strong>Antet:</strong> luna, suprafața utilă, orele de ocupare, gradele-zi. Fără corecție
          climatică, comparațiile lună la lună nu spun nimic.
        </li>
        <li>
          <strong>Blocul de cifre:</strong> cei zece indicatori de performanță (KPI), fiecare cu
          valoarea lunii, luna anterioară, aceeași lună din anul precedent și un semn de stare.
        </li>
        <li>
          <strong>Cele trei grafice:</strong> profilul zilnic de putere pe 24 de ore, cu ziua
          lucrătoare și cea nelucrătoare suprapuse; consumul pe ultimele 24 de luni; orele de
          confort pe zone.
        </li>
        <li>
          <strong>Cele trei acțiuni:</strong> ce se face luna următoare, cine răspunde și ce cifră
          trebuie să se miște. Un raport fără ele este un fișier, nu un instrument de management.
        </li>
      </ul>

      <ArticleDiagram
        src="/diagrame/A08-1-macheta-raport-lunar.jpg"
        caption="Machetă de raport lunar pe o pagină: antet contextual, grila celor 10 KPI, trei grafice și tabelul de acțiuni."
      />

      <h2 id="cele-cinci-cauze-pentru-care-cladirile-nu-pot-raporta">
        Cele cinci cauze pentru care majoritatea clădirilor nu pot raporta
      </h2>

      <p>
        Infrastructura de date a fost gândită pentru comandă, nu pentru raportare. Cinci cauze
        acoperă aproape toate cazurile. În evaluările de instrumentare pe care Sovitech Control le-a
        făcut în clădiri comerciale din București, prima dintre ele, lipsa contorizării secundare, a
        apărut în majoritatea cazurilor.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Problema</th>
              <th>Cum se manifestă</th>
              <th>Ce se face</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Lipsa contorizării secundare</td>
              <td>
                Un singur contor general. Chiriașii nu se pot separa de zonele comune. Costul
                energetic (KPI 4) și randamentul instalației de frig (KPI 5) devin imposibile.
              </td>
              <td>
                Arbore de contorizare: general, zone comune, chiriași, consumatori mari. Rezolvă și
                repartiția.
              </td>
            </tr>
            <tr>
              <td>Puncte necalibrate sau montate greșit</td>
              <td>
                Două sonde pe același circuit arată 3 °C diferență. Senzorul de CO2 este lângă ușă.
              </td>
              <td>
                Verificare pe teren, recalibrare, relocare. Ieftin, cu efect mare asupra
                credibilității.
              </td>
            </tr>
            <tr>
              <td>Date care nu se istoricizează</td>
              <td>Valorile se văd live, dar nu se salvează. Peste o lună nu mai există.</td>
              <td>
                Trend loguri pe punctele care intră în KPI, cu retenție de minimum 24 de luni la
                rezoluție completă.
              </td>
            </tr>
            <tr>
              <td>Rezoluție prea mică</td>
              <td>
                Citiri o dată pe oră sau doar indexuri lunare. Consumul de bază și încălzirea sau
                răcirea simultană nu se pot calcula.
              </td>
              <td>Trecerea la 5-15 minute pe punctele relevante.</td>
            </tr>
            <tr>
              <td>Sisteme care nu exportă</td>
              <td>Supervizor proprietar, fără export automat. Datele se copiază manual, cu erori.</td>
              <td>
                <a href="/servicii/integrare-sisteme-knx-dali-modbus-mbus">
                  Integrare pe protocoale deschise
                </a>{" "}
                și export programat.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Toate cinci se rezolvă, de regulă, fără înlocuirea sistemului de automatizare, printr-un{" "}
        <a href="/servicii/modernizare-sisteme-de-automatizare-si-bms">
          proiect de modernizare pe etape
        </a>
        .
      </p>

      <h2 id="de-la-cei-10-kpi-la-scope-1-si-scope-2">De la cei 10 KPI la Scope 1 și Scope 2</h2>

      <p>
        Cei zece indicatori de performanță (KPI) sunt stratul fizic al raportării de
        sustenabilitate. Consumul pe purtător de energie este intrarea pentru emisiile Scope 1 și
        Scope 2, iar intensitatea energetică în kWh/mp/an este cerută de raportările de portofoliu
        și de evaluările GRESB.
      </p>

      <p>
        Diferența dintre un raport care trece de audit și unul care nu trece stă în trasabilitate:
        din ce contor a venit cifra, la ce interval a fost citită și cine a validat-o. Un auditor nu
        întreabă „cât ați consumat", ci „de unde știți". Lanțul complet, în ghidul despre{" "}
        <a href="/ghid/date-esg-cladiri">datele pentru raportarea ESG</a>.
      </p>

      <h2 id="ce-urmareste-fiecare-rol">
        Ce urmărește fiecare rol: facility manager, asset manager, responsabil ESG
      </h2>

      <ul>
        <li>
          <strong>Facility managerul</strong> începe cu consumul de bază (KPI 3), orele de
          funcționare (KPI 6), încălzirea și răcirea simultană (KPI 7) și rata de alarme (KPI 8),
          toate citibile din sistemul BMS existent într-o zi de lucru.
        </li>
        <li>
          <strong>Property sau asset managerul</strong> cere intensitatea energetică (KPI 1),
          consumul specific (KPI 2), costul energetic (KPI 4) și calitatea mediului interior (KPI
          9) în raportul lunar, mereu în același format. Consecvența valorează mai mult decât
          precizia din prima lună.
        </li>
        <li>
          <strong>Responsabilul de sustenabilitate</strong> nu acceptă niciun indicator fără
          completitudinea datelor (KPI 10) și deschide raportul cu rata de completitudine.
        </li>
      </ul>

      <ArticleDiagram
        src="/diagrame/A08-2-flux-punct-de-masura-livrabil.jpg"
        caption="Fluxul datelor pe patru straturi: puncte de măsură, controlere de câmp, supervizor cu trend loguri și cele trei livrabile."
      />

      <ArticleFaqBox items={faq} />

      <h2 id="concluzie">Concluzie</h2>

      <p>
        Diferența dintre o clădire condusă și una doar întreținută se vede în raportul lunar. Cele
        zece cifre nu cer, de regulă, echipamente noi, ci configurarea corectă a ceea ce există și
        un proprietar pentru fiecare indicator. Obstacolul obișnuit nu este bugetul, ci faptul că
        nimeni nu a cerut aceleași cifre, în același format, două luni la rând.
      </p>

      <h2 id="cere-template-ul-de-raport-lunar">Cere template-ul de raport lunar</h2>

      <p>
        Cei zece indicatori de performanță sunt structurați într-un template de raport lunar al
        clădirii (XLSX), cu formule și foaie separată pentru completitudinea datelor.{" "}
        <a href="/contact">Cere template-ul de raport lunar</a>. Dacă jumătate din câmpuri nu se pot
        completa din sistemul actual, aceea este lista de lucru pentru o{" "}
        <a href="/servicii/consultanta">evaluare a instrumentării clădirii</a>.
      </p>

      <p className="article-note">
        Articol publicat 17.08.2026, actualizat 19.08.2026. Informațiile juridice au fost verificate
        la 17.08.2026. Surse citate: Directiva (UE) 2024/1275, comunicatul Comisiei Europene din
        15.07.2026 privind netranspunerea acesteia și Real Estate Environmental Benchmark 2023 al
        Better Buildings Partnership. Autor: Echipa de inginerie Sovitech Control.{" "}
        {/* TODO(author): replace with the signing engineer */}
      </p>
    </ArticleProse>
  )
}
