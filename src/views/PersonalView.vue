<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getTodayStudySeconds } from '../utils/studyTime'
import HomeIconButton from '../components/HomeIconButton.vue'
import { clearUserSessionCache } from '../utils/auth'

const router = useRouter()

const quickActions = [
  { key: 'continue', icon: '📖', title: '继续学习' },
  { key: 'recall', icon: '💡', title: '单词回忆' },
  { key: 'wrong', icon: '🗂️', title: '错词集' },
  { key: 'books', icon: '📚', title: '词书管理' }
]

const weeks = ['一', '二', '三', '四', '五', '六', '日']
const now = new Date()
const calendarYear = ref(now.getFullYear())
const calendarMonth = ref(now.getMonth() + 1)
const checkedDays = ref([])

const calendarRows = computed(() => {
  const year = calendarYear.value
  const month = calendarMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const firstWeekday = (firstDay.getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate()

  const cells = []
  for (let i = 0; i < 42; i += 1) {
    const offset = i - firstWeekday + 1
    if (offset <= 0) {
      cells.push({ day: daysInPrevMonth + offset, inCurrentMonth: false })
    } else if (offset > daysInMonth) {
      cells.push({ day: offset - daysInMonth, inCurrentMonth: false })
    } else {
      cells.push({ day: offset, inCurrentMonth: true })
    }
  }

  return Array.from({ length: 6 }, (_, idx) => cells.slice(idx * 7, idx * 7 + 7))
})

async function fetchCheckinCalendar() {
  try {
    const res = await fetch(
      `http://127.0.0.1:5001/study/checkin_calendar?year=${calendarYear.value}&month=${calendarMonth.value}`
    )
    const data = await res.json()
    checkedDays.value = Array.isArray(data.checkedDays) ? data.checkedDays : []
  } catch (error) {
    console.error('获取打卡日历失败', error)
    checkedDays.value = []
  }
}

function onQuickActionClick(key) {
  if (key === 'wrong') {
    router.push('/wrong')
    return
  }
  if (key === 'books') {
    router.push('/books')
  }
}

const dashboard = reactive({
  globalTodayLearned: 0,
  todayStudyMinutes: 0,
  selectedBookPlan: {
    learnedWordCount: 0,
    reviewedWordCount: 0,
    unreviewedWrongCount: 0
  }
})

const books = ref([])
const selectedBookId = ref(null)
const authUser = ref(null)
const showLogoutConfirm = ref(false)

const selectedBook = computed(() => books.value.find((b) => b.id === selectedBookId.value) || null)
const learnedCount = computed(() => dashboard.selectedBookPlan.learnedWordCount)
const totalCount = computed(() => selectedBook.value?.totalCount || 0)
const progressPercent = computed(() => {
  if (!totalCount.value) return 0
  const raw = Math.round((learnedCount.value / totalCount.value) * 100)
  return Math.max(0, Math.min(100, raw))
})

function saveSelectedBookId(id) {
  selectedBookId.value = id
  localStorage.setItem('active-book-id', String(id))
}

function loadSelectedBookId() {
  const cached = Number(localStorage.getItem('active-book-id') || 0)
  return Number.isFinite(cached) ? cached : 0
}

function loadAuthUser() {
  try {
    const raw = localStorage.getItem('auth-user')
    authUser.value = raw ? JSON.parse(raw) : null
  } catch {
    authUser.value = null
  }
}

function logoutByAvatar() {
  if (!authUser.value?.id) return
  showLogoutConfirm.value = true
}

function cancelLogout() {
  showLogoutConfirm.value = false
}

function confirmLogout() {
  clearUserSessionCache()
  authUser.value = null
  showLogoutConfirm.value = false
  router.push('/')
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

async function fetchTodaySummary() {
  try {
    const res = await fetch('http://127.0.0.1:5001/study/today_summary')
    const data = await res.json()
    dashboard.globalTodayLearned = data.learnedToday ?? 0
    dashboard.todayStudyMinutes = Math.floor(getTodayStudySeconds() / 60)
  } catch (error) {
    console.error('获取今日统计失败', error)
  }
}

async function fetchSelectedBookSummary() {
  if (!selectedBookId.value) {
    dashboard.selectedBookPlan.learnedWordCount = 0
    dashboard.selectedBookPlan.reviewedWordCount = 0
    dashboard.selectedBookPlan.unreviewedWrongCount = 0
    return
  }
  try {
    const res = await fetch(`http://127.0.0.1:5001/study/today_summary?book_id=${selectedBookId.value}`)
    const data = await res.json()
    dashboard.selectedBookPlan.learnedWordCount = data.learnedToday ?? 0
    dashboard.selectedBookPlan.reviewedWordCount = data.reviewedToday ?? 0
    dashboard.selectedBookPlan.unreviewedWrongCount = data.unreviewedWrong ?? 0
  } catch (error) {
    console.error('获取词书今日统计失败', error)
  }
}

function openBookCenter() {
  router.push('/books')
}

function goStudy() {
  if (!selectedBookId.value) {
    window.alert('请先进入词书中心选择词书')
    return
  }
  router.push(`/battle?mode=normal&bookId=${selectedBookId.value}`)
}

onMounted(async () => {
  loadAuthUser()
  await Promise.all([fetchBooks(), fetchTodaySummary(), fetchCheckinCalendar()])
  await fetchSelectedBookSummary()
})

watch(selectedBookId, async () => {
  await fetchSelectedBookSummary()
})
</script>

<template>
  <main class="profile-page">
    <header class="top-bar">
      <span></span>
      <HomeIconButton class="home-btn" @click="router.push('/')" />
    </header>

    <div class="content-shell">
      <section class="profile-card">
        <div class="avatar-wrap" @click="logoutByAvatar">
          <img v-if="authUser?.avatar" :src="authUser.avatar" alt="用户头像" class="avatar-image" />
          <div v-else class="avatar">👤</div>
        </div>
        <div class="profile-copy">
          <div class="book-title-row">
            <span class="book-icon">📘</span>
            <div class="book-copy">
              <h2>{{ selectedBook?.name || '未选择词书' }}</h2>
              <p class="progress-number">{{ learnedCount }} / {{ totalCount }}</p>
            </div>
            <button class="switch-btn" @click="openBookCenter">切换</button>
          </div>

          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>

          <div class="main-footer">
            <div class="plan-row">
              <span>今日：学习 {{ dashboard.selectedBookPlan.learnedWordCount }}</span>
              <span>复习 {{ dashboard.selectedBookPlan.reviewedWordCount }}</span>
              <span>待复习 {{ dashboard.selectedBookPlan.unreviewedWrongCount }}</span>
            </div>
            <button class="start-btn" @click="goStudy">开始学习</button>
          </div>
        </div>
      </section>

      <section class="action-row">
        <div class="action-btn metric-btn" role="note" aria-label="今日已学">
          <span>📈</span>
          <small>今日已学 {{ dashboard.globalTodayLearned }}</small>
        </div>
        <div class="action-btn metric-btn" role="note" aria-label="学习时间">
          <span>⏱️</span>
          <small>学习时间 {{ dashboard.todayStudyMinutes }} 分钟</small>
        </div>
      </section>

      <section class="action-row">
        <button
          v-for="action in quickActions.slice(2, 4)"
          :key="action.key"
          class="action-btn"
          @click="onQuickActionClick(action.key)"
        >
          <span>{{ action.icon }}</span>
          <small>{{ action.title }}</small>
        </button>
      </section>

      <section class="calendar-card">
        <header class="calendar-head">
          <strong>{{ calendarYear }}</strong>
          <strong>{{ calendarMonth }}月</strong>
        </header>
        <div class="calendar-grid week">
          <span v-for="w in weeks" :key="w">{{ w }}</span>
        </div>
        <div v-for="(row, rowIndex) in calendarRows" :key="rowIndex" class="calendar-grid days">
          <span
            v-for="(cell, colIndex) in row"
            :key="`${rowIndex}-${colIndex}`"
            :class="{
              dim: !cell.inCurrentMonth,
              mark: cell.inCurrentMonth && checkedDays.includes(cell.day)
            }"
          >
            {{ cell.day }}
          </span>
        </div>
      </section>

    </div>

    <div v-if="showLogoutConfirm" class="logout-mask" @click.self="cancelLogout">
      <section class="logout-modal">
        <h3>退出登录</h3>
        <p>确定要退出当前账号吗？</p>
        <div class="logout-actions">
          <button class="cancel-btn" @click="cancelLogout">取消</button>
          <button class="confirm-btn" @click="confirmLogout">退出登录</button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #404652 0%, #474d59 100%);
  color: #f5f7fb;
}

