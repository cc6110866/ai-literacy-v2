'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { PencilLine, ChevronLeft, Star, RotateCcw, ArrowRight, Volume2, PenTool, ListChecks } from 'lucide-react'
import BottomNav from '../../components/BottomNav'
import { getLocalDate } from '../../lib/utils'
import { useTTS } from '../../lib/useTTS'
import { useSound } from '../../lib/useSound'
import { useCloudSync } from '../../lib/useCloudSync'
import { loadCharactersWithCache } from '../../lib/charCache'
import { useAppContext } from '../../components/AppProvider'

const HanziWriter = dynamic(() => import('../../components/HanziWriter'), { ssr: false })

interface CharData { id: number; character: string; pinyin: string; meaning: string; category: string; level: number; topic_group: string; audio_url?: string }

interface Question {
  type: 'select_pinyin' | 'select_char'
  prompt: string
  options: string[]
  correctIndex: number
  charId: number
  char: string
  pinyin: string
  audio_url?: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

type PracticeMode = 'select' | 'write'

export default function Practice() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [answered, setAnswered] = useState<boolean[]>([])
  const [mode, setMode] = useState<PracticeMode>('select')
  const [writeComplete, setWriteComplete] = useState(false)
  const writerRef = useRef<any>(null)
  const { stats: ctxStats, recordAnswer } = useAppContext()
  const userId = ctxStats.userId
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { speak, speaking } = useTTS()
  const { play: playSound, init: initSound } = useSound()
  const { schedulePush } = useCloudSync()

  const API = ''

  useEffect(() => {
    async function loadQuestions() {
      try {
        const learnedIds = ctxStats.learnedIds
        const urlParams = new URLSearchParams(window.location.search)
        const charIdsParam = urlParams.get('charIds')
        if (charIdsParam) {
          const targetIds = charIdsParam.split(',').map(Number).filter(Boolean)
          const allData = await loadCharactersWithCache({ apiBaseUrl: API })
          {
            const targetChars = allData.filter((c: CharData) => targetIds.includes(c.id))
            const extraChars = allData.filter((c: CharData) => !targetIds.includes(c.id) && learnedIds.includes(c.id))
            const allChars = [...targetChars, ...extraChars]
            if (allChars.length >= 4) { buildQuestions(targetChars.length >= 4 ? targetChars : allChars); return }
          }
        }
        if (learnedIds.length < 4) {
          // 不够 4 个字无法生成有效题目，显示提示
          setQuestions([])
          return
        }
        const allData = await loadCharactersWithCache({ apiBaseUrl: API })
        {
          const learned: CharData[] = allData.filter((c: CharData) => learnedIds.includes(c.id))
          if (learned.length >= 4) buildQuestions(shuffle<CharData>(learned).slice(0, 20))
        }
      } catch {
        setQuestions([{ type: 'select_pinyin', prompt: '一', options: ['yī', 'èr', 'sān', 'sì'], correctIndex: 0, charId: 1, char: '一', pinyin: 'yī', audio_url: '/api/audio?pinyin=y%C4%AB' }])
      } finally { setLoading(false) }
    }

    function buildQuestions(chars: CharData[]) {
      const qs: Question[] = []
      for (const c of chars) {
        const wrongPinyin = shuffle(chars.filter(x => x.id !== c.id && x.pinyin !== c.pinyin)).slice(0, 3).map(x => x.pinyin)
        if (wrongPinyin.length >= 3) {
          const options = shuffle([c.pinyin, ...wrongPinyin])
          qs.push({ type: 'select_pinyin', prompt: c.character, options, correctIndex: options.indexOf(c.pinyin), charId: c.id, char: c.character, pinyin: c.pinyin, audio_url: c.audio_url })
        }
        const wrongChars = shuffle(chars.filter(x => x.id !== c.id)).slice(0, 3).map(x => x.character)
        if (wrongChars.length >= 3) {
          const options = shuffle([c.character, ...wrongChars])
          qs.push({ type: 'select_char', prompt: c.pinyin, options, correctIndex: options.indexOf(c.character), charId: c.id, char: c.character, pinyin: c.pinyin, audio_url: c.audio_url })
        }
      }
      setQuestions(shuffle(qs).slice(0, 10))
    }
    loadQuestions()
  }, [])

  // 手写模式切换时重置
  const switchMode = useCallback((newMode: PracticeMode) => {
    setMode(newMode)
    setSelected(null)
    setWriteComplete(false)
    setScore(0)
    setCurrentIndex(0)
    setAnswered([])
    setFinished(false)
  }, [])

