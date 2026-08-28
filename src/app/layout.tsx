import type { Metadata, Viewport } from 'next'
import { AuthGate } from '@/components/AuthGate'
import { DataProvider } from '@/lib/store/provider'
import { TabBar } from '@/components/TabBar'
import { InstallHint } from '@/components/InstallHint'
import { ServiceWorker } from '@/components/ServiceWorker'
import './globals.css'

export const metadata: Metadata = {
  title: 'Memey Diet Planner',
  description: 'Pelan diet harian — log makanan, jejak progres, kutip lencana.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Diet Planner' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdfaf6' },
    { media: '(prefers-color-scheme: dark)', color: '#161413' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Let the notch area take the page background on installed iOS PWAs.
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
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
