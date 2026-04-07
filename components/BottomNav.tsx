'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Home, BookOpen, PencilLine, Trophy, Users, RotateCcw, Star } from 'lucide-react'

export default function BottomNav({ active }: { active: string }) {
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return
      ticking.current = true

      requestAnimationFrame(() => {
        const currentY = window.scrollY
        const delta = currentY - lastScrollY.current
        const docHeight = document.documentElement.scrollHeight
        const windowHeight = window.innerHeight
        const distanceToBottom = docHeight - windowHeight - currentY

        if (distanceToBottom < 100) {
          setVisible(true)
        } else if (delta > 8) {
          setVisible(false)
        } else if (delta < -8) {
          setVisible(true)
        }

        lastScrollY.current = currentY
        ticking.current = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const items = [
    { href: '/', label: '首页', id: 'home', icon: Home },
    { href: '/learn', label: '识字', id: 'learn', icon: BookOpen },
    { href: '/practice', label: '练习', id: 'practice', icon: PencilLine },
    { href: '/review', label: '复习', id: 'review', icon: RotateCcw },
    { href: '/achievement', label: '成就', id: 'achievement', icon: Star },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-100 transition-transform duration-300 ease-in-out"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
    >
      <div
        className="max-w-lg mx-auto flex justify-around items-center pt-2 pb-6"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all relative ${
                isActive ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {isActive && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-1 bg-orange-500 rounded-full" />
              )}
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
