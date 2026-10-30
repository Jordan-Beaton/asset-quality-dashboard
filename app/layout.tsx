import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import AppShell from "../src/components/AppShell";

export const metadata: Metadata = {
  title: "Quality Dashboard",
  description: "Quality management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The public Speak Up page is served without the signed-in IMS shell, so it never looks up who is viewing it.
  const publicSpeakUp = (await headers()).get("x-speak-up-public") === "1";
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{
          margin: 0,
          fontFamily: "\"Azo Sans\", \"Segoe UI\", Arial, Helvetica, sans-serif",
          background: "#ECECE7",
          color: "#000000",
        }}
      >
        {publicSpeakUp ? children : <AppShell>{children}</AppShell>}
      </body>
    </html>
  );
}
