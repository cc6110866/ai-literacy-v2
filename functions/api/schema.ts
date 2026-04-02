// 临时探测端点 - 获取实际表结构
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context

  try {
    const tables = ['Progress', 'DailyRecord', 'Character']
    const result: Record<string, any[]> = {}

    for (const table of tables) {
      const info: any = await env.DB.prepare(`PRAGMA table_info(${table})`).all()
      result[table] = info.results || []
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

interface Env {
  DB: D1Database
}
