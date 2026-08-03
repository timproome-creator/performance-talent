import { createClient as createServerClient } from '@/lib/supabase/server'

// Thrown when someone is signed in but not on the allowlist. Distinguished
// from "not signed in" by a sentinel message rather than an error subclass —
// errors crossing the Server Action boundary don't preserve their prototype,
// so instanceof is unreliable here.
export const NOT_AUTHORISED = 'NOT_AUTHORISED'

// Every Server Action in this app routes through here. Two separate checks:
//
//   1. Signed in at all? (Supabase session)
//   2. On the allowlist? (ALLOWED_EMAILS)
//
// Check 2 exists because Supabase magic-link sign-in works for ANY email
// address — there's no built-in notion of "staff only". Without an
// allowlist, anyone who found the URL could sign in and read (and edit)
// every person's assessment scores, 9-box position and development plan.
// That's real employee data, and 9-box placements in particular are
// manager-and-above information in most organisations.
//
// FAILS CLOSED: an unset or empty ALLOWED_EMAILS denies everyone rather
// than defaulting to open. A misconfigured deployment should lock the door,
// not silently unlock it — the failure is then obvious and safe, instead of
// invisible and dangerous.
export async function requireAllowedUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const allowed = (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (allowed.length === 0) throw new Error(NOT_AUTHORISED)
  if (!user.email || !allowed.includes(user.email.toLowerCase())) {
    throw new Error(NOT_AUTHORISED)
  }

  return user
}

export function isNotAuthorised(e: unknown): boolean {
  return e instanceof Error && e.message === NOT_AUTHORISED
}
