import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Monitor de Reseñas de Google',
  description: 'Sistema automatizado para detectar y notificar nuevas reseñas de Google Maps',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

