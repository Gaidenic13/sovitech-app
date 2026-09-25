import { ArticleDiagram, ArticleFaqBox, ArticleProse } from "@/components/article-prose"
import type { ArticleFaq, ArticleMeta } from "./index"

// LINKS-TO-REACTIVATE:
//   materialele despre protocoale si integrare | interim /resurse/bms-scada-integrare | final /ghid/protocoale-automatizarea-cladirilor
//   cere modelul de caiet de sarcini BMS | interim /contact | final /instrumente/model-caiet-de-sarcini-bms
//   echipa responsabila de IT/OT (text fara link) | interim (fara link) | final /pentru/it-ot
//   pagina pentru directorul tehnic (text fara link) | interim (fara link) | final /pentru/director-tehnic

export const meta: ArticleMeta = {
  title: "SCADA vs BMS: diferente si cand se foloseste | Sovitech Control",
  description:
    "BMS optimizeaza confortul si energia intr-o cladire, SCADA supervizeaza un proces industrial. Vezi tabelul comparativ pe 14 criterii si arborele de decizie.",
  datePublished: "2026-08-16",
  dateModified: "2026-08-16",
}

export const faq: ArticleFaq[] = [
  {
    q: "Poate un BMS să înlocuiască un SCADA?",
    a: "În instalații lente și necritice, da. Un BMS modern citește Modbus, afișează sinoptice și scrie istoric. Nu se folosește însă pentru bucle rapide, interblocări de siguranță sau procese care nu au voie să se oprească: acolo este nevoie de PLC.",
  },
  {
    q: "Ce diferenta este intre DDC si PLC?",
    a: "DDC-ul este un controler proiectat pentru clădiri, cu funcții HVAC gata făcute și configurare rapidă. PLC-ul este generic, cu ciclu de scanare determinist și programare standardizată. DDC-ul câștigă la viteza de implementare, PLC-ul câștigă la proces și la interblocări.",
  },
  {
    q: "Cât costă în plus legarea celor două sisteme?",
    a: "Estimativ, interfața între un BMS și un SCADA existente înseamnă între câteva zile și câteva săptămâni de lucru: gateway sau server OPC UA, maparea punctelor, testare și documentație. Intervalul este orientativ și depinde de numărul de puncte schimbate.",
  },
  {
    q: "Este nevoie de SCADA pentru o clădire de birouri?",
    a: "În marea majoritate a cazurilor, nu. Un BMS acoperă HVAC, iluminatul, contorizarea și raportarea energetică mai ieftin și mai rapid. Excepțiile apar la clădirile cu producție proprie de energie, cu stație de tratare a apei sau cu centru de date.",
  },
  {
    q: "Cine ar trebui să dețină sistemul: echipa tehnică sau IT-ul?",
    a: "Operarea rămâne la echipa tehnică, pentru că ea înțelege instalația. Rețeaua, conturile, accesul la distanță și copiile de siguranță aparțin IT-ului. Modelul care eșuează cel mai des este cel în care nimeni nu deține explicit partea de rețea a sistemelor OT.",
  },
]

