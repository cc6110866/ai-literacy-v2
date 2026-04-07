// @ts-nocheck
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI识字伴侣 — 让孩子爱上汉字',
  description: '1862个汉字，四级分级，AI驱动的儿童识字应用',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-warm-50 text-gray-900 min-h-screen overflow-x-hidden">
        {/* @ts-expect-error Async Server Component */}
        <SyncProviderWrapper>{children}</SyncProviderWrapper>
      </body>
    </html>
  )
}

// Client wrapper for SyncProvider
import dynamic from 'next/dynamic'
const SyncProviderWrapper = dynamic(() => import('../components/SyncProvider'), { ssr: false })
