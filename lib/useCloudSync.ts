'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * 云端进度同步 Hook
 * - 启动时从云端拉取进度，与本地合并（取最新）
 * - 本地进度变更后自动上传（防抖 5 秒）
 * - 支持手动触发同步
 */

interface CloudProgress {
  characterId: number
  status: string
  practiceCount: number
  correctCount: number
  nextReview: string | null
  reviewCount: number
  lastPracticeTs: number | null
}

interface LocalProgress {
  nextReview: number
  status: string
  count: number
}

const SYNC_DEBOUNCE = 5000 // 5 秒防抖
const SYNC_KEY = 'ai-literacy-last-sync'
const SYNC_INTERVAL = 60000 // 每分钟自动同步一次

function getUserId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('ai-literacy-uid') || ''
}

function getLocalProgress(): Record<number, LocalProgress> {
  const str = localStorage.getItem('ai-literacy-progress') || '{}'
  return JSON.parse(str)
}

function setLocalProgress(progress: Record<number, LocalProgress>) {
  localStorage.setItem('ai-literacy-progress', JSON.stringify(progress))
}

function getLocalLearnedIds(): number[] {
  return JSON.parse(localStorage.getItem('ai-literacy-learned') || '[]')
}

function setLocalLearnedIds(ids: number[]) {
  localStorage.setItem('ai-literacy-learned', JSON.stringify(ids))
}

export function useCloudSync() {
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const syncingRef = useRef(false)
  const lastSyncRef = useRef<number>(0)

  // 从云端拉取并合并到本地
  const pullFromCloud = useCallback(async () => {
    const userId = getUserId()
    if (!userId || syncingRef.current) return

    try {
      syncingRef.current = true
      const res = await fetch(`/api/progress?userId=${encodeURIComponent(userId)}&mode=all`)
      const data: any = await res.json()

      if (!data.success || !Array.isArray(data.data)) return

      const cloudProgress: CloudProgress[] = data.data
      if (cloudProgress.length === 0) return

      const localProgress = getLocalProgress()
      let merged = false

      for (const cloud of cloudProgress) {
        const local = localProgress[cloud.characterId]

        if (!local) {
          // 云端有，本地没有 → 新设备，写入本地
          localProgress[cloud.characterId] = {
            nextReview: cloud.nextReview ? new Date(cloud.nextReview).getTime() : Date.now() + 86400000,
            status: cloud.status,
            count: cloud.reviewCount || cloud.practiceCount || 0,
          }
          merged = true
        } else {
          // 两边都有，取 nextReview 更晚的（更准确的间隔）
          const cloudNext = cloud.nextReview ? new Date(cloud.nextReview).getTime() : 0
          const localNext = local.nextReview || 0
          if (cloudNext > localNext && cloud.reviewCount > local.count) {
            localProgress[cloud.characterId] = {
              nextReview: cloudNext,
              status: cloud.status || local.status,
              count: Math.max(local.count, cloud.reviewCount || 0),
            }
            merged = true
          }
        }
      }

      if (merged) {
        setLocalProgress(localProgress)

        // 同步已学列表
        const learnedIds = new Set(getLocalLearnedIds())
        for (const cid of Object.keys(localProgress)) {
          learnedIds.add(parseInt(cid))
        }
        setLocalLearnedIds(Array.from(learnedIds))

        // 同步连续天数
        const cloudStreak = cloudProgress.reduce((max, p) => {
          if (p.lastPracticeTs) {
            const daysSince = Math.floor((Date.now() - p.lastPracticeTs) / 86400000)
            if (daysSince <= 1) return Math.max(max, 1)
          }
          return max
        }, 0)
        const localStreak = parseInt(localStorage.getItem('ai-literacy-streak') || '0')
        if (cloudStreak > localStreak) {
          localStorage.setItem('ai-literacy-streak', String(cloudStreak))
        }

        console.log(`[CloudSync] 拉取并合并 ${cloudProgress.length} 条进度`)
      }

      lastSyncRef.current = Date.now()
      localStorage.setItem(SYNC_KEY, String(lastSyncRef.current))
    } catch (err) {
      console.warn('[CloudSync] 拉取失败:', err)
    } finally {
      syncingRef.current = false
    }
  }, [])

  // 上传本地进度到云端
  const pushToCloud = useCallback(async () => {
    const userId = getUserId()
    if (!userId) return

    const localProgress = getLocalProgress()
    const entries = Object.entries(localProgress)
    if (entries.length === 0) return

    // 只上传有实际进度的记录
    const progressList = entries.map(([charId, p]) => ({
      characterId: parseInt(charId),
      status: p.status,
      practiceCount: p.count,
      correctCount: Math.round(p.count * 0.8), // 估算正确数
      nextReview: new Date(p.nextReview).toISOString(),
      reviewCount: p.count,
    }))

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, mode: 'sync', progress: progressList }),
      })
      const data: any = await res.json()
      if (data.success) {
        console.log(`[CloudSync] 上传 ${data.synced} 条进度`)
      }
    } catch (err) {
      console.warn('[CloudSync] 上传失败:', err)
    }
  }, [])

  // 防抖上传
  const schedulePush = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      pushToCloud()
    }, SYNC_DEBOUNCE)
  }, [pushToCloud])

  // 手动触发完整同步
  const syncNow = useCallback(async () => {
    await pullFromCloud()
    await pushToCloud()
  }, [pullFromCloud, pushToCloud])

  // 启动时拉取
  useEffect(() => {
    const lastSync = parseInt(localStorage.getItem(SYNC_KEY) || '0')
    // 超过 5 分钟没同步过，自动拉取
    if (Date.now() - lastSync > 300000) {
      pullFromCloud()
    }

    // 定时上传
    intervalRef.current = setInterval(schedulePush, SYNC_INTERVAL)

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [pullFromCloud, schedulePush])

  return { syncNow, schedulePush }
}
