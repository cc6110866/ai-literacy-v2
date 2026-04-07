'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50">
        <div className="flex items-center justify-center min-h-screen px-5">
          <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm shadow-lg">
            <div className="text-6xl mb-4">🐱</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">哎呀，出了点小问题</h2>
            <p className="text-gray-400 text-sm mb-6">别担心，点击下面的按钮重试一下</p>
            <button
              onClick={reset}
              className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-lg shadow-lg shadow-orange-500/30 active:scale-95 transition-transform"
            >
              重新试试 🔄
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
