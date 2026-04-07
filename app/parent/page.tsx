'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Users, ChevronLeft, BarChart3, Settings, Target, Flame, Lightbulb, Info, Trophy, AlertCircle, Clock } from 'lucide-react'
import BottomNav from '../../components/BottomNav'
import { useAppContext } from '../../components/AppProvider'
import { getLocalDate, getDateDaysAgo } from '../../lib/utils'

interface WeekDay { date: string; newCount: number; reviewCount: number; total: number; correctRate: number }

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`
  const min = Math.floor(seconds / 60)
  const sec = Math.round(seconds % 60)
  if (min < 60) return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`
  const hour = Math.floor(min / 60)
  const remainMin = min % 60
  return `${hour}小时${remainMin}分`
}

export default function Parent() {
  const [stats, setStats] = useState({
    totalLearned: 0, totalChars: 1862, mastered: 0, streak: 0,
    todayNew: 0, todayReview: 0, todayRate: 0,
    weekData: [] as WeekDay[], avgDaily: 0, estimatedDays: 0,
    currentLevel: 1, levelProgress: 0,
  })
  const [wrongChars, setWrongChars] = useState<{ character: string; pinyin: string; wrongCount: number }[]>([])
  const [studyTime, setStudyTime] = useState({ today: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'report' | 'settings'>('report')
  const [dailyTarget, setDailyTarget] = useState(5)
  const [difficultyMode, setDifficultyMode] = useState('normal')
  const [forceLevel, setForceLevel] = useState(0)

  const { stats: ctxStats } = useAppContext()
  const userId = ctxStats.userId

  const API = ''

  useEffect(() => {
    setDailyTarget(ctxStats.dailyTarget)
    setForceLevel(ctxStats.forceLevel)
    if (typeof window !== 'undefined') {
      setDifficultyMode(localStorage.getItem('ai-literacy-mode') || 'normal')
    }
  }, [])

  useEffect(() => {
    function loadParentData() {
      try {
        // 统一从 localStorage 读取（与首页、识字页一致）
        const learnedIds = ctxStats.learnedIds
        const progress = ctxStats.progress

        const totalLearned = learnedIds.length
        const mastered = learnedIds.filter(id => progress[id]?.status === 'mastered' || (progress[id]?.count || 0) >= 5).length
        const streak = ctxStats.streak

        // 今日数据
        const today = getLocalDate()
        const todayKey = `ai-literacy-today-learned-${today}`
        const todayIds: number[] = JSON.parse(localStorage.getItem(todayKey) || '[]')
        const todayNew = todayIds.length
        const todayReview = ctxStats.today.reviewCount
        const todayCorrect = ctxStats.today.correctCount
        const todayTotal = ctxStats.today.totalCount
        const todayRate = todayTotal > 0 ? todayCorrect / todayTotal : 0

        // 级别进度
        let currentLevel = 1, levelStart = 0, levelSize = 169
        if (totalLearned >= 1738) { currentLevel = 4; levelStart = 1738; levelSize = 124 }
        else if (totalLearned >= 960) { currentLevel = 3; levelStart = 960; levelSize = 778 }
        else if (totalLearned >= 169) { currentLevel = 2; levelStart = 169; levelSize = 791 }
        const levelProgress = Math.min(100, Math.round(((totalLearned - levelStart) / levelSize) * 100))

        // 本周数据（从 localStorage 读取每日记录）
        const weekData: WeekDay[] = []
        for (let i = 6; i >= 0; i--) {
          const dateStr = getDateDaysAgo(6 - i)
          const dayKey = `ai-literacy-today-learned-${dateStr}`
          const dayIds: number[] = JSON.parse(localStorage.getItem(dayKey) || '[]')
          const dayReview = parseInt(localStorage.getItem(`ai-literacy-today-review-count-${dateStr}`) || '0')
          const dayCorrect = parseInt(localStorage.getItem(`ai-literacy-today-correct-${dateStr}`) || '0')
          const dayTotal = parseInt(localStorage.getItem(`ai-literacy-today-total-${dateStr}`) || '0')
          const dayRate = dayTotal > 0 ? dayCorrect / dayTotal : 0
          weekData.push({ date: dateStr, newCount: dayIds.length, reviewCount: dayReview, total: dayIds.length + dayReview, correctRate: dayRate })
        }
        const avgDaily = weekData.reduce((s, d) => s + d.total, 0) / 7
        const remaining = 1862 - totalLearned
        const estimatedDays = avgDaily > 0 ? Math.ceil(remaining / avgDaily) : 0

        setStats({ totalLearned, totalChars: 1862, mastered, streak, todayNew, todayReview, todayRate, weekData, avgDaily: Math.round(avgDaily * 10) / 10, estimatedDays, currentLevel, levelProgress })

        // 加载错字排行（从今日和近 7 天的错误数据）
        const wrongMap: Record<string, { character: string; pinyin: string; wrongCount: number }> = {}
        for (let i = 0; i <= 6; i++) {
          const dateStr = getDateDaysAgo(i)
          const dayCorrect = parseInt(localStorage.getItem(`ai-literacy-today-correct-${dateStr}`) || '0')
          const dayTotal = parseInt(localStorage.getItem(`ai-literacy-today-total-${dateStr}`) || '0')
          // 从每日进度中找错字（这个是估算，更精确的需要 API 支持）
        }
        // 从 progress 中找未掌握的字（需要复习的 = 相对薄弱的）
        const weakChars = learnedIds
          .filter(id => {
            const p = progress[id as number]
            return p && p.status !== 'mastered' && (p.count || 0) > 0
          })
          .slice(0, 10)
        if (weakChars.length > 0) {
          // 从字符缓存获取信息
          const charCacheStr = localStorage.getItem('ai-literacy-char-cache') || '{}'
          const charCache: Record<number, { character: string; pinyin: string }> = JSON.parse(charCacheStr)
          weakChars.forEach(id => {
            const cached = charCache[id]
            if (cached) {
              wrongMap[cached.character] = {
                character: cached.character,
                pinyin: cached.pinyin || '',
                wrongCount: (wrongMap[cached.character]?.wrongCount || 0) + 1,
              }
            }
          })
        }
        setWrongChars(Object.values(wrongMap).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 10))

        // 学习时长估算（每次练习约 30 秒/字）
        const totalTime = weekData.reduce((s, d) => s + d.total, 0)
        const todayTime = weekData.length > 0 ? weekData[weekData.length - 1].total * 30 : 0
        setStudyTime({ today: todayTime, total: totalTime * 30 })
      } catch {
        setStats(prev => ({ ...prev, totalLearned: ctxStats.learnedIds.length }))
      } finally { setLoading(false) }
    }
    loadParentData()
  }, [])

  const progressPct = Math.round((stats.totalLearned / stats.totalChars) * 100)
  const levelName: Record<number, string> = { 1: '启蒙', 2: '基础', 3: '进阶', 4: '衔接' }
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  if (loading) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 pt-4 pb-4 safe-area-top flex items-center gap-3">
          <Link href="/" className="text-gray-400"><ChevronLeft size={22} /></Link>
          <h1 className="font-bold text-gray-800">家长中心</h1>
          <Users size={18} className="ml-auto text-orange-500" />
        </div>
        <div className="flex flex-col items-center justify-center" style={{ minHeight: '70vh' }}>
          <Image src="/images/icon-parent.webp" alt="" width={80} height={80} className="mb-4 opacity-60" />
          <p className="text-gray-400">加载中...</p>
        </div>
        <BottomNav active="home" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* 顶栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 pt-4 pb-4 safe-area-top flex items-center gap-3">
        <Link href="/" className="text-gray-400"><ChevronLeft size={22} /></Link>
        <h1 className="font-bold text-gray-800">家长中心</h1>
        <Users size={18} className="ml-auto text-orange-500" />
      </div>

      {/* Tab */}
      <div className="sticky top-[57px] z-30 flex bg-white border-b border-orange-100">
        <button onClick={() => setTab('report')}
          className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
            tab === 'report' ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent'
          }`}>
          <span className="flex items-center justify-center gap-1.5"><BarChart3 size={15} /> 学习报告</span>
        </button>
        <button onClick={() => setTab('settings')}
          className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
            tab === 'settings' ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent'
          }`}>
          <span className="flex items-center justify-center gap-1.5"><Settings size={15} /> 设置</span>
        </button>
      </div>

      {tab === 'report' ? (
        <div className="px-5 pt-4 pb-6">
          {/* 今日报告 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">今日报告</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-orange-50 rounded-2xl p-3 text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.todayNew}</div>
                <div className="text-[10px] text-gray-400">新学</div>
              </div>
              <div className="bg-pink-50 rounded-2xl p-3 text-center">
                <div className="text-2xl font-bold text-pink-500">{stats.todayReview}</div>
                <div className="text-[10px] text-gray-400">复习</div>
              </div>
              <div className="bg-green-50 rounded-2xl p-3 text-center">
                <div className="text-2xl font-bold text-green-500">{Math.round(stats.todayRate * 100)}%</div>
                <div className="text-[10px] text-gray-400">正确率</div>
              </div>
            </div>
          </div>

          {/* 总进度 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">总进度</h3>
            <div className="flex justify-between items-end mb-2">
              <div>
                <span className="text-3xl font-black text-orange-500">{stats.totalLearned}</span>
                <span className="text-sm text-gray-400"> / {stats.totalChars}</span>
              </div>
              <span className="text-lg font-bold text-orange-500">{progressPct}%</span>
            </div>
            <div className="h-3 bg-orange-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-400 via-amber-400 to-pink-400 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">已掌握</span>
                <span className="font-bold text-green-500">{stats.mastered}</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-orange-400" />
                <span className="text-gray-400">连续</span>
                <span className="font-bold text-orange-500">{stats.streak} 天</span>
              </div>
            </div>
            <div className="mt-3 bg-orange-50 rounded-2xl p-3">
              <div className="flex items-center gap-2 text-sm">
                <Target size={14} className="text-orange-500" />
                <span className="font-semibold text-orange-700">L{stats.currentLevel} {levelName[stats.currentLevel]}</span>
                <span className="text-orange-300">·</span>
                <span className="text-orange-500">{stats.levelProgress}% 完成</span>
              </div>
              <div className="h-1.5 bg-orange-100 rounded-full mt-2">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${stats.levelProgress}%` }} />
              </div>
            </div>
          </div>

          {/* 本周学习 */}
          <div className="bg-orange-50 rounded-2xl p-5 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-800">本周学习</h3>
              <span className="text-xs font-bold text-orange-500">近 7 天</span>
            </div>
            <div className="flex items-end justify-between gap-2 h-24">
              {stats.weekData.map((d, i) => {
                const maxTotal = Math.max(...stats.weekData.map(w => w.total), 1)
                const h = Math.max(4, (d.total / maxTotal) * 80)
                const isToday = i === 6
                const colors = ['bg-orange-400', 'bg-amber-400', 'bg-pink-400', 'bg-orange-400', 'bg-amber-400', 'bg-pink-400', 'bg-orange-400']
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    {d.total > 0 && <span className="text-[10px] text-gray-500 font-bold">{d.total}</span>}
                    <div className={`w-full ${colors[i % 7]} rounded-lg ${isToday ? 'shadow-md shadow-orange-300' : ''}`} style={{ height: h }} />
                    <span className={`text-[10px] ${isToday ? 'text-orange-500 font-bold' : 'text-gray-400'}`}>{weekDays[new Date(d.date).getDay()]}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 text-sm text-gray-500 flex justify-between">
              <span>日均学习：<b className="text-orange-500">{stats.avgDaily}</b> 字</span>
              <span>预计完成：<b className="text-orange-500">{stats.estimatedDays > 0 ? `${stats.estimatedDays}天` : '—'}</b></span>
            </div>
          </div>

          {/* 需加强的字 */}
          {wrongChars.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                <AlertCircle size={15} className="text-orange-500" /> 需要加强的字
              </h3>
              <p className="text-xs text-gray-400 mb-3">这些字还未掌握，建议重点复习</p>
              <div className="flex flex-wrap gap-2">
                {wrongChars.map((wc, i) => (
                  <div key={i} className="bg-red-50 border border-red-100 rounded-2xl px-3 py-2 text-center min-w-[56px]">
                    <div className="text-lg font-bold text-gray-800">{wc.character}</div>
                    <div className="text-[10px] text-gray-400">{wc.pinyin}</div>
                  </div>
                ))}
              </div>
              <Link href="/review" className="block mt-3 w-full py-2.5 rounded-2xl bg-orange-50 text-orange-500 font-semibold text-sm text-center">
                去复习这些字 →
              </Link>
            </div>
          )}

          {/* 学习时长 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
              <Clock size={15} className="text-indigo-500" /> 学习时长
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-indigo-500">{formatTime(studyTime.today)}</div>
                <div className="text-[10px] text-gray-400 mt-1">今日学习</div>
              </div>
              <div className="bg-purple-50 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-500">{formatTime(studyTime.total)}</div>
                <div className="text-[10px] text-gray-400 mt-1">本周累计</div>
              </div>
            </div>
            <p className="text-[10px] text-gray-300 mt-2">* 学习时长按练习字数估算（约30秒/字）</p>
          </div>

          {/* 亲子建议 */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-orange-100">
            <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-1.5">
              <Lightbulb size={15} /> 亲子互动建议
            </h3>
            <div className="text-sm text-gray-500 leading-relaxed space-y-1">
              <p>• 和孩子一起用今天学的字组词造句</p>
              <p>• 在绘本中找出孩子认识的字</p>
              <p>• 用冰箱贴或卡片玩认字游戏</p>
              <p>• 睡前读一本简单的绘本，让孩子找认识的字</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 pt-4 pb-6">
          {/* 学习设置 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-4">学习设置</h3>

            {/* 难度模式 */}
            <div className="mb-5">
              <label className="text-sm text-gray-400 mb-2 block">难度模式</label>
              <div className="flex gap-2">
                {[
                  { value: 'easy', label: '轻松', desc: '3字/天' },
                  { value: 'normal', label: '标准', desc: '5字/天' },
                  { value: 'challenge', label: '挑战', desc: '10字/天' },
                ].map(m => (
                  <button key={m.value} onClick={() => {
                    setDifficultyMode(m.value)
                    const targets: Record<string, number> = { easy: 3, normal: 5, challenge: 10 }
                    setDailyTarget(targets[m.value])
                    localStorage.setItem('ai-literacy-mode', m.value)
                    localStorage.setItem('ai-literacy-daily-target', String(targets[m.value]))
                  }} className={`flex-1 py-3 rounded-2xl text-center transition-colors ${
                    difficultyMode === m.value ? 'bg-orange-500 text-white' : 'bg-orange-50 text-gray-500'
                  }`}>
                    <div className="text-sm font-semibold">{m.label}</div>
                    <div className="text-[10px] opacity-70">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 每日字数 */}
            <div className="mb-5">
              <label className="text-sm text-gray-400 mb-2 block">每日学习字数</label>
              <div className="flex gap-2">
                {[3, 5, 8, 10, 15].map(n => (
                  <button key={n} onClick={() => { setDailyTarget(n); localStorage.setItem('ai-literacy-daily-target', String(n)) }}
                    className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-colors ${
                      dailyTarget === n ? 'bg-orange-500 text-white' : 'bg-orange-50 text-gray-500'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-300 mt-1">当前：每天学习 {dailyTarget} 个新字</p>
            </div>

            {/* 学习级别 */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">学习级别</label>
              <p className="text-xs text-gray-300 mb-2">默认自动跟随进度，可手动切换</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { lv: 0, label: '自动跟随', desc: '根据进度自动选' },
                  { lv: 1, label: 'L1 启蒙', desc: '169字 基础常用' },
                  { lv: 2, label: 'L2 基础', desc: '791字 日常扩展' },
                  { lv: 3, label: 'L3 进阶', desc: '778字 阅读提升' },
                  { lv: 4, label: 'L4 衔接', desc: '124字 小学衔接' },
                ].map(item => (
                  <button key={item.lv} onClick={() => { setForceLevel(item.lv); localStorage.setItem('ai-literacy-force-level', String(item.lv)) }}
                    className={`p-3 rounded-2xl text-left transition-colors ${
                      forceLevel === item.lv ? 'bg-orange-500 text-white' : 'bg-orange-50 text-gray-500'
                    }`}>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-[10px] opacity-70">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 学习数据 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">学习数据</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-400">用户 ID</span><span className="font-mono text-xs text-gray-700">{userId}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">累计识字</span><span className="font-bold">{stats.totalLearned} 字</span></div>
              <div className="flex justify-between"><span className="text-gray-400">已掌握</span><span className="font-bold text-green-500">{stats.mastered} 字</span></div>
              <div className="flex justify-between"><span className="text-gray-400">完成进度</span><span className="font-bold text-orange-500">{progressPct}%</span></div>
            </div>
          </div>

          {/* 关于 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
              <Trophy size={15} /> 成就徽章
            </h3>
            <p className="text-sm text-gray-400 mb-3">查看孩子的学习成就和解锁进度</p>
            <Link href="/achievement" className="block w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold text-center">
              查看成就
            </Link>
          </div>

          {/* 关于 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
              <Info size={15} /> 关于
            </h3>
            <p className="text-sm text-gray-500">AI 识字伴侣 v2.0</p>
            <p className="text-sm text-gray-300">归零工作室出品</p>
            <p className="text-sm text-gray-300 mt-1">字库：1,862 个汉字（L1-L4）</p>
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  )
}
