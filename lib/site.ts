// Must match `basePath` in next.config.ts exactly. Next.js auto-prepends
// basePath to <Link>/router.push, but NOT to manually-built URL strings
// (window.location.origin + a path), so anywhere that builds an absolute
// URL by hand has to append this itself.
export const BASE_PATH = '/performance'

// Server-side only (uses NEXT_PUBLIC_SITE_URL, not window).
export function baseUrl(): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://performance-talent.vercel.app'
  return `${origin}${BASE_PATH}`
}
