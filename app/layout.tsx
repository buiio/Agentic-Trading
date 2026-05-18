import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asteria Trading Agent",
  description: "Retail AI trading cockpit for Hyperliquid",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
