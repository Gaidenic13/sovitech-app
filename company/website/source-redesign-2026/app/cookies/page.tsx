import type { Metadata } from "next"
import Link from "next/link"
import { HeroField } from "@/components/hero-field"

// Legal copy from doc C2 (copy_01_core.md), section 6.
// [DE COMPLETAT] marks data the copy doc itself does not provide (the exact
// cookie list must be extracted from the site after final implementation).
// NOTE: the doc's "Preferinte cookie-uri" link opens a preference panel; no
// consent banner or panel exists in the codebase yet, so the text keeps the
// wording but no dead link is rendered.

export const metadata: Metadata = {
  title: "Politica de cookies si preferinte | Sovitech Control",
  description:
    "Ce cookie-uri foloseste site-ul Sovitech Control, in ce scop, cat timp se pastreaza si cum se schimba preferintele. Fara cookie-uri de publicitate.",
  alternates: { canonical: "/cookies" },
}

const cookieRows = [
  {
    categorie: "Strict necesare",
    scop: "funcționarea site-ului, securitate, echilibrarea încărcării, memorarea alegerii din bannerul de cookie-uri",
    exemple: "cookie de sesiune al platformei de găzduire, cookie care reține preferințele de consimțământ",
    durata: "sesiune, iar preferințele de consimțământ 6 luni",
    temei: "fără consimțământ, sunt indispensabile serviciului cerut",
  },
  {
    categorie: "Măsurarea traficului",
    scop: "numărul de vizitatori, paginile citite, sursa vizitei, în formă agregată",
    exemple:
      "Vercel Analytics [DE COMPLETAT: confirmarea tehnică dacă instrumentul scrie cookie-uri sau funcționează fără identificatori persistenți]",
    durata: "[DE COMPLETAT]",
    temei: "consimțământ",
  },
  {
    categorie: "Conținut încorporat",
    scop: "afișarea hărții de pe pagina de contact și, dacă apar, a materialelor video",
    exemple: "hartă OpenStreetMap sau Google Maps",
    durata: "stabilită de furnizorul serviciului",
    temei: "consimțământ",
  },
  {
    categorie: "Publicitate și urmărire pe alte site-uri",
    scop: "-",
    exemple: "site-ul nu folosește",
    durata: "-",
    temei: "-",
  },
]

const faqs = [
  {
    q: "Site-ul folosește cookie-uri de publicitate?",
    a: "Nu. Site-ul Sovitech Control nu folosește cookie-uri de publicitate, nu are pixeli de rețele sociale și nu transmite date către platforme de reclame. Singurele categorii suplimentare sunt măsurarea traficului și conținutul încorporat, cum este harta de pe pagina de contact, încărcată de la OpenStreetMap la afișarea paginii.",
  },
  {
    q: "Ce se întâmplă dacă resping cookie-urile?",
    a: "Site-ul funcționează complet. Site-ul nu condiționează nicio funcție de cookie-uri opționale: formularele și toate paginile rămân accesibile. Blocarea cookie-urilor din browser poate împiedica doar afișarea hărții de pe pagina de contact; adresa rămâne scrisă în pagină.",
  },
  {
    q: "Cum îmi schimb ulterior alegerea?",
    a: "Din linkul „Preferințe cookie-uri” aflat din setările browserului. Alegerea se poate modifica oricând, în ambele sensuri. Cookie-urile deja salvate pot fi șterse și din setările browserului, caz în care bannerul reapare la vizita următoare.",
  },
]

