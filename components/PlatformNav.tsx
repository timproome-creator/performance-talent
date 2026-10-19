'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AuthModal } from './auth/AuthModal'
import { BRAND } from '@/lib/brand'
import { BASE_PATH } from '@/lib/site'

// Order follows the actual FY cadence (see lib/cadence.ts), not alphabetical
// or feature-launch order — Assessment and Trackers happen first (April),
// then 9-Box (July), Scorecard is the ongoing live view, People is the
// roster admin screen underneath everything else.
const links: { href: string; label: string; match?: string; external?: boolean }[] = [
  { href: '/', label: 'Year' },
  // Plain <a>, not next/link — see the external-link comment in the render
  // below. Escapes this app's basePath to reach the wlea-mrpg deployment
  // proxied in at /leadership.
  { href: '/leadership', label: 'Assessment', external: true },
  { href: '/leadership/console', label: 'My assessments', external: true },
  // match '/tracker' so the singular /tracker/[id] detail page also highlights here
  { href: '/trackers', label: 'Trackers', match: '/tracker' },
  { href: '/ninebox', label: '9-Box' },
  { href: '/succession', label: 'Succession' },
  { href: '/scorecard', label: 'Scorecard' },
  { href: '/people', label: 'People' },
]

export function PlatformNav() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  // '/' is the cadence home, so it must match EXACTLY — otherwise it lights
  // up on every route. Everything else matches by prefix, with `match`
  // overriding where the detail route differs from the list route
  // (/trackers owns /tracker/[id]).
  const isActive = (link: { href: string; match?: string }) =>
    link.href === '/' ? pathname === '/' : pathname.startsWith(link.match ?? link.href)

  return (
    <header
      className="border-b border-black/20 print:hidden"
      style={{ backgroundColor: 'var(--brand-header)' }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          {BRAND.logoSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- plain
                  img is basePath-aware here via the manual BASE_PATH prefix;
                  next/image would need its own config for a static jpeg. */}
              <img src={`${BASE_PATH}${BRAND.logoSrc}`} alt={BRAND.name} className="h-8 w-auto" />
              <span
                className="font-normal text-[10px] uppercase tracking-wide leading-tight"
                style={{ color: 'var(--brand-accent)' }}
              >
                {BRAND.subtitle}
              </span>
            </>
          ) : (
            <span className="text-base font-bold leading-tight" style={{ color: 'var(--brand-on-header)' }}>
              {BRAND.name}
              <br />
              <span
                className="font-normal text-[10px] uppercase tracking-wide"
                style={{ color: 'var(--brand-accent)' }}
              >
                {BRAND.subtitle}
              </span>
            </span>
          )}
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) =>
            link.external ? (
              <a key={link.href} href={link.href} className="nav-link">
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'nav-link',
                  isActive(link) ? 'nav-link--active' : '',
                ].join(' ')}
              >
                {link.label}
              </Link>
            ),
          )}
          <span
            className="w-px h-5 mx-1"
            style={{ backgroundColor: 'var(--brand-header-active)' }}
          />
          {!loading &&
            (user ? (
              <button
                type="button"
                onClick={signOut}
                title={user.email ?? undefined}
                className="nav-link"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="nav-link"
              >
                Sign in
              </button>
            ))}
        </nav>
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  )
}
