import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-wght-normal.woff2", style: "normal" },
    { path: "./fonts/inter-latin-wght-italic.woff2", style: "italic" },
  ],
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
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
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning className={inter.variable}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
