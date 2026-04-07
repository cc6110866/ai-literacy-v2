// 艾宾浩斯复习间隔（毫秒）：1h, 1d, 3d, 7d, 15d, 30d
export const REVIEW_INTERVALS = [
  3600000,       // 1 小时
  86400000,      // 1 天
  259200000,     // 3 天
  604800000,     // 7 天
  1296000000,    // 15 天
  2592000000,    // 30 天
] as const

/** 根据已复习次数获取下次复习时间 */
export function getNextReview(reviewCount: number, now: number = Date.now()): number {
  const idx = Math.min(reviewCount, REVIEW_INTERVALS.length - 1)
  return now + REVIEW_INTERVALS[idx]
}

/** 判断是否已掌握（连续正确 5 次） */
export function isMastered(reviewCount: number): boolean {
  return reviewCount >= 5
}
