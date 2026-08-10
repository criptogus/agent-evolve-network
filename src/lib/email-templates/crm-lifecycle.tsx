import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND, styles } from './_brand'

/**
 * Single data-driven lifecycle template used by every CRM trigger.
 * Copy comes from src/lib/crm/copy.ts so email, in-app and MCP stay in sync.
 */
interface Metric {
  label: string
  value: string
  note?: string
}

interface Props {
  heading?: string
  preheader?: string
  intro?: string[]
  metrics?: Metric[]
  bullets?: string[]
  ctaLabel?: string
  ctaUrl?: string
  footnote?: string
  pixelUrl?: string
}

const metricRow = {
  border: `1px solid ${BRAND.border}`,
  borderRadius: '12px',
  padding: '14px 16px',
  marginBottom: '10px',
  backgroundColor: BRAND.surface,
} as const

const CrmLifecycleEmail = ({
  heading = 'Your SuperAgent Skill update',
  preheader = 'Your usage, your ROI and the highest-value next step.',
  intro = [],
  metrics = [],
  bullets = [],
  ctaLabel = 'Open my dashboard',
  ctaUrl = `${BRAND.url}/home`,
  footnote,
  pixelUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preheader}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.card}>
          <div style={styles.brandRow}>
            <span style={styles.brandDot} />
            <span style={styles.brandName}>{BRAND.name}</span>
          </div>
          <Heading style={styles.h1}>{heading}</Heading>
          {intro.map((p, i) => (
            <Text key={`intro-${i}`} style={styles.text}>
              {p}
            </Text>
          ))}

          {metrics.length > 0 && (
            <Section style={{ margin: '8px 0 20px' }}>
              {metrics.map((m, i) => (
                <div key={`m-${i}`} style={metricRow}>
                  <Text
                    style={{
                      ...styles.text,
                      margin: 0,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: BRAND.subtle,
                    }}
                  >
                    {m.label}
                  </Text>
                  <Text
                    style={{
                      ...styles.text,
                      margin: '2px 0 0',
                      fontSize: '20px',
                      fontWeight: 700,
                      color: BRAND.ink,
                    }}
                  >
                    {m.value}
                  </Text>
                  {m.note ? (
                    <Text style={{ ...styles.text, margin: '2px 0 0', fontSize: '13px' }}>
                      {m.note}
                    </Text>
                  ) : null}
                </div>
              ))}
            </Section>
          )}

          {bullets.length > 0 && (
            <Section>
              <Text style={{ ...styles.text, fontWeight: 700, margin: '0 0 8px' }}>
                What to do next
              </Text>
              {bullets.map((b, i) => (
                <Text key={`b-${i}`} style={{ ...styles.text, margin: '0 0 8px' }}>
                  • {b}
                </Text>
              ))}
            </Section>
          )}

          <Section style={{ marginTop: '20px' }}>
            <Button href={ctaUrl} style={styles.button}>
              {ctaLabel}
            </Button>
          </Section>

          <Hr style={styles.divider} />
          {footnote ? (
            <Text style={{ ...styles.text, fontSize: '12px', color: BRAND.subtle }}>
              {footnote}
            </Text>
          ) : null}
          <Text style={{ ...styles.text, fontSize: '13px' }}>
            Reply to this email if you want a human to look at your setup.
          </Text>
        </Section>
        <Text style={styles.footer}>
          {BRAND.name} ·{' '}
          <Link href={BRAND.url} style={styles.footerLink}>
            superagentskill.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CrmLifecycleEmail,
  subject: (data: Record<string, any>) =>
    (data?.subject as string) || 'Your SuperAgent Skill update',
  displayName: 'CRM lifecycle',
  previewData: {
    subject: 'Your week on SAK: $1,240/month of avoidable spend removed',
    heading: 'Weekly recap for Gustavo',
    preheader: 'Usage, realized ROI and the highest-value thing to do next.',
    intro: ['Here is what your agents did on SAK and what it was worth.'],
    metrics: [
      {
        label: 'Avoidable spend removed',
        value: '$1,240/month',
        note: '$14,880/year at 10,000 runs per month',
      },
      { label: 'Skill reviews', value: '12' },
    ],
    bullets: ['Diagnose your agent — find the bottleneck before rewriting prompts'],
    ctaLabel: 'Open my dashboard',
    ctaUrl: `${BRAND.url}/home`,
    footnote: 'Projections use the public SAK benchmark at 10,000 runs per month.',
  },
} satisfies TemplateEntry
