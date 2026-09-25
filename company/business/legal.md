# SOVITECH website legal pages: terms, privacy and cookies

What the SOVITECH website's three legal pages say, summarised with their sources, and what they mean for the SOVITECH App's own privacy work.

> **Unmerged branch. Reference only. Not SOVITECH's current position.** Everything in this file comes from the branch `origin/redesign-2026` of the website repository, commit `af813534041c387c07fc29a35c53bc9bd100c7fe` (`af81353`, 2026-08-27). The three pages were added in commit `d2d15d2` (2026-08-24, "Redesign complet: continut editorial, rute noi, identitate vizuala"). The branch has not been merged into `main`. Owner decision, 2026-09-24: the branch is not SOVITECH's current position and will not be merged. `main` is the current website, and it has none of these pages. The pages themselves are drafts: each shows "Ultima actualizare: [DE COMPLETAT: data publicării]", and code comments hold open legal questions marked "[DE VERIFICAT JURIDIC]" (section 5).

**Source:** repository `Gaidenic13/sovitech-website`, branch `redesign-2026`. Paths are relative to the website repository root on that branch. A verbatim copy of each file is in `company/website/source-redesign-2026/`, except `app/layout.tsx`, which the branch does not change and which is in `company/website/source/`. Imported on 2026-09-24.

| Page | URL on the branch | Source file |
|------|-------------------|-------------|
| Terms and conditions | `/termeni` | `app/termeni/page.tsx` |
| Privacy policy | `/confidentialitate` | `app/confidentialitate/page.tsx` |
| Cookie policy | `/cookies` | `app/cookies/page.tsx` |

**`main` has none of these pages.** On `main` (commit `e080614`), the footer's legal links all point to `/contact` (`company-profile.md` section 7.4). On the branch, `components/footer.tsx` links to all three pages from a "Legal" column and from the bottom bar, and `app/sitemap.ts` lists them.

**Status of the content.** This is SOVITECH's draft website legal text, not legal advice and not a reviewed policy. It is summarised here so the product owner can see what SOVITECH already says about personal data. It does not decide anything for the app.

---

## 1. Why this matters for the app

This file is relevant to the app's own privacy work. The website privacy policy is the only written SOVITECH text on personal data found in the website repository. The app will also collect personal data, so the product owner will need a privacy notice for the app. The website policy is a possible starting point, but it does not cover the app.

**What the website policy already settles, as drafted:**
- SOVITECH CONTROL SRL is the controller ("operatorul").
- Personal data is not sold or passed to third parties for marketing.
- Requests that lead to no contract are kept 24 months after the last interaction, then deleted.
- Contract data is kept for the contract term plus 3 years. Accounting records are kept 10 years.
- As-built documentation and points lists are kept for the life of the system. The policy says they usually hold building data, not personal data, except the technical contact's name.
- Processors act under art. 28 GDPR contracts. Transfers outside the EEA need a chapter V mechanism.
- SOVITECH makes no automated decisions with legal effects on people and does no profiling. The calculator estimates a building, not a person.

**What it does not cover, and the app will need** (observations for the product owner, not decisions):
- **Uploaded documents.** The policy lists five website flows (section 2.2). None of them is the app's main flow: an owner uploading drawings, schedules, energy bills and contracts for AI analysis. Such documents can hold personal data, for example names, signatures, staff lists or guest data.
- **AI processing.** The app sends documents to an LLM provider. That provider is a processor, and its inference may run outside the EEA. `docs/build-readiness.md` records that Anthropic's own API infers in the US or globally, and that zero data retention should be requested before any real document. The website policy names only hosting (Vercel), email, a newsletter platform, a CRM and analytics as processors.
- **Processor list.** Guardrails rule 13 says the approved processors (LLM provider, OCR, storage) are listed in `docs/guardrails.md` once chosen. The website policy has the same gap: its processor names are "[DE COMPLETAT]".
- **Erasure and the event log.** The app keeps immutable candidates and an append-only event log (rule 4). Rule 13 defines one audited erasure job as the only path that alters stored evidence. The website policy's right-to-erasure text (art. 17) does not address this design.
- **Retention for app projects.** The policy's 24-month rule applies to website requests. Whether the same period applies to app projects that never become a contract is a decision for SOVITECH.
- **Occupancy and guest data.** `design/dashboards-spec.md` already says the product owner should get GDPR input on occupancy and PMS data. The website policy does not mention either.
- **DPO.** The policy leaves open whether SOVITECH must appoint a DPO (section 5). The answer applies to the app too.
- **Breach procedure.** A code comment says a written 72-hour breach procedure (art. 33) "must be created before this policy is published". The app would need the same procedure.

