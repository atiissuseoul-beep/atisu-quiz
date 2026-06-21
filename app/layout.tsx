import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '어티슈 제품 퀴즈',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex items-center justify-center">
        {children}
      </body>
    </html>
  )
}
