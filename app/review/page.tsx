'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { BookOpen, ChevronLeft, Eye, XCircle, CheckCircle2, Sparkles, Volume2, Play, PenTool, ListChecks } from 'lucide-react'
import BottomNav from '../../components/BottomNav'
import { getLocalDate } from '../../lib/utils'
import { useTTS } from '../../lib/useTTS'
import { useSound } from '../../lib/useSound'
import { useCloudSync } from '../../lib/useCloudSync'
import { useAppContext } from '../../components/AppProvider'
import { getNextReview, isMastered } from '../../lib/spaced-repetition'

const HanziWriter = dynamic(() => import('../../components/HanziWriter'), { ssr: false })

interface CharData { id: number; character: string; pinyin: string; meaning: string; category: string; level: number; topic_group: string; audio_url?: string }

type ReviewMode = 'recall' | 'quiz' | 'write'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export default function Review() {
  const [reviewChars, setReviewChars] = useState<CharData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [results, setResults] = useState<{ charId: number; correct: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [mode, setMode] = useState<ReviewMode>('recall')
  const [selected, setSelected] = useState<number | null>(null)
  const [writeComplete, setWriteComplete] = useState(false)
  const { speak, speaking } = useTTS()
  const { play: playSound } = useSound()
  const { schedulePush } = useCloudSync()
  const writerRef = useRef<any>(null)
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { stats: ctxStats, updateProgress, recordAnswer } = useAppContext()
  const userId = ctxStats.userId

  const API = ''

  async function loadReview() {
    setLoading(true)
    try {
      const progress = ctxStats.progress
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

  const resetState = useCallback(() => {
    setCurrentIndex(0); setResults([]); setFinished(false); setShowAnswer(false)
    setSelected(null); setWriteComplete(false)
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null }
  }, [])

  const switchMode = useCallback((newMode: ReviewMode) => {
    setMode(newMode)
    resetState()
  }, [resetState])

  const restartReview = () => {
    resetState()
    loadReview()
  }

  useEffect(() => { loadReview() }, [])

  // 核心进度更新逻辑
  const handleResult = useCallback((correct: boolean) => {
    const char = reviewChars[currentIndex]
    if (!char) return
    playSound(correct ? 'correct' : 'wrong')
    setResults(prev => [...prev, { charId: char.id, correct }])
    // Update progress via Context
    updateProgress(prev => {
      const count = prev[char.id]?.count || 0
      const newPrev = { ...prev }
      if (correct) {
        const newCount = count + 1
        newPrev[char.id] = { nextReview: getNextReview(newCount), status: isMastered(newCount) ? 'mastered' : 'learning', count: newCount }
      } else {
        newPrev[char.id] = { nextReview: getNextReview(0), status: 'learning', count: Math.max(0, count - 1) }
      }
      return newPrev
    })
    recordAnswer(correct, true)
    fetch(`${API}/api/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, characterId: char.id, status: 'learning', practiceCount: 1, correctCount: correct ? 1 : 0, isCorrect: correct, isReview: true }) }).catch(() => {})
    schedulePush()
    if (currentIndex < reviewChars.length - 1) {
      setCurrentIndex(i => i + 1); setShowAnswer(false); setSelected(null); setWriteComplete(false)
    } else {
      setFinished(true)
      playSound('complete')
    }
  }, [reviewChars, currentIndex, userId, playSound, schedulePush])

  // 选择题模式答题
  const handleSelectAnswer = useCallback((index: number) => {
    if (selected !== null) return
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null }
    setSelected(index)
    const char = reviewChars[currentIndex]
    if (!char) return
    // 选项是拼音，找到正确拼音对应的 index
    const isCorrect = index === 0 // 选项[0] 是正确答案
    handleResult(isCorrect)
    speak(char.character, char.audio_url)
    autoTimerRef.current = setTimeout(() => {
      if (currentIndex < reviewChars.length - 1) { setCurrentIndex(i => i + 1); setSelected(null) }
      else { setFinished(true); playSound('complete') }
    }, 1500)
  }, [selected, reviewChars, currentIndex, handleResult, speak, playSound])

  // 手写完成回调
  const handleWriteComplete = useCallback(() => {
    setWriteComplete(true)
    handleResult(true)
    speak(reviewChars[currentIndex].character, reviewChars[currentIndex].audio_url)
    autoTimerRef.current = setTimeout(() => {
      if (currentIndex < reviewChars.length - 1) { setCurrentIndex(i => i + 1); setWriteComplete(false) }
      else { setFinished(true); playSound('complete') }
    }, 2000)
  }, [reviewChars, currentIndex, handleResult, speak, playSound])

  useEffect(() => () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current) }, [])

  // 生成选择题选项
  const getQuizOptions = () => {
    const char = reviewChars[currentIndex]
    if (!char) return { options: [], correctIndex: 0 }
    const wrongOptions = shuffle(reviewChars.filter(c => c.id !== char.id)).slice(0, 3).map(c => c.pinyin)
    const options = shuffle([char.pinyin, ...wrongOptions])
    return { options, correctIndex: options.indexOf(char.pinyin) }
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
              <button onClick={restartReview} className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold">再来一轮</button>
              <Link href="/" className="flex-1 py-4 rounded-2xl bg-orange-100 text-gray-700 font-bold text-center">首页</Link>
            </div>
          </div>
        </div>
        <BottomNav active="review" />
      </div>
    )
  }

  const currentChar = reviewChars[currentIndex]
  const modeLabels: Record<ReviewMode, string> = { recall: '回忆', quiz: '选择', write: '手写' }
  const modeIcons: Record<ReviewMode, any> = { recall: Eye, quiz: ListChecks, write: PenTool }

  return (
    <div className="pb-24">
      {/* 顶栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 pt-4 pb-4 safe-area-top flex items-center gap-3">
        <Link href="/" className="text-gray-400"><ChevronLeft size={22} /></Link>
        <h1 className="font-bold text-gray-800">复习</h1>
        <div className="ml-auto flex items-center gap-1.5">
          {(Object.keys(modeLabels) as ReviewMode[]).map(m => {
            const Icon = modeIcons[m]
            return (
              <button key={m} onClick={() => switchMode(m)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${mode === m ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Icon size={13} /> {modeLabels[m]}
              </button>
            )
          })}
        </div>
      </div>

      {/* 进度条 */}
      <div className="sticky top-[57px] z-30 h-1.5 bg-indigo-100">
        <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-500" style={{ width: `${((currentIndex + 1) / reviewChars.length) * 100}%` }} />
      </div>

      {/* 进度点 */}
      <div className="sticky top-[59px] z-30 bg-white/60 backdrop-blur-sm h-7 flex items-center justify-center gap-1">
        {reviewChars.map((_, i) => {
          const r = results[i]
          return (
            <div key={i} className={`rounded-full transition-all ${
              r ? (r.correct ? 'w-2 h-2 bg-green-400' : 'w-2 h-2 bg-red-400')
              : i === currentIndex ? 'w-3 h-3 bg-indigo-500 shadow-sm shadow-indigo-300' : 'w-2 h-2 bg-gray-200'
            }`} />
          )
        })}
      </div>

      <div className="px-5 pt-4">
        <div className="max-w-md mx-auto">

          {/* ===== 回忆模式 ===== */}
          {mode === 'recall' && (
            <div className="bg-white rounded-3xl overflow-hidden shadow-lg">
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
                    <button onClick={() => speak(currentChar.character, currentChar.audio_url)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${speaking ? 'bg-indigo-500 text-white scale-110' : 'bg-white/80 text-indigo-400 active:scale-95'}`}>
                      <Volume2 size={20} />
                    </button>
                    <button onClick={() => writerRef.current?.animate()} className="w-10 h-10 rounded-full bg-white/80 text-gray-400 flex items-center justify-center active:scale-95 transition-all hover:bg-white" title="重播笔顺">
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
          )}

          {/* ===== 选择题模式 ===== */}
          {mode === 'quiz' && (() => {
            const { options, correctIndex } = getQuizOptions()
            return (
              <div className="bg-white rounded-3xl overflow-hidden shadow-lg">
                <div className="px-8 py-10 text-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-[72px] font-bold text-gray-800 select-none leading-none">{currentChar.character}</div>
                    <button onClick={() => speak(currentChar.character, currentChar.audio_url)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${speaking ? 'bg-indigo-500 text-white scale-110' : 'bg-white/80 text-indigo-400 active:scale-95'}`}>
                      <Volume2 size={20} />
                    </button>
                  </div>
                  <p className="text-gray-500 text-lg mt-4">这个字怎么读？</p>
                </div>
                <div className="p-6">
                  <div className="flex flex-col gap-3">
                    {options.map((option, index) => {
                      const isCorrect = index === correctIndex
                      const isSelected = selected === index
                      let cls = 'bg-white text-gray-800 border-transparent shadow-sm'
                      if (selected !== null) {
                        if (isCorrect) cls = 'bg-green-50 text-green-700 border-green-200'
                        else if (isSelected && !isCorrect) cls = 'bg-red-50 text-red-600 border-red-200'
                        else cls = 'bg-gray-50 text-gray-300 border-transparent'
                      }
                      return (
                        <button key={index} onClick={() => handleSelectAnswer(index)} disabled={selected !== null}
                          className={`w-full py-4 px-5 rounded-2xl text-left text-lg font-semibold border-2 transition-all ${cls} ${selected === null ? 'hover:shadow-md active:scale-[0.98]' : ''}`}>
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold mr-3 ${
                            selected !== null && isCorrect ? 'bg-green-200 text-green-700'
                            : selected === index && !isCorrect ? 'bg-red-200 text-red-700'
                            : 'bg-indigo-100 text-indigo-600'
                          }`}>{['A', 'B', 'C', 'D'][index]}</span>
                          {option}
                        </button>
                      )
                    })}
                  </div>
                  {selected !== null && (
                    <p className="text-center text-gray-400 text-sm mt-4">
                      {selected === correctIndex ? '✅ 记住了！' : `❌ 正确答案是 ${currentChar.pinyin}`} · 自动跳转中...
                    </p>
                  )}
                </div>
              </div>
            )
          })()}

          {/* ===== 手写模式 ===== */}
          {mode === 'write' && (
            <div className="bg-white rounded-3xl overflow-hidden shadow-lg">
              <div className="px-8 py-6 text-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <p className="text-gray-500 text-sm mb-1">第 {currentIndex + 1}/{reviewChars.length} 题</p>
                <p className="text-gray-700 text-lg font-semibold">请写出这个字</p>
              </div>
              <div className="flex flex-col items-center p-6">
                <div className="bg-gray-50 rounded-3xl shadow-inner p-4 relative">
                  <HanziWriter
                    key={`write-${currentIndex}`}
                    character={currentChar.character}
                    width={200}
                    height={200}
                    padding={15}
                    strokeColor="#374151"
                    outlineColor="#E5E7EB"
                    radicalColor="#F59E0B"
                    showOutline={true}
                    showCharacter={false}
                    autoAnimate={false}
                    ref={writerRef}
                  />
                  {writeComplete && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/10 rounded-3xl">
                      <div className="bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg animate-bounce-in">
                        ✅ 写对了！
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <button onClick={() => speak(currentChar.character, currentChar.audio_url)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${speaking ? 'bg-indigo-500 text-white scale-110' : 'bg-indigo-50 text-indigo-400 active:scale-95'}`}>
                    <Volume2 size={20} />
                  </button>
                  <button onClick={() => writerRef.current?.animate()} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center active:scale-95 transition-all hover:bg-gray-100" title="看笔顺提示">
                    <Play size={16} />
                  </button>
                </div>
                {!writeComplete ? (
                  <button onClick={() => { writerRef.current?.quiz({ onComplete: handleWriteComplete }) }}
                    className="w-full mt-5 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-lg shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                    <PenTool size={20} /> 开始手写
                  </button>
                ) : (
                  <p className="text-center text-gray-400 text-sm mt-5">
                    {currentIndex < reviewChars.length - 1 ? '自动跳转下一题...' : '即将查看结果...'}
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      <BottomNav active="review" />
    </div>
  )
}
