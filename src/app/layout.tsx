import type { Metadata, Viewport } from 'next'
import { AuthGate } from '@/components/AuthGate'
import { DataProvider } from '@/lib/store/provider'
import { OnboardingGate } from '@/components/OnboardingGate'
import { TabBar } from '@/components/TabBar'
import { InstallHint } from '@/components/InstallHint'
import { ServiceWorker } from '@/components/ServiceWorker'
import { DEFAULT_THEME, THEME_COLORS, THEME_KEY } from '@/lib/theme'
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
  // A single value, kept in sync by applyTheme() in src/lib/theme.ts. Media-query
  // variants would fight the explicit choice, since 'light' on a dark phone has
  // to win over prefers-color-scheme.
  themeColor: '#faf6f8',
  width: 'device-width',
  initialScale: 1,
  // Let the notch area take the page background on installed iOS PWAs.
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Runs before first paint, so an installed app never flashes the wrong
          theme on launch. Deliberately inline and dependency-free: anything
          loaded as a module would run after the first frame, which is exactly
          the flash this prevents. Kept in sync with src/lib/theme.ts.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=localStorage.getItem(${JSON.stringify(
              THEME_KEY
            )});if(c!=='light'&&c!=='dark'&&c!=='system')c=${JSON.stringify(
              DEFAULT_THEME
            )};if(c==='system'){document.documentElement.removeAttribute('data-theme')}else{document.documentElement.setAttribute('data-theme',c)}var r=c==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):c;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',r==='dark'?${JSON.stringify(
              THEME_COLORS.dark
            )}:${JSON.stringify(THEME_COLORS.light)})}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <DataProvider>
          <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col">
            <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+108px)] pt-[max(0.5rem,env(safe-area-inset-top))]">
              <AuthGate>{children}</AuthGate>
            </main>
            <OnboardingGate />
            <InstallHint />
            <ServiceWorker />
            <TabBar />
          </div>
        </DataProvider>
      </body>
    </html>
  )
}
