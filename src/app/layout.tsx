import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import { StoreProvider } from "@/store/StoreProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { Toaster } from "@/components/ui/Toaster";
import { BRAND } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rx Vision",
  description: "Enterprise business-management platform.",
  icons: { icon: BRAND.logo, apple: BRAND.logo },
};

export const viewport: Viewport = {
  themeColor: "#5b5bf0",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Review S-4: reading the request makes every page render per request, which is what lets the
  // framework stamp this response's nonce on its scripts (a prerendered page has none and the
  // Content-Security-Policy would block it).
  await headers();
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <StoreProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