  // 手写测验完成回调
  const handleWriteComplete = useCallback(() => {
    setWriteComplete(true)
    setScore(s => s + 1)
    setAnswered(prev => [...prev, true])
    recordAnswer(true)
    speak(questions[currentIndex].char, questions[currentIndex].audio_url)
    fetch(`${API}/api/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, characterId: questions[currentIndex].charId, status: 'learning', practiceCount: 1, correctCount: 1, isCorrect: true, isReview: false }) }).catch(() => {})
    schedulePush()
    // 自动跳转下一题（2秒后）
    setTimeout(() => {
      if (currentIndex < questions.length - 1) { setCurrentIndex(i => i + 1); setWriteComplete(false) }
      else {
        setFinished(true)
        playSound('complete')
        const newScore = score + 1
        // perfect count handled externally if needed
      }
    }, 2000)
  }, [currentIndex, questions, score, userId, speak])

  const handleAnswer = useCallback((index: number) => {
    if (selected !== null) return
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null }
    setSelected(index)
    const isCorrect = index === questions[currentIndex].correctIndex
    if (isCorrect) { setScore(s => s + 1); playSound('correct') }
    else { playSound('wrong') }
    setAnswered(prev => [...prev, isCorrect])
    recordAnswer(isCorrect)
    fetch(`${API}/api/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, characterId: questions[currentIndex].charId, status: 'learning', practiceCount: 1, correctCount: isCorrect ? 1 : 0, isCorrect, isReview: false }) }).catch(() => {})
    schedulePush()
    // 朗读正确答案
    speak(questions[currentIndex].char, questions[currentIndex].audio_url)
    // 自动跳转下一题（1.5秒后）
    autoTimerRef.current = setTimeout(() => nextQuestion(), 1500)
  }, [selected, questions, currentIndex, userId])

  const nextQuestion = () => {
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null }
    if (currentIndex < questions.length - 1) { setCurrentIndex(i => i + 1); setSelected(null) }
    else {
      setFinished(true)
      playSound(score === questions.length ? 'achievement' : 'complete')
      // perfect score detected
    }
  }

  // 清理定时器
  useEffect(() => () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current) }, [])

  const restart = () => { window.location.reload() }

  if (loading) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 pt-4 pb-4 safe-area-top flex items-center gap-3">
          <Link href="/" className="text-gray-400"><ChevronLeft size={22} /></Link>
          <h1 className="font-bold text-gray-800">练习</h1>
        </div>
        <div className="flex flex-col items-center justify-center" style={{ minHeight: '70vh' }}>
          <Image src="/images/icon-practice.webp" alt="" width={80} height={80} className="mb-4 opacity-60" />
          <p className="text-gray-400">正在出题...</p>
        </div>
        <BottomNav active="practice" />
      </div>
    )
  }

  if (finished) {
    const correctRate = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0
    return (
      <div className="pb-24">
        <div className="flex items-center justify-center px-5" style={{ minHeight: '80vh' }}>
          <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm shadow-lg">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              correctRate >= 80 ? 'bg-green-100' : correctRate >= 60 ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              <Star size={28} className={correctRate >= 80 ? 'text-green-500' : correctRate >= 60 ? 'text-amber-500' : 'text-red-400'} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-5">练习完成！</h2>
            <div className="flex justify-center gap-8 mb-5">
              <div className="text-center"><div className="text-3xl font-bold text-green-500">{score}</div><div className="text-xs text-gray-400">答对</div></div>
              <div className="text-center"><div className="text-3xl font-bold text-red-400">{questions.length - score}</div><div className="text-xs text-gray-400">答错</div></div>
              <div className="text-center"><div className="text-3xl font-bold text-orange-500">{correctRate}%</div><div className="text-xs text-gray-400">正确率</div></div>
            </div>
            {score === questions.length && <p className="text-orange-500 font-bold mb-4">满分！太厉害了！</p>}
            {answered.some(a => !a) && (
              <div className="mb-5 p-3 bg-orange-50 rounded-2xl">
                <p className="text-sm font-semibold text-orange-700 mb-2">需要复习的字：</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {questions.map((q, i) => !answered[i] ? <span key={i} className="bg-white px-3 py-1 rounded-full text-base shadow-sm">{q.char}</span> : null)}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={restart} className="flex-1 py-4 rounded-2xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2">
                <RotateCcw size={16} /> 再练一次
              </button>
              <Link href="/review" className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-center">去复习</Link>
            </div>
            <Link href="/" className="block mt-3 text-center text-gray-400 text-sm">回到首页 →</Link>
          </div>
        </div>
        <BottomNav active="practice" />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="pb-24">
        <div className="flex items-center justify-center px-5" style={{ minHeight: '80vh' }}>
          <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm shadow-lg">
            <PencilLine size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">先去学几个字吧</h2>
            <p className="text-gray-400 mb-5">至少学会 4 个字才能开始练习</p>
            <Link href="/learn" className="block w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-center">去识字</Link>
          </div>
        </div>
        <BottomNav active="practice" />
      </div>
    )
  }

  const q = questions[currentIndex]
  const typeLabel = q.type === 'select_pinyin' ? '这个字怎么读？' : '哪个是正确答案？'

  return (
    <div className="pb-24">
      {/* 顶栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 pt-4 pb-4 safe-area-top flex items-center gap-3">
        <Link href="/" className="text-gray-400"><ChevronLeft size={22} /></Link>
        <h1 className="font-bold text-gray-800">练习</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => switchMode('select')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mode === 'select' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <span className="flex items-center gap-1"><ListChecks size={14} /> 选择</span>
          </button>
          <button onClick={() => switchMode('write')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mode === 'write' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <span className="flex items-center gap-1"><PenTool size={14} /> 手写</span>
          </button>
          <div className="flex items-center gap-1 text-orange-500 font-bold text-sm ml-1">
            <Star size={16} /> {score}
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="sticky top-[57px] z-30 h-1.5 bg-orange-100">
        <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all duration-500" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="px-5 pt-8">
        <div className="max-w-md mx-auto">
          {mode === 'select' ? (
            <>
              {/* 选择题模式 */}
              <div className="text-center mb-8">
                {q.type === 'select_pinyin' ? (
                  <>
                    <div className="flex items-center justify-center gap-3">
                      <div className="text-[64px] sm:text-[72px] md:text-[80px] font-bold text-gray-800 select-none leading-none">{q.prompt}</div>
                      <button onClick={() => speak(q.char, q.audio_url)} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${speaking ? 'bg-orange-500 text-white scale-110' : 'bg-orange-50 text-orange-400 active:scale-95'}`}>
                        <Volume2 size={18} />
                      </button>
                    </div>
                    <p className="text-gray-500 text-lg mt-3">{typeLabel}</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-3">
                      <div className="text-4xl font-bold text-orange-500">{q.prompt}</div>
                      <button onClick={() => speak(q.char, q.audio_url)} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${speaking ? 'bg-orange-500 text-white scale-110' : 'bg-orange-50 text-orange-400 active:scale-95'}`}>
                        <Volume2 size={18} />
                      </button>
                    </div>
                    <p className="text-gray-500 mt-2">{typeLabel}</p>
                  </>
                )}
              </div>

              {/* 选项 */}
              <div className="flex flex-col gap-3">
                {q.options.map((option, index) => {
                  const isCorrect = index === q.correctIndex
                  const isSelected = selected === index
                  let cls = 'bg-white text-gray-800 border-transparent shadow-sm'
                  if (selected !== null) {
                    if (isCorrect) cls = 'bg-green-50 text-green-700 border-green-200'
                    else if (isSelected && !isCorrect) cls = 'bg-red-50 text-red-600 border-red-200'
                    else cls = 'bg-gray-50 text-gray-300 border-transparent'
                  }
                  return (
                    <button key={index} onClick={() => handleAnswer(index)} disabled={selected !== null}
                      className={`w-full py-4 px-5 rounded-2xl text-left text-lg font-semibold border-2 transition-all ${cls} ${selected === null ? 'hover:shadow-md active:scale-[0.98]' : ''}`}>
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold mr-3 ${
                        selected !== null && isCorrect ? 'bg-green-200 text-green-700'
                        : selected === index && !isCorrect ? 'bg-red-200 text-red-700'
                        : 'bg-orange-100 text-orange-600'
                      }`}>{['A', 'B', 'C', 'D'][index]}</span>
                      {option}
                    </button>
                  )
                })}
              </div>

              {selected !== null && (
                <button onClick={nextQuestion}
                  className="w-full mt-6 py-4 rounded-2xl bg-orange-500 text-white font-bold text-lg shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2">
                  <span>{currentIndex < questions.length - 1 ? '下一题 →' : '查看结果 →'}</span>
                  <span className="text-xs opacity-60 ml-1">自动跳转中...</span>
                </button>
              )}
            </>
          ) : (
            <>
              {/* 手写模式 */}
              <div className="text-center mb-6">
                <p className="text-gray-500 text-base mb-1">
                  第 {currentIndex + 1}/{questions.length} 题
                </p>
                <p className="text-gray-700 text-lg font-semibold">请写出这个字</p>
              </div>

              <div className="flex flex-col items-center mb-6">
                <div className="bg-white rounded-3xl shadow-lg p-6 relative">
                  <HanziWriter
                    key={`write-${currentIndex}`}
                    character={q.char}
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
                      <div className="bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg animate-bounce">
                        ✅ 写对了！
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={() => speak(q.char, q.audio_url)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${speaking ? 'bg-orange-500 text-white scale-110' : 'bg-orange-50 text-orange-400 active:scale-95'}`}
                  >
                    <Volume2 size={20} />
                  </button>
                  <button
                    onClick={() => writerRef.current?.animate()}
                    className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center active:scale-95 transition-all hover:bg-gray-100"
                    title="看笔顺提示"
                  >
                    <PencilLine size={18} />
                  </button>
                </div>
              </div>

              {!writeComplete && (
                <button
                  onClick={() => {
                    writerRef.current?.quiz({
                      onComplete: handleWriteComplete,
                    })
                  }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <PenTool size={20} /> 开始手写
                </button>
              )}

              {writeComplete && (
                <p className="text-center text-gray-400 text-sm mt-4">
                  {currentIndex < questions.length - 1 ? '自动跳转下一题...' : '即将查看结果...'}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <BottomNav active="practice" />
    </div>
  )
}
