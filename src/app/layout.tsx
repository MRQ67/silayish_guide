import type { Metadata } from "next"
import { DM_Sans, Stardos_Stencil } from "next/font/google"
import { Header } from "@/components/header"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
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
      className={`${dmSans.variable} ${stardosStencil.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  )
}
