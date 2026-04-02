// API: 获取单个汉字详情
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context
  const { id } = params

  try {
    const result = await env.DB.prepare(
      'SELECT id, character, pinyin, meaning, story, category, strokes, level, topic_group, origin FROM Character WHERE id = ?'
    ).bind(id).first()

    if (!result) {
      return new Response(JSON.stringify({ success: false, error: 'Character not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
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
