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

const AppContext = createContext<{
  stats: AppStats
  setStats: React.Dispatch<React.SetStateAction<AppStats>>
  refreshToday: () => void
} | null>(null)

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
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

function getLocalDate(): string {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 10)
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

  // 跨天刷新今日数据
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
    <AppContext.Provider value={{ stats, setStats, refreshToday }}>
      {children}
    </AppContext.Provider>
  )
}
