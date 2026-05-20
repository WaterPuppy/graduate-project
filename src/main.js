import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { getCurrentUserId } from './utils/auth'

const rawFetch = window.fetch.bind(window)
window.fetch = (input, init = {}) => {
  const userId = getCurrentUserId()
  const req = new Request(input, init)
  const url = req.url || ''
  const shouldAttach = url.includes('127.0.0.1:5001') || url.includes('localhost:5001') || url.startsWith('/')

  if (!shouldAttach || !userId) {
    return rawFetch(req)
  }

  const headers = new Headers(req.headers || {})
  if (!headers.has('X-User-Id')) {
    headers.set('X-User-Id', String(userId))
  }

  const withUser = new Request(req, { headers })
  return rawFetch(withUser)
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