.top-bar {
  height: 56px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}


.content-shell {
  width: min(860px, calc(100% - 24px));
  margin: 14px auto 0;
  display: grid;
  gap: 12px;
}

.profile-card,
.action-row,
.calendar-card {
  border-radius: 14px;
  background: #4a505c;
  border: 1px solid #3d4350;
  box-shadow: 0 8px 18px rgba(20, 23, 30, 0.35);
}

.profile-card {
  min-height: 170px;
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 10px;
  padding: 0;
}

.avatar-wrap {
  margin: 14px;
  border-radius: 12px;
  background: #9f715b;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  overflow: hidden;
}

.avatar {
  font-size: 3rem;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 0;
  object-fit: cover;
}

.profile-copy {
  display: grid;
  align-content: center;
  gap: 10px;
  text-align: left;
  padding: 12px 14px 12px 0;
}

.book-copy h2 {
  margin: 0;
  font-size: 1.15rem;
}

.book-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.book-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.book-copy {
  display: grid;
  gap: 4px;
}

.progress-number {
  margin: 0;
  font-size: 0.95rem;
  color: #dbeafe;
  font-weight: 600;
}

.switch-btn,
.start-btn {
  border: none;
  cursor: pointer;
}

.switch-btn {
  margin-left: auto;
  border-radius: 10px;
  padding: 6px 10px;
  background: #26374f;
  color: #dbeafe;
}

