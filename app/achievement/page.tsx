'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Trophy, ChevronLeft, Flame, Star, BookOpen, CheckCircle2 } from 'lucide-react'
import BottomNav from '../../components/BottomNav'

interface Achievement {
  id: string; icon: string; name: string; desc: string; target: number; type: 'learned' | 'streak' | 'perfect' | 'review'
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', icon: '🌱', name: '初识汉字', desc: '学会第1个字', target: 1, type: 'learned' },
  { id: 'ten', icon: '📖', name: '小小读书郎', desc: '学会10个字', target: 10, type: 'learned' },
  { id: 'fifty', icon: '📚', name: '识字小学者', desc: '学会50个字', target: 50, type: 'learned' },
  { id: 'hundred', icon: '🎓', name: '识字小达人', desc: '学会100个字', target: 100, type: 'learned' },
  { id: 'two_hundred', icon: '🌟', name: '识字高手', desc: '学会200个字', target: 200, type: 'learned' },
  { id: 'five_hundred', icon: '🏆', name: '识字大师', desc: '学会500个字', target: 500, type: 'learned' },
  { id: 'thousand', icon: '👑', name: '汉字大王', desc: '学会1000个字', target: 1000, type: 'learned' },
  { id: 'all', icon: '🐉', name: '汉字之神', desc: '学会全部1862个字', target: 1862, type: 'learned' },
  { id: 'streak3', icon: '🔥', name: '三天小能手', desc: '连续学习3天', target: 3, type: 'streak' },
  { id: 'streak7', icon: '🔥', name: '一周坚持', desc: '连续学习7天', target: 7, type: 'streak' },
  { id: 'streak30', icon: '🔥', name: '月度之星', desc: '连续学习30天', target: 30, type: 'streak' },
  { id: 'streak100', icon: '💫', name: '百日传奇', desc: '连续学习100天', target: 100, type: 'streak' },
  { id: 'perfect1', icon: '💯', name: '完美练习', desc: '一次练习全部答对', target: 1, type: 'perfect' },
  { id: 'perfect5', icon: '⭐', name: '五次满分', desc: '5次练习全部答对', target: 5, type: 'perfect' },
  { id: 'perfect10', icon: '🏅', name: '满分达人', desc: '10次练习全部答对', target: 10, type: 'perfect' },
  { id: 'review10', icon: '📖', name: '复习新手', desc: '完成10次复习', target: 10, type: 'review' },
  { id: 'review50', icon: '📖', name: '复习达人', desc: '完成50次复习', target: 50, type: 'review' },
]

export default function AchievementPage() {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({ totalLearned: 0, streak: 0, perfectCount: 0, reviewCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function loadAchievements() {
      try {
        // 统一从 localStorage 读取（与首页、识字页一致）
        const learnedStr = localStorage.getItem('ai-literacy-learned') || '[]'
        const totalLearned = JSON.parse(learnedStr).length
        const streak = parseInt(localStorage.getItem('ai-literacy-streak') || '0')
        const perfectCount = parseInt(localStorage.getItem('ai-literacy-perfect') || '0')
        const reviewCount = parseInt(localStorage.getItem('ai-literacy-review-count') || '0')
        setStats({ totalLearned, streak, perfectCount, reviewCount })
        const unlockedSet = new Set<string>()
        for (const a of ACHIEVEMENTS) {
          let current = 0
          switch (a.type) { case 'learned': current = totalLearned; break; case 'streak': current = streak; break; case 'perfect': current = perfectCount; break; case 'review': current = reviewCount; break }
          if (current >= a.target) unlockedSet.add(a.id)
        }
        setUnlocked(unlockedSet)
      } catch {
        setStats(prev => ({ ...prev, totalLearned: 0 }))
      } finally { setLoading(false) }
    }
    loadAchievements()
  }, [])

  if (loading) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400"><ChevronLeft size={22} /></Link>
          <h1 className="font-bold text-gray-800">成就</h1>
          <Trophy size={18} className="ml-auto text-orange-500" />
        </div>
        <div className="flex flex-col items-center justify-center" style={{ minHeight: '70vh' }}>
          <Image src="/images/icon-achievement.webp" alt="" width={80} height={80} className="mb-4 opacity-60" />
          <p className="text-gray-400">加载成就中...</p>
        </div>
        <BottomNav active="parent" />
      </div>
    )
  }

  const unlockedCount = unlocked.size
  const totalCount = ACHIEVEMENTS.length
  const completionPct = Math.round((unlockedCount / totalCount) * 100)

  const renderGroup = (title: string, type: string, getValue: (a: Achievement) => number) => {
    const items = ACHIEVEMENTS.filter(a => a.type === type)
    return (
      <div className="mt-4">
        <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">{title}</h3>
        <div className={`grid gap-2 ${type === 'perfect' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {items.map(a => {
            const isUnlocked = unlocked.has(a.id)
            const current = getValue(a)
            const progress = Math.min(100, Math.round((current / a.target) * 100))
            return (
              <div key={a.id} className={`rounded-2xl p-3 ${
                isUnlocked ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-200 shadow-sm' : 'bg-orange-50/50 border border-orange-100'
              }`}>
                <div className={`flex items-center gap-2 ${type === 'perfect' ? 'flex-col text-center' : ''}`}>
                  <span className={`text-2xl ${isUnlocked ? '' : 'grayscale opacity-40'}`}>{a.icon}</span>
                  <div>
                    <div className={`text-xs font-bold ${isUnlocked ? 'text-orange-700' : 'text-gray-400'}`}>{a.name}</div>
                    <div className="text-[10px] text-gray-300">{a.desc}</div>
                  </div>
                </div>
                {!isUnlocked && (
                  <div className="mt-2">
                    <div className="h-1 bg-orange-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-300 text-right mt-1">{current}/{a.target}</div>
                  </div>
                )}
                {isUnlocked && (
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-orange-500">
                    <CheckCircle2 size={12} /> 已解锁
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* 顶栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <Link href="/" className="text-gray-400"><ChevronLeft size={22} /></Link>
        <h1 className="font-bold text-gray-800">成就</h1>
        <span className="ml-auto text-sm font-bold text-orange-500">{unlockedCount}/{totalCount}</span>
      </div>

      <div className="px-5 pt-4">
        {/* 总览卡片 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">成就完成度</span>
            <span className="text-sm font-bold text-orange-500">{completionPct}%</span>
          </div>
          <div className="h-2.5 bg-orange-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="text-center">
              <div className="text-lg font-bold text-orange-500">{stats.totalLearned}</div>
              <div className="text-[10px] text-gray-400">已识字</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-orange-500"><Flame size={14} />{stats.streak}</div>
              <div className="text-[10px] text-gray-400">连续天</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-green-500"><Star size={14} />{stats.perfectCount}</div>
              <div className="text-[10px] text-gray-400">满分</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-purple-500"><BookOpen size={14} />{stats.reviewCount}</div>
              <div className="text-[10px] text-gray-400">复习</div>
            </div>
          </div>
        </div>

        {/* 成就分组 */}
        <div className="pb-4">
          {renderGroup('识字里程碑', 'learned', a => stats.totalLearned)}
          {renderGroup('连续学习', 'streak', a => stats.streak)}
          {renderGroup('完美练习', 'perfect', a => stats.perfectCount)}
          {renderGroup('复习达人', 'review', a => stats.reviewCount)}
        </div>
      </div>

      <BottomNav active="parent" />
    </div>
  )
}
