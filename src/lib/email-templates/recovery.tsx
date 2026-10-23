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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {BRAND.name} password</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.card}>
          <Section style={styles.brandRow}>
            <span style={styles.brandDot} />
            <span style={styles.brandName}>{BRAND.name}</span>
          </Section>
          <Heading style={styles.h1}>Reset your password</Heading>
          <Text style={styles.text}>
            We received a request to reset your {BRAND.name} password. Click
            below to choose a new one. This link expires shortly.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Reset password
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
          Didn't request a reset? You can safely ignore this email — your
          password stays the same.
          <br />
          <Link href={BRAND.url} style={styles.footerLink}>
            superagentskill.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
