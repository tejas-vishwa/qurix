import type { Metadata, Viewport } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "QURIX | Intelligent Health Tracker",
  description: "Digitize your lab reports, visualize health trends, and share securely with your doctor.",
  icons: {
    icon: "/qurix-logo.svg",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F9FC" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0F1D" },
  ],
  colorScheme: "light dark",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var root = document.documentElement;
                  root.classList.remove('light');
                  if (isDark) {
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                  } else {
                    root.classList.remove('dark');
                    root.style.colorScheme = 'light';
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background antialiased flex flex-col font-sans">
        <ClerkProvider
          dynamic
          appearance={{
            variables: {
              colorPrimary: "#059669",
              colorTextOnPrimaryBackground: "#ffffff",
            },
          }}
        >
          <Providers>
            {children}
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
