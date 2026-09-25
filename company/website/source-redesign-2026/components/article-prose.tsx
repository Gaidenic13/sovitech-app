import type { ReactNode } from "react"
import type { ArticleFaq } from "@/components/articles/index"

// Typographic container for ported article bodies. Articles are written as
// clean semantic HTML with no utility classes; every visual decision lives in
// the .article-prose block in globals.css, so ten articles ported by different
// hands render identically. Section spacing and the column come from
// ArticleLayout, which wraps this on the article routes.
export function ArticleProse({ children }: { children: ReactNode }) {
  return <div className="article-prose">{children}</div>
}

// Figure + caption for the article diagrams in /public/diagrame.
export function ArticleDiagram({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="article-diagram">
      <img src={src} alt={caption} loading="lazy" />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

// Compact boxed FAQ, rendered from the article's exported faq list so the
// visible questions can never drift from the FAQPage JSON-LD.
export function ArticleFaqBox({ items }: { items: ArticleFaq[] }) {
  if (items.length === 0) return null
  return (
    <section id="intrebari-frecvente" className="faq-box">
      <p className="faq-box-label">Întrebări frecvente</p>
      <dl>
        {items.map((f) => (
          <div key={f.q} className="faq-box-item">
            <dt>{f.q}</dt>
            <dd>{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
