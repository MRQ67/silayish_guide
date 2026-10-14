import type { Metadata } from "next"
import { Geist, Geist_Mono, Stardos_Stencil } from "next/font/google"
import { Header } from "@/components/header"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const stardosStencil = Stardos_Stencil({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-stencil",
})

export const metadata: Metadata = {
  title: "DDU Campus Guide | Dire Dawa University",
  description:
    "Campus navigation and service information system for Dire Dawa University",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${stardosStencil.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  )
}
