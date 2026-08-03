import Link from 'next/link'

export default function AuthError() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign-in failed</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Your login link may have expired or already been used. Links are valid for 60 minutes
          and can only be used once.
        </p>
        <Link
          href="/"
          className="inline-block btn-primary"
        >
          Return to Scorecard
        </Link>
      </div>
    </main>
  )
}
