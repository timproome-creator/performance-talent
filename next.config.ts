import type { NextConfig } from 'next'

// Must match BASE_PATH in lib/site.ts exactly (that constant covers the
// manually-built URLs that Next.js's own basePath prepending doesn't reach).
const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  basePath: '/performance',
  // Default Server Action body limit is 1MB; the real Connect 2.0 workbook
  // (uploaded via app/import/page.tsx) is ~1.3MB on its own before
  // multipart/form-data overhead. 10mb gives headroom for future growth
  // (more tabs, more people) without needing to revisit this.
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // This app is the gateway for the unified Mr Price "People Portal" URL:
  // WLEA (a separate Vercel deployment, wlea-mrpg) is proxied in here under
  // /leadership so both tools live under one domain without merging
  // codebases. Same multi-zone pattern operational-leak-diagnostic already
  // uses in production for dcupside.com — see that project's next.config.ts.
  //
  // Two rules, not one: when :path* captures zero segments, a destination
  // template with a literal slash before it (".../leadership/:path*") still
  // emits a trailing slash, which triggers WLEA's own trailing-slash
  // redirect back to ".../leadership" — an absolute-path redirect the
  // browser re-requests against THIS domain, which rewrites it the same
  // way, looping forever. The bare-path rule has no trailing slash in its
  // destination, so it never produces that redirect.
  //
  // basePath: false on both rules is required — without it, Next
  // auto-prepends this app's OWN basePath ('/performance') to the source,
  // which would only match '/performance/leadership', not the top-level
  // '/leadership' path WLEA's basePath actually needs (its JS bundle has
  // '/leadership' baked into every asset URL it serves, so the path here
  // must match WLEA's basePath exactly, not an arbitrary alias).
  async rewrites() {
    return [
      {
        source: '/leadership',
        destination: 'https://wlea-mrpg.vercel.app/leadership',
        basePath: false,
      },
      {
        source: '/leadership/:path*',
        destination: 'https://wlea-mrpg.vercel.app/leadership/:path*',
        basePath: false,
      },
    ]
  },
}

export default nextConfig
