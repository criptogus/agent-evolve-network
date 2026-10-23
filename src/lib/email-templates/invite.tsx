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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to {BRAND.name}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.card}>
          <Section style={styles.brandRow}>
            <span style={styles.brandDot} />
            <span style={styles.brandName}>{BRAND.name}</span>
          </Section>
          <Heading style={styles.h1}>You're invited to {BRAND.name}</Heading>
          <Text style={styles.text}>
            {BRAND.tagline}. Accept the invitation to create your account and
            start collaborating.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Accept invitation
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
          Not expecting this invitation? You can safely ignore this email.
          <br />
          <Link href={BRAND.url} style={styles.footerLink}>
            superagentskill.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
