/**
 * IndexedDB 字库缓存层
 * 首次从 API 加载字库后缓存到 IndexedDB，后续直接读取
 * 支持按 level/topic 粒度缓存，避免全量写入
 */

const DB_NAME = 'ai-literacy-db'
const DB_VERSION = 1
const CHAR_STORE = 'characters'

export interface CharRecord {
  id: number
  character: string
  pinyin: string
  meaning: string
  story: string
  category: string
  strokes: number
  level: number
  topic_group: string
  origin: string
  audio_url?: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(CHAR_STORE)) {
        const store = db.createObjectStore(CHAR_STORE, { keyPath: 'id' })
        store.createIndex('level', 'level', { unique: false })
        store.createIndex('topic_group', 'topic_group', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** 批量写入字库到 IndexedDB */
export async function cacheCharacters(chars: CharRecord[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAR_STORE, 'readwrite')
    const store = tx.objectStore(CHAR_STORE)
    // 清空旧数据再写入（版本更新时全量替换）
    store.clear()
    chars.forEach(c => store.put(c))
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

/** 获取所有缓存字符 */
export async function getAllCachedChars(): Promise<CharRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAR_STORE, 'readonly')
    const store = tx.objectStore(CHAR_STORE)
    const req = store.getAll()
    req.onsuccess = () => { db.close(); resolve(req.result) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

/** 按 ID 获取单个字符 */
export async function getCachedChar(id: number): Promise<CharRecord | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAR_STORE, 'readonly')
    const store = tx.objectStore(CHAR_STORE)
    const req = store.get(id)
    req.onsuccess = () => { db.close(); resolve(req.result) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

/** 按条件筛选缓存字符 */
export async function getCachedCharsByFilter(filter: {
  level?: number
  topic_group?: string
}): Promise<CharRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAR_STORE, 'readonly')
    const store = tx.objectStore(CHAR_STORE)
    let req: IDBRequest
    if (filter.topic_group) {
      const idx = store.index('topic_group')
      req = idx.getAll(filter.topic_group)
    } else if (filter.level) {
      const idx = store.index('level')
      req = idx.getAll(filter.level)
    } else {
      req = store.getAll()
    }
    req.onsuccess = () => { db.close(); resolve(req.result) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

/** 检查缓存是否存在且有数据 */
export async function hasCache(): Promise<boolean> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAR_STORE, 'readonly')
    const store = tx.objectStore(CHAR_STORE)
    const req = store.count()
    req.onsuccess = () => { db.close(); resolve(req.result > 0) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

/** 清除缓存 */
export async function clearCache(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAR_STORE, 'readwrite')
    const store = tx.objectStore(CHAR_STORE)
    store.clear()
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

/** 带缓存的字库加载（核心方法） */
export async function loadCharactersWithCache(options?: {
  forceRefresh?: boolean
  apiBaseUrl?: string
}): Promise<CharRecord[]> {
  const api = options?.apiBaseUrl || ''

  // 1. 有缓存且不强制刷新 → 直接返回
  if (!options?.forceRefresh) {
    const cached = await hasCache()
    if (cached) {
      const chars = await getAllCachedChars()
      if (chars.length > 0) return chars
    }
  }

  // 2. 从 API 加载
  const res = await fetch(`${api}/api/characters?mode=all&limit=2000`)
  const data: any = await res.json()
  if (!data.success) throw new Error('API failed')

  // 3. 写入缓存
  const chars: CharRecord[] = data.data
  await cacheCharacters(chars)

  return chars
}
