import type { Metadata } from "next";
import "./globals.css";
import AppShell from "../src/components/AppShell";

export const metadata: Metadata = {
  title: "Quality Dashboard",
  description: "Quality management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{
          margin: 0,
          fontFamily: "Arial, sans-serif",
          background: "#eef2f5",
          color: "#0f172a",
        }}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
