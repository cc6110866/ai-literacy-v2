'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PencilLine, ChevronLeft, Star, RotateCcw, ArrowRight } from 'lucide-react'
import BottomNav from '../../components/BottomNav'

interface CharData { id: number; character: string; pinyin: string; meaning: string; category: string; level: number; topic_group: string }

interface Question {
  type: 'select_pinyin' | 'select_char'
  prompt: string
  options: string[]
  correctIndex: number
  charId: number
  char: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export default function Practice() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [answered, setAnswered] = useState<boolean[]>([])
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai-literacy-uid') || 'anonymous'
    }
    return 'anonymous'
  })

  const API = ''

  useEffect(() => {
    async function loadQuestions() {
      try {
        const learnedStr = localStorage.getItem('ai-literacy-learned') || '[]'
        const learnedIds: number[] = JSON.parse(learnedStr)
        const urlParams = new URLSearchParams(window.location.search)
        const charIdsParam = urlParams.get('charIds')
        if (charIdsParam) {
          const targetIds = charIdsParam.split(',').map(Number).filter(Boolean)
          const res = await fetch(`${API}/api/characters?mode=all&limit=200`)
          const data: any = await res.json()
          if (data.success) {
            const targetChars = data.data.filter((c: CharData) => targetIds.includes(c.id))
            const extraChars = data.data.filter((c: CharData) => !targetIds.includes(c.id) && learnedIds.includes(c.id))
            const allChars = [...targetChars, ...extraChars]
            if (allChars.length >= 4) { buildQuestions(targetChars.length >= 4 ? targetChars : allChars); return }
          }
        }
        if (learnedIds.length < 4) {
          const res = await fetch(`${API}/api/characters?mode=level&level=1&limit=10`)
          const data: any = await res.json()
          if (data.success && data.data.length >= 4) buildQuestions(data.data)
          return
        }
        const res = await fetch(`${API}/api/characters?mode=all&limit=200`)
        const data: any = await res.json()
        if (data.success) {
          const learned: CharData[] = data.data.filter((c: CharData) => learnedIds.includes(c.id))
          if (learned.length >= 4) buildQuestions(shuffle<CharData>(learned).slice(0, 20))
        }
      } catch {
        setQuestions([{ type: 'select_pinyin', prompt: '一', options: ['yī', 'èr', 'sān', 'sì'], correctIndex: 0, charId: 1, char: '一' }])
      } finally { setLoading(false) }
    }

    function buildQuestions(chars: CharData[]) {
      const qs: Question[] = []
      for (const c of chars) {
        const wrongPinyin = shuffle(chars.filter(x => x.id !== c.id && x.pinyin !== c.pinyin)).slice(0, 3).map(x => x.pinyin)
        if (wrongPinyin.length >= 3) {
          const options = shuffle([c.pinyin, ...wrongPinyin])
          qs.push({ type: 'select_pinyin', prompt: c.character, options, correctIndex: options.indexOf(c.pinyin), charId: c.id, char: c.character })
        }
        const wrongChars = shuffle(chars.filter(x => x.id !== c.id)).slice(0, 3).map(x => x.character)
        if (wrongChars.length >= 3) {
          const options = shuffle([c.character, ...wrongChars])
          qs.push({ type: 'select_char', prompt: c.pinyin, options, correctIndex: options.indexOf(c.character), charId: c.id, char: c.character })
        }
      }
      setQuestions(shuffle(qs).slice(0, 10))
    }
    loadQuestions()
  }, [])

  const handleAnswer = useCallback((index: number) => {
    if (selected !== null) return
    setSelected(index)
    const isCorrect = index === questions[currentIndex].correctIndex
    if (isCorrect) setScore(s => s + 1)
    setAnswered(prev => [...prev, isCorrect])
    // 同步今日正确率
    const today = new Date().toISOString().slice(0, 10)
    const correctKey = `ai-literacy-today-correct-${today}`
    const totalKey = `ai-literacy-today-total-${today}`
    localStorage.setItem(correctKey, String(parseInt(localStorage.getItem(correctKey) || '0') + (isCorrect ? 1 : 0)))
    localStorage.setItem(totalKey, String(parseInt(localStorage.getItem(totalKey) || '0') + 1))
    fetch(`${API}/api/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, characterId: questions[currentIndex].charId, status: 'learning', practiceCount: 1, correctCount: isCorrect ? 1 : 0, isCorrect }) }).catch(() => {})
  }, [selected, questions, currentIndex, userId])

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) { setCurrentIndex(i => i + 1); setSelected(null) }
    else {
      setFinished(true)
      if (score === questions.length) {
        const cnt = parseInt(localStorage.getItem('ai-literacy-perfect') || '0') + 1
        localStorage.setItem('ai-literacy-perfect', String(cnt))
      }
    }
  }

  const restart = () => { window.location.reload() }

  if (loading) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 py-4 flex items-center gap-3">
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
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <Link href="/" className="text-gray-400"><ChevronLeft size={22} /></Link>
        <h1 className="font-bold text-gray-800">练习</h1>
        <div className="ml-auto flex items-center gap-1 text-orange-500 font-bold text-sm">
          <Star size={16} /> {score}
        </div>
      </div>

      {/* 进度条 */}
      <div className="sticky top-[57px] z-30 h-1.5 bg-orange-100">
        <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all duration-500" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="px-5 pt-8">
        <div className="max-w-md mx-auto">
          {/* 题目 */}
          <div className="text-center mb-8">
            {q.type === 'select_pinyin' ? (
              <>
                <div className="text-[80px] font-bold text-gray-800 select-none leading-none">{q.prompt}</div>
                <p className="text-gray-500 text-lg mt-3">{typeLabel}</p>
              </>
            ) : (
              <>
                <div className="text-4xl font-bold text-orange-500">{q.prompt}</div>
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
              {currentIndex < questions.length - 1 ? '下一题' : '查看结果'}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>

      <BottomNav active="practice" />
    </div>
  )
}
