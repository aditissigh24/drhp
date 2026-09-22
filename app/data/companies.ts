/**
 * The watchlist's company records.
 *
 * `public/verification.json` carries the run metadata — docId, runId, page
 * range, statusCounts — but it has no company name, ticker or sector anywhere.
 * Before this file the issuer's name existed only as literal JSX inside
 * `components/Reviewer.jsx` and in the page <title>. So
 * this module is the source of truth for everything *about* the company, while
 * verification.json stays the source of truth for everything *in* the report.
 *
 * One entry today. The DRHP reviewer still fetches `/verification.json`,
 * `/anchors.json` and `/drhp.pdf` from fixed paths, so a second entry here
 * would render a second row that opens the *first* company's document. Adding
 * a real second company means threading `drhpPdf`/`verificationJson` into
 * `Reviewer` first — deliberately out of scope while there is only one dataset.
 */

export interface CompanyItem {
  /** Stable row id. */
  id: string;
  /** Display name — the authority for this string across the whole app. */
  legalName: string;
  /** Raw status, rendered as-is and colour-coded by the row builder. */
  status: string;
  /** Document kind, e.g. "DRHP". */
  docType: string;
  /** Section of the document that was verified. */
  section: string;
  /** Inclusive page range covered by the run, pre-formatted for display. */
  pages: string;
  /**
   * Filed → verified. `start` is the registration timestamp encoded in docId
   * (Registration_24032026122414 → 24/03/2026 12:24:14); `end` is the run's
   * `generatedAt`. ISO dates; the row builder formats them as DD-MM-YYYY.
   */
  dateRange: { start: string | null; end: string | null };
  /** Matches `verification.json.docId`. */
  docId: string;
  /** Matches `verification.json.runId`. */
  runId: string;
  /** The document under review. */
  drhpPdf: string;
  /** The corroborating source the claims are checked against. */
  sourcePdf: string;
}

export const companies: CompanyItem[] = [
  {
    id: 'UIEL',
    // The file is named for the deal codename, "Project Namo". This is the
    // issuer named on the cover, which is what a reviewer searches for.
    legalName: 'Ultravibrant Integrated Energy Limited',
    status: 'COMPLETED',
    docType: 'DRHP',
    section: 'Full document',
    pages: '1–571',
    dateRange: { start: '2026-09-22', end: '2026-09-22' },
    docId: 'adc946cc-ada1-424d-bc45-809d912e1791',
    runId: '0d8fec09-4ae3-4e8f-bd60-64621abd2ad5',
    drhpPdf: '/drhp.pdf',
    // Internal consistency: claims are checked against this same document.
    sourcePdf: '/drhp.pdf',
  },
];

/**
 * Stable URL slug for /investigation/[name]. Whitespace-stripped legal name,
 * matching `companyUrlSlug` in the surveillance UI so the route shape is the
 * same: /investigation/UltravibrantIntegratedEnergyLimited
 */
export function companyUrlSlug(company: Pick<CompanyItem, 'legalName'>): string {
  return company.legalName.replace(/\s+/g, '');
}

/** Looks a company up by the slug in the URL. Returns undefined if unknown. */
export function companyBySlug(slug: string): CompanyItem | undefined {
  return companies.find((c) => companyUrlSlug(c) === slug);
}

/** The company the app opens on. */
export const defaultCompany: CompanyItem = companies[0];
