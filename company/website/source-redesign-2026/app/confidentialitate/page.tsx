import type { Metadata } from "next"
import Link from "next/link"
import { HeroField } from "@/components/hero-field"

// Legal copy from doc C2 (copy_01_core.md), section 4.
// [DE COMPLETAT] marks data the copy doc itself does not provide (dates,
// dedicated addresses, supplier lists). Do not invent values for them.
// Items the doc flags as [DE VERIFICAT JURIDIC] are kept as TODO comments
// below, next to the section they concern; they are not rendered.

export const metadata: Metadata = {
  title: "Politica de confidentialitate | Sovitech Control",
  description:
    "Ce date personale colecteaza Sovitech Control prin formularele site-ului, in ce scop, pe ce temei legal, cat timp le pastreaza si cum se exercita drepturile.",
  alternates: { canonical: "/confidentialitate" },
}

const scopeRows = [
  {
    scop: "Răspuns la o cerere trimisă prin formular, email sau telefon",
    date: "date de identificare și de contact, conținutul cererii",
    temei: "art. 6 alin. (1) lit. b) din Regulament, demersuri la cererea persoanei înainte de încheierea unui contract",
    durata: "24 de luni de la ultima interacțiune, apoi ștergere",
  },
  {
    scop: "Pregătirea și transmiterea unei oferte",
    date: "date de contact, date tehnice despre clădire",
    temei: "art. 6 alin. (1) lit. b)",
    durata: "24 de luni de la transmiterea ofertei, dacă nu se încheie contract",
  },
  {
    scop: "Executarea unui contract de proiectare, execuție, integrare sau întreținere",
    date: "date de contact ale persoanelor implicate în proiect",
    temei: "art. 6 alin. (1) lit. b)",
    durata: "pe durata contractului, plus termenul general de prescripție de 3 ani de la încetare",
  },
  {
    scop: "Facturare, evidență contabilă, arhivare",
    date: "date de facturare",
    temei: "art. 6 alin. (1) lit. c), obligație legală, Legea contabilității nr. 82/1991 și Codul fiscal",
    durata: "10 ani de la încheierea exercițiului financiar",
  },
  {
    scop: "Trimiterea materialului solicitat (ghid, raport)",
    date: "nume, email, companie, funcție",
    temei: "art. 6 alin. (1) lit. a), consimțământ",
    durata: "până la retragerea consimțământului, cel mult 24 de luni de la ultima interacțiune",
  },
  {
    scop: "Comunicări periodice despre reglementări, costuri și modernizare de sisteme BMS",
    date: "email, nume, companie",
    temei: "art. 6 alin. (1) lit. a), consimțământ, cu opt-in separat",
    durata: "până la dezabonare",
  },
  {
    scop: "Securitatea site-ului, prevenirea abuzurilor și a mesajelor automate",
    date: "adresă IP, date de jurnal",
    temei: "art. 6 alin. (1) lit. f), interes legitim în funcționarea în siguranță a site-ului",
    durata: "maximum 12 luni [DE COMPLETAT: durata reală de retenție a jurnalelor la furnizorul de găzduire]",
  },
  {
    scop: "Măsurarea traficului și îmbunătățirea conținutului",
    date: "date de utilizare agregate",
    temei: "art. 6 alin. (1) lit. f) pentru măsurare agregată fără cookie-uri, sau lit. a) dacă se folosesc cookie-uri de analiză",
    durata: "vezi Politica de cookies",
  },
  {
    scop: "Constatarea, exercitarea sau apărarea unui drept în justiție",
    date: "orice date relevante pentru cauza respectivă",
    temei: "art. 6 alin. (1) lit. f)",
    durata: "până la soluționarea definitivă, plus termenele legale de arhivare",
  },
]

