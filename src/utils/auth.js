export function getAuthUser() {
  try {
    const raw = localStorage.getItem('auth-user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getCurrentUserId() {
  const user = getAuthUser()
  const id = Number(user?.id || 0)
  return Number.isFinite(id) && id > 0 ? id : null
}

export function clearUserSessionCache() {
  localStorage.removeItem('auth-user')
  localStorage.removeItem('active-book-id')
}