export default function Body() {
  return (
    <ArticleProse>
      <p className="standfirst">
        Definiții, tabel comparativ pe 14 criterii, arbore de decizie și modul de legare a celor două
        sisteme într-o facilitate mixtă.
      </p>

      <p>
        BMS înseamnă sistem de management al clădirii: optimizează confortul și energia într-un
        imobil. SCADA înseamnă supervizare și achiziție de date pentru un proces industrial sau o
        infrastructură distribuită. Tehnologic se suprapun. Diferă la scop, la viteza de reacție și
        la consecința unei erori: disconfort, într-un caz, oprirea producției, în celălalt.
      </p>

      <p>
        BMS vine de la Building Management System, a nu se confunda cu Battery Management System. În
        textele de reglementare, sistemul apare sub numele de BACS, sisteme de automatizare și
        control al clădirilor.
      </p>

      <h2 id="pe-scurt">Pe scurt</h2>

      <ul>
        <li>
          Tehnologia se suprapune aproape complet: ambele familii citesc senzori, execută logică,
          afișează sinoptice și scriu istoric.
        </li>
        <li>
          Criteriul de departajare este consecința unei opriri de 10 minute: reclamații sau șarjă
          pierdută.
        </li>
        <li>
          Controlerul DDC vine cu biblioteci HVAC gata făcute; PLC-ul are ciclu de scanare
          determinist.
        </li>
        <li>
          Licențierea decide bugetul mai des decât funcțiile: un SCADA pe tag-uri devine scump la
          câteva mii de puncte de confort.
        </li>
        <li>
          În facilitățile mixte răspunsul corect este „amândouă", legate prin BACnet, Modbus TCP sau
          OPC UA.
        </li>
        <li>
          OUG nr. 155/2024 nu conține un articol dedicat sistemelor OT, iar aplicabilitatea la SCADA
          și BMS rămâne o interpretare.
        </li>
      </ul>

      <h2 id="originea-bms-controlere-ddc-bacnet-knx-dali-m-bus">
        Originea BMS: controlere DDC, BACnet, KNX, DALI, M-Bus
      </h2>

      <p>
        Sistemul BMS (Building Management System) controlează și supraveghează instalațiile unei
        clădiri: încălzire, ventilare, climatizare, iluminat, contorizare de utilități, uneori
        pompare sau surse de rezervă. Toată familia pleacă de la o singură întrebare: cum se menține
        un mediu interior stabil cu un consum cât mai mic.
      </p>

      <p>
        Istoric, BMS-ul a crescut din instalațiile de clădiri, prin bucle de reglaj întâi pneumatice,
        apoi electronice, apoi digitale. Din anii '80 au apărut controlerele DDC (Direct Digital
        Control), cu funcții de clădire deja în bibliotecă: reglaj pe cameră, secvențe de CTA
        (centrală de tratare a aerului), curbe de încălzire, programe orare. În 1995 a apărut{" "}
        <a href="https://bacnet.org/" target="_blank" rel="noopener">
          BACnet
        </a>{" "}
        și, odată cu el, așteptarea că sistemul unui producător poate citi punctele altuia. Alături
        de BACnet, protocoalele uzuale ale lumii clădirilor sunt Modbus, KNX, DALI și M-Bus.
        Contextul complet este în{" "}
        <a href="/ghid/sisteme-bms-cladiri">ghidul despre sistemele BMS pentru clădiri</a>.
      </p>

      <p>
        Aceeași categorie de sisteme este și reglementată. În legea română apare ca BACS (Building
        Automation and Control System) și este obligatorie la clădirile nerezidențiale cu sisteme de
        încălzire, de climatizare, sau combinate cu ventilare, cu putere nominală utilă de peste 290
        kW pe familie de sisteme, conform Legii 372/2005, art. 27 alin. (5) și art. 29 alin. (6).
        Termenul a fost 31 decembrie 2024 și este depășit. Legea cere trei capabilități:
        monitorizarea, înregistrarea, analiza și ajustarea continuă a consumului de energie;
        evaluarea eficienței, detectarea pierderilor și informarea persoanei responsabile;
        comunicarea cu sistemele tehnice conectate și interoperabilitatea între tehnologii
        proprietare diferite. A patra capabilitate, monitorizarea calității mediului interior, se
        adaugă de la 29 mai 2026 prin Directiva (UE) 2024/1275, art. 13 alin. (10) lit. d), și nu
        este încă transpusă în legea română. Tot de acolo vine și pragul de 70 kW, cu termen 31
        decembrie 2029, art. 13 alin. (9) lit. b), netranspus.
      </p>

      <h2 id="originea-scada-plc-rtu-modbus-si-opc-ua">Originea SCADA: PLC, RTU, Modbus și OPC UA</h2>

      <p>
        SCADA înseamnă Supervisory Control and Data Acquisition, adică supervizare și achiziție de
        date. Este stratul de deasupra automatizării de proces: colectează date de la PLC-uri și
        RTU-uri, prin Modbus, OPC UA, Profinet sau protocoale de telemetrie precum IEC 60870-5-104
        și DNP3, le afișează în sinoptice, gestionează alarmele, scrie istoric și permite comenzi de
        supervizare. Un detaliu care se pierde des: SCADA nu execută, de regulă, bucla rapidă de
        reglaj. Acolo lucrează PLC-ul, iar SCADA îl supraveghează.
      </p>

      <p>
        Rădăcinile stau în telemetrie. În anii '60 și '70, companiile de apă, gaz și energie
        trebuiau să comande stații aflate la zeci de kilometri. De acolo vin trăsăturile rămase până
        azi: toleranța la legături slabe, RTU-uri autonome când linia cade, obsesia pentru
        istoricizare și pentru jurnalul de evenimente.
      </p>

      <p>
        Un semn practic că un sistem este SCADA doar cu numele: sinopticele arată bine, dar
        historianul nu păstrează nimic peste 30 de zile și nimeni nu poate reconstitui ultima
        oprire.
      </p>

      <h2 id="tabel-comparativ-pe-14-criterii-scop-criticitate-protocoale-licentiere">
        Tabel comparativ pe 14 criterii: scop, criticitate, protocoale, licențiere
      </h2>

      <p>
        Diferența esențială, în proză: sistemul BMS urmărește confortul și energia unei clădiri, cu
        bucle de secunde până la minute și cu tendințe la 5-15 minute, iar o defecțiune produce
        disconfort și reclamații. SCADA urmărește continuitatea unui proces, cu bucle de milisecunde
        până la secunde executate în PLC, iar o defecțiune se măsoară în minute de producție
        pierdută. Restul diferențelor, de la protocoale la modul de licențiere, decurg din aceste
        două scopuri.
      </p>

      <p>
        Tabelul descrie utilizarea tipică, nu limitele tehnice. Orice criteriu poate fi contrazis de
        un proiect anume.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Criteriu</th>
              <th>BMS / BACS</th>
              <th>SCADA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1. Scop principal</td>
              <td>Confort, calitatea aerului, eficiență energetică, cost de operare</td>
              <td>Continuitatea și controlul unui proces, disponibilitatea instalației</td>
            </tr>
            <tr>
              <td>2. Obiect controlat</td>
              <td>Un imobil sau un campus: CTA, cazane, chillere, ventiloconvectoare, iluminat, contoare</td>
              <td>Un proces sau o infrastructură: linii de producție, pompare, tratare apă, distribuție energie</td>
            </tr>
            <tr>
              <td>3. Tip de proces</td>
              <td>Lent, continuu, cu inerție termică mare</td>
              <td>Rapid sau discret, cu secvențe, interblocări și stări de siguranță</td>
            </tr>
            <tr>
              <td>4. Rezoluție temporală / rată de eșantionare</td>
              <td>Bucle de secunde până la minute; tendințe la 5-15 minute</td>
              <td>Bucle de milisecunde până la secunde în PLC; achiziție la secundă sau sub secundă</td>
            </tr>
            <tr>
              <td>5. Criticitate și consecința unei defecțiuni</td>
              <td>
                Disconfort, consum crescut, reclamații ale chiriașilor. Rareori pierdere directă de
                bani în prima oră
              </td>
              <td>
                Oprire de producție, șarjă pierdută, rebut, risc de siguranță sau de mediu. Costul se
                măsoară pe minut
              </td>
            </tr>
            <tr>
              <td>6. Tip de controler</td>
              <td>DDC: controler digital dedicat clădirii, cu biblioteci de funcții HVAC gata făcute</td>
              <td>
                PLC: controler logic programabil, cu ciclu de scanare determinist, plus RTU pentru
                puncte îndepărtate
              </td>
            </tr>
            <tr>
              <td>7. Interfața de operare</td>
              <td>
                Grafică de clădire: planuri de etaj, secțiuni prin instalație, zone colorate pe
                temperatură
              </td>
              <td>
                Sinoptic de proces: schema P&amp;ID vie, cu stări de utilaj, debite, presiuni și
                comenzi
              </td>
            </tr>
            <tr>
              <td>8. Protocoale tipice</td>
              <td>BACnet IP și MS/TP, Modbus, KNX, DALI, M-Bus, LON</td>
              <td>Modbus RTU/TCP, OPC UA, Profinet, Profibus, EtherNet/IP, IEC 60870-5-104, DNP3</td>
            </tr>
            <tr>
              <td>9. Istoricizare și rezoluția datelor</td>
              <td>
                Tendințe pe intervale largi, agregate orare și zilnice, păstrate luni sau ani pentru
                raportare energetică
              </td>
              <td>
                Historian dedicat, rezoluție fină, compresie pe valoare, interogare pe eveniment și
                analiză post-incident
              </td>
            </tr>
            <tr>
              <td>10. Managementul alarmelor</td>
              <td>
                Câteva sute de alarme, prioritizate pe confort și pe defect de echipament; notificare
                prin e-mail
              </td>
              <td>
                Mii de alarme, cu confirmare obligatorie, ierarhizare pe siguranță, sortare pe cauză
                primă și rapoarte de flux de alarme
              </td>
            </tr>
            <tr>
              <td>11. Redundanță</td>
              <td>
                Rareori dublată; server unic, controlere autonome care păstrează logica locală dacă
                serverul cade
              </td>
              <td>
                Frecvent dublată: servere redundante, rețele inelare, PLC-uri în configurație
                redundantă, UPS dimensionat
              </td>
            </tr>
            <tr>
              <td>12. Cerințe de validare / reglementare</td>
              <td>
                Reglementări de performanță energetică și de calitate a mediului interior;
                documentație as-built
              </td>
              <td>
                Frecvent validare formală: calificare, audit trail, semnătură electronică, control al
                versiunilor și al accesului
              </td>
            </tr>
            <tr>
              <td>13. Cine îl operează</td>
              <td>
                Facility manager, echipa tehnică a clădirii, uneori un dispecerat de portofoliu
              </td>
              <td>
                Operator de tură în camera de comandă, inginer de proces, mentenanță industrială.
                Program de lucru continuu
              </td>
            </tr>
            <tr>
              <td>14. Mod de licențiere</td>
              <td>
                De obicei pe număr de puncte de date sau pe stație de operare, cu abonament de
                mentenanță software
              </td>
              <td>
                Pe tag-uri, pe client conectat, pe server sau pe nod de dezvoltare. Costul crește
                rapid cu numărul de puncte
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="zona-gri-dintre-bms-si-scada-contorizare-pompare-chillere-de-proces">
        Zona gri dintre BMS și SCADA: contorizare, pompare, chillere de proces
      </h2>

      <p>
        Zona gri are șase situații recurente: contorizarea generală de utilități, stațiile de
        pompare, compresoarele de aer, chillerele industriale, HVAC-ul de proces din camerele curate
        și grupurile electrogene cu UPS. Tehnologia din spate face parte din aceeași familie:
        senzori, module de intrări și ieșiri, o magistrală, un controler, un server, o interfață
        grafică. Un SCADA modern controlează o CTA foarte bine, iar un sistem BMS modern
        supraveghează o stație de pompare. Diferența stă în cât costă folosirea fiecăruia în afara
        zonei proprii.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Zona gri</th>
              <th>Cine o preia de obicei</th>
              <th>Ce înclină decizia</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Contorizare generală de utilități (energie, apă, gaz, agent termic)</td>
              <td>Ambele, frecvent duplicat</td>
              <td>
                Cine emite raportul lunar. Contorul se citește o singură dată și se distribuie, nu se
                cablează de două ori
              </td>
            </tr>
            <tr>
              <td>Stații de pompare și de ridicare a presiunii</td>
              <td>SCADA dacă sunt distribuite sau critice; BMS dacă deservesc clădirea</td>
              <td>Distanța geografică și consecința unei opriri</td>
            </tr>
            <tr>
              <td>Compresoare de aer</td>
              <td>SCADA în industrie, BMS în clădiri comerciale</td>
              <td>Dacă aerul comprimat intră în produs sau doar acționează clapete</td>
            </tr>
            <tr>
              <td>Chillere industriale și răcire de proces</td>
              <td>SCADA când răcirea este parte din proces</td>
              <td>Toleranța admisă la abaterea de temperatură și viteza de reacție cerută</td>
            </tr>
            <tr>
              <td>
                HVAC de proces: camere curate, incinte climatizate, zone cu presiune controlată
              </td>
              <td>Sistem dedicat, adesea numit EMS, cu cerințe de validare</td>
              <td>
                Existența unei cerințe de audit trail și de monitorizare continuă a parametrilor
                critici
              </td>
            </tr>
            <tr>
              <td>Grupuri electrogene, UPS, tablouri generale</td>
              <td>
                BMS pentru semnalizare; SCADA electric acolo unde există distribuție proprie de medie
                tensiune
              </td>
              <td>Cine răspunde de rețeaua electrică internă</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Regula practică: dacă un echipament apare în două sisteme, se decide o dată cine îl{" "}
        <em>controlează</em>, iar celălalt îl <em>citește</em>. Dublarea comenzii este sursa clasică
        de conflict între două regulatoare care se luptă pe același setpoint. Contorul dublat
        produce, la finalul lunii, două valori care nu se potrivesc.
      </p>

      <h2 id="arborele-de-decizie-in-8-pasi-consecinta-unei-opriri-de-10-minute">
        Arborele de decizie în 8 pași: consecința unei opriri de 10 minute
      </h2>

      <p>
        Întrebările se parcurg în ordine. Un singur răspuns nu decide nimic; contează de câte ori se
        ajunge în aceeași parte.
      </p>

      <ol>
        <li>
          <strong>Ce se protejează: confortul oamenilor sau continuitatea unui proces?</strong>{" "}
          Confortul: BMS. Procesul: SCADA. Ambele, în zone diferite: ambele.
        </li>
        <li>
          <strong>Ce se întâmplă dacă sistemul cade 10 minute?</strong> Nimeni nu observă sau apar
          reclamații: BMS. Se oprește o linie sau se pierde o șarjă: SCADA.
        </li>
        <li>
          <strong>Cât de repede trebuie să reacționeze bucla?</strong> Minute, cu inerție termică:
          BMS. Sub o secundă, cu interblocări: SCADA cu PLC.
        </li>
        <li>
          <strong>Este necesar un audit trail validat?</strong> Da, în pharma sau în alt domeniu
          reglementat: SCADA sau EMS dedicat. Nu: BMS.
        </li>
        <li>
          <strong>Există puncte distribuite geografic, în afara unei singure clădiri?</strong>{" "}
          Stații de pompare, puțuri, posturi de transformare: SCADA. Totul într-un campus compact:
          BMS.
        </li>
        <li>
          <strong>Cine se uită la ecran și cât de des?</strong> Un facility manager care intră de
          câteva ori pe zi: BMS. Un operator de tură, permanent în fața sinopticului: SCADA.
        </li>
        <li>
          <strong>Care este întrebarea principală pusă sistemului?</strong> „Câtă energie s-a
          consumat și de ce?": BMS. „De ce s-a oprit utilajul la 03:14?": SCADA.
        </li>
        <li>
          <strong>Cine plătește și din ce buget?</strong> OPEX de clădire: BMS. Buget de producție
          sau de mentenanță industrială, justificat prin downtime evitat: SCADA.
        </li>
      </ol>

      <p>
        Când răspunsurile se împart aproximativ egal, nu există o dilemă de alegere, ci o facilitate
        mixtă, care are nevoie de amândouă și de o interfață între ele.
      </p>

      <p>
        Arborele nu acoperă bine două situații: centrele de date și clădirile cu producție proprie
        de energie. Acolo decizia se ia pe redundanță și pe contractul de disponibilitate, nu pe
        tipul de sistem.
      </p>

      <h2 id="arhitectura-mixta-bacnet-modbus-tcp-si-opc-ua-la-interfata">
        Arhitectura mixtă: BACnet, Modbus TCP și OPC UA la interfață
      </h2>

      <p>
        Într-o facilitate mixtă, cele două sisteme se leagă la nivel de date prin trei căi: BACnet
        pentru punctele de clădire, Modbus TCP pentru echipamentele cu registre simple și OPC UA
        pentru schimbul structurat între SCADA și supervizarea de clădire. Situațiile în care
        răspunsul corect este „amândouă" apar des:
      </p>

      <ul>
        <li>
          <strong>Hală de producție cu corp de birouri.</strong> Procesul, utilitățile tehnologice
          și aerul comprimat stau pe SCADA. Birourile, CTA-urile și contorizarea pe chiriaș stau pe
          BMS. Punctul comun: energia electrică și termică.
        </li>
        <li>
          <strong>Spital.</strong> Saloanele, iluminatul și ventilarea generală sunt BMS. Blocurile
          operatorii, presiunile diferențiale și gazele medicale cer tratament de tip proces, cu
          alarmare severă și redundanță.
        </li>
        <li>
          <strong>Fabrică pharma.</strong> BMS pentru zonele administrative, sistem dedicat de
          monitorizare a mediului pentru camerele curate, SCADA pentru proces. Cele trei nu se
          contopesc, pentru că cerințele de validare diferă.
        </li>
        <li>
          <strong>Hotel cu piscină și cogenerare.</strong> Camerele, CTA-urile și zonele publice
          sunt BMS clasic. Tratarea apei de piscină și cogenerarea sunt instalații de proces, cu
          furnizorul lor.
        </li>
      </ul>

      <p>
        Legătura se face la nivel de date, nu prin înlocuirea unui sistem cu celălalt. Trei căi
        acoperă aproape tot: <strong>BACnet</strong> pentru punctele de clădire,{" "}
        <strong>Modbus TCP</strong> pentru echipamente cu registre simple și{" "}
        <a href="https://opcfoundation.org/" target="_blank" rel="noopener">
          <strong>OPC UA</strong>
        </a>{" "}
        pentru schimbul structurat între SCADA și supervizarea de clădire. Criteriile de alegere
        sunt tratate în{" "}
        <a href="/resurse/bms-scada-integrare">materialele despre protocoale și integrare</a>, iar
        execuția este descrisă în pagina de{" "}
        <a href="/servicii/integrare-sisteme-knx-dali-modbus-mbus">integrare de sisteme</a>.
      </p>

      <p>
        Partea consumatoare de timp nu este montarea gateway-ului, ci maparea punctelor: denumiri,
        unități de măsură, sensuri de acțiune, ce se scrie și ce se citește doar. În integrările pe
        care Sovitech Control le-a executat în București, negocierea listei de puncte între doi
        furnizori a durat, de regulă, mai mult decât configurarea propriu-zisă a interfeței. Un
        gateway nu repară o documentație absentă: fără listă de puncte se face întâi releveul.
      </p>

      <p>
        Un singur sistem forțat pentru tot costă în ambele sensuri. Un SCADA pe tag-uri devine scump
        la câteva mii de puncte de confort, iar un BMS împins în secvențe de proces se plătește în
        ore de programare nestandard, pe care nimeni nu le mai întreține peste cinci ani.
      </p>

      <ArticleDiagram
        src="/diagrame/A03-1-arhitectura-bms-scada.jpg"
        caption="Arhitectură combinată BMS și SCADA într-o facilitate mixtă, pe patru niveluri, cu granița IT/OT marcată."
      />

      <h2 id="granita-it-ot-segmentare-iec-62443-si-oug-155-2024">
        Granița IT/OT: segmentare, IEC 62443 și OUG 155/2024
      </h2>

      <p>
        Granița IT/OT se trasează la nivelul rețelei, nu al furnizorului. Sistemul BMS și sistemul
        SCADA sunt amândouă sisteme OT (tehnologie operațională), dar profilul de risc diferă. Un
        sistem BMS stă pe rețeaua de clădire, are stații de operare pe Windows, are frecvent acces
        de la distanță pentru furnizorul de mentenanță și trăiește 10-15 ani cu actualizări rare. Un
        SCADA industrial este mai bine izolat, însă consecința unei intruziuni este mai gravă.
      </p>

      <p>Trei măsuri acoperă cea mai mare parte a riscului real, în ambele lumi:</p>

      <ul>
        <li>
          <strong>Segmentarea.</strong> Rețele separate pentru IT, BMS și SCADA, nu un singur VLAN
          „tehnic". Modelul de zone și conduite din{" "}
          <a href="https://www.iec.ch/blog/understanding-iec-62443" target="_blank" rel="noopener">
            seria IEC 62443
          </a>{" "}
          este referința uzuală pentru partea industrială.
        </li>
        <li>
          <strong>Accesul la distanță controlat.</strong> Un singur punct de intrare, cu
          autentificare cu mai mulți factori, conturi nominale și jurnalizare, nu un client de acces
          lăsat pornit pe stația de operare.
        </li>
        <li>
          <strong>Inventarul.</strong> Ce dispozitive există, cu ce firmware și cine le poate
          atinge. În clădirile cu mai mulți furnizori, inventarul lipsește aproape întotdeauna.
        </li>
      </ul>

      <p>
        Pe partea de reglementare, NIS2 a fost transpusă în România prin{" "}
        <a
          href="https://legislatie.just.ro/public/DetaliiDocument/293121"
          target="_blank"
          rel="noopener"
        >
          OUG nr. 155/2024
        </a>
        , cu DNSC ca autoritate. Un aspect merită spus corect: actul normativ nu conține un articol
        dedicat sistemelor OT, SCADA sau BMS. Obligațiile sunt formulate neutru tehnologic și
        privesc rețelele și sistemele informatice folosite pentru furnizarea serviciului.{" "}
        <strong>Interpretarea rezonabilă</strong>, prezentată aici ca interpretare și nu ca text
        citabil de lege, este că un SCADA care ține în funcțiune un serviciu esențial sau un BMS de
        care depinde furnizarea serviciului intră în acest perimetru. Operatorii aflați în această
        situație clarifică întrebarea cu juristul și cu echipa responsabilă de IT/OT, pe baza
        textului oficial.
      </p>

      <h2 id="trei-greseli-frecvente-scada-in-birouri-proces-critic-pe-bms">
        Trei greșeli frecvente: SCADA în birouri, proces critic pe BMS
      </h2>

      <ul>
        <li>
          <strong>SCADA cumpărat pentru o clădire de birouri.</strong> Apare când specificația este
          scrisă de cineva cu formație industrială. Rezultatul: licențiere pe tag-uri care explodează
          la câteva mii de puncte de confort, sinoptice construite de la zero pentru lucruri pe care
          orice DDC le are în bibliotecă.
        </li>
        <li>
          <strong>Proces critic controlat dintr-un BMS.</strong> Apare când o instalație tehnologică
          este adăugată târziu și „mai încape" pe controlerul existent. Problemele ies la
          interblocări, la timpii de scanare și după o repornire a serverului. Un proces care nu are
          voie să se oprească are nevoie de logică deterministă, în PLC.
        </li>
        <li>
          <strong>Două sisteme fără interfață comună.</strong> Cea mai costisitoare pe termen lung,
          pentru că este invizibilă. Două istorice, două seturi de contoare, iar raportul lunar se
          face manual în Excel. La <a href="/ghid/date-esg-cladiri">raportarea de date ESG</a>,
          lipsa interfeței devine o problemă de auditabilitate.
        </li>
      </ul>

      <h2 id="ce-decid-directorul-tehnic-managerul-pharma-si-responsabilul-it-ot">
        Ce decid directorul tehnic, managerul pharma și responsabilul IT/OT
      </h2>

      <h3 id="directorul-tehnic-impartirea-pe-zone-de-criticitate-inainte-de-ofertare">
        Directorul tehnic: împărțirea pe zone de criticitate, înainte de ofertare
      </h3>

      <p>
        Decizia se ia la nivel de arhitectură, înainte de cererea de oferte. Facilitatea se împarte
        pe zone de criticitate, iar caietul de sarcini spune explicit cine deține fiecare punct de
        date și prin ce protocol se schimbă informația la graniță. Modelul de caiet de sarcini
        Sovitech are un capitol dedicat interfeței cu sistemele terțe:{" "}
        <a href="/contact">cere modelul de caiet de sarcini BMS</a>. Contextul de rol stă pe pagina
        pentru directorul tehnic.
      </p>

      <h3 id="managerul-pharma-ce-zone-intra-in-validare-si-audit-trail">
        Managerul pharma: ce zone intră în validare și audit trail
      </h3>

      <p>
        Întrebarea de pus nu este „SCADA sau BMS", ci ce anume trebuie validat. Zonele cu cerințe de
        audit trail se separă de la început de cele fără, altfel validarea se extinde peste tot și
        scumpește fiecare modificare de secvență. Abordarea pe segmente este descrisă pentru{" "}
        <a href="/expertiza/pharma">facilități pharma</a> și pentru{" "}
        <a href="/expertiza/industrial">proiecte industriale</a>.
      </p>

      <h3 id="responsabilul-it-ot-schema-de-retea-inaintea-listei-de-echipamente">
        Responsabilul IT/OT: schema de rețea înaintea listei de echipamente
      </h3>

      <p>
        Schema de rețea se cere înaintea listei de echipamente. Contează unde stă granița IT/OT,
        cine are acces la distanță și ce se jurnalizează. Un BMS bine făcut și un SCADA bine făcut
        arată identic din această perspectivă: segmentate, inventariate, cu un singur punct de
        acces.
      </p>

      <ArticleFaqBox items={faq} />

      <h2 id="concluzie">Concluzie</h2>

      <p>
        Alegerea între SCADA și BMS nu este o competiție între tehnologii, ci o decizie de
        arhitectură luată o singură dată, pe criteriul consecinței unei opriri. Facilitățile mixte
        au nevoie de amândouă, iar banii se pierd în interfața dintre ele, nu în sisteme. Un proiect
        care nu spune cine deține fiecare punct de date plătește diferența mai târziu, în ore de
        integrare.
      </p>

      <h2 id="discuta-arhitectura-cu-un-inginer-sovitech">
        Discută arhitectura cu un inginer Sovitech
      </h2>

      <p>
        Sovitech proiectează și execută ambele părți:{" "}
        <a href="/servicii/proiectare-automatizari-bms">proiectare de automatizări și BMS</a> și
        integrare cu sisteme de proces existente, de la birouri și hoteluri până la fabrici pharma,
        în <a href="/referinte">lista de referințe</a>. Pe baza schemei instalațiilor, un inginer
        răspunde cu o propunere de împărțire pe zone, cu punctele schimbate între sisteme și cu
        protocolul recomandat.
      </p>

      <p className="article-note">
        Articol publicat 16.08.2026. Actualizat 19.08.2026. Informațiile juridice au fost verificate
        la 16.08.2026. Referința la OUG nr. 155/2024 este redată ca atare; interpretarea privind
        aplicabilitatea la sistemele SCADA și BMS este opinia autorului, nu text de lege. Sursele
        primare citate sunt paginile oficiale ale organizațiilor emitente: bacnet.org,
        opcfoundation.org, iec.ch și portalul legislativ. Autor: Echipa de inginerie Sovitech
        Control. {/* TODO(author): replace with the signing engineer */}
      </p>
    </ArticleProse>
  )
}
