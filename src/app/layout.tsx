import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Any Site on Earth',
  description: 'Interactive 3D Earth with satellite imagery and 3D scene generation',
  icons: { icon: '/anysiteonearth_minimal_icon_dark.svg' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}