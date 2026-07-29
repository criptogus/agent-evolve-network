import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  head: () => ({
    meta: [
      { title: 'Unsubscribe — SuperAgent Skill' },
      { name: 'description', content: 'Manage your email preferences for SuperAgent Skill.' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: UnsubscribePage,
})

type Status =
  | 'loading'
  | 'ready'
  | 'already'
  | 'invalid'
  | 'submitting'
  | 'done'
  | 'error'

function UnsubscribePage() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const url = new URL(window.location.href)
    const t = url.searchParams.get('token')
    if (!t) {
      setStatus('invalid')
      return
    }
    setToken(t)
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        if (r.status === 404) return setStatus('invalid')
        if (!r.ok) return setStatus('error')
        const data = await r.json()
        if (data.valid) setStatus('ready')
        else if (data.reason === 'already_unsubscribed') setStatus('already')
        else setStatus('invalid')
      })
      .catch(() => setStatus('error'))
  }, [])

  async function confirm() {
    if (!token) return
    setStatus('submitting')
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data.success) setStatus('done')
      else if (data.reason === 'already_unsubscribed') setStatus('already')
      else {
        setError(data.error || 'Something went wrong.')
        setStatus('error')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setStatus('error')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="text-sm font-semibold tracking-tight">SuperAgent Skill</span>
        </div>

        {status === 'loading' && (
          <p className="text-sm text-muted-foreground">Checking your link…</p>
        )}

        {status === 'ready' && (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Unsubscribe from emails</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You&apos;ll stop receiving app emails from SuperAgent Skill. You can still receive
              essential account emails like password resets.
            </p>
            <button
              onClick={confirm}
              className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Confirm unsubscribe
            </button>
          </>
        )}

        {status === 'submitting' && (
          <p className="text-sm text-muted-foreground">Processing…</p>
        )}

        {status === 'done' && (
          <>
            <h1 className="text-xl font-semibold tracking-tight">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We won&apos;t email you about product updates anymore. Sorry to see you go.
            </p>
          </>
        )}

        {status === 'already' && (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Already unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This address is already opted out. No further action needed.
            </p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Invalid link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This unsubscribe link is missing or has expired. Please use the link from a
              recent email.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error || 'Please try again in a moment.'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
