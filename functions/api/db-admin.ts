// 临时端点：查看和修改 D1 表结构（用完即删）
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context
  const url = new URL(context.request.url)
  const action = url.searchParams.get('action') || 'info'

  try {
    if (action === 'info') {
      const tables = url.searchParams.get('table') || 'DailyRecord'
      const result: any = await env.DB.prepare(`PRAGMA table_info(${tables})`).all()
      return new Response(JSON.stringify({ success: true, data: result.results }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
    if (action === 'alter') {
      const sql = url.searchParams.get('sql')
      if (!sql) return new Response(JSON.stringify({ error: 'Missing sql' }), { status: 400 })
      await env.DB.prepare(sql).run()
      return new Response(JSON.stringify({ success: true, sql }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false, error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}
