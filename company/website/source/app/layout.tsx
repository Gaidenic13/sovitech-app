import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LanguageProvider } from "@/lib/language-context"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "600", "800", "900"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://sovitech-website-gaidenic.vercel.app"),
  title: "Sovitech Control - Sisteme de automatizare si BMS",
  description:
    "Sovitech Control ofera solutii complete pentru automatizare si Building Management Systems (BMS). Proiectare, executie si intretinere sisteme BMS cu tehnologie SAUTER din Elvetia.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ro" className={`${inter.variable} bg-[#F5F4F0]`}>
      <body className="font-sans antialiased flex flex-col min-h-screen bg-[#F5F4F0] text-[#0D2E2B]">
        <LanguageProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