export default function CookiesPage() {
  return (
    <>
      <section className="bg-[#07201C] py-20 md:py-24 relative overflow-hidden">
        <HeroField />
        <div className="container-site relative z-10">
          <span className="text-[#C8E6C9] text-xs font-semibold tracking-widest uppercase mb-4 block">• Legal</span>
          <h1 className="text-4xl md:text-5xl font-light text-white leading-tight tracking-tighter max-w-3xl">
            Politica de cookies a site-ului Sovitech Control
          </h1>
          <p className="text-lg text-white/60 font-light mt-4 max-w-2xl">
            Site-ul Sovitech Control folosește cookie-uri strict necesare pentru funcționare și, cu acordul
            vizitatorului, cookie-uri de măsurare a traficului și de afișare a conținutului încorporat, cum este harta de
            pe pagina de contact. Site-ul nu folosește cookie-uri de publicitate și nu transmite date către rețele de
            reclame. Preferințele se pot schimba oricând din pagina de preferințe.
          </p>
        </div>
      </section>

      <section className="bg-[#F5F4F0] section-l">
        <div className="container-site">
          <div className="article-prose">
            <p>
              <strong>Ultima actualizare:</strong> [DE COMPLETAT: data publicării]
            </p>

            <h2>Cookie-uri: regulile din Legea 506/2004 și din GDPR</h2>
            <p>
              Un cookie este un fișier text mic, salvat de site în browserul vizitatorului, care permite recunoașterea
              sesiunii sau măsurarea utilizării. Aceleași reguli se aplică tehnologiilor echivalente: stocarea locală din
              browser, identificatorii din memoria sesiunii și pixelii de urmărire.
            </p>
            <p>
              Regulile vin din Legea nr. 506/2004 privind prelucrarea datelor cu caracter personal în sectorul
              comunicațiilor electronice și din Regulamentul (UE) 2016/679. Consecința practică:{" "}
              <strong>
                cookie-urile strict necesare funcționează fără acord, toate celelalte au nevoie de consimțământ
                prealabil, dat printr-o acțiune clară.
              </strong>{" "}
              Continuarea navigării nu este consimțământ.
            </p>

            <h2>Ce cookie-uri folosește acest site</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Categorie</th>
                    <th>Scop</th>
                    <th>Exemple</th>
                    <th>Durată</th>
                    <th>Temei</th>
                  </tr>
                </thead>
                <tbody>
                  {cookieRows.map((row) => (
                    <tr key={row.categorie}>
                      <td>{row.categorie}</td>
                      <td>{row.scop}</td>
                      <td>{row.exemple}</td>
                      <td>{row.durata}</td>
                      <td>{row.temei}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              [DE COMPLETAT: lista exactă de cookie-uri, cu nume, furnizor, scop și durată, extrasă din site după
              implementarea finală]
            </p>

            <h2>Cum se dau și cum se retrag preferințele</h2>
            <p>
              La prima vizită, bannerul de cookie-uri permite trei acțiuni: acceptarea tuturor categoriilor, respingerea
              celor neesențiale și alegerea pe categorii. Respingerea este disponibilă din primul ecran, la același nivel
              de vizibilitate cu acceptarea.
            </p>
            <p>
              Preferințele se pot schimba oricând din linkul „Preferințe cookie-uri” din subsolul fiecărei pagini.
              Retragerea consimțământului nu afectează prelucrările făcute anterior.
            </p>
            <p>
              Cookie-urile deja salvate se pot șterge și din setările browserului. Ștergerea din browser elimină și
              cookie-ul care reține preferințele, deci bannerul va reapărea la următoarea vizită.
            </p>

            <h2>Ce se întâmplă dacă cookie-urile neesențiale sunt respinse</h2>
            <p>Site-ul funcționează integral. Toate paginile, tabelele de cost, materialele și formularele rămân disponibile.</p>
            <p>
              Dacă browserul blochează conținutul încorporat, harta de pe pagina de contact poate să nu se încarce; în locul ei rămâne o
              imagine statică plus adresa scrisă și un link către aplicația de hărți, iar vizita nu este numărată în
              statisticile de trafic.
            </p>

            <h2>Întrebări frecvente</h2>
            {faqs.map((f) => (
              <div key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}

            <hr />
            <p>
              <Link href="/confidentialitate">Politica de confidențialitate</Link> ·{" "}
              <Link href="/termeni">Termeni și condiții</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
