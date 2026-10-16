import type { Metadata, Viewport } from "next";

import { StoreProvider } from "@/store/StoreProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rx Vision",
  description: "Enterprise business-management platform.",
};

export const viewport: Viewport = {
  themeColor: "#5b5bf0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
