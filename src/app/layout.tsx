import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, DM_Mono } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SmartGuard",
    template: "%s | SmartGuard",
  },
  description:
    "Control de acceso industrial con registro en tiempo real, trazabilidad y monitoreo operativo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${barlow.variable} ${barlowCondensed.variable} ${dmMono.variable}`}
    >
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
