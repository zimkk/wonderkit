import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

interface Props { url: string; email: string; }

export function MagicLinkEmail({ url, email }: Props) {
  return (
    <Html><Head />
      <Body style={{ fontFamily: "sans-serif", background: "#fafafa" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", background: "#fff", padding: 40, borderRadius: 8 }}>
          <Heading style={{ fontSize: 24 }}>Sign in to WonderKit</Heading>
          <Text>Click the button below to sign in as <strong>{email}</strong>. This link expires in 24 hours.</Text>
          <Button href={url} style={{ background: "#2563eb", color: "#fff", padding: "12px 24px", borderRadius: 6, display: "inline-block", marginTop: 16 }}>
            Sign in
          </Button>
          <Hr style={{ margin: "32px 0" }} />
          <Text style={{ color: "#888", fontSize: 12 }}>If you did not request this, you can safely ignore it.</Text>
        </Container>
      </Body>
    </Html>
  );
}
