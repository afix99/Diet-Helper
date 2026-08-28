import type { Metadata, Viewport } from 'next'
import { AuthGate } from '@/components/AuthGate'
import { DataProvider } from '@/lib/store/provider'
import { TabBar } from '@/components/TabBar'
import { InstallHint } from '@/components/InstallHint'
import { ServiceWorker } from '@/components/ServiceWorker'
import './globals.css'

export const metadata: Metadata = {
  title: 'Memey Diet Planner',
  description: 'Daily diet planner — log meals, track progress, earn badges.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Diet Planner' },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    // iOS requests this path directly when adding to the home screen.
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fffafc' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1418' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Let the notch area take the page background on installed iOS PWAs.
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DataProvider>
          <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col">
            <main className="flex-1 px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
              <AuthGate>{children}</AuthGate>
            </main>
            <InstallHint />
            <ServiceWorker />
            <TabBar />
          </div>
        </DataProvider>
      </body>
    </html>
  )
}
