import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/Toaster";
import { SessionProvider } from "@/lib/client/session";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Zevora — кейсы CS2, апгрейд и вывод скинов",
    template: "%s · Zevora",
  },
  description:
    "Открывай кейсы, улучшай предметы и собирай свой инвентарь в Zevora. Прозрачные шансы, мгновенная продажа и быстрый вывод скинов CS2.",
  applicationName: "Zevora",
  keywords: ["Zevora", "CS2", "кейсы", "апгрейд", "скины", "инвентарь"],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    title: "Zevora — открой. испытай. забери.",
    description:
      "Игровая платформа CS2: кейсы, апгрейд предметов, инвентарь и вывод.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#05060C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="min-h-screen">
        <SessionProvider>
          <Navbar />
          {/* Top padding clears the fixed navbar; bottom clears the mobile tabs. */}
          <main className="pb-28 pt-16 sm:pt-[68px] lg:pb-0">{children}</main>
          <Footer />
          <MobileNav />
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
