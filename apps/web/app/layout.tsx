import { Geist_Mono, Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ToastProvider } from "@/components/ToastProvider"
import { AuthProvider } from "@/components/AuthProvider"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <head>
        <title>Appointment AI — Smart Booking Assistant</title>
        <meta name="description" content="Appointment AI helps users book and manage appointments using natural language and AI assistance." />
        <meta property="og:title" content="Appointment AI" />
        <meta property="og:description" content="Book appointments using natural language with AI-powered parsing and scheduling." />
        <meta property="og:image" content="/favicon.ico" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="/favicon.ico" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="relative min-h-screen overflow-x-hidden">
        {/* Ambient Background Effects */}
        <div className="inset-0 pointer-events-none fixed z-0 overflow-hidden">
          <div className="-top-40 -right-40 h-80 w-80 bg-primary/20 dark:bg-primary/10 absolute rounded-full blur-[120px]" />
          <div className="-left-40 h-80 w-80 bg-purple-500/20 dark:bg-purple-500/10 absolute top-1/2 rounded-full blur-[120px]" />
        </div>

        {/* Content Layer */}
        <div className="relative z-10">
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>{children}</AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  )
}
