import Link from 'next/link'

export default function BottomNav({ active }: { active: string }) {
  const items = [
    { href: '/', emoji: '🏠', label: '首页', id: 'home' },
    { href: '/learn', emoji: '📚', label: '识字', id: 'learn' },
    { href: '/practice', emoji: '✏️', label: '练习', id: 'practice' },
    { href: '/achievement', emoji: '🏆', label: '成就', id: 'achievement' },
    { href: '/parent', emoji: '👨‍👩‍👧', label: '家长', id: 'parent' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-100">
      <div className="max-w-lg mx-auto flex justify-around items-center pt-2 pb-6">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${
              active === item.id
                ? 'bg-orange-50 text-orange-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-xl">{item.emoji}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
