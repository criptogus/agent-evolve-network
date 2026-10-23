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

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new email for {BRAND.name}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.card}>
          <Section style={styles.brandRow}>
            <span style={styles.brandDot} />
            <span style={styles.brandName}>{BRAND.name}</span>
          </Section>
          <Heading style={styles.h1}>Confirm your new email</Heading>
          <Text style={styles.text}>
            You requested to change your {BRAND.name} email from{' '}
            <Link href={`mailto:${oldEmail}`} style={styles.link}>
              {oldEmail}
            </Link>{' '}
            to{' '}
            <Link href={`mailto:${newEmail}`} style={styles.link}>
              {newEmail}
            </Link>
            . Click below to confirm.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Confirm email change
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
          Didn't request this change? Secure your account immediately at{' '}
          <Link href={BRAND.url} style={styles.footerLink}>
            superagentskill.com
          </Link>
          .
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
