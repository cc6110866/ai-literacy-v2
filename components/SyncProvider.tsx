'use client'

import { useEffect } from 'react'
import { useCloudSync } from '../lib/useCloudSync'

/**
 * 全局云端同步 Provider
 * 放在 layout 中，应用启动时自动拉取云端进度
 */
export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const { syncNow } = useCloudSync()

  useEffect(() => {
    // 应用启动时静默同步一次
    syncNow()
  }, [syncNow])

  return <>{children}</>
}