export default function ConfidentialitatePage() {
  return (
    <>
      <section className="bg-[#07201C] py-20 md:py-24 relative overflow-hidden">
        <HeroField />
        <div className="container-site relative z-10">
          <span className="text-[#C8E6C9] text-xs font-semibold tracking-widest uppercase mb-4 block">• Legal</span>
          <h1 className="text-4xl md:text-5xl font-light text-white leading-tight tracking-tighter max-w-3xl">
            Politica de confidențialitate a Sovitech Control
          </h1>
          <p className="text-lg text-white/60 font-light mt-4 max-w-2xl">
            Sovitech Control SRL prelucrează date personale colectate prin formularele site-ului, prin email și telefon,
            pentru a răspunde cererilor, a pregăti oferte și a executa contracte. Datele nu se vând și nu se transmit
            terților în scop de marketing. Politica explică ce date se colectează, pe ce temei, cât timp se păstrează și
            cum se exercită drepturile din Regulamentul (UE) 2016/679.
          </p>
        </div>
      </section>

      <section className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <div className="article-prose">
            <p>
              <strong>Ultima actualizare:</strong> [DE COMPLETAT: data publicării]
            </p>

            <h2>Operatorul de date este SOVITECH CONTROL SRL, CUI 38500895</h2>
            <p>Operatorul care decide scopurile și mijloacele prelucrării este:</p>
            <p>
              <strong>SOVITECH CONTROL SRL</strong>
              <br />
              Sediu: Str. Dr. Niculae D. Staicovici nr. 35, Sector 5, București, România
              <br />
              CUI 38500895, Reg. Com. J40/19288/2017
              <br />
              Email pentru chestiuni de protecția datelor: [DE COMPLETAT: adresă dedicată, de exemplu date@sovitech.ro
              sau office@sovitech.ro]
            </p>
            {/* TODO(legal): [DE VERIFICAT JURIDIC] whether the company must appoint a DPO (art. 37 GDPR). Likely not
                for a small integrator, but must be confirmed, especially if delivered BMS systems include access
                control or CCTV in clients' buildings. */}

            <h2>Ce date se colectează, pe fiecare formular al site-ului</h2>
            <p>Site-ul colectează date în cinci situații distincte. În afara acestora, navigarea nu cere date personale.</p>
            <p>
              <strong>1. Formularul de contact.</strong> Nume și prenume, companie, adresă de email, telefon (opțional),
              rolul în proiect (opțional), subiectul cererii, tipul și suprafața clădirii (opțional), localitatea
              clădirii (opțional) și textul cererii. Textul cererii este scris liber, deci poate conține orice
              informație adaugă expeditorul, inclusiv date despre clădire și despre alte persoane de contact.
            </p>
            <p>
              <strong>2. Cererea de ofertă.</strong> Aceleași date de identificare, plus informații tehnice despre
              clădire: tip, suprafață, sisteme de încălzire, ventilație și climatizare existente, sistem de automatizare
              existent, termen estimat și buget orientativ, dacă se completează.
            </p>
            <p>
              <strong>3. Descărcarea materialelor (ghid, raport, documentație).</strong> Nume, adresă de email
              profesională, companie, funcție, telefon opțional, plus acordul separat pentru primirea materialului și,
              dacă este bifat, pentru abonarea la actualizări.
            </p>
            <p>
              <strong>4. Calculatorul de estimare (ROI).</strong> Datele introduse despre clădire: tip, suprafață,
              consum estimat, sisteme existente. Dacă rezultatul se afișează fără email, datele pot rămâne exclusiv în
              browser și nu se stochează. Dacă rezultatul se trimite pe email, se colectează și adresa de email, iar
              acest lucru se spune explicit înainte de completarea pașilor.
            </p>
            {/* TODO(legal): [DE VERIFICAT JURIDIC si tehnic] confirm how the ROI calculator actually handles data
                (browser-only vs. server/email) and align the paragraph above with the implementation. */}
            <p>
              <strong>5. Abonarea la actualizări.</strong> Adresa de email și, opțional, numele și compania.
            </p>
            <p>
              <strong>În plus, automat, la orice vizită:</strong> adresa IP, tipul și versiunea browserului, sistemul de
              operare, pagina de proveniență, paginile vizitate și momentul vizitei. Aceste date ajung în jurnalele
              furnizorului de găzduire și în instrumentul de analiză a traficului.
            </p>
            <p>
              <strong>Ce nu se colectează:</strong> date privind sănătatea, originea etnică, opiniile politice,
              apartenența sindicală, datele biometrice și celelalte categorii speciale prevăzute la art. 9 din
              Regulament. Site-ul nu cere codul numeric personal și nici date de card. Nu se prelucrează date ale
              persoanelor sub 16 ani; site-ul se adresează exclusiv comunicării profesionale între firme.
            </p>

            <h2>Scopurile prelucrării și temeiul legal, pe fiecare flux</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Scop</th>
                    <th>Date folosite</th>
                    <th>Temei legal</th>
                    <th>Durata de păstrare</th>
                  </tr>
                </thead>
                <tbody>
                  {scopeRows.map((row) => (
                    <tr key={row.scop}>
                      <td>{row.scop}</td>
                      <td>{row.date}</td>
                      <td>{row.temei}</td>
                      <td>{row.durata}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* TODO(legal): [DE VERIFICAT JURIDIC] the legal basis for commercial communications to existing clients
                (art. 12 alin. (2), Legea 506/2004). If used, it must be stated explicitly as an alternative to consent. */}

            <h2>Cui se transmit datele</h2>
            <p>
              Datele nu se vând, nu se închiriază și nu se transmit către terți în scop de marketing. Ele ajung la un
              număr limitat de categorii de destinatari, fiecare pe baza unui contract de prelucrare conform art. 28 din
              Regulament.
            </p>
            <p>
              <strong>Furnizorul de găzduire a site-ului.</strong> Site-ul este găzduit pe infrastructura Vercel. Datele
              trimise prin formulare trec prin această infrastructură, iar jurnalele de server sunt stocate acolo. [DE
              COMPLETAT: regiunea de găzduire și mecanismul de transfer aplicabil pentru Statele Unite, clauze
              contractuale standard sau cadrul de adecvare UE-SUA]
            </p>
            <p>
              <strong>Furnizorul de servicii de email.</strong> Mesajele transmise prin formular ajung în căsuța de email
              a firmei. [DE COMPLETAT: furnizorul folosit, de exemplu Google Workspace sau Microsoft 365]
            </p>
            <p>
              <strong>Platforma de trimitere a comunicărilor periodice</strong>, dacă se folosește una. [DE COMPLETAT:
              denumirea platformei]
            </p>
            <p>
              <strong>Sistemul de evidență a clienților (CRM)</strong>, dacă se folosește unul. [DE COMPLETAT]
            </p>
            <p>
              <strong>Instrumentul de analiză a traficului.</strong> Site-ul folosește astăzi Vercel Analytics. [DE
              COMPLETAT: confirmarea tehnică dacă instrumentul funcționează fără cookie-uri și fără identificatori
              persistenți; în funcție de răspuns, temeiul este interesul legitim sau consimțământul]
            </p>
            <p>
              <strong>Contabilitatea și auditul.</strong> Firma de contabilitate primește datele de facturare, în măsura
              necesară obligațiilor legale.
            </p>
            <p>
              <strong>Autorități publice</strong>, la cerere, în limitele legii: administrația fiscală, instanțe, organe
              de control.
            </p>
            <p>
              <strong>SAUTER și alți furnizori de echipamente</strong>, exclusiv atunci când este necesar pentru garanție
              sau pentru suport tehnic pe un echipament instalat, și numai cu datele de contact ale persoanei tehnice
              responsabile din partea clientului.
            </p>
            {/* TODO(legal): [DE VERIFICAT JURIDIC] whether the transfer to SAUTER actually happens and under what
                conditions. */}

            <h2>Transferuri în afara Spațiului Economic European</h2>
            <p>
              Furnizorii de găzduire și de email pot stoca sau prelucra date pe servere aflate în afara Spațiului
              Economic European, în special în Statele Unite. Aceste transferuri se fac numai pe baza unui mecanism
              prevăzut de capitolul V din Regulament: o decizie de adecvare a Comisiei Europene sau clauze contractuale
              standard, însoțite de măsuri tehnice suplimentare.
            </p>
            <p>
              [DE COMPLETAT: lista exactă a furnizorilor cu prelucrare în afara SEE și mecanismul aplicabil pentru
              fiecare]
            </p>
            <p>O copie a garanțiilor aplicate poate fi solicitată la adresa de email a operatorului.</p>

            <h2>Cât timp se păstrează datele</h2>
            <p>
              Regula generală: datele se păstrează atât timp cât există scopul pentru care au fost colectate, plus
              termenele impuse de lege.
            </p>
            <ul>
              <li>
                <strong>Cereri fără contract:</strong> 24 de luni de la ultima interacțiune. Un ciclu de decizie pentru
                un sistem BMS durează frecvent peste un an, iar o cerere reluată la 18 luni este o situație obișnuită, nu
                una excepțională. După 24 de luni fără nicio interacțiune, datele se șterg.
              </li>
              <li>
                <strong>Contracte și documentația aferentă:</strong> pe durata contractului, plus 3 ani, termenul general
                de prescripție.
              </li>
              <li>
                <strong>Documente contabile și facturi:</strong> 10 ani, conform legislației contabile.
              </li>
              <li>
                <strong>Documentația tehnică As-built și listele de puncte:</strong> pe durata de viață a sistemului,
                pentru că este necesară intervențiilor ulterioare. Aceste documente conțin de regulă date despre clădire,
                nu date personale, cu excepția numelui persoanei de contact tehnic.
              </li>
              <li>
                <strong>Consimțământ pentru comunicări periodice:</strong> până la dezabonare, plus evidența dezabonării,
                păstrată pentru a dovedi respectarea cererii.
              </li>
              <li>
                <strong>Jurnale de server:</strong> [DE COMPLETAT: durata la furnizorul de găzduire, uzual între 30 de
                zile și 12 luni]
              </li>
            </ul>

            <h2>Drepturile persoanei vizate și cum se exercită</h2>
            <p>Regulamentul (UE) 2016/679 acordă următoarele drepturi.</p>
            <p>
              <strong>Dreptul de acces</strong>, art. 15: confirmarea dacă se prelucrează date despre persoana respectivă
              și o copie a acestora.
            </p>
            <p>
              <strong>Dreptul la rectificare</strong>, art. 16: corectarea datelor inexacte și completarea celor
              incomplete.
            </p>
            <p>
              <strong>Dreptul la ștergere</strong>, art. 17: ștergerea datelor când nu mai sunt necesare, când
              consimțământul a fost retras sau când prelucrarea a fost ilegală. Dreptul nu se aplică datelor pe care
              legea obligă firma să le păstreze, cum sunt facturile.
            </p>
            <p>
              <strong>Dreptul la restricționarea prelucrării</strong>, art. 18, de exemplu pe durata verificării unei
              contestații privind exactitatea datelor.
            </p>
            <p>
              <strong>Dreptul la portabilitate</strong>, art. 20: primirea datelor furnizate, într-un format structurat
              și citibil automat, pentru prelucrările bazate pe consimțământ sau pe contract.
            </p>
            <p>
              <strong>Dreptul la opoziție</strong>, art. 21: opoziția față de prelucrările întemeiate pe interes legitim.
              Pentru marketing direct, opoziția este necondiționată și se respectă imediat.
            </p>
            <p>
              <strong>Dreptul de a retrage consimțământul</strong> în orice moment, fără a afecta legalitatea
              prelucrărilor anterioare retragerii. Pentru comunicările periodice, retragerea se face din linkul de
              dezabonare aflat în fiecare mesaj.
            </p>
            <p>
              <strong>Dreptul de a nu face obiectul unei decizii automate</strong>, art. 22. Sovitech Control nu ia
              decizii automate cu efecte juridice asupra persoanelor și nu creează profiluri. Calculatorul de estimare de
              pe site produce un ordin de mărime pentru o clădire, nu o evaluare a unei persoane.
            </p>
            <p>
              <strong>Cum se exercită.</strong> Prin email la [DE COMPLETAT: adresa dedicată] sau prin scrisoare la
              sediul din Str. Dr. Niculae D. Staicovici nr. 35, Sector 5, București. Răspunsul se transmite în cel mult o
              lună de la primirea cererii, termen care poate fi prelungit cu două luni pentru cereri complexe, cu
              informarea solicitantului. Pentru a preveni divulgarea datelor către o persoană neîndreptățită, firma poate
              cere informații suplimentare de identificare.
            </p>
            <p>
              <strong>Dreptul de a depune plângere.</strong> Autoritatea Națională de Supraveghere a Prelucrării Datelor
              cu Caracter Personal, B-dul G-ral. Gheorghe Magheru nr. 28-30, Sector 1, București, cod poștal 010336,
              anspdcp@dataprotection.ro,{" "}
              <a href="https://www.dataprotection.ro" target="_blank" rel="noopener">
                www.dataprotection.ro
              </a>
              . Persoana vizată se poate adresa și instanțelor de judecată.
            </p>

            <h2>Securitatea datelor</h2>
            <p>
              Datele transmise prin site circulă criptat, prin HTTPS. Accesul la mesajele primite prin formulare este
              limitat la persoanele din firmă care au nevoie de ele pentru a răspunde. Furnizorii de găzduire, email și,
              dacă există, CRM aplică propriile măsuri tehnice și organizatorice, prevăzute în contractele de prelucrare.
            </p>
            {/* TODO(legal): [DE VERIFICAT JURIDIC si tehnic] whether a written 72-hour breach notification procedure
                (art. 33) exists; it must be created before this policy is published. */}

            <h2>Modificări ale politicii</h2>
            <p>
              Politica se actualizează atunci când se schimbă fluxurile de colectare a datelor, furnizorii sau
              obligațiile legale. Versiunea în vigoare este cea publicată pe această pagină, cu data ultimei actualizări
              afișată la început. Modificările substanțiale se anunță prin email persoanelor abonate la comunicările
              periodice.
            </p>

            <hr />
            <p>
              <Link href="/cookies">Politica de cookies</Link> · <Link href="/termeni">Termeni și condiții</Link> ·{" "}
              <Link href="/contact">Contact și date de identificare</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