.progress-track {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: #3f4654;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #f2994a, #e18736);
}

.main-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.plan-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #e2ecff;
  font-size: 0.88rem;
}

.start-btn {
  border-radius: 999px;
  min-width: 116px;
  padding: 8px 14px;
  font-size: 0.92rem;
  font-weight: 700;
  background: linear-gradient(90deg, #f2994a, #e18736);
  color: #fff7ed;
}

.action-row {
  min-height: 72px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

.action-btn {
  border: none;
  background: transparent;
  color: #e6edf7;
  display: grid;
  place-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 1.2rem;
}

.action-btn small {
  font-size: 0.9rem;
}

.calendar-card {
  padding: 0 0 14px;
}

.calendar-head {
  display: flex;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.45);
  font-size: 2.2rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  gap: 6px;
  padding: 10px 16px 0;
}

.calendar-grid.week span {
  font-size: 1.55rem;
  font-weight: 700;
}

.calendar-grid.days span {
  min-height: 44px;
  display: grid;
  place-items: center;
  font-size: 1.45rem;
}

.calendar-grid .dim {
  color: rgba(219, 234, 254, 0.48);
}

.calendar-grid .mark {
  color: #22c55e;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(34, 197, 94, 0.4);
}

.logout-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: grid;
  place-items: center;
  z-index: 60;
}

.logout-modal {
  width: min(380px, calc(100vw - 24px));
  border-radius: 14px;
  background: #4a505c;
  border: 1px solid #3d4350;
  box-shadow: 0 12px 26px rgba(20, 23, 30, 0.45);
  padding: 14px;
  display: grid;
  gap: 10px;
}

.logout-modal h3 {
  margin: 0;
}

.logout-modal p {
  margin: 0;
  color: #cbd5e1;
}

.logout-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-btn,
.confirm-btn {
  border: none;
  border-radius: 8px;
  min-height: 34px;
  padding: 0 12px;
  cursor: pointer;
}

.cancel-btn {
  background: #3f4654;
  color: #e2ecff;
}

.confirm-btn {
  background: #dc2626;
  color: #fff;
}

@media (max-width: 880px) {
  .calendar-head {
    font-size: 1.5rem;
  }

  .calendar-grid.week span {
    font-size: 1rem;
  }

  .calendar-grid.days span {
    font-size: 1rem;
    min-height: 34px;
  }
}

@media (max-width: 640px) {
  .profile-card {
    grid-template-columns: 1fr;
  }

  .avatar-wrap {
    min-height: 170px;
  }

  .profile-copy {
    padding: 12px;
  }

  .main-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
