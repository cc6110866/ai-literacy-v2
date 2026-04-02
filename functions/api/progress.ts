// API: 获取/更新学习进度
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')

  if (!userId) {
    return new Response(JSON.stringify({ success: false, error: 'Missing userId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  try {
    // 获取用户总览
    const userResult: any = await env.DB.prepare(
      'SELECT totalLearned, mastered, streak, dueReview FROM user_progress WHERE userId = ?'
    ).bind(userId).first()

    const totalLearned = userResult?.totalLearned || 0
    const mastered = userResult?.mastered || 0
    const streak = userResult?.streak || 0

    // 获取今日统计
    const today = new Date().toISOString().slice(0, 10)
    const todayResult: any = await env.DB.prepare(
      'SELECT newCount, reviewCount, correctCount, totalAttempts FROM daily_stats WHERE userId = ? AND date = ?'
    ).bind(userId, today).first()

    const todayData = todayResult ? {
      newCount: todayResult.newCount || 0,
      reviewCount: todayResult.reviewCount || 0,
      correctCount: todayResult.correctCount || 0,
      totalAttempts: todayResult.totalAttempts || 0,
      correctRate: todayResult.totalAttempts > 0 ? (todayResult.correctCount / todayResult.totalAttempts) : 0,
    } : { newCount: 0, reviewCount: 0, correctCount: 0, totalAttempts: 0, correctRate: 0 }

    // 获取本周历史
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 6)
    const weekStr = weekAgo.toISOString().slice(0, 10)
    const weekResult: any = await env.DB.prepare(
      'SELECT date, newCount, reviewCount, correctCount, totalAttempts FROM daily_stats WHERE userId = ? AND date >= ? ORDER BY date'
    ).bind(userId, weekStr).all()

    const weekHistory = weekResult.results.map((row: any) => ({
      date: row.date,
      newCount: row.newCount || 0,
      reviewCount: row.reviewCount || 0,
      correctRate: row.totalAttempts > 0 ? (row.correctCount / row.totalAttempts) : 0,
    }))

    // 计算待复习数量
    const dueReview = userResult?.dueReview || 0

    return new Response(JSON.stringify({
      success: true,
      data: {
        totalLearned,
        mastered,
        streak,
        dueReview,
        today: todayData,
        weekHistory,
      },
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const body: any = await request.json()
    const { userId, characterId, status, practiceCount, correctCount, isCorrect } = body

    if (!userId || !characterId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing userId or characterId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const today = new Date().toISOString().slice(0, 10)

    // 更新用户总进度
    await env.DB.prepare(`
      INSERT INTO user_progress (userId, totalLearned, mastered, streak, lastStudyDate, dueReview)
      VALUES (?, 1, 0, 1, ?, 0)
      ON CONFLICT(userId) DO UPDATE SET
        totalLearned = totalLearned + CASE WHEN status = 'learning' THEN 1 ELSE 0 END,
        mastered = mastered + CASE WHEN status = 'mastered' THEN 1 ELSE 0 END,
        lastStudyDate = ?,
        streak = CASE WHEN date(lastStudyDate) = date(?, '-1 day') THEN streak + 1 ELSE 1 END
    `).bind(userId, today, today, today).run()

    // 更新每日统计
    await env.DB.prepare(`
      INSERT INTO daily_stats (userId, date, newCount, reviewCount, correctCount, totalAttempts)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId, date) DO UPDATE SET
        newCount = newCount + ?,
        reviewCount = reviewCount + ?,
        correctCount = correctCount + ?,
        totalAttempts = totalAttempts + ?
    `).bind(
      userId, today,
      status === 'learning' ? 1 : 0, status === 'review' ? 1 : 0,
      correctCount || 0, practiceCount || 0,
      status === 'learning' ? 1 : 0, status === 'review' ? 1 : 0,
      correctCount || 0, practiceCount || 0
    ).run()

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
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
