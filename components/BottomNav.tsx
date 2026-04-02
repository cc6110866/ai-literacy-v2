import Link from 'next/link'
import { Home, BookOpen, PencilLine, Trophy, Users, RotateCcw } from 'lucide-react'

export default function BottomNav({ active }: { active: string }) {
  const items = [
    { href: '/', label: '首页', id: 'home', icon: Home },
    { href: '/learn', label: '识字', id: 'learn', icon: BookOpen },
    { href: '/practice', label: '练习', id: 'practice', icon: PencilLine },
    { href: '/review', label: '复习', id: 'review', icon: RotateCcw },
    { href: '/parent', label: '家长', id: 'parent', icon: Users },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-100">
      <div className="max-w-lg mx-auto flex justify-around items-center pt-2 pb-6">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${
                active === item.id
                  ? 'text-orange-500'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={22} strokeWidth={2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