These are for SOVITECH's legal review. Nothing here changes the guardrails.

---

## 2. Privacy policy (`/confidentialitate`)

Source: `app/confidentialitate/page.tsx`. Romanian only; the page has no English version. A code comment says the copy comes from "doc C2 (copy_01_core.md), section 4", which is not in the repository.

- **Title:** "Politica de confidențialitate a Sovitech Control".
- **Lead, in short:** SOVITECH processes personal data collected through the site's forms, email and phone, to answer requests, prepare offers and perform contracts. Data is not sold and not passed to third parties for marketing. The policy explains the data, the legal basis, the retention and the rights under Regulation (EU) 2016/679.
- **Last updated:** "[DE COMPLETAT: data publicării]".

### 2.1 Controller

- SOVITECH CONTROL SRL, Str. Dr. Niculae D. Staicovici nr. 35, Sector 5, București, România. CUI 38500895, Reg. Com. J40/19288/2017.
- Data-protection email: "[DE COMPLETAT: adresă dedicată, de exemplu date@sovitech.ro sau office@sovitech.ro]". No address is chosen.

### 2.2 Data collected, per flow

The policy says the site collects data in five situations, and that browsing needs no personal data otherwise.

| # | Flow | Data the policy lists |
|---|------|-----------------------|
| 1 | Contact form | Name, company, email, phone (optional), role in the project (optional), subject, building type and area (optional), building location (optional), free text. The policy notes that the free text can contain anything, including data about other contact persons. |
| 2 | Quote request | The same identification data, plus building data: type, area, existing heating, ventilation and air-conditioning, existing automation, estimated deadline and an indicative budget if given. |
| 3 | Material download (guide, report, documentation) | Name, work email, company, job title, optional phone, a separate consent to receive the material and, if ticked, a consent to updates. |
| 4 | ROI calculator | The building data entered: type, area, estimated consumption, existing systems. If the result is shown without an email, the data "can stay only in the browser" and is not stored. If the result is emailed, the email address is collected, and this is said before the steps. |
| 5 | Subscription to updates | Email and, optionally, name and company. |
| — | Every visit, automatically | IP address, browser type and version, operating system, referring page, pages visited and time of visit. These go to the hosting provider's logs and to the traffic analytics tool. |

**Not collected:** the special categories of art. 9 (health, ethnic origin, political opinions, union membership, biometrics and the rest), the personal numeric code (CNP) and card data. The site does not process data of people under 16 and addresses only business-to-business communication.

### 2.3 Purposes, legal bases and retention

The policy's table, summarised. Legal bases cite art. 6(1) GDPR.

| Purpose | Data | Legal basis | Retention |
|---------|------|-------------|-----------|
| Answering a request by form, email or phone | Identification and contact data, request content | (b) steps at the person's request before a contract | 24 months after the last interaction, then deletion |
| Preparing and sending an offer | Contact data, technical building data | (b) | 24 months after the offer, if no contract follows |
| Performing a design, execution, integration or maintenance contract | Contact data of people involved in the project | (b) | Contract term plus the general 3-year limitation period |
| Invoicing, accounting, archiving | Billing data | (c) legal obligation: Legea contabilității nr. 82/1991 and the Fiscal Code | 10 years from the end of the financial year |
| Sending a requested material | Name, email, company, job title | (a) consent | Until consent is withdrawn, at most 24 months after the last interaction |
| Periodic communications on regulation, costs and BMS modernisation | Email, name, company | (a) consent, separate opt-in | Until unsubscribe |
| Site security, abuse and bot prevention | IP address, log data | (f) legitimate interest | "maximum 12 luni [DE COMPLETAT: durata reală de retenție a jurnalelor la furnizorul de găzduire]" |
| Traffic measurement and content improvement | Aggregated usage data | (f) for aggregated cookieless measurement, or (a) if analytics cookies are used | "vezi Politica de cookies" |
| Establishing or defending a legal claim | Any data relevant to the case | (f) | Until final settlement, plus legal archiving periods |

### 2.4 Recipients and processors

