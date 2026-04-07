'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { BookOpen, ChevronLeft, Eye, XCircle, CheckCircle2, Sparkles, Volume2, Play } from 'lucide-react'
import BottomNav from '../../components/BottomNav'
import { getLocalDate } from '../../lib/utils'
import { useTTS } from '../../lib/useTTS'
import { useSound } from '../../lib/useSound'

const HanziWriter = dynamic(() => import('../../components/HanziWriter'), { ssr: false })

interface CharData { id: number; character: string; pinyin: string; meaning: string; category: string; level: number; topic_group: string; audio_url?: string }

export default function Review() {
  const [reviewChars, setReviewChars] = useState<CharData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [results, setResults] = useState<{ charId: number; correct: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const { speak, speaking } = useTTS()
  const { play: playSound } = useSound()
  const writerRef = useRef<any>(null)
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai-literacy-uid') || 'anonymous'
    }
    return 'anonymous'
  })

  const API = ''

  async function loadReview() {
    setLoading(true)
    try {
      const progressStr = localStorage.getItem('ai-literacy-progress') || '{}'
      const progress: Record<number, { nextReview: number; status: string }> = JSON.parse(progressStr)
      const now = Date.now()
      const dueIds: number[] = []
      for (const [idStr, p] of Object.entries(progress)) {
        if (p.status !== 'mastered' && p.nextReview && p.nextReview <= now) dueIds.push(parseInt(idStr))
      }
      if (dueIds.length > 0) {
        const res = await fetch(`${API}/api/characters?mode=all&limit=200`)
        const data: any = await res.json()
        if (data.success) {
          const due = data.data.filter((c: CharData) => dueIds.includes(c.id))
          setReviewChars(due.slice(0, 20))
        }
      } else {
        setReviewChars([])
      }
    } catch {} finally { setLoading(false) }
  }

  const restartReview = () => {
    setCurrentIndex(0); setResults([]); setFinished(false); setShowAnswer(false)
    loadReview()
  }

  useEffect(() => { loadReview() }, [])

  const handleResult = (correct: boolean) => {
    const char = reviewChars[currentIndex]
    if (!char) return
    playSound(correct ? 'correct' : 'wrong')
    setResults(prev => [...prev, { charId: char.id, correct }])
    const progressStr = localStorage.getItem('ai-literacy-progress') || '{}'
    const progress: Record<number, { nextReview: number; status: string; count: number }> = JSON.parse(progressStr)
    const intervals = [3600000, 86400000, 259200000, 604800000, 1296000000, 2592000000]
    const count = progress[char.id]?.count || 0
    if (correct) {
      const intervalIndex = Math.min(count, intervals.length - 1)
      progress[char.id] = { nextReview: Date.now() + intervals[intervalIndex], status: count >= 4 ? 'mastered' : 'learning', count: count + 1 }
    } else {
      progress[char.id] = { nextReview: Date.now() + intervals[0], status: 'learning', count: Math.max(0, count - 1) }
    }
    localStorage.setItem('ai-literacy-progress', JSON.stringify(progress))
    const reviewCnt = parseInt(localStorage.getItem('ai-literacy-review-count') || '0') + 1
    localStorage.setItem('ai-literacy-review-count', String(reviewCnt))
    const today = getLocalDate()
    const todayReviewKey = `ai-literacy-today-review-count-${today}`
    const todayReviewCnt = parseInt(localStorage.getItem(todayReviewKey) || '0') + 1
    localStorage.setItem(todayReviewKey, String(todayReviewCnt))
    fetch(`${API}/api/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, characterId: char.id, status: 'learning', practiceCount: 1, correctCount: correct ? 1 : 0, isCorrect: correct, isReview: true }) }).catch(() => {})
    if (currentIndex < reviewChars.length - 1) { setCurrentIndex(i => i + 1); setShowAnswer(false) }
    else { setFinished(true); playSound('complete') }
  }

  if (loading) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 pt-4 pb-4 safe-area-top flex items-center gap-3">
          <Link href="/" className="text-gray-400"><ChevronLeft size={22} /></Link>
          <h1 className="font-bold text-gray-800">复习</h1>
        </div>
        <div className="flex flex-col items-center justify-center" style={{ minHeight: '70vh' }}>
          <Image src="/images/icon-review.webp" alt="" width={80} height={80} className="mb-4 opacity-60" />
          <p className="text-gray-400">正在准备复习...</p>
        </div>
        <BottomNav active="review" />
      </div>
    )
  }

  if (reviewChars.length === 0) {
    return (
      <div className="pb-24">
        <div className="flex items-center justify-center px-5" style={{ minHeight: '80vh' }}>
          <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm shadow-lg">
            <Sparkles size={48} className="text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">暂无复习任务</h2>
            <p className="text-gray-400 mb-6">当前没有需要复习的汉字</p>
            <div className="flex gap-3">
              <Link href="/learn" className="flex-1 py-4 rounded-2xl bg-orange-500 text-white font-bold text-center">去识字</Link>
              <Link href="/" className="flex-1 py-4 rounded-2xl bg-orange-100 text-gray-700 font-bold text-center">首页</Link>
            </div>
          </div>
        </div>
        <BottomNav active="review" />
      </div>
    )
  }

  if (finished) {
    const correctCount = results.filter(r => r.correct).length
    const rate = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0
    return (
      <div className="pb-24">
        <div className="flex items-center justify-center px-5" style={{ minHeight: '80vh' }}>
          <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm shadow-lg">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${rate >= 80 ? 'bg-green-100' : 'bg-amber-100'}`}>
              <CheckCircle2 size={28} className={rate >= 80 ? 'text-green-500' : 'text-amber-500'} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-5">复习完成！</h2>
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center"><div className="text-3xl font-bold text-green-500">{correctCount}</div><div className="text-xs text-gray-400">记住了</div></div>
              <div className="text-center"><div className="text-3xl font-bold text-red-400">{results.length - correctCount}</div><div className="text-xs text-gray-400">需巩固</div></div>
              <div className="text-center"><div className="text-3xl font-bold text-orange-500">{rate}%</div><div className="text-xs text-gray-400">正确率</div></div>
            </div>
            <div className="flex gap-3">
              <Link href="/learn" className="flex-1 py-4 rounded-2xl bg-orange-500 text-white font-bold text-center">学新字</Link>
              <button onClick={restartReview}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold">
                再来一轮
              </button>
              <Link href="/" className="flex-1 py-4 rounded-2xl bg-orange-100 text-gray-700 font-bold text-center">首页</Link>
            </div>
          </div>
        </div>
        <BottomNav active="review" />
      </div>
    )
  }

  const currentChar = reviewChars[currentIndex]

  return (
    <div className="pb-24">
      {/* 顶栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 pt-4 pb-4 safe-area-top flex items-center gap-3">
        <Link href="/" className="text-gray-400"><ChevronLeft size={22} /></Link>
        <h1 className="font-bold text-gray-800">复习</h1>
        <span className="ml-auto text-xs font-semibold bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
          {currentIndex + 1}/{reviewChars.length}
        </span>
      </div>

      {/* 进度条 */}
      <div className="sticky top-[57px] z-30 h-1.5 bg-orange-100">
        <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all duration-500" style={{ width: `${((currentIndex + 1) / reviewChars.length) * 100}%` }} />
      </div>

      <div className="px-5 pt-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-3xl overflow-hidden shadow-lg">
            {/* 汉字区 - HanziWriter 笔顺 */}
            <div className="px-8 py-8 text-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
              <div className="flex flex-col items-center">
                <HanziWriter
                  key={`review-${currentChar.id}`}
                  character={currentChar.character}
                  width={160}
                  height={160}
                  padding={10}
                  strokeColor="#374151"
                  outlineColor="#DDD"
                  radicalColor="#F59E0B"
                  showOutline={true}
                  showCharacter={false}
                  autoAnimate={true}
                  animateSpeed={1}
                  delayBetweenStrokes={150}
                  ref={writerRef}
                />
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => speak(currentChar.character, currentChar.audio_url)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      speaking ? 'bg-indigo-500 text-white scale-110' : 'bg-white/80 text-indigo-400 active:scale-95'
                    }`}
                  >
                    <Volume2 size={20} />
                  </button>
                  <button
                    onClick={() => writerRef.current?.animate()}
                    className="w-10 h-10 rounded-full bg-white/80 text-gray-400 flex items-center justify-center active:scale-95 transition-all hover:bg-white"
                    title="重播笔顺"
                  >
                    <Play size={16} />
                  </button>
                </div>
              </div>
              {!showAnswer && <p className="text-gray-400 text-lg mt-3">还记得这个字吗？</p>}
              {showAnswer && (
                <div className="mt-3">
                  <div className="text-2xl font-medium text-orange-500">{currentChar.pinyin}</div>
                  <p className="text-gray-500 mt-1">{currentChar.meaning}</p>
                  <p className="text-gray-300 text-sm mt-1">{currentChar.category} · L{currentChar.level}</p>
                </div>
              )}
            </div>

            {/* 操作区 */}
            <div className="p-6">
              {!showAnswer ? (
                <button onClick={() => { setShowAnswer(true); speak(currentChar.character, currentChar.audio_url) }}
                  className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2">
                  <Eye size={20} /> 看答案
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => handleResult(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-lg bg-red-50 text-red-500 border-2 border-red-200 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <XCircle size={20} /> 忘了
                  </button>
                  <button onClick={() => handleResult(true)}
                    className="flex-1 py-4 rounded-2xl font-bold text-lg bg-green-500 text-white shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <CheckCircle2 size={20} /> 记得
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="review" />
    </div>
  )
}
