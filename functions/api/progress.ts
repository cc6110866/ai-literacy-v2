// API: 获取/更新学习进度
// 表结构（v1 实际）:
// Progress: id, userId, characterId, status, practiceCount, correctCount, lastPractice, nextReview, reviewCount, createdAt
// DailyRecord: id, userId, date, charactersLearned, charactersReviewed, newCount, reviewCount, correctRate, createdAt

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  const mode = url.searchParams.get('mode') || 'overview'

  if (!userId) {
    return new Response(JSON.stringify({ success: false, error: 'Missing userId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  try {
    if (mode === 'overview') {
      return getOverview(env, userId)
    } else if (mode === 'character') {
      const characterId = url.searchParams.get('characterId')
      if (!characterId) {
        return new Response(JSON.stringify({ success: false, error: 'Missing characterId' }), {
          status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }
      return getCharacterProgress(env, userId, parseInt(characterId))
    } else if (mode === 'today') {
      return getTodayStats(env, userId)
    } else if (mode === 'week') {
      return getWeekHistory(env, userId)
    } else if (mode === 'review') {
      return getDueReview(env, userId)
    }
    return new Response(JSON.stringify({ success: false, error: 'Unknown mode' }), {
      status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

// 获取用户总览
async function getOverview(env: any, userId: string) {
  // 从 Progress 表聚合统计
  const stats: any = await env.DB.prepare(`
    SELECT
      COUNT(*) as totalLearned,
      SUM(CASE WHEN practiceCount >= 5 THEN 1 ELSE 0 END) as mastered,
      COUNT(DISTINCT date(lastPractice)) as studyDays
    FROM Progress WHERE userId = ?
  `).bind(userId).first()

  // 计算连续学习天数
  const recentDates: any = await env.DB.prepare(`
    SELECT DISTINCT date(lastPractice) as studyDate
    FROM Progress WHERE userId = ?
    ORDER BY studyDate DESC LIMIT 30
  `).bind(userId).all()

  let streak = 0
  const today = new Date().toISOString().slice(0, 10)
  if (recentDates.results && recentDates.results.length > 0) {
    let expectedDate = today
    // 如果今天没学，从昨天开始算
    const firstDate = recentDates.results[0].studyDate
    if (firstDate !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expectedDate = yesterday.toISOString().slice(0, 10)
    }
    for (const row of recentDates.results) {
      if (row.studyDate === expectedDate) {
        streak++
        const d = new Date(expectedDate)
        d.setDate(d.getDate() - 1)
        expectedDate = d.toISOString().slice(0, 10)
      } else {
        break
      }
    }
  }

  // 获取待复习数量
  const dueReview: any = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM Progress
    WHERE userId = ? AND status != 'mastered' AND nextReview IS NOT NULL AND nextReview <= datetime('now')
  `).bind(userId).first()

  // 今日统计
  const todayData = await getTodayStats(env, userId)
  const todayJson: any = await todayData.json()

  return new Response(JSON.stringify({
    success: true,
    data: {
      totalLearned: stats?.totalLearned || 0,
      mastered: stats?.mastered || 0,
      streak,
      dueReview: dueReview?.count || 0,
      today: todayJson.data || { newCount: 0, reviewCount: 0, correctRate: 0 },
    },
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

// 获取单个字进度
async function getCharacterProgress(env: any, userId: string, characterId: number) {
  const result: any = await env.DB.prepare(
    'SELECT * FROM Progress WHERE userId = ? AND characterId = ?'
  ).bind(userId, characterId).first()

  if (!result) {
    return new Response(JSON.stringify({ success: true, data: null }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  return new Response(JSON.stringify({ success: true, data: result }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

// 获取今日统计
async function getTodayStats(env: any, userId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const result: any = await env.DB.prepare(
    'SELECT * FROM DailyRecord WHERE userId = ? AND date = ?'
  ).bind(userId, today).first()

  const data = result ? {
    date: result.date,
    newCount: result.newCount || 0,
    reviewCount: result.reviewCount || 0,
    correctRate: result.correctRate || 0,
    charactersLearned: result.charactersLearned || '',
    charactersReviewed: result.charactersReviewed || '',
  } : { date: today, newCount: 0, reviewCount: 0, correctRate: 0, charactersLearned: '', charactersReviewed: '' }

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

// 获取本周历史
async function getWeekHistory(env: any, userId: string) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)
  const weekStr = weekAgo.toISOString().slice(0, 10)
  const result: any = await env.DB.prepare(
    'SELECT date, newCount, reviewCount, correctRate FROM DailyRecord WHERE userId = ? AND date >= ? ORDER BY date'
  ).bind(userId, weekStr).all()

  return new Response(JSON.stringify({
    success: true,
    data: result.results || [],
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

// 获取待复习列表
async function getDueReview(env: any, userId: string) {
  const result: any = await env.DB.prepare(`
    SELECT p.characterId, p.status, p.practiceCount, p.correctCount, p.nextReview,
           c.character, c.pinyin, c.meaning
    FROM Progress p
    JOIN Character c ON p.characterId = c.id
    WHERE p.userId = ? AND p.status != 'mastered'
      AND p.nextReview IS NOT NULL AND p.nextReview <= datetime('now')
    ORDER BY p.nextReview ASC
    LIMIT 50
  `).bind(userId).all()

  return new Response(JSON.stringify({
    success: true,
    data: result.results || [],
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

// POST: 更新进度
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const body: any = await request.json()
    const { userId, characterId, status, practiceCount, correctCount, isCorrect, isReview } = body

    if (!userId || !characterId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing userId or characterId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const now = new Date().toISOString()
    const today = new Date().toISOString().slice(0, 10)
    const inputStatus = status || 'learning'
    const inputCorrect = correctCount ?? (isCorrect ? 1 : 0)
    const inputPractice = practiceCount ?? 1

    // 计算复习间隔（艾宾浩斯）
    const intervals = [3600000, 86400000, 259200000, 604800000, 1296000000, 2592000000]
    const nextReviewDate = new Date(Date.now() + intervals[0]) // 1小时后

    // 检查是否已存在
    const existing: any = await env.DB.prepare(
      'SELECT practiceCount, correctCount, reviewCount, status FROM Progress WHERE userId = ? AND characterId = ?'
    ).bind(userId, characterId).first()

    if (existing) {
      const newPracticeCount = (existing.practiceCount || 0) + inputPractice
      const newCorrectCount = (existing.correctCount || 0) + inputCorrect
      const newReviewCount = (existing.reviewCount || 0) + 1
      const newStatus = newPracticeCount >= 5 ? 'mastered' : inputStatus

      // 根据已复习次数确定间隔
      let intervalIndex = Math.min(newReviewCount, intervals.length - 1)
      const nextReview = new Date(Date.now() + intervals[intervalIndex]).toISOString()

      await env.DB.prepare(`
        UPDATE Progress SET
          status = ?, practiceCount = ?, correctCount = ?,
          lastPractice = datetime('now'), nextReview = ?, reviewCount = ?
        WHERE userId = ? AND characterId = ?
      `).bind(newStatus, newPracticeCount, newCorrectCount, nextReview, newReviewCount, userId, characterId).run()
    } else {
      await env.DB.prepare(`
        INSERT INTO Progress (userId, characterId, status, practiceCount, correctCount, nextReview, reviewCount)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).bind(userId, characterId, inputStatus, inputPractice, inputCorrect, nextReviewDate.toISOString()).run()
    }

    // 更新每日统计
    const existingDaily: any = await env.DB.prepare(
      'SELECT id, newCount, reviewCount, charactersLearned, charactersReviewed FROM DailyRecord WHERE userId = ? AND date = ?'
    ).bind(userId, today).first()

    if (existingDaily) {
      const isReviewOp = isReview === true
      const newCount = (existingDaily.newCount || 0) + (isReviewOp ? 0 : 1)
      const reviewCount = (existingDaily.reviewCount || 0) + (isReviewOp ? 1 : 0)
      const learned = existingDaily.charactersLearned || ''
      const reviewed = existingDaily.charactersReviewed || ''

      await env.DB.prepare(`
        UPDATE DailyRecord SET
          newCount = ?, reviewCount = ?,
          charactersLearned = ?, charactersReviewed = ?
        WHERE userId = ? AND date = ?
      `).bind(newCount, reviewCount, learned, reviewed, userId, today).run()
    } else {
      await env.DB.prepare(`
        INSERT INTO DailyRecord (userId, date, newCount, reviewCount, charactersLearned, charactersReviewed)
        VALUES (?, ?, ?, ?, ?, '')
      `).bind(userId, today, isReview === true ? 0 : 1, isReview === true ? 1 : 0, '').run()
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