- Data is not sold, rented or passed to third parties for marketing. Recipients act under art. 28 processing contracts.
- **Hosting:** Vercel. Form data passes through Vercel, and server logs are stored there. The hosting region and the US transfer mechanism are "[DE COMPLETAT]".
- **Email provider:** "[DE COMPLETAT: furnizorul folosit, de exemplu Google Workspace sau Microsoft 365]".
- **Newsletter platform,** if one is used: "[DE COMPLETAT: denumirea platformei]".
- **CRM,** if one is used: "[DE COMPLETAT]".
- **Traffic analytics:** "Site-ul folosește astăzi Vercel Analytics." Whether it works without cookies and persistent identifiers is "[DE COMPLETAT]". The legal basis depends on the answer.
- **Accountants and auditors:** billing data, as legally required.
- **Public authorities,** on request, within the law.
- **SAUTER and other equipment suppliers:** only when needed for warranty or technical support on installed equipment, and only the client's technical contact details. A code comment asks whether this transfer actually happens ("[DE VERIFICAT JURIDIC]").

### 2.5 Transfers outside the EEA

Hosting and email providers may store or process data outside the EEA, especially in the United States. Transfers use only a chapter V mechanism: an adequacy decision or standard contractual clauses with supplementary measures. The exact list of providers and mechanisms is "[DE COMPLETAT]". A copy of the safeguards can be requested from the controller's email.

### 2.6 Retention, in list form

- Requests without a contract: 24 months after the last interaction. The policy explains that a BMS decision cycle often takes over a year and that a request resumed after 18 months is normal. After 24 months with no interaction, the data is deleted.
- Contracts and their documents: contract term plus 3 years.
- Accounting documents and invoices: 10 years.
- As-built documentation and points lists: the life of the system, because later interventions need them.
- Consent to periodic communications: until unsubscribe, plus a record of the unsubscribe.
- Server logs: "[DE COMPLETAT: durata la furnizorul de găzduire, uzual între 30 de zile și 12 luni]".

### 2.7 Rights and how to use them

- Access (art. 15), rectification (art. 16), erasure (art. 17, not for data the law requires the company to keep, such as invoices), restriction (art. 18), portability (art. 20, for processing based on consent or contract), objection (art. 21, unconditional for direct marketing), withdrawal of consent (unsubscribe link in each message), and no automated decisions (art. 22).
- **How:** by email to "[DE COMPLETAT: adresa dedicată]" or by letter to the registered office. Answer within one month, extendable by two months for complex requests, with notice. The company may ask for extra identification.
- **Complaint:** to ANSPDCP (Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal), B-dul G-ral. Gheorghe Magheru nr. 28-30, Sector 1, București, 010336, anspdcp@dataprotection.ro, www.dataprotection.ro, or to the courts.

### 2.8 Security and changes

- Data travels over HTTPS. Access to form messages is limited to the people who need them. Hosting, email and any CRM apply their own measures under the processing contracts.
- The policy is updated when data flows, providers or legal obligations change. Substantial changes are announced by email to subscribers.

---

## 3. Cookie policy (`/cookies`)

Source: `app/cookies/page.tsx`. Romanian only. A code comment says the copy comes from "doc C2 (copy_01_core.md), section 6".

- **Title:** "Politica de cookies a site-ului Sovitech Control".
- **Lead, in short:** the site uses strictly necessary cookies and, with the visitor's consent, traffic-measurement cookies and cookies for embedded content such as the contact-page map. No advertising cookies and no data to ad networks. Preferences can be changed at any time.
- **Last updated:** "[DE COMPLETAT: data publicării]".
- **Rules:** Legea nr. 506/2004 and Regulation (EU) 2016/679. The same rules cover local storage, session identifiers and tracking pixels. Strictly necessary cookies need no consent; all others need prior consent by a clear action. "Continuarea navigării nu este consimțământ."

### 3.1 Cookie table

| Category | Purpose | Examples | Duration | Basis |
|----------|---------|----------|----------|-------|
| Strict necesare | Site operation, security, load balancing, remembering the banner choice | Hosting session cookie, consent-preference cookie | Session; consent preferences 6 months | No consent needed |
| Măsurarea traficului | Visitors, pages read, visit source, aggregated | "Vercel Analytics [DE COMPLETAT: ...]" | "[DE COMPLETAT]" | Consent |
| Conținut încorporat | The contact-page map and any videos | "hartă OpenStreetMap sau Google Maps" | Set by the provider | Consent |
| Publicitate și urmărire pe alte site-uri | — | "site-ul nu folosește" | — | — |

