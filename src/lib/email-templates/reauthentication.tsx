import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { BRAND, styles } from './_brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {BRAND.name} verification code</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.card}>
          <Section style={styles.brandRow}>
            <span style={styles.brandDot} />
            <span style={styles.brandName}>{BRAND.name}</span>
          </Section>
          <Heading style={styles.h1}>Confirm it's you</Heading>
          <Text style={styles.text}>
            Enter this verification code in {BRAND.name} to confirm your
            identity. It expires shortly.
          </Text>
          <Text style={styles.code}>{token}</Text>
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Didn't request this? You can safely ignore this email.
          </Text>
        </Section>
        <Text style={styles.footer}>
          Sent by {BRAND.name} ·{' '}
          <a href={BRAND.url} style={styles.footerLink}>
            superagentskill.com
          </a>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
