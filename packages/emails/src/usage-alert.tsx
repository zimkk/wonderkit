import { Html, Head, Body, Container, Heading, Text, Button } from "@react-email/components";

interface Props { orgName: string; usedPct: number; upgradeUrl: string; }

export function UsageAlertEmail({ orgName, usedPct, upgradeUrl }: Props) {
  return (
    <Html><Head />
      <Body style={{ fontFamily: "sans-serif", background: "#fafafa" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", background: "#fff", padding: 40, borderRadius: 8 }}>
          <Heading style={{ fontSize: 24 }}>{usedPct}% of your token quota used</Heading>
          <Text><strong>{orgName}</strong> has used {usedPct}% of its monthly AI token quota. Upgrade your plan to avoid hitting the limit.</Text>
          <Button href={upgradeUrl} style={{ background: "#2563eb", color: "#fff", padding: "12px 24px", borderRadius: 6, display: "inline-block", marginTop: 16 }}>
            Upgrade plan
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
