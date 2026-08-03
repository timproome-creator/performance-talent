export function SignInPrompt() {
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
