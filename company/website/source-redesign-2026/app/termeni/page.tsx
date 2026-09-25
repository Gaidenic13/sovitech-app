import type { Metadata } from "next"
import Link from "next/link"
import { HeroField } from "@/components/hero-field"

// Legal copy from doc C2 (copy_01_core.md), section 5.
// [DE COMPLETAT] marks data the copy doc itself does not provide.
// Items the doc flags as [DE VERIFICAT JURIDIC] are kept as TODO comments,
// not rendered.

export const metadata: Metadata = {
  title: "Termeni si conditii de utilizare a site-ului | Sovitech Control",
  description:
    "Conditiile de utilizare a site-ului Sovitech Control: statutul informatiilor publicate, al cifrelor de cost si al estimarilor, drepturi de autor, raspundere.",
  alternates: { canonical: "/termeni" },
}

export default function TermeniPage() {
  return (
    <>
      <section className="bg-[#07201C] py-20 md:py-24 relative overflow-hidden">
        <HeroField />
        <div className="container-site relative z-10">
          <span className="text-[#C8E6C9] text-xs font-semibold tracking-widest uppercase mb-4 block">• Legal</span>
          <h1 className="text-4xl md:text-5xl font-light text-white leading-tight tracking-tighter max-w-3xl">
            Termeni și condiții de utilizare a site-ului Sovitech Control
          </h1>
          <p className="text-lg text-white/60 font-light mt-4 max-w-2xl">
            Acești termeni reglementează utilizarea site-ului Sovitech Control. Informațiile publicate, inclusiv benzile
            de cost și rezultatele calculatorului de estimare, sunt informative și nu constituie o ofertă fermă. Relația
            contractuală dintre Sovitech Control și un client se naște exclusiv dintr-o ofertă semnată sau dintr-un
            contract, nu din conținutul acestui site.
          </p>
        </div>
      </section>

      <section className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <div className="article-prose">
            <p>
              <strong>Ultima actualizare:</strong> [DE COMPLETAT: data publicării]
            </p>

            <h2>Cine publică site-ul</h2>
            <p>
              Site-ul este publicat de <strong>SOVITECH CONTROL SRL</strong>, cu sediul în Str. Dr. Niculae D.
              Staicovici nr. 35, Sector 5, București, CUI 38500895, înregistrată la Registrul Comerțului cu numărul
              J40/19288/2017.
            </p>
            <p>
              Accesarea și utilizarea site-ului înseamnă acceptarea acestor termeni. Cine nu îi acceptă poate folosi
              datele de contact pentru a comunica direct cu firma.
            </p>

            <h2>Informațiile de pe site sunt informative, nu ofertă fermă</h2>
            <p>
              Conținutul site-ului are scop informativ și comercial general. Nimic din ce este publicat aici nu
              constituie o ofertă fermă în sensul art. 1188 din Codul civil și nu obligă Sovitech Control la un preț, un
              termen sau o soluție tehnică.
            </p>
            <p>
              <strong>Benzile de cost publicate</strong> (de exemplu 4-18 EUR/mp ca bandă agregată, 9-18 EUR/mp pentru
              birouri clasa A, 90-320 EUR pe punct de date) sunt repere de piață pentru bugetare preliminară. Costul real
              al unui sistem depinde de numărul de puncte, de echipamentele existente, de starea instalațiilor, de
              nivelul de integrare cerut și de condițiile de șantier.
            </p>
            <p>
              <strong>Cifrele de economie de energie</strong> provin din studii independente publicate, sunt citate cu
              domeniul lor (procent din consumul total al clădirii sau procent din consumul HVAC) și nu reprezintă o
              garanție de rezultat pentru o anumită clădire. Economia efectivă depinde de starea inițială a clădirii, de
              modul de operare și de măsurile implementate în paralel.
            </p>
            <p>
              <strong>Rezultatul calculatorului de estimare</strong> este o aproximare produsă pe baza datelor introduse
              de utilizator, cu ipoteze simplificatoare. Nu ține loc de audit energetic, de proiect tehnic sau de ofertă.
            </p>
            {/* TODO(legal): [DE VERIFICAT JURIDIC] whether a stricter liability disclaimer is needed for investment
                decisions based on the calculator result. */}
            <p>
              <strong>Informațiile despre reglementări</strong> (pragul de 290 kW din Legea 372/2005, pragul de 70 kW din
              Directiva (UE) 2024/1275 și celelalte termene menționate pe site) sunt prezentate cu sursa primară și cu
              data verificării. Ele nu constituie consultanță juridică. Aplicarea unei obligații legale unei clădiri
              anume se stabilește prin analiza situației concrete.
            </p>

            <h2>Cum se naște o relație contractuală</h2>
            <p>
              O ofertă a Sovitech Control se transmite în scris, este semnată și are un termen de valabilitate menționat
              în ea. [DE COMPLETAT: termenul standard de valabilitate al ofertelor, de exemplu 30 de zile]
            </p>
            <p>
              Trimiterea unui formular de pe site, descărcarea unui material sau abonarea la comunicările periodice nu
              creează nicio obligație contractuală pentru niciuna dintre părți.
            </p>
            <p>
              Condițiile de execuție, garanțiile, termenele, recepția lucrărilor și răspunderea contractuală se stabilesc
              prin contractul semnat între părți și prin anexele lui tehnice, nu prin acest site.
            </p>

            <h2>Conținutul site-ului aparține Sovitech Control</h2>
            <p>
              Textele, tabelele, schemele, fotografiile proprii, materialele descărcabile și structura site-ului sunt
              protejate de Legea nr. 8/1996 privind dreptul de autor și drepturile conexe. Drepturile aparțin SOVITECH
              CONTROL SRL, cu excepția materialelor identificate ca aparținând altor titulari.
            </p>
            <p>
              <strong>Ce este permis fără acord prealabil:</strong> consultarea site-ului, tipărirea sau salvarea unei
              copii pentru uz intern, citarea unor fragmente scurte cu indicarea sursei și cu link către pagina
              originală.
            </p>
            <p>
              <strong>Ce nu este permis:</strong> reproducerea integrală a paginilor sau a materialelor descărcabile pe
              alt site, folosirea conținutului în materiale comerciale proprii, revânzarea materialelor, precum și
              extragerea sistematică a conținutului prin mijloace automate în scopul construirii unei baze de date sau a
              unui serviciu concurent.
            </p>
            <p>
              <strong>Mărci comerciale.</strong> SAUTER și denumirile de produse SAUTER sunt mărci ale titularului lor.
              Sovitech Control le folosește în calitate de partener autorizat, pentru a identifica echipamentele
              integrate. Numele clădirilor și ale organizațiilor din secțiunea de referințe se folosesc pentru
              identificarea lucrărilor executate.
            </p>
            {/* TODO(legal): [DE VERIFICAT JURIDIC] whether each published reference has the client's consent to be
                named; where it does not, use a description without the name. */}

            <h2>Utilizarea site-ului și a formularelor</h2>
            <p>
              Formularele site-ului se folosesc pentru cereri reale. Nu este permisă transmiterea de date false sau ale
              altei persoane fără acordul ei, trimiterea de mesaje comerciale nesolicitate, încercarea de a obține acces
              neautorizat, testarea vulnerabilităților fără acord scris prealabil sau orice acțiune care afectează
              funcționarea site-ului.
            </p>
            <p>
              Sovitech Control poate bloca accesul de la adrese care încalcă aceste reguli și poate păstra datele de
              jurnal necesare pentru constatarea și apărarea drepturilor sale.
            </p>
            <p>
              Materialele descărcabile se pun la dispoziție pentru uz profesional propriu. Redistribuirea lor comercială
              nu este permisă.
            </p>

            <h2>Răspundere</h2>
            <p>
              Sovitech Control depune diligențe rezonabile pentru ca informațiile publicate să fie exacte și actualizate
              la data publicării, indicată pe fiecare material. Reglementările se modifică, iar prețurile de piață se
              schimbă.
            </p>
            <p>
              Firma nu răspunde pentru decizii de investiție, de proiectare sau de conformare luate exclusiv pe baza
              informațiilor de pe site, fără o analiză a situației concrete a clădirii.
            </p>
            <p>
              Site-ul poate conține linkuri către surse externe, în special texte de lege, standarde și studii publicate.
              Sovitech Control nu răspunde pentru conținutul acestora.
            </p>
            <p>Firma nu garantează funcționarea neîntreruptă a site-ului și poate suspenda accesul pentru mentenanță.</p>
            {/* TODO(legal): [DE VERIFICAT JURIDIC] liability limits must be phrased so they do not exclude liability
                for intent or gross negligence, which cannot be contractually excluded under the Civil Code. */}

            <h2>Legea aplicabilă și soluționarea litigiilor</h2>
            <p>
              Acestor termeni li se aplică legea română. Litigiile se soluționează pe cale amiabilă, iar dacă nu este
              posibil, de instanțele competente de la sediul Sovitech Control.
            </p>
            <p>Site-ul se adresează comunicării profesionale între firme.</p>
            {/* TODO(legal): [DE VERIFICAT JURIDIC] if consumers (OG 21/1992) are among the recipients of the services,
                a consumer-rights section (ANPC, EU ODR platform, withdrawal right) is required. */}

            <h2>Modificarea termenilor</h2>
            <p>
              Sovitech Control poate modifica acești termeni. Versiunea aplicabilă este cea publicată pe această pagină
              la momentul utilizării site-ului, cu data ultimei actualizări afișată la început.
            </p>

            <hr />
            <p>
              <Link href="/confidentialitate">Politica de confidențialitate</Link> ·{" "}
              <Link href="/cookies">Politica de cookies</Link> ·{" "}
              <Link href="/contact">Contact și date de identificare</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
