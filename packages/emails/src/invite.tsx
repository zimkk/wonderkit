import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

interface Props { inviterName: string; orgName: string; acceptUrl: string; }

export function InviteEmail({ inviterName, orgName, acceptUrl }: Props) {
  return (
    <Html><Head />
      <Body style={{ fontFamily: "sans-serif", background: "#fafafa" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", background: "#fff", padding: 40, borderRadius: 8 }}>
          <Heading style={{ fontSize: 24 }}>You&apos;ve been invited</Heading>
          <Text><strong>{inviterName}</strong> has invited you to join <strong>{orgName}</strong> on WonderKit.</Text>
          <Button href={acceptUrl} style={{ background: "#2563eb", color: "#fff", padding: "12px 24px", borderRadius: 6, display: "inline-block", marginTop: 16 }}>
            Accept invitation
          </Button>
          <Hr style={{ margin: "32px 0" }} />
          <Text style={{ color: "#888", fontSize: 12 }}>This invitation expires in 7 days.</Text>
        </Container>
      </Body>
    </Html>
  );
}
