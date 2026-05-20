<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearUserSessionCache } from '../utils/auth'

const router = useRouter()

const dashboard = reactive({
  homeEntries: [
    { key: 'spelling', title: '单词拼写', icon: '⌨️' },
    { key: 'reading', title: '趣味阅读', icon: '📖' },
    { key: 'dictionary', title: '智能助手', icon: '📘' },
    { key: 'battle', title: '单词对战', icon: '⚔️' }
  ]
})

const books = ref([])
const selectedBookId = ref(null)
const authUser = ref(null)
const authModalVisible = ref(false)
const authMode = ref('login')
const authLoading = ref(false)
const authTip = ref('')

const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  avatar: ''
})

function saveSelectedBookId(id) {
  selectedBookId.value = id
  localStorage.setItem('active-book-id', String(id))
}

function loadSelectedBookId() {
  const cached = Number(localStorage.getItem('active-book-id') || 0)
  return Number.isFinite(cached) ? cached : 0
}

async function fetchBooks() {
  const res = await fetch('http://127.0.0.1:5001/books')
  const data = await res.json()
  books.value = data || []
  if (!books.value.length) {
    selectedBookId.value = null
    return
  }
  const cached = loadSelectedBookId()
  const exists = books.value.some((b) => b.id === cached)
  if (exists) {
    selectedBookId.value = cached
    return
  }
  saveSelectedBookId(books.value[0].id)
}

function goStudy() {
  if (!selectedBookId.value) {
    window.alert('请先进入词书中心选择词书')
    return
  }
  router.push(`/battle?mode=normal&bookId=${selectedBookId.value}`)
}

function isLoggedIn() {
  return !!authUser.value?.id
}

function openAuthModal(mode = 'login') {
  authMode.value = mode
  authTip.value = ''
  authModalVisible.value = true
}

function closeAuthModal() {
  authModalVisible.value = false
  authLoading.value = false
}

function loadAuthUser() {
  try {
    const raw = localStorage.getItem('auth-user')
    authUser.value = raw ? JSON.parse(raw) : null
  } catch {
    authUser.value = null
  }
}

function saveAuthUser(user) {
  authUser.value = user || null
  if (user) {
    localStorage.setItem('auth-user', JSON.stringify(user))
  } else {
    clearUserSessionCache()
  }
}


async function submitLogin() {
  if (!loginForm.username.trim() || !loginForm.password.trim()) {
    authTip.value = '请输入账号和密码'
    return
  }
  authLoading.value = true
  authTip.value = ''
  try {
    const res = await fetch('http://127.0.0.1:5001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: loginForm.username.trim(),
        password: loginForm.password
      })
    })
    const data = await res.json()
    if (!res.ok) {
      authTip.value = data.error || '登录失败'
      return
    }
    saveAuthUser(data.user)
    closeAuthModal()
  } catch {
    authTip.value = '登录失败，请稍后重试'
  } finally {
    authLoading.value = false
  }
}

async function submitRegister() {
  const username = registerForm.username.trim()
  const email = registerForm.email.trim()
  const password = registerForm.password
  const confirmPassword = registerForm.confirmPassword

  if (!username || !password.trim() || !email || !confirmPassword.trim()) {
    authTip.value = '请完整填写注册信息'
    return
  }
  if (username.length < 2) {
    authTip.value = '用户名至少 2 位'
    return
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    authTip.value = '邮箱格式不正确'
    return
  }
  if (password.length < 6) {
    authTip.value = '密码至少 6 位'
    return
  }
  if (password !== confirmPassword) {
    authTip.value = '两次密码不一致'
    return
  }

  authLoading.value = true
  authTip.value = ''
  try {
    const res = await fetch('http://127.0.0.1:5001/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        email,
        avatar: registerForm.avatar || ''
      })
    })
    const data = await res.json()
    if (!res.ok) {
      authTip.value = data.error || '注册失败'
      return
    }
    saveAuthUser(data.user)
    loginForm.username = ''
    loginForm.password = ''
    registerForm.password = ''
    registerForm.confirmPassword = ''
    authTip.value = ''
    closeAuthModal()
  } catch {
    authTip.value = '注册失败，请稍后重试'
  } finally {
    authLoading.value = false
  }
}

