import { Html, Head, Body, Container, Heading, Text, Button } from "@react-email/components";

interface Props { orgName: string; updateUrl: string; }

export function PaymentFailedEmail({ orgName, updateUrl }: Props) {
  return (
    <Html><Head />
      <Body style={{ fontFamily: "sans-serif", background: "#fafafa" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", background: "#fff", padding: 40, borderRadius: 8 }}>
          <Heading style={{ fontSize: 24, color: "#dc2626" }}>Payment failed</Heading>
          <Text>We could not process the payment for <strong>{orgName}</strong>. Please update your payment method to avoid service interruption.</Text>
          <Button href={updateUrl} style={{ background: "#dc2626", color: "#fff", padding: "12px 24px", borderRadius: 6, display: "inline-block", marginTop: 16 }}>
            Update payment method
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
