const STORAGE_KEY = 'study-time-seconds-by-date'

function todayKey() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function readMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function getTodayStudySeconds() {
  const map = readMap()
  return Number(map[todayKey()] || 0)
}

export function addStudySeconds(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0))
  if (!safe) return
  const map = readMap()
  const key = todayKey()
  map[key] = Number(map[key] || 0) + safe
  writeMap(map)
}

export function createStudyTimer() {
  let startedAt = 0
  let running = false
  let bound = false

  const start = () => {
    if (running) return
    running = true
    startedAt = Date.now()
    if (!bound) {
      window.addEventListener('pagehide', stop)
      bound = true
    }
  }

  const stop = () => {
    if (!running) return
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000)
    addStudySeconds(elapsedSeconds)
    running = false
    startedAt = 0
  }

  return { start, stop }
}
