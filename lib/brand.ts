// Brand layer for white-labelling this app across deployments. See the
// sibling copy in leadership-excellence-assessment/lib/brand.ts for the full
// rationale — same pattern, duplicated per-app since these are separate
// Next.js deployments with no shared package.

export type BrandId = 'dcupside' | 'mrpg'

export interface Brand {
  id: BrandId
  name: string
  subtitle: string
  legalName: string
  metaTitle: string
  metaDescription: string
  ogSiteName: string
  /** Path under /public to a real logo image, or null to render the text
   *  wordmark instead. Relative to the app root — callers must prepend
   *  BASE_PATH themselves (see lib/site.ts; plain <img src> is not
   *  basePath-aware the way <Link>/next/image are). */
  logoSrc: string | null
}

const BRANDS: Record<BrandId, Brand> = {
  dcupside: {
    id: 'dcupside',
    name: 'DC Upside',
    subtitle: 'Performance & Talent',
    legalName: 'Virtual Supply Chain Executive',
    metaTitle: 'KPI Tracker | DC Upside',
    metaDescription:
      'A per-person KPI tracker with weighted objectives across KPI Delivery and Leadership Effectiveness, tracked quarterly for warehouse and DC operations.',
    ogSiteName: 'DC Upside',
    logoSrc: null,
  },
  mrpg: {
    id: 'mrpg',
    name: 'Mr Price Group Logistics',
    subtitle: 'Performance & Talent',
    legalName: 'Mr Price Group Logistics',
    metaTitle: 'KPI Tracker | Mr Price Group Logistics',
    metaDescription:
      'The internal Connect 2.0 KPI tracker — weighted objectives across KPI Delivery and Leadership Effectiveness, tracked quarterly, for Mr Price Group Logistics.',
    ogSiteName: 'Mr Price Group Logistics',
    logoSrc: '/mrpg-logo.jpeg',
  },
}

const resolvedId = (process.env.NEXT_PUBLIC_BRAND as BrandId) || 'dcupside'

export const BRAND: Brand = BRANDS[resolvedId] ?? BRANDS.dcupside
