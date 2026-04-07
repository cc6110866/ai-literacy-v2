'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

/**
 * 统一学习状态管理
 * 所有 localStorage 读写集中在这里，各页面通过 Context 读取
 * 避免每个页面重复读取 88+ 次 localStorage
 */

interface TodayStats {
  newCount: number
  reviewCount: number
  correctCount: number
  totalCount: number
}

interface AppStats {
  userId: string
  learnedIds: number[]
  streak: number
  dailyTarget: number
  forceLevel: number
  perfectCount: number
  totalReviewCount: number
  lastStudyDate: string
  today: TodayStats
  progress: Record<number, { nextReview: number; status: string; count: number }>
}

interface AppContextValue {
  stats: AppStats
  setStats: React.Dispatch<React.SetStateAction<AppStats>>
  refreshToday: () => void
  /** 标记一个字为已学 + 更新进度（写 localStorage + 更新 Context） */
  markLearned: (charId: number, nextReview: number, status: string, count: number) => void
  /** 更新正确率（答对/答错） */
  recordAnswer: (correct: boolean, isReview?: boolean) => void
  /** 更新连续学习天数 */
  updateStreak: () => void
  /** 刷新今日数据（从 localStorage 重新读取） */
  refresh: () => void
  /** 直接更新 progress 对象（同时写 localStorage） */
  updateProgress: (updater: (prev: AppStats['progress']) => AppStats['progress']) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

function getLocalDate(): string {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 10)
}

// 读取一次 localStorage，构建完整状态
function loadInitialState(): AppStats {
  const today = getLocalDate()

  return {
    userId: localStorage.getItem('ai-literacy-uid') || '',
    learnedIds: JSON.parse(localStorage.getItem('ai-literacy-learned') || '[]'),
    streak: parseInt(localStorage.getItem('ai-literacy-streak') || '0'),
    dailyTarget: parseInt(localStorage.getItem('ai-literacy-daily-target') || '5'),
    forceLevel: parseInt(localStorage.getItem('ai-literacy-force-level') || '0'),
    perfectCount: parseInt(localStorage.getItem('ai-literacy-perfect') || '0'),
    totalReviewCount: parseInt(localStorage.getItem('ai-literacy-review-count') || '0'),
    lastStudyDate: localStorage.getItem('ai-literacy-last-study-date') || '',
    today: {
      newCount: parseInt(localStorage.getItem(`ai-literacy-today-learned-${today}`) || '0'),
      reviewCount: parseInt(localStorage.getItem(`ai-literacy-today-review-count-${today}`) || '0'),
      correctCount: parseInt(localStorage.getItem(`ai-literacy-today-correct-${today}`) || '0'),
      totalCount: parseInt(localStorage.getItem(`ai-literacy-today-total-${today}`) || '0'),
    },
    progress: JSON.parse(localStorage.getItem('ai-literacy-progress') || '{}'),
  }
}

export default function AppProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<AppStats>(loadInitialState)

  // 初始化 userId
  useEffect(() => {
    if (!stats.userId) {
      const uid = 'user_' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem('ai-literacy-uid', uid)
      setStats(prev => ({ ...prev, userId: uid }))
    }
  }, [])

  /** 标记一个字为已学 + 更新进度 */
  const markLearned = useCallback((charId: number, nextReview: number, status: string, count: number) => {
    const today = getLocalDate()

    // 更新 learnedIds
    setStats(prev => {
      const newLearned = prev.learnedIds.includes(charId) ? prev.learnedIds : [...prev.learnedIds, charId]
      localStorage.setItem('ai-literacy-learned', JSON.stringify(newLearned))

      // 更新 progress
      const newProgress = { ...prev.progress, [charId]: { nextReview, status, count } }
      localStorage.setItem('ai-literacy-progress', JSON.stringify(newProgress))

      // 更新今日已学
      const todayKey = `ai-literacy-today-learned-${today}`
      const todayIds: number[] = JSON.parse(localStorage.getItem(todayKey) || '[]')
      if (!todayIds.includes(charId)) {
        todayIds.push(charId)
        localStorage.setItem(todayKey, JSON.stringify(todayIds))
      }

      return {
        ...prev,
        learnedIds: newLearned,
        progress: newProgress,
        today: { ...prev.today, newCount: todayIds.length },
      }
    })
  }, [])

  /** 记录答题结果 */
  const recordAnswer = useCallback((correct: boolean, isReview: boolean = false) => {
    const today = getLocalDate()

    setStats(prev => {
      const newCorrect = prev.today.correctCount + (correct ? 1 : 0)
      const newTotal = prev.today.totalCount + 1

      localStorage.setItem(`ai-literacy-today-correct-${today}`, String(newCorrect))
      localStorage.setItem(`ai-literacy-today-total-${today}`, String(newTotal))

      if (isReview) {
        const newReviewCount = prev.today.reviewCount + 1
        const newTotalReview = prev.totalReviewCount + 1
        localStorage.setItem(`ai-literacy-today-review-count-${today}`, String(newReviewCount))
        localStorage.setItem('ai-literacy-review-count', String(newTotalReview))
        return {
          ...prev,
          today: { ...prev.today, correctCount: newCorrect, totalCount: newTotal, reviewCount: newReviewCount },
          totalReviewCount: newTotalReview,
        }
      }

      return {
        ...prev,
        today: { ...prev.today, correctCount: newCorrect, totalCount: newTotal },
      }
    })
  }, [])

  /** 更新连续学习天数 */
  const updateStreak = useCallback(() => {
    const today = getLocalDate()

    setStats(prev => {
      let newStreak = prev.streak
      if (prev.lastStudyDate !== today) {
        const yesterday = new Date(Date.now() - 86400000)
        const yesterdayStr = yesterday.toISOString().slice(0, 10)
        newStreak = prev.lastStudyDate === yesterdayStr ? prev.streak + 1 : 1
      }
      localStorage.setItem('ai-literacy-streak', String(newStreak))
      localStorage.setItem('ai-literacy-last-study-date', today)
      return { ...prev, streak: newStreak, lastStudyDate: today }
    })
  }, [])

  /** 完整刷新（从 localStorage 重读所有数据） */
  const refresh = useCallback(() => {
    setStats(loadInitialState())
  }, [])

  const updateProgress = useCallback((updater: (prev: AppStats['progress']) => AppStats['progress']) => {
    setStats(prev => {
      const newProgress = updater(prev.progress)
      localStorage.setItem('ai-literacy-progress', JSON.stringify(newProgress))
      return { ...prev, progress: newProgress }
    })
  }, [])

  const refreshToday = useCallback(() => {
    const today = getLocalDate()
    setStats(prev => ({
      ...prev,
      today: {
        newCount: parseInt(localStorage.getItem(`ai-literacy-today-learned-${today}`) || '0'),
        reviewCount: parseInt(localStorage.getItem(`ai-literacy-today-review-count-${today}`) || '0'),
        correctCount: parseInt(localStorage.getItem(`ai-literacy-today-correct-${today}`) || '0'),
        totalCount: parseInt(localStorage.getItem(`ai-literacy-today-total-${today}`) || '0'),
      },
    }))
  }, [])

  return (
    <AppContext.Provider value={{ stats, setStats, refreshToday, markLearned, recordAnswer, updateStreak, refresh, updateProgress }}>
      {children}
    </AppContext.Provider>
  )
}
