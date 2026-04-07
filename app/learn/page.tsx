'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { BookOpen, PencilLine, ChevronLeft, ChevronRight, Eye, CheckCircle2, Lightbulb, PenTool, Tag, Layers, RotateCcw, Home, Sparkles, Volume2, Play } from 'lucide-react'
import BottomNav from '../../components/BottomNav'
import { getLocalDate, getYesterdayDate } from '../../lib/utils'
import { useTTS } from '../../lib/useTTS'

const HanziWriter = dynamic(() => import('../../components/HanziWriter'), { ssr: false })

interface CharData {
  id: number; character: string; pinyin: string; meaning: string
  story: string; category: string; strokes: number; level: number; topic_group: string
  audio_url?: string
}

type Phase = 'review' | 'learn' | 'done'

export default function Learn() {
  const [phase, setPhase] = useState<Phase>('review')
  const [reviewChars, setReviewChars] = useState<CharData[]>([])
  const [newChars, setNewChars] = useState<CharData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showStory, setShowStory] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [learned, setLearned] = useState<Set<number>>(new Set())
  const [markedChars, setMarkedChars] = useState<Set<number>>(new Set()) // 记录已提交到 localStorage 的字，防止重复提交
  const [currentTopic, setCurrentTopic] = useState('')
  const [currentLevel, setCurrentLevel] = useState(1)
  const [reviewCompleted, setReviewCompleted] = useState(0)
  const { speak, speaking } = useTTS()
  const writerRef = useRef<any>(null)

  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      let uid = localStorage.getItem('ai-literacy-uid')
      if (!uid) { uid = 'user_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('ai-literacy-uid', uid) }
      return uid
    }
    return 'anonymous'
  })

  const API = ''

  useEffect(() => {
    async function loadData() {
      try {
        const learnedStr = localStorage.getItem('ai-literacy-learned') || '[]'
        const learnedIds: number[] = JSON.parse(learnedStr)
        setLearned(new Set(learnedIds))
        const progressStr = localStorage.getItem('ai-literacy-progress') || '{}'
        const progress: Record<number, { nextReview: number; status: string }> = JSON.parse(progressStr)
        const now = Date.now()
        const dueIds: number[] = []
        for (const [idStr, p] of Object.entries(progress)) {
          if (p.status !== 'mastered' && p.nextReview && p.nextReview <= now) dueIds.push(parseInt(idStr))
        }
        if (dueIds.length > 0) {
          const allRes = await fetch(`${API}/api/characters?mode=all&limit=200`)
          const allData: any = await allRes.json()
          if (allData.success) {
            const reviewSet = allData.data.filter((c: CharData) => dueIds.includes(c.id))
            if (reviewSet.length > 0) { setReviewChars(reviewSet.slice(0, 10)); setPhase('review'); setLoading(false); return }
          }
        }
        await loadNewChars(learnedIds)
      } catch { await loadNewChars([]) } finally { setLoading(false) }
    }
    async function loadNewChars(learnedIds: number[]) {
      const today = getLocalDate()
      const dailyTarget = parseInt(localStorage.getItem('ai-literacy-daily-target') || '5')
      const cached = localStorage.getItem(`ai-literacy-today-${today}`)
      const forceLevel = parseInt(localStorage.getItem('ai-literacy-force-level') || '0')
      if (cached) {
        try {
          const data = JSON.parse(cached)
          if (data.chars && data.chars.length > 0) {
            const levelMismatch = forceLevel !== 0 && data.level !== forceLevel
            const targetMismatch = data.dailyTarget && data.dailyTarget !== dailyTarget
            if (levelMismatch || targetMismatch) {
              localStorage.removeItem(`ai-literacy-today-${today}`)
            } else {
              const allLearned = data.chars.every((c: any) => learnedIds.includes(c.id))
              if (!allLearned) {
                setNewChars(data.chars); setCurrentTopic(data.topic); setCurrentLevel(data.level); setPhase('learn'); return
              }
            }
          }
        } catch {}
      }
      try {
        let targetLevel = forceLevel
        if (targetLevel === 0) {
          const total = learnedIds.length
          if (total >= 1738) targetLevel = 4; else if (total >= 960) targetLevel = 3; else if (total >= 169) targetLevel = 2; else targetLevel = 1
        }
        const res = await fetch(`${API}/api/characters?mode=level&level=${targetLevel}&limit=50`)
        const data: any = await res.json()
        if (data.success && data.data) {
          const unlearned = data.data.filter((c: CharData) => !learnedIds.includes(c.id))
          if (unlearned.length > 0) {
            const todayChars = unlearned.slice(0, dailyTarget)
            setNewChars(todayChars); setCurrentTopic(todayChars[0]?.topic_group || ''); setCurrentLevel(todayChars[0]?.level || targetLevel)
            localStorage.setItem(`ai-literacy-today-${today}`, JSON.stringify({ chars: todayChars, topic: todayChars[0]?.topic_group || '', level: todayChars[0]?.level || targetLevel, dailyTarget }))
          } else if (targetLevel < 4) {
            const nextRes = await fetch(`${API}/api/characters?mode=level&level=${targetLevel + 1}&limit=50`)
            const nextData: any = await nextRes.json()
            if (nextData.success && nextData.data) {
              const nextUnlearned = nextData.data.filter((c: CharData) => !learnedIds.includes(c.id))
              if (nextUnlearned.length > 0) {
                const todayChars = nextUnlearned.slice(0, dailyTarget)
                setNewChars(todayChars); setCurrentTopic(todayChars[0]?.topic_group || ''); setCurrentLevel(targetLevel + 1)
                localStorage.setItem(`ai-literacy-today-${today}`, JSON.stringify({ chars: todayChars, topic: todayChars[0]?.topic_group || '', level: targetLevel + 1, dailyTarget }))
              }
            }
          }
        }
      } catch {}
      setPhase('learn')
    }
    loadData()
  }, [])

  const markViewed = useCallback((charId: number) => {
    // 仅视觉标记，不写 localStorage（由 nextChar 统一写入）
    setLearned(prev => new Set(prev).add(charId))
  }, [])

  const markLearned = useCallback((charId: number, isReview: boolean = false) => {
    setLearned(prev => new Set(prev).add(charId))
    const learnedStr = localStorage.getItem('ai-literacy-learned') || '[]'
    const learnedIds: number[] = JSON.parse(learnedStr)
    const isNew = !learnedIds.includes(charId)
    if (isNew) { learnedIds.push(charId); localStorage.setItem('ai-literacy-learned', JSON.stringify(learnedIds)) }
    const progressStr = localStorage.getItem('ai-literacy-progress') || '{}'
    const progress: Record<number, { nextReview: number; status: string; count: number }> = JSON.parse(progressStr)
    const existingCount = progress[charId]?.count || 0
    const newCount = existingCount + 1

    if (isReview) {
      // 复习阶段：用艾宾浩斯间隔，答对增加间隔
      const intervals = [3600000, 86400000, 259200000, 604800000, 1296000000, 2592000000]
      const intervalIndex = Math.min(existingCount, intervals.length - 1)
      progress[charId] = { nextReview: Date.now() + intervals[intervalIndex], status: newCount >= 5 ? 'mastered' : 'learning', count: newCount }
    } else {
      // 新学阶段：每次 +1，nextReview 1小时后
      progress[charId] = { nextReview: Date.now() + 3600000, status: newCount >= 5 ? 'mastered' : 'learning', count: newCount }
    }
    localStorage.setItem('ai-literacy-progress', JSON.stringify(progress))

    // 同步首页需要的今日数据
    const today = getLocalDate()
    const todayKey = `ai-literacy-today-learned-${today}`
    const todayIds: number[] = JSON.parse(localStorage.getItem(todayKey) || '[]')
    if (!todayIds.includes(charId)) { todayIds.push(charId); localStorage.setItem(todayKey, JSON.stringify(todayIds)) }

    // 更新连续学习天数
    const lastStudyDate = localStorage.getItem('ai-literacy-last-study-date') || ''
    const yesterdayStr = getYesterdayDate()
    let streak = parseInt(localStorage.getItem('ai-literacy-streak') || '0')
    if (lastStudyDate === yesterdayStr || lastStudyDate === today) {
      if (lastStudyDate !== today) streak++
      localStorage.setItem('ai-literacy-streak', String(streak))
    } else if (lastStudyDate !== today) {
      localStorage.setItem('ai-literacy-streak', '1')
    }
    localStorage.setItem('ai-literacy-last-study-date', today)

    // 同步今日正确率（识字页默认答对）
    const correctKey = `ai-literacy-today-correct-${today}`
    const totalKey = `ai-literacy-today-total-${today}`
    localStorage.setItem(correctKey, String(parseInt(localStorage.getItem(correctKey) || '0') + 1))
    localStorage.setItem(totalKey, String(parseInt(localStorage.getItem(totalKey) || '0') + 1))

    // 复习阶段同步复习计数
    if (isReview) {
      const todayReviewKey = `ai-literacy-today-review-count-${today}`
      const todayReviewCnt = parseInt(localStorage.getItem(todayReviewKey) || '0') + 1
      localStorage.setItem(todayReviewKey, String(todayReviewCnt))
      const reviewTotal = parseInt(localStorage.getItem('ai-literacy-review-count') || '0') + 1
      localStorage.setItem('ai-literacy-review-count', String(reviewTotal))
    }

    fetch(`${API}/api/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, characterId: charId, status: newCount >= 5 ? 'mastered' : 'learning', practiceCount: 1, correctCount: 1, isCorrect: true, isReview }) }).catch(() => {})
  }, [userId])

  const nextChar = () => {
    const chars = phase === 'review' ? reviewChars : newChars
    if (!chars[currentIndex]) return
    const charId = chars[currentIndex].id
    // 防止前进-后退-前进导致重复提交
    if (!markedChars.has(charId)) {
      markLearned(charId, phase === 'review')
      setMarkedChars(prev => new Set(prev).add(charId))
    }
    if (currentIndex < chars.length - 1) {
      setIsAnimating(true)
      setTimeout(() => { setCurrentIndex(i => i + 1); setShowStory(false); setIsAnimating(false) }, 300)
    } else {
      if (phase === 'review') { setReviewCompleted(reviewChars.length); setPhase('learn'); setCurrentIndex(0); setShowStory(false) }
      else { setPhase('done') }
    }
  }
  const prevChar = () => {
    if (currentIndex > 0) { setIsAnimating(true); setTimeout(() => { setCurrentIndex(i => i - 1); setShowStory(false); setIsAnimating(false) }, 300) }
  }

  const levelName: Record<number, string> = { 1: '启蒙', 2: '基础', 3: '进阶', 4: '衔接' }
  const chars = phase === 'review' ? reviewChars : newChars
  const currentChar = chars[currentIndex]

  // 切字时自动朗读
  useEffect(() => {
    if (!loading && currentChar && phase !== 'done') {
      const timer = setTimeout(() => speak(currentChar.character, currentChar.audio_url), 400)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, loading, currentChar, phase])

  if (loading) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 pt-4 pb-4 safe-area-top flex items-center gap-3">
          <Link href="/" className="text-gray-400"><ChevronLeft size={22} /></Link>
          <h1 className="font-bold text-gray-800">识字</h1>
          <div className="ml-auto"><BookOpen size={18} className="text-orange-500" /></div>
        </div>
        <div className="flex flex-col items-center justify-center" style={{ minHeight: '70vh' }}>
          <Image src="/images/icon-learn.webp" alt="" width={80} height={80} className="mb-4 opacity-60" />
          <p className="text-gray-400">正在准备汉字...</p>
        </div>
        <BottomNav active="learn" />
      </div>
    )
  }

  if (phase === 'done') {
    const todayCharIds = newChars.map(c => c.id)
    return (
      <div className="pb-24">
        <div className="flex flex-col items-center justify-center px-5" style={{ minHeight: '80vh' }}>
          <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm shadow-lg">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">今日学习完成！</h2>
            {reviewCompleted > 0 && <p className="text-orange-500 font-medium mb-1">复习了 {reviewCompleted} 个旧字</p>}
            <p className="text-gray-500 mb-1">{currentTopic}</p>
            <p className="text-gray-500 mb-5">你今天学习了 {newChars.length} 个新汉字</p>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {newChars.map((c, i) => (
                <div key={i} className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-2 text-center">
                  <div className="text-lg font-bold text-gray-800">{c.character}</div>
                  <div className="text-[10px] text-gray-400">{c.pinyin}</div>
                </div>
              ))}
            </div>
            <Link href={`/practice?charIds=${todayCharIds.join(',')}`}
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-emerald-500/30 mb-3">
              <PencilLine size={18} /> 练习今天学的字
            </Link>
            <div className="flex gap-3">
              <Link href="/review" className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm py-3 rounded-2xl text-center shadow-md">
                去复习
              </Link>
              <Link href="/" className="flex-1 bg-gradient-to-r from-orange-400 to-amber-400 text-white font-semibold text-sm py-3 rounded-2xl text-center shadow-md">
                首页
              </Link>
            </div>
          </div>
        </div>
        <BottomNav active="learn" />
      </div>
    )
  }

  if (!currentChar) {
    return (
      <div className="pb-24">
        <div className="flex flex-col items-center justify-center px-5" style={{ minHeight: '80vh' }}>
          <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm shadow-lg">
            <Sparkles size={48} className="text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">没有需要学习的字</h2>
            <p className="text-gray-500 mb-5">今天已经学完啦！</p>
            <Link href="/" className="block w-full bg-gradient-to-r from-orange-400 to-pink-400 text-white font-bold py-4 rounded-2xl text-center shadow-lg">回到首页</Link>
          </div>
        </div>
        <BottomNav active="learn" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* 顶栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 pt-4 pb-4 safe-area-top flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={22} /></Link>
        <h1 className="font-bold text-gray-800 text-sm">
          {phase === 'review' ? '复习旧字' : `L${currentLevel} ${levelName[currentLevel]}`}
        </h1>
        <span className="ml-auto text-xs font-semibold bg-orange-50 text-orange-600 px-3 py-1 rounded-full">
          {currentIndex + 1}/{chars.length}
        </span>
      </div>

      {/* 进度点 */}
      <div className="sticky top-[57px] z-30 bg-white/60 backdrop-blur-sm h-8 flex items-center justify-center gap-1.5">
        {chars.map((_, i) => (
          <div key={i} className={`rounded-full transition-all ${i === currentIndex ? 'w-3 h-3 bg-orange-500 shadow-sm shadow-orange-300' : 'w-2 h-2 bg-gray-200'}`} />
        ))}
      </div>

      {/* 字卡 - 点击即下一个 */}
      <div className="px-5 pt-2 transition-all duration-300" style={{ opacity: isAnimating ? 0 : 1, transform: isAnimating ? 'scale(0.95)' : 'scale(1)' }}>
        <div onClick={nextChar}
          className="bg-white rounded-3xl overflow-hidden shadow-lg max-w-md mx-auto active:scale-[0.98] transition-transform cursor-pointer">
          {/* 汉字区 */}
          <div className="relative px-8 py-10 text-center bg-gradient-to-br from-orange-50 to-amber-50">
            {phase === 'review' && (
              <div className="absolute top-4 left-4 bg-orange-500 text-white text-xs font-medium px-3 py-1 rounded-full">复习</div>
            )}
            <div className="absolute top-4 right-4">
              <span className="bg-white text-xs font-medium px-3 py-1 rounded-full text-gray-500">{currentChar.category}</span>
            </div>
            <div className="pt-2 flex flex-col items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <HanziWriter
                    ref={writerRef}
                    character={currentChar.character}
                    width={160}
                    height={160}
                    padding={10}
                    strokeColor="#374151"
                    outlineColor="#E5E7EB"
                    radicalColor="#F59E0B"
                    showOutline={true}
                    showCharacter={false}
                    autoAnimate={true}
                    animateSpeed={1}
                    delayBetweenStrokes={150}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="text-2xl font-medium text-orange-500">{currentChar.pinyin}</div>
                <button
                  onClick={(e) => { e.stopPropagation(); speak(currentChar.character, currentChar.audio_url) }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    speaking ? 'bg-orange-500 text-white scale-110' : 'bg-orange-50 text-orange-400 active:scale-95'
                  }`}
                >
                  <Volume2 size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); writerRef.current?.animate() }}
                  className="w-9 h-9 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center flex-shrink-0 active:scale-95 transition-all hover:bg-gray-100"
                  title="重播笔顺"
                >
                  <Play size={16} />
                </button>
              </div>
            </div>
            {/* 底部提示 */}
            <div className="mt-4 text-xs text-gray-300">点击继续 →</div>
          </div>

          {/* 内容区 */}
          <div className="p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Lightbulb size={18} className="text-amber-500" />
              </div>
              <p className="text-gray-800 text-base leading-relaxed pt-1">{currentChar.meaning || `${currentChar.character}的含义`}</p>
            </div>
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><PenTool size={14} /> {currentChar.strokes || '?'} 画</span>
              <span className="flex items-center gap-1"><Tag size={14} /> {currentChar.category}</span>
              <span className="flex items-center gap-1"><Layers size={14} /> L{currentChar.level}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowStory(!showStory) }}
              className="w-full py-3.5 rounded-2xl font-semibold text-base bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2">
              <Eye size={18} />
              {showStory ? '收起故事' : '听故事学字'}
            </button>
            {showStory && (
              <div className="mt-3 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                <p className="text-sm text-gray-700 leading-relaxed">{currentChar.story || `${currentChar.character}的故事正在生成中...`}</p>
              </div>
            )}
          </div>
        </div>

        {/* 只保留"上一个"按钮 */}
        <div className="flex justify-start mt-5 max-w-md mx-auto mb-6">
          <button onClick={prevChar} disabled={currentIndex === 0}
            className={`w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'hover:shadow-lg active:scale-95'}`}>
            <ChevronLeft size={20} className="text-gray-700" />
          </button>
        </div>
      </div>

      <BottomNav active="learn" />
    </div>
  )
}
