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
          fontFamily: "\"Azo Sans\", \"Segoe UI\", Arial, Helvetica, sans-serif",
          background: "#ECECE7",
          color: "#000000",
        }}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
