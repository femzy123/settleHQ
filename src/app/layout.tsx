import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import Script from "next/script";

import { ThemeProvider } from "@/components/theme-provider";
import { getThemeBootScript } from "@/lib/theme";

import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "SettleHQ",
  description:
    "Obligation-first collections and reconciliation for Nigerian organizations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
        <body suppressHydrationWarning>
          <Script
            id="settlehq-theme"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: getThemeBootScript() }}
          />
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
