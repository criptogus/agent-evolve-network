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
  dashboardUrl?: string
}

const WelcomeEmail = ({ name, dashboardUrl }: Props) => {
  const greeting = name ? `Welcome, ${name}!` : 'Welcome!'
  const url = dashboardUrl || `${BRAND.url}/dashboard`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Welcome to {BRAND.name} — your marketplace for verified AI agent skills.</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            <div style={styles.brandRow}>
              <span style={styles.brandDot} />
              <span style={styles.brandName}>{BRAND.name}</span>
            </div>
            <Heading style={styles.h1}>{greeting}</Heading>
            <Text style={styles.text}>
              You&apos;re in. {BRAND.name} is the marketplace for verified AI agent skills —
              publish your own, install skills into your agents, and get paid when others
              use them.
            </Text>
            <Text style={styles.text}>Here&apos;s what to try first:</Text>
            <Text style={{ ...styles.text, margin: '0 0 8px' }}>
              • Browse the skill marketplace
            </Text>
            <Text style={{ ...styles.text, margin: '0 0 8px' }}>
              • Install a skill into Cursor, VS Code, or Lovable in one click
            </Text>
            <Text style={{ ...styles.text, margin: '0 0 24px' }}>
              • Publish your first skill via CLI or MCP
            </Text>
            <Button href={url} style={styles.button}>
              Open my dashboard
            </Button>
            <Hr style={styles.divider} />
            <Text style={{ ...styles.text, fontSize: '13px' }}>
              Questions? Just reply to this email — a real human reads every message.
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
  component: WelcomeEmail,
  subject: 'Welcome to SuperAgent Skill',
  displayName: 'Welcome',
  previewData: { name: 'Gustavo', dashboardUrl: `${BRAND.url}/dashboard` },
} satisfies TemplateEntry
