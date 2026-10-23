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
import { BRAND, styles } from './_brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your one-time sign-in link for {BRAND.name}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.card}>
          <Section style={styles.brandRow}>
            <span style={styles.brandDot} />
            <span style={styles.brandName}>{BRAND.name}</span>
          </Section>
          <Heading style={styles.h1}>Sign in to {BRAND.name}</Heading>
          <Text style={styles.text}>
            Click the button below to sign in. This link expires shortly and
            can only be used once.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Sign in
          </Button>
          <Hr style={styles.divider} />
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Or paste this link into your browser:
            <br />
            <Link href={confirmationUrl} style={styles.link}>
              {confirmationUrl}
            </Link>
          </Text>
        </Section>
        <Text style={styles.footer}>
          Didn't request this? Ignore this email — no changes were made.
          <br />
          <Link href={BRAND.url} style={styles.footerLink}>
            superagentskill.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
