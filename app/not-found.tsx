export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen px-5">
      <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm shadow-lg">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">页面走丢了</h2>
        <p className="text-gray-400 text-sm mb-6">这个页面不存在哦</p>
        <a
          href="/"
          className="block w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-lg text-center shadow-lg shadow-orange-500/30"
        >
          回到首页 🏠
        </a>
      </div>
    </div>
  )
}
