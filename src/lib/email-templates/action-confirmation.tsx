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

interface Props {
  name?: string
  action?: string
  details?: string
  actionUrl?: string
  actionLabel?: string
}

const ActionConfirmationEmail = ({
  name,
  action,
  details,
  actionUrl,
  actionLabel,
}: Props) => {
  const title = action || 'Action confirmed'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{title} on {BRAND.name}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            <div style={styles.brandRow}>
              <span style={styles.brandDot} />
              <span style={styles.brandName}>{BRAND.name}</span>
            </div>
            <Heading style={styles.h1}>{title}</Heading>
            <Text style={styles.text}>
              {name ? `Hi ${name},` : 'Hi there,'} we&apos;ve recorded the following action
              on your account:
            </Text>
            {details ? (
              <Text
                style={{
                  ...styles.text,
                  backgroundColor: BRAND.surface,
                  border: `1px solid ${BRAND.border}`,
                  borderRadius: '10px',
                  padding: '16px 20px',
                  color: BRAND.ink,
                }}
              >
                {details}
              </Text>
            ) : null}
            {actionUrl ? (
              <Button href={actionUrl} style={styles.button}>
                {actionLabel || 'View details'}
              </Button>
            ) : null}
            <Hr style={styles.divider} />
            <Text style={{ ...styles.text, fontSize: '13px' }}>
              Didn&apos;t do this? Reply to this email and we&apos;ll investigate right away.
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
}

export const template = {
  component: ActionConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.action ? `${data.action} — SuperAgent Skill` : 'Action confirmed — SuperAgent Skill',
  displayName: 'Action confirmation',
  previewData: {
    name: 'Gustavo',
    action: 'Skill published',
    details: 'Your skill "web-search-pro v1.2.0" is now live in the marketplace.',
    actionUrl: `${BRAND.url}/dashboard`,
    actionLabel: 'View skill',
  },
} satisfies TemplateEntry
