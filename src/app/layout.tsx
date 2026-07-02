import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SettleHQ",
  description: "Obligation-first collections and reconciliation for Nigerian organizations.",
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
