import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AccentProvider } from "@/components/accent-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inoma Hub",
  description: "Internal operations platform for Inoma Digital.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ACCENT_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
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
