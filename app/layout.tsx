// @ts-nocheck
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://ai-literacy.pages.dev'),
  title: 'AI识字伴侣 — 让孩子爱上汉字',
  description: '1862个汉字，四级分级，AI驱动的儿童识字应用，适合3-6岁儿童',
  keywords: '识字,儿童识字,汉字学习,幼儿教育,AI识字,拼音,笔顺',
  authors: [{ name: '归零工作室' }],
  openGraph: {
    title: 'AI识字伴侣 — 让孩子爱上汉字',
    description: '1862个汉字，四级分级，AI驱动的儿童识字应用',
    type: 'website',
    locale: 'zh_CN',
    images: [{
      url: '/images/og-image.png',
      width: 512,
      height: 512,
      alt: 'AI识字伴侣',
    }],
  },
  twitter: {
    card: 'summary',
    title: 'AI识字伴侣 — 让孩子爱上汉字',
    description: '1862个汉字，四级分级，AI驱动的儿童识字应用',
    images: ['/images/og-image.png'],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'AI识字',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="theme-color" content="#F97316" />
      </head>
      <body className="bg-warm-50 text-gray-900 min-h-screen overflow-x-hidden">
        {/* @ts-expect-error Async Server Component */}
        <SyncProviderWrapper><AppProviderWrapper>{children}</AppProviderWrapper></SyncProviderWrapper>
      </body>
    </html>
  )
}

// Client wrapper for SyncProvider
import dynamic from 'next/dynamic'
const SyncProviderWrapper = dynamic(() => import('../components/SyncProvider'), { ssr: false })
const AppProviderWrapper = dynamic(() => import('../components/AppProvider'), { ssr: false })
