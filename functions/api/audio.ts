// /functions/api/audio.ts
// 代理 R2 拼音音频，前端通过 /api/audio?pinyin=ba1 访问

interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;
}

// 拼音声调符号转文件名
function pinyinToFilename(pinyin: string): string {
  const map: Record<string, string> = {
    'ā': 'a1', 'á': 'a2', 'ǎ': 'a3', 'à': 'a4',
    'ē': 'e1', 'é': 'e2', 'ě': 'e3', 'è': 'e4',
    'ī': 'i1', 'í': 'i2', 'ǐ': 'i3', 'ì': 'i4',
    'ō': 'o1', 'ó': 'o2', 'ǒ': 'o3', 'ò': 'o4',
    'ū': 'u1', 'ú': 'u2', 'ǔ': 'u3', 'ù': 'u4',
    'ǖ': 'v1', 'ǘ': 'v2', 'ǚ': 'v3', 'ǜ': 'v4',
  };
  let safe = pinyin;
  for (const [tone, num] of Object.entries(map)) {
    safe = safe.replaceAll(tone, num);
  }
  return `ai-literacy/audio/pinyin/${safe}.mp3`;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const pinyin = url.searchParams.get('pinyin');

  if (!pinyin) {
    return new Response(JSON.stringify({ error: 'Missing pinyin parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const key = pinyinToFilename(pinyin);

  // 绑定 R2 bucket
  const bucket = context.env.ASSETS;
  if (!bucket) {
    return new Response(JSON.stringify({ error: 'R2 bucket not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const object = await bucket.get(key);
  if (!object) {
    return new Response(JSON.stringify({ error: 'Audio not found', key }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(object.size),
    },
  });
};
