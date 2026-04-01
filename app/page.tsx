'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BottomNav from '../components/BottomNav'

export default function Home() {
  const [stats, setStats] = useState({
    totalLearned: 0, totalChars: 1862, todayLearned: 0, todayTarget: 5,
    streak: 0, mastered: 0, dueReview: 0, currentLevel: 1, correctRate: 0,
    weekHistory: [] as { date: string; count: number }[],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const uid = localStorage.getItem('ai-literacy-uid') || ''
        if (!uid) return
        const res = await fetch(`https://ai-literacy-companion.pages.dev/api/progress?userId=${uid}`)
        const data = await res.json()
        if (data.success) {
          const p = data.data
          let lv = 1
          if (p.totalLearned >= 960) lv = 4
          else if (p.totalLearned >= 195) lv = 3
          else if (p.totalLearned >= 30) lv = 2
          setStats({
            totalLearned: p.totalLearned, totalChars: 1862,
            todayLearned: p.today.newCount + p.today.reviewCount,
            todayTarget: parseInt(localStorage.getItem('ai-literacy-daily-target') || '5'),
            streak: p.streak, mastered: p.mastered, dueReview: p.dueReview,
            currentLevel: lv, correctRate: p.today.correctRate,
            weekHistory: (p.weekHistory || []).map((d: any) => ({ date: d.date, count: d.newCount + d.reviewCount })),
          })
        }
      } catch {} finally { setLoading(false) }
    }
    load()
  }, [])

  const progressPct = Math.round((stats.totalLearned / stats.totalChars) * 100)
  const lvEmoji: Record<number, string> = { 1: '🌱', 2: '🌿', 3: '🌳', 4: '🌲' }
  const lvName: Record<number, string> = { 1: '启蒙', 2: '基础', 3: '进阶', 4: '衔接' }

  return (
    <div className="pb-24">
      {/* 顶部 */}
      <div className="bg-gradient-to-b from-orange-400 to-amber-400 px-6 pt-14 pb-8 rounded-b-[32px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐯</span>
            <span className="text-white font-bold text-xl">AI识字伴侣</span>
          </div>
          <Link href="/parent" className="text-white/80 text-xl">⚙️</Link>
        </div>

        <h1 className="text-white text-2xl font-bold mb-2">
          {stats.todayLearned >= stats.todayTarget ? '太棒了！🎉' : stats.todayLearned > 0 ? '继续加油！💪' : '你好，小老虎！🐯'}
        </h1>
        <p className="text-white/80 text-sm mb-6">
          {stats.todayLearned >= stats.todayTarget
            ? `今日任务完成！已认识 ${stats.totalLearned} 个字`
            : stats.todayLearned > 0
            ? `今天已学 ${stats.todayLearned} 个，还差 ${stats.todayTarget - stats.todayLearned} 个`
            : '准备好开始今天的识字冒险了吗？'}
        </p>

        {/* 进度珠子 */}
        <div className="flex gap-2">
          {Array.from({ length: stats.todayTarget }, (_, i) => (
            <div key={i} className={`flex-1 h-3 rounded-full transition-all ${i < stats.todayLearned ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="px-5 -mt-4">
        {/* CTA */}
        <Link
          href={stats.dueReview > 0 ? '/review' : '/learn'}
          className="block w-full bg-orange-500 text-white text-center font-bold text-lg py-4 rounded-2xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors"
        >
          {stats.dueReview > 0 ? `📖 ${stats.dueReview} 个字待复习` : '📚 开始学习'}
        </Link>

        {/* 快捷入口 */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { href: '/learn', emoji: '📚', label: '识字', bg: 'bg-blue-50' },
            { href: '/practice', emoji: '✏️', label: '练习', bg: 'bg-purple-50' },
            { href: '/achievement', emoji: '🏆', label: '成就', bg: 'bg-amber-50' },
          ].map((item) => (
            <Link key={item.label} href={item.href} className={`${item.bg} rounded-2xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow`}>
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-sm font-bold text-gray-700">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-gray-400 font-medium">已学</div>
            <div className="text-3xl font-black text-orange-500">{stats.totalLearned}</div>
            <div className="text-xs text-gray-300">个汉字</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-gray-400 font-medium">掌握</div>
            <div className="text-3xl font-black text-green-500">{stats.mastered}</div>
            <div className="text-xs text-gray-300">个字</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-gray-400 font-medium">连续</div>
            <div className="text-3xl font-black text-orange-500">🔥 {stats.streak}</div>
            <div className="text-xs text-gray-300">天</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-gray-400 font-medium">待复习</div>
            <div className="text-3xl font-black text-pink-500">{stats.dueReview}</div>
            <div className="text-xs text-gray-300">个字</div>
          </div>
        </div>

        {/* 总进度 */}
        <div className="bg-white rounded-2xl p-5 mt-5 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-gray-700">总进度</span>
            <span className="text-sm font-bold text-orange-500">{progressPct}%（{stats.totalLearned}/{stats.totalChars}）</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-400 via-amber-400 to-pink-400 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
            <span>{lvEmoji[stats.currentLevel]}</span>
            <span>L{stats.currentLevel} {lvName[stats.currentLevel]}</span>
            <span>·</span>
            <span>已掌握 {stats.mastered} 字</span>
          </div>
        </div>

        {/* 本周学习 */}
        {stats.weekHistory.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-5 mt-5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-gray-700">📊 本周学习</span>
              <span className="text-xs font-bold text-orange-500">近 7 天</span>
            </div>
            <div className="flex items-end justify-between gap-2 h-24">
              {stats.weekHistory.map((d, i) => {
                const max = Math.max(...stats.weekHistory.map(w => w.count), 1)
                const h = Math.max(8, (d.count / max) * 80)
                const colors = ['bg-orange-400', 'bg-amber-400', 'bg-pink-400', 'bg-orange-400', 'bg-amber-400', 'bg-pink-400', 'bg-orange-400']
                const isToday = i === stats.weekHistory.length - 1
                const weekDays = ['日', '一', '二', '三', '四', '五', '六']
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    {d.count > 0 && <span className="text-[10px] text-gray-500 font-bold">{d.count}</span>}
                    <div className={`w-full ${colors[i % 7]} rounded-lg ${isToday ? 'shadow-md shadow-orange-300' : ''}`} style={{ height: h }} />
                    <span className={`text-[10px] ${isToday ? 'text-orange-500 font-bold' : 'text-gray-400'}`}>{weekDays[new Date(d.date).getDay()]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  )
}
