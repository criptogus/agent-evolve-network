import { supabase } from '@/integrations/supabase/client'

export interface SendTransactionalEmailInput {
  templateName: string
  recipientEmail: string
  idempotencyKey: string
  templateData?: Record<string, unknown>
}

/**
 * Client-side helper to enqueue a transactional email.
 * Requires an authenticated Supabase session. The server route validates the JWT.
 */
export async function sendTransactionalEmail(input: SendTransactionalEmailInput) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    throw new Error('You must be signed in to send an email.')
  }

  const res = await fetch('/lovable/email/transactional/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to send email (${res.status}): ${text}`)
  }
  return res.json() as Promise<{ success: boolean; message_id?: string }>
}
