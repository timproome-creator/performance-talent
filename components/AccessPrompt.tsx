// Two genuinely different situations that must not be confused: nobody is
// signed in (fixable by signing in) vs. signed in as someone who isn't on
// the allowlist (not fixable by trying again). Telling the second person to
// "sign in" would send them round a loop.
export function AccessPrompt({ reason }: { reason: 'signed_out' | 'not_authorised' }) {
  if (reason === 'not_authorised') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-gray-900 mb-2">You don&apos;t have access</h1>
          <p className="text-gray-500 text-sm">
            You&apos;re signed in, but this account isn&apos;t on the access list for the People
            Portal. This area holds performance and talent data, so access is granted per person.
            Speak to the portal owner if you need it.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in to continue</h1>
        <p className="text-gray-500 text-sm">
          Use the Sign in button in the top right. Every read and write here requires an
          authenticated session — this data is never exposed to signed-out visitors.
        </p>
      </div>
    </main>
  )
}
