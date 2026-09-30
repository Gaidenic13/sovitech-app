/**
 * An inference's confidence against the evidence that remains (docs/guardrails.md rule 3, "Confidence is set by the
 * evidence and capped by code" and "Enforced by: Confidence caps. The cap is checked against each item's evidence
 * check result"; 2.3, "A candidate or asset with evidence from other active documents keeps that evidence"; F-VALUE-02).
 *
 * The verifier caps an inference once, when it is written (./evidence.ts). A candidate never changes after that (2.4),
 * but its evidence can go: deleting or erasing a document removes the entries that cite it, and the candidate stays
 * while another document supports it. The tier the verifier gave may have rested on the entry that went: "hotel"
 * inferred from a label that names the building's use and from a room schedule is high because the label names the
 * type, and from the room schedule alone it is at most medium (section 4's example). So the value model reads the
 * stored confidence capped again by the evidence that remains: the lower of the two. It never raises a stored
 * confidence, and it is a pure function of what is stored.
 *
 * The cap an entry supports, read from the entry as stored:
 * - low when its check is `unverifiable` ("Unverifiable evidence caps confidence at low");
 * - high when its excerpt, read on its own, names the chosen option with a mention no negation governs
 *   (./evidence.ts, `excerptNamesChoice`); the verifier keeps a candidate below high when an entry reads so only because
 *   its excerpt leaves out a negation its located text writes, so this reading never overstates a stored tier;
 * - an IFC entry of the gated value path (ADR 0033, behind `ifc-values`) supports what that path's own verifier gives it,
 *   which caps nothing below high: this module does not re-read a model's statements;
 * - otherwise medium.
 * The cap of several entries is low when any supports only low, else the highest any supports; with no entry left it
 * is low (such a candidate is withdrawn with its documents, 2.3, and never shown as current).
 */
import { excerptNamesChoice } from './evidence';
import { isIfcEvidence } from './ifc-evidence';
import type { Candidate, Confidence, Evidence } from './model';

const ORDER: readonly Confidence[] = ['low', 'medium', 'high'];

const rank = (confidence: Confidence): number => ORDER.indexOf(confidence);

/** The lower of two confidences. */
export function lowerConfidence(a: Confidence, b: Confidence): Confidence {
  return rank(a) <= rank(b) ? a : b;
}

/** The cap one stored evidence entry supports for a candidate with this choice (none for a quantity or a text). */
export function evidenceCap(entry: Evidence, choice: string | undefined): Confidence {
  if (entry.check === 'unverifiable') return 'low';
  if (isIfcEvidence(entry)) return 'high';
  return choice !== undefined && excerptNamesChoice(choice, entry.excerpt) ? 'high' : 'medium';
}

/** The cap of several entries: low when any supports only low, else the highest any supports; low with none. */
export function confidenceCap(entries: readonly Evidence[], choice: string | undefined): Confidence {
  const caps = entries.map((entry) => evidenceCap(entry, choice));
  if (caps.length === 0 || caps.includes('low')) return 'low';
  return caps.includes('high') ? 'high' : 'medium';
}

/**
 * The confidence the value model reads for a candidate (see the module comment). For an `ai_inference`: the stored
 * confidence (low when none is stored), capped by the entries it was written with and by those whose documents are not
 * removed, so it never reads higher than stored, and removing a document never raises it (an unverifiable entry that
 * goes leaves the inference low). For any other source: the stored confidence, if any (rule 8's ambiguous reading is
 * low whatever remains). Undefined when the candidate has none.
 */
export function derivedConfidence(candidate: Candidate, removed: (documentId: string) => boolean): Confidence | undefined {
  if (candidate.source !== 'ai_inference') return candidate.confidence;
  const written = lowerConfidence(candidate.confidence ?? 'low', confidenceCap(candidate.evidence, candidate.choice));
  const remaining = candidate.evidence.filter((entry) => !removed(entry.documentId));
  return lowerConfidence(written, confidenceCap(remaining, candidate.choice));
}
