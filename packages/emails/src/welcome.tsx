import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

interface Props { name: string; plan: string; appUrl?: string; }

export function WelcomeEmail({ name, plan, appUrl = "https://wonderkit.dev" }: Props) {
  return (
    <Html><Head />
      <Body style={{ fontFamily: "sans-serif", background: "#fafafa" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", background: "#fff", padding: 40, borderRadius: 8 }}>
          <Heading style={{ fontSize: 24, marginBottom: 8 }}>Welcome to WonderKit</Heading>
          <Text>Hi {name}, you&apos;re on the <strong>{plan}</strong> plan. Let&apos;s build something great.</Text>
          <Button href={`${appUrl}/app`} style={{ background: "#2563eb", color: "#fff", padding: "12px 24px", borderRadius: 6, display: "inline-block", marginTop: 16 }}>
            Open dashboard
          </Button>
          <Hr style={{ margin: "32px 0" }} />
          <Text style={{ color: "#888", fontSize: 12 }}>WonderKit · hassannazir955@gmail.com</Text>
        </Container>
      </Body>
    </Html>
  );
}
