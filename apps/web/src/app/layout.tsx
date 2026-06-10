import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "WonderKit", template: "%s · WonderKit" },
  description: "Agent-native AI SaaS starter kit — multi-tenant, metered, observable.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
