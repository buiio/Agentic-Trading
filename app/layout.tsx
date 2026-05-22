import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arlo Behavioral Receipt",
  description: "A Hyperliquid-native behavioral receipt for post-trade coaching",
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
