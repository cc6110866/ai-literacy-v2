// API: 获取汉字列表
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode') || 'level'
  const level = parseInt(url.searchParams.get('level') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const topicGroup = url.searchParams.get('topic_group') || ''
  const offset = parseInt(url.searchParams.get('offset') || '0')

  try {
    let query = ''
    let params: any[] = []

    if (mode === 'all') {
      query = 'SELECT id, character, pinyin, meaning, story, category, strokes, level, topic_group, origin, audio_url FROM Character ORDER BY level, id LIMIT ? OFFSET ?'
      params = [limit, offset]
    } else if (mode === 'level') {
      if (topicGroup) {
        query = 'SELECT id, character, pinyin, meaning, story, category, strokes, level, topic_group, origin, audio_url FROM Character WHERE level = ? AND topic_group = ? ORDER BY id LIMIT ? OFFSET ?'
        params = [level, topicGroup, limit, offset]
      } else {
        query = 'SELECT id, character, pinyin, meaning, story, category, strokes, level, topic_group, origin, audio_url FROM Character WHERE level = ? ORDER BY id LIMIT ? OFFSET ?'
        params = [level, limit, offset]
      }
    } else if (mode === 'topic_group') {
      query = 'SELECT DISTINCT topic_group, COUNT(*) as count FROM Character GROUP BY topic_group ORDER BY MIN(id)'
    } else if (mode === 'groups') {
      query = 'SELECT topic_group, level, COUNT(*) as count FROM Character GROUP BY topic_group, level ORDER BY level, topic_group'
    } else if (mode === 'today') {
      // 随机取指定级别和数量的字
      query = 'SELECT id, character, pinyin, meaning, story, category, strokes, level, topic_group, origin, audio_url FROM Character WHERE level = ? ORDER BY RANDOM() LIMIT ?'
      params = [level, limit]
    } else if (mode === 'review') {
      query = 'SELECT id, character, pinyin, meaning, story, category, strokes, level, topic_group, origin, audio_url FROM Character WHERE level <= ? ORDER BY RANDOM() LIMIT ?'
      params = [level, limit]
    } else {
      query = 'SELECT id, character, pinyin, meaning, story, category, strokes, level, topic_group, origin, audio_url FROM Character WHERE level = ? ORDER BY id LIMIT ? OFFSET ?'
      params = [level, limit, offset]
    }

    const result = await env.DB.prepare(query).bind(...params).all()

    return new Response(JSON.stringify({
      success: true,
      data: result.results,
      total: result.results.length,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
