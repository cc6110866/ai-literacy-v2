// 工具函数：统一使用本地日期（避免 toISOString 的 UTC 时区问题）
// 目标用户在国内（UTC+8），00:00-07:59 之间 toISOString 会显示前一天

export function getLocalDate(date?: Date): string {
  const d = date || new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getYesterdayDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return getLocalDate(d)
}

export function getDateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return getLocalDate(d)
}