The exact cookie list is "[DE COMPLETAT: ... extrasă din site după implementarea finală]".

### 3.2 Consent, withdrawal, refusal

- **Banner:** at the first visit, a banner offers accept all, reject non-essential, and choose by category. Reject is on the first screen, as visible as accept.
- **Changing preferences:** from a "Preferințe cookie-uri" link in every page footer. Withdrawal does not affect earlier processing. Deleting cookies in the browser also deletes the preference cookie, so the banner returns.
- **If non-essential cookies are refused:** the site works fully. If the browser blocks embedded content, the map may not load; a static image, the written address and a map link remain, and the visit is not counted.
- **FAQ:** no advertising cookies, no social pixels, no data to ad platforms. Refusing changes nothing except, possibly, the map. The third answer says preferences are changed "Din linkul „Preferințe cookie-uri” aflat din setările browserului", which reads as a drafting slip (the body text puts the link in the footer).

---

## 4. Terms and conditions (`/termeni`)

Source: `app/termeni/page.tsx`. Romanian only. A code comment says the copy comes from "doc C2 (copy_01_core.md), section 5".

- **Title:** "Termeni și condiții de utilizare a site-ului Sovitech Control".
- **Lead, in short:** the terms govern use of the site. Published information, including cost bands and calculator results, is informative and not a firm offer. A contract arises only from a signed offer or a contract, not from the site.
- **Last updated:** "[DE COMPLETAT: data publicării]".

**Summary by heading.**
- **Who publishes the site.** SOVITECH CONTROL SRL, registered office, CUI 38500895, J40/19288/2017. Using the site means accepting the terms.
- **Information is not a firm offer.** Nothing on the site is "o ofertă fermă în sensul art. 1188 din Codul civil" or binds SOVITECH to a price, deadline or technical solution.
  - Cost bands ("4-18 EUR/mp ca bandă agregată, 9-18 EUR/mp pentru birouri clasa A, 90-320 EUR pe punct de date") are "repere de piață pentru bugetare preliminară". Real cost depends on points, existing equipment, installation condition, integration level and site conditions.
  - Energy-saving figures "provin din studii independente publicate", are quoted with their domain (percent of total building consumption or percent of HVAC consumption) and are not a guarantee for any building.
  - The calculator result is an approximation with simplifying assumptions. It is not an energy audit, a design or an offer.
  - Regulatory information (the 290 kW threshold of Legea 372/2005, the 70 kW threshold of Directive (EU) 2024/1275, other deadlines) is given with its primary source and check date, and is not legal advice.
- **How a contract arises.** A SOVITECH offer is written, signed and has a validity period: "[DE COMPLETAT: termenul standard de valabilitate al ofertelor, de exemplu 30 de zile]". Sending a form, downloading a material or subscribing creates no obligation. Execution terms, warranties, deadlines, acceptance and liability come from the signed contract and its technical annexes.
- **Content belongs to SOVITECH.** Texts, tables, diagrams, own photos, downloads and site structure are protected by Legea nr. 8/1996. Allowed without consent: reading, saving or printing for internal use, short quotes with source and link. Not allowed: full reproduction elsewhere, use in own commercial materials, resale, and systematic automated extraction to build a database or a competing service.
- **Trademarks.** SAUTER and SAUTER product names belong to their owner. SOVITECH uses them "în calitate de partener autorizat" to identify integrated equipment. Building and organisation names in the references identify the works done.
- **Use of the site and forms.** Real requests only. No false data or other people's data without consent, no unsolicited commercial messages, no unauthorised access, no vulnerability testing without prior written consent. SOVITECH may block addresses and keep log data to establish and defend its rights. Downloads are for own professional use.
- **Liability.** Reasonable diligence for accuracy at the publication date shown on each material. No liability for investment, design or compliance decisions made only on the site's information. No liability for external links. No guarantee of uninterrupted operation.
- **Law and disputes.** Romanian law. Amicable settlement first, then the competent courts at SOVITECH's registered office. "Site-ul se adresează comunicării profesionale între firme."
- **Changes.** SOVITECH may change the terms. The version in force is the one on the page, with the last-updated date at the top.

---

## 5. Open items the pages themselves flag

These markers are in the branch source. "[DE COMPLETAT]" items render on the page as written. "[DE VERIFICAT JURIDIC]" items are code comments and do not render.

