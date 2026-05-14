import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#0d0f0e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "SmartGuard",
    template: "%s | SmartGuard",
  },
  description:
    "Control de acceso industrial con registro en tiempo real, trazabilidad y monitoreo operativo.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SmartGuard",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning className={inter.variable}>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