function onAvatarFileChange(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    authTip.value = '请上传图片文件'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    registerForm.avatar = typeof reader.result === 'string' ? reader.result : ''
  }
  reader.onerror = () => {
    authTip.value = '头像读取失败'
  }
  reader.readAsDataURL(file)
}

function goFeature(key) {
  if (!isLoggedIn()) {
    openAuthModal('login')
    return
  }
  if (key === 'battle') {
    goStudy()
    return
  }
  if (key === 'reading') {
    router.push('/reading')
    return
  }
  if (key === 'spelling') {
    if (!selectedBookId.value) {
      window.alert('请先进入词书中心选择词书')
      return
    }
    router.push(`/spelling?bookId=${selectedBookId.value}`)
    return
  }
  if (key === 'dictionary') {
    router.push('/search')
    return
  }
  router.push(`/feature/${key}`)
}

function goProfile() {
  router.push('/profile')
}

function toggleUserMenu() {
  if (!isLoggedIn()) {
    openAuthModal('login')
    return
  }
  goProfile()
}

onMounted(async () => {
  loadAuthUser()
  await fetchBooks()
})

</script>

<template>
  <main class="home-page">
    <header class="top-nav">
      <div class="top-nav-inner">
        <span></span>
        <button class="icon-btn" aria-label="用户中心" @click="toggleUserMenu">
          <span class="user-glyph" aria-hidden="true"></span>
        </button>
      </div>
    </header>

    <section class="hero-center">
      <h1>lexico!</h1>
      <p>一个简洁易用的英语单词学习工具</p>
      <div class="quick-grid">
        <button
          v-for="entry in dashboard.homeEntries"
          :key="entry.key"
          class="quick-card"
          @click="goFeature(entry.key)"
        >
          <span class="quick-icon">{{ entry.icon }}</span>
          <small>{{ entry.title }}</small>
        </button>
      </div>
    </section>

    <div v-if="authModalVisible" class="auth-mask" @click.self="closeAuthModal">
      <section class="auth-modal">
        <div class="auth-tabs">
          <button
            class="auth-tab"
            :class="{ active: authMode === 'login' }"
            @click="authMode = 'login'"
          >
            登录
          </button>
          <button
            class="auth-tab"
            :class="{ active: authMode === 'register' }"
            @click="authMode = 'register'"
          >
            注册
          </button>
        </div>

        <div v-if="authMode === 'login'" class="auth-form">
          <input v-model="loginForm.username" class="auth-input" placeholder="账号" />
          <input v-model="loginForm.password" class="auth-input" type="password" placeholder="密码" />
          <button class="auth-submit" :disabled="authLoading" @click="submitLogin">
            {{ authLoading ? '登录中...' : '登录' }}
          </button>
        </div>

        <div v-else class="auth-form">
          <input v-model="registerForm.username" class="auth-input" placeholder="用户名" />
          <input v-model="registerForm.password" class="auth-input" type="password" placeholder="密码（至少6位）" />
          <input
            v-model="registerForm.confirmPassword"
            class="auth-input"
            type="password"
            placeholder="确认密码"
          />
          <input v-model="registerForm.email" class="auth-input" placeholder="邮箱" />
          <label class="avatar-upload">
            <span>上传头像</span>
            <input type="file" accept="image/*" @change="onAvatarFileChange" />
          </label>
          <div v-if="registerForm.avatar" class="avatar-preview-wrap">
            <img :src="registerForm.avatar" alt="avatar-preview" class="avatar-preview" />
          </div>
          <button class="auth-submit" :disabled="authLoading" @click="submitRegister">
            {{ authLoading ? '注册中...' : '注册' }}
          </button>
        </div>

        <p v-if="authTip" class="auth-tip">{{ authTip }}</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #4a4f5b 0%, #505562 100%);
  color: #edf5ff;
  display: grid;
  grid-template-rows: 56px 1fr;
}