**[DE COMPLETAT] (missing data):**
- Last-updated date on all three pages.
- Data-protection email address.
- Hosting region and the US transfer mechanism.
- Email provider, newsletter platform and CRM names.
- Whether Vercel Analytics uses cookies or persistent identifiers, and its duration.
- Actual server-log retention.
- The exact list of providers processing outside the EEA, with mechanisms.
- The exact cookie list.
- The standard validity period of offers.

**[DE VERIFICAT JURIDIC] (legal questions, in code comments):**
- Whether SOVITECH must appoint a DPO (art. 37). The comment says "Likely not for a small integrator, but must be confirmed, especially if delivered BMS systems include access control or CCTV in clients' buildings."
- The legal basis for commercial messages to existing clients (art. 12(2), Legea 506/2004).
- Whether transfers to SAUTER actually happen, and on what terms.
- How the ROI calculator actually handles data (browser only, server or email), so the policy matches it.
- Whether a written 72-hour breach notification procedure (art. 33) exists. The comment says it "must be created before this policy is published".
- Whether a stricter disclaimer is needed for investment decisions based on the calculator.
- Whether each named reference client has consented to being named. If not, "use a description without the name".
- Liability limits must not exclude liability for intent or gross negligence (Civil Code).
- If consumers (OG 21/1992) are among the recipients, a consumer-rights section (ANPC, the EU ODR platform, withdrawal right) is required.

---

## 6. Where the pages disagree with the branch's own code

Checked by reading the branch source statically. None of these is visible from the pages alone.

- **No cookie banner exists.** The cookie policy describes a banner and a "Preferințe cookie-uri" footer link. A code comment in `app/cookies/page.tsx` says "no consent banner or panel exists in the codebase yet". The footer (`components/footer.tsx`) has no such link.
- **Analytics loads without consent.** `app/layout.tsx` renders `<Analytics />` from `@vercel/analytics` on every page. The cookie table says traffic measurement needs consent, and there is no mechanism to ask for it. Whether Vercel Analytics sets cookies is the open "[DE COMPLETAT]" item.
- **The map loads without consent.** `app/contact/page.tsx` embeds an OpenStreetMap iframe that loads with the page. The cookie table puts embedded content under consent. The cookie FAQ itself says the map is "încărcată de la OpenStreetMap la afișarea paginii".
- **The contact form does not match the policy.** The policy lists company, role, building type, area and location as contact-form fields. The branch contact form asks only first name, last name, email, phone, subject and free text. Its `<form>` has no action or submit handler, so it sends nothing.
- **The quote form sends nothing and has no privacy notice.** `app/cerere-oferta/page.tsx` collects building data, an optional budget bracket, file names and contact details. On the last step it only sets a "submitted" state. It shows no consent line and no link to the privacy policy. The contact form does link to `/confidentialitate`.
- **The guide download form links to a missing page.** `app/ghid-bms/descarca/page.tsx` links its privacy text to `/politica-confidentialitate`. The policy's route on the branch is `/confidentialitate`, and no redirect covers the old path.
- **The calculator has no email step.** The policy describes emailing the calculator result. `app/calculator-roi/page.tsx` on the branch offers only a `mailto:` share link that opens the visitor's own email program. This matches the open "[DE VERIFICAT JURIDIC si tehnic]" comment.

Details of the forms themselves are in [`lead-funnels.md`](lead-funnels.md).

---

## 7. What the app may and may not use

These notes apply the app's guardrails (`docs/guardrails.md`, version 1.3).

- **Not a policy for the app.** The website pages are unmerged drafts with open legal questions, on a branch that will not be merged (owner decision, 2026-09-24). The app may not show them, link to them or rely on them as its privacy notice until SOVITECH publishes and approves an app notice.
- **Company data.** The controller identity (name, CUI, trade register number, address) is the same data recorded in `company-profile.md` section 11. It has not been checked against the Trade Register.
- **Terms wording versus the pricing stages.** The terms call the cost bands "repere de piață pentru bugetare preliminară" and say nothing on the site is "o ofertă fermă". This is close in spirit to rule 10, but the bands are still website marketing copy, not an approved benchmark dataset. See `pricing.md` section 7.
- **Reserved terms.** The pages use "ofertă", "ofertă fermă" and "conform", which are on the guardrails reserved list (section 2.8). In the app these words are allowed only where section 2.8 allows them.
- **Regulatory statements.** The 290 kW and 70 kW thresholds and their deadlines are the website's reading of the law. The app never claims compliance (rule 11), and legal thresholds would come only from reference data (rule 1).
