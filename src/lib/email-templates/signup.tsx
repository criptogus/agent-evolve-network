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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to activate your {BRAND.name} account</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.card}>
          <Section style={styles.brandRow}>
            <span style={styles.brandDot} />
            <span style={styles.brandName}>{BRAND.name}</span>
          </Section>
          <Heading style={styles.h1}>Confirm your email</Heading>
          <Text style={styles.text}>
            Welcome to {BRAND.name} — {BRAND.tagline.toLowerCase()}. Confirm{' '}
            <Link href={`mailto:${recipient}`} style={styles.link}>
              {recipient}
            </Link>{' '}
            to activate your account and start shipping verified skills.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Verify email
          </Button>
          <Hr style={styles.divider} />
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            If the button doesn't work, paste this link into your browser:
            <br />
            <Link href={confirmationUrl} style={styles.link}>
              {confirmationUrl}
            </Link>
          </Text>
        </Section>
        <Text style={styles.footer}>
          Didn't create an account? You can safely ignore this email.
          <br />
          <Link href={BRAND.url} style={styles.footerLink}>
            superagentskill.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
