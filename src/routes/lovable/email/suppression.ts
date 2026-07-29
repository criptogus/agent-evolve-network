import { createClient } from '@supabase/supabase-js'
import { WebhookError, verifyWebhookRequest } from '@lovable.dev/webhooks-js'
import { createFileRoute } from '@tanstack/react-router'

// Suppression event payload sent by the Go API when Mailgun reports
// a bounce, complaint, or unsubscribe.
interface SuppressionPayload {
  email: string
  reason: 'bounce' | 'complaint' | 'unsubscribe'
  message_id?: string
  metadata?: Record<string, unknown>
  is_retry: boolean
  retry_count: number
}

function parseSuppressionPayload(body: string): SuppressionPayload {
  const parsed = JSON.parse(body)
  if (!parsed.data) {
    throw new Error('Missing data field in payload')
  }
  const data = parsed.data as SuppressionPayload
  if (!data.email || !data.reason) {
    throw new Error('Missing required fields: email, reason')
  }
  return data
}

function mapReasonToStatus(
  reason: string,
): 'bounced' | 'complained' | 'suppressed' {
  switch (reason) {
    case 'bounce':
      return 'bounced'
    case 'complaint':
      return 'complained'
    default:
      return 'suppressed'
  }
}

function mapReasonToMessage(reason: string): string {
  switch (reason) {
    case 'bounce':
      return 'Permanent bounce — email address is invalid or rejected'
    case 'complaint':
      return 'Spam complaint — recipient marked email as spam'
    case 'unsubscribe':
      return 'Recipient unsubscribed'
    default:
      return 'Email suppressed'
  }
}

export const Route = createFileRoute("/lovable/email/suppression")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Verify HMAC signature using the Lovable API Key (same as auth-email-hook)
        let payload: SuppressionPayload
        try {
          const verified = await verifyWebhookRequest({
            req: request,
            secret: apiKey,
            parser: parseSuppressionPayload,
          })
          payload = verified.payload
        } catch (error) {
          if (error instanceof WebhookError) {
            switch (error.code) {
              case 'invalid_signature':
                console.error('Invalid webhook signature')
                return Response.json({ error: 'Invalid signature' }, { status: 401 })
              case 'stale_timestamp':
                console.error('Stale webhook timestamp')
                return Response.json({ error: 'Stale timestamp' }, { status: 401 })
              case 'invalid_payload':
              case 'invalid_json':
                console.error('Invalid payload', { code: error.code })
                return Response.json({ error: 'Invalid payload' }, { status: 400 })
              default:
                console.error('Webhook verification failed', {
                  code: error.code,
                  message: error.message,
                })
                return Response.json({ error: 'Verification failed' }, { status: 401 })
            }
          }
          console.error('Unexpected error during verification', { error })
          return Response.json({ error: 'Internal error' }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const normalizedEmail = payload.email.toLowerCase()

        // 1. Upsert to suppressed_emails (idempotent — safe for retries)
        const { error: suppressError } = await supabase
          .from('suppressed_emails')
          .upsert(
            {
              email: normalizedEmail,
              reason: payload.reason,
              metadata: payload.metadata ?? null,
            },
            { onConflict: 'email' },
          )

        if (suppressError) {
          console.error('Failed to upsert suppressed email', {
            error: suppressError,
            email_redacted: normalizedEmail[0] + '***@' + normalizedEmail.split('@')[1],
          })
          return Response.json({ error: 'Failed to write suppression' }, { status: 500 })
        }

        // 2. Append a new log entry for the suppression event (never update existing rows)
        const sendLogStatus = mapReasonToStatus(payload.reason)
        const sendLogMessage = mapReasonToMessage(payload.reason)

        const { error: insertError } = await supabase
          .from('email_send_log')
          .insert({
            message_id: payload.message_id ?? null,
            template_name: 'system',
            recipient_email: normalizedEmail,
            status: sendLogStatus,
            error_message: sendLogMessage,
            metadata: payload.metadata ?? null,
          })

        if (insertError) {
          // Non-fatal — log and continue. The suppression was already recorded.
          console.warn('Failed to insert email_send_log', {
            error: insertError,
          })
        }

        console.log('Suppression processed', {
          email_redacted: normalizedEmail[0] + '***@' + normalizedEmail.split('@')[1],
          reason: payload.reason,
          is_retry: payload.is_retry,
          retry_count: payload.retry_count,
          has_message_id: !!payload.message_id,
        })

        return Response.json({ success: true })
      },
    },
  },
})
