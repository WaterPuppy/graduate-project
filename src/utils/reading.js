const API_BASE = 'http://127.0.0.1:5001'

export function extractWordsFromEnglish(text) {
  if (!text) return []
  const cleaned = String(text)
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
  const parts = cleaned.split(/\s+/).filter(Boolean)
  return [...new Set(parts)]
}

async function ensureFavoriteBookId() {
  const listRes = await fetch(`${API_BASE}/books`)
  const books = await listRes.json()
  const existed = (books || []).find((item) => String(item.name || '').trim() === '收藏')
  if (existed?.id) return existed.id

  const createRes = await fetch(`${API_BASE}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '收藏',
      tag: '系统',
      description: '阅读模块收藏词书',
      cover: ''
    })
  })
  const created = await createRes.json()
  return created.id
}

async function fetchWordMeaning(word) {
  async function translateToChinese(text) {
    try {
      const tRes = await fetch(`${API_BASE}/api/ai/reading/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const tData = await tRes.json()
      const zh = String(tData?.chinese || '').trim()
      if (tRes.ok && tData?.success && zh) {
        return zh
      }
      return ''
    } catch {
      return ''
    }
  }

  try {
    const res = await fetch(`${API_BASE}/dictionary_search?word=${encodeURIComponent(word)}`)
    if (!res.ok) {
      // 词典查不到时，回退翻译单词本身
      return await translateToChinese(word)
    }
    const data = await res.json()
    const first = (data.meanings || [])[0]
    const definition = String(first?.definition || '').trim()
    if (!definition) {
      // 没有英英释义时，回退翻译单词本身
      return await translateToChinese(word)
    }

    // 二次翻译：将英英释义转为中文，失败时回退英文释义
    const zh = await translateToChinese(definition)
    if (zh) return zh

    return definition
  } catch {
    return await translateToChinese(word)
  }
}

export async function addWordToFavorites({ word, source_article_id, source_article_title }) {
  const normalized = String(word || '').trim().toLowerCase()
  if (!normalized) {
    return { added: false, reason: 'empty' }
  }

  const favoriteBookId = await ensureFavoriteBookId()

  const queryRes = await fetch(
    `${API_BASE}/books/${favoriteBookId}/entries?keyword=${encodeURIComponent(normalized)}`
  )
  const queryData = await queryRes.json()
  const existed = (queryData.words || []).some((item) => String(item.word || '').trim().toLowerCase() === normalized)
  if (existed) {
    return { added: false, reason: 'exists', favoriteBookId }
  }

  const meaning = (await fetchWordMeaning(normalized)) || '释义待补充'
  const createRes = await fetch(`${API_BASE}/books/${favoriteBookId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word: normalized,
      meaning,
      pos: '阅读',
      phonetic: ''
    })
  })

  if (!createRes.ok) {
    return { added: false, reason: 'failed', favoriteBookId }
  }

  return { added: true, favoriteBookId }
}
