import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";

import { StoreProvider } from "@/store/StoreProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { PageTitle } from "@/components/layout/PageTitle";
import { Toaster } from "@/components/ui/Toaster";
import { BRAND } from "@/lib/brand";
import { hex } from "@/styles/tokens";
import "./globals.css";

// Inter, the agent's typeface (OFL, fonts/LICENSE-Inter.txt). next/font preloads it and sizes the
// fallback to Inter's metrics, so text does not jump when the font arrives (web practices, D-89).
const inter = localFont({
  src: [
    { path: "./fonts/Inter-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Inter-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Inter-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Inter-Bold.ttf", weight: "700 800", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: "RX Vision",
  description: "Enterprise business-management platform.",
  icons: { icon: BRAND.logo, apple: BRAND.logo },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: hex.panel,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Review S-4: reading the request makes every page render per request, which is what lets the
  // framework stamp this response's nonce on its scripts (a prerendered page has none and the
  // Content-Security-Policy would block it).
  await headers();
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <StoreProvider>
          <QueryProvider>
            <PageTitle />
            {children}
            <Toaster />
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
