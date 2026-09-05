import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import { AccentProvider } from "@/components/accent-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dossier",
  description: "Internal operations platform for Inoma Digital.",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
};

// Applies the persisted accent before paint, mirroring next-themes' own
// no-flash approach — without this, a saved accent would only appear
// after AccentProvider's effect runs on the client.
const ACCENT_INIT_SCRIPT = `(function(){try{var a=localStorage.getItem('inoma-accent');if(a)document.documentElement.setAttribute('data-accent',a);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="accent-init" strategy="beforeInteractive">
          {ACCENT_INIT_SCRIPT}
        </Script>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AccentProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
          </AccentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