.top-nav {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.top-nav-inner {
  width: 100%;
  min-height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
}

.icon-btn {
  width: 42px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #4a4f5b;
  color: #eff6ff;
  cursor: pointer;
  display: grid;
  place-items: center;
}


.user-glyph {
  position: relative;
  width: 18px;
  height: 18px;
}

.user-glyph::before,
.user-glyph::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: #ffffff;
}

.user-glyph::before {
  top: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.user-glyph::after {
  bottom: 0;
  width: 14px;
  height: 8px;
  border-radius: 8px 8px 4px 4px;
}

.hero-center {
  width: min(980px, 100%);
  margin: 0 auto;
  display: grid;
  place-content: center;
  place-items: center;
  gap: 14px;
  text-align: center;
}

.hero-center h1 {
  margin: 0;
  font-size: clamp(2.1rem, 5vw, 3rem);
  letter-spacing: 0.12em;
  font-weight: 700;
}

.hero-center p {
  margin: 0;
  color: #cbd5e1;
  font-size: 1rem;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.quick-card {
  min-height: 74px;
  min-width: 90px;
  border-radius: 14px;
  background: #4a505c;
  border: 1px solid #3d4350;
  padding: 8px;
  display: grid;
  place-items: center;
  gap: 2px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  box-shadow: 0 8px 18px rgba(20, 23, 30, 0.35);
}

.quick-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(20, 23, 30, 0.45);
  background: #555c69;
}

.quick-icon {
  font-size: 1.3rem;
}

.quick-card small {
  color: #e2ecff;
  font-size: 0.82rem;
}

@media (max-width: 680px) {
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.auth-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: grid;
  place-items: center;
  z-index: 50;
}

.auth-modal {
  width: min(420px, calc(100vw - 24px));
  border-radius: 14px;
  background: #4a505c;
  border: 1px solid #3d4350;
  box-shadow: 0 14px 30px rgba(10, 14, 20, 0.45);
  padding: 14px;
  display: grid;
  gap: 10px;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.auth-tab {
  border: none;
  border-radius: 10px;
  min-height: 36px;
  background: #3f4654;
  color: #e2ecff;
  cursor: pointer;
}

.auth-tab.active {
  background: #26374f;
  color: #ffffff;
  font-weight: 700;
}

.auth-form {
  display: grid;
  gap: 8px;
}

.auth-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #5e6675;
  border-radius: 10px;
  min-height: 38px;
  background: #3f4654;
  color: #f8fafc;
  padding: 0 10px;
}

.code-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.code-btn,
.auth-submit {
  border: none;
  border-radius: 10px;
  min-height: 38px;
  padding: 0 12px;
  cursor: pointer;
}

.code-btn {
  background: #3f4654;
  color: #e2ecff;
  border: 1px solid #5e6675;
}

.auth-submit {
  background: linear-gradient(90deg, #f2994a, #e18736);
  color: #fff7ed;
  font-weight: 700;
}

.auth-tip {
  margin: 0;
  color: #dbeafe;
  font-size: 0.9rem;
}

.avatar-upload {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid #5e6675;
  border-radius: 10px;
  min-height: 38px;
  background: #3f4654;
  color: #e2ecff;
  padding: 0 10px;
  font-size: 0.9rem;
}

.avatar-upload input[type='file'] {
  width: 190px;
  color: #cbd5e1;
  font-size: 0.8rem;
}

.avatar-preview-wrap {
  display: flex;
  justify-content: center;
}

.avatar-preview {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #5e6675;
}
</style>
