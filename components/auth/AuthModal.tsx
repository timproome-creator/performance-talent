'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BASE_PATH } from '@/lib/site'

interface Props {
  onClose: () => void
}

type ModalState = 'idle' | 'sending' | 'sent' | 'error'
type CodeState = 'idle' | 'verifying' | 'error'

// Same magic-link + numeric-code pattern as leadership-excellence-assessment's
// AuthModal — see that file's comment for the rationale (corporate mail
// scanners pre-visiting single-use links).
export function AuthModal({ onClose }: Props) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<ModalState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [code, setCode] = useState('')
  const [codeState, setCodeState] = useState<CodeState>('idle')
  const [codeError, setCodeError] = useState('')

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${BASE_PATH}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
      },
    })
    if (error) {
      setErrorMsg(error.message)
      setState('error')
    } else {
      setState('sent')
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setCodeState('verifying')
    setCodeError('')
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })
    if (error) {
      setCodeError(error.message)
      setCodeState('error')
      return
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {state === 'sent' ? (
          <div className="py-2 space-y-5">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 accent-panel rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 accent-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg font-bold text-gray-900">Check your inbox</p>
              <p className="text-gray-500 text-sm leading-relaxed">
                We sent a message to <strong className="text-gray-700">{email}</strong>. Click the
                link inside, or enter the verification code from the same email below.
              </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-2 pt-1 border-t border-gray-100">
              <label className="text-xs font-medium text-gray-500 block pt-3">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  if (codeState === 'error') setCodeState('idle')
                }}
                placeholder="Enter the code from your email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
              {codeState === 'error' && <p className="text-red-500 text-xs">{codeError}</p>}
              <button
                type="submit"
                disabled={codeState === 'verifying' || code.trim().length === 0}
                className="w-full btn-primary disabled:opacity-60"
              >
                {codeState === 'verifying' ? 'Verifying...' : 'Verify code'}
              </button>
            </form>

            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors block mx-auto"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Sign in</h2>
              <p className="text-gray-500 text-sm mt-1">
                See the scorecard, KPIs and roster for your team.
              </p>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@company.com"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
              {state === 'error' && <p className="text-red-500 text-xs">{errorMsg}</p>}
              <button
                type="submit"
                disabled={state === 'sending'}
                className="w-full btn-primary disabled:opacity-60"
              >
                {state === 'sending' ? 'Sending...' : 'Continue'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 pt-3">
              No password. We email you a sign-in link and a backup code.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
