<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import HomeIconButton from '../components/HomeIconButton.vue'

const router = useRouter()

const wrongList = ref([])
const totalCount = ref(0)
const pendingCount = ref(0)
const activeTab = ref('all')
const selectedWord = ref(null)
const isLoading = ref(false)
const audioPlayer = ref(null)
const books = ref([])
const importBookId = ref(null)
const selectedWrongKeys = ref([])
const loadError = ref('')

const displayedList = computed(() =>
  activeTab.value === 'pending'
    ? wrongList.value.filter((item) => !item.isMastered && item.needsReview)
    : wrongList.value
)

const heatmapCells = computed(() =>
  wrongList.value.map((item) => ({
    ...item,
    level:
      item.errorCount >= 5
        ? 'high'
        : item.errorCount >= 3
          ? 'medium'
          : 'low'
  }))
)
const selectedWrongItems = computed(() =>
  wrongList.value.filter((item) => selectedWrongKeys.value.includes(`${item.word}@@${item.meaning}`))
)

function formatStatus(item) {
  if (item.isMastered) {
    return '已掌握'
  }

  if (item.needsReview) {
    return '待重练'
  }

  return '未分类'
}

async function fetchWrongBook() {
  isLoading.value = true
  loadError.value = ''

  try {
    const [listRes, summaryRes] = await Promise.all([
      fetch('http://127.0.0.1:5001/wrong'),
      fetch('http://127.0.0.1:5001/wrong/summary')
    ])

    if (listRes.status === 401 || summaryRes.status === 401) {
      loadError.value = '请先登录后查看错题本'
      wrongList.value = []
      totalCount.value = 0
      pendingCount.value = 0
      return
    }

    const listData = await listRes.json()
    const summaryData = await summaryRes.json()

    if (!listRes.ok || !Array.isArray(listData)) {
      loadError.value = (listData && listData.error) || '错题数据加载失败'
      wrongList.value = []
      totalCount.value = 0
      pendingCount.value = 0
      return
    }

    wrongList.value = listData
    totalCount.value = summaryData.totalCount ?? listData.length
    pendingCount.value = summaryData.pendingCount ?? 0

    if (selectedWord.value) {
      const latest = listData.find(
        (item) =>
          item.word === selectedWord.value.word &&
          item.meaning === selectedWord.value.meaning
      )
      selectedWord.value = latest || null
    }
  } catch (error) {
    console.error('获取错题本失败', error)
    loadError.value = '获取错题本失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

async function fetchBooks() {
  try {
    const res = await fetch('http://127.0.0.1:5001/books')
    const data = await res.json()
    books.value = data || []
    if (!importBookId.value && books.value.length) {
      importBookId.value = books.value[0].id
    }
  } catch (error) {
    console.error('获取词库失败', error)
  }
}

function openDetail(item) {
  selectedWord.value = item
}

function toggleSelect(item) {
  const key = `${item.word}@@${item.meaning}`
  if (selectedWrongKeys.value.includes(key)) {
    selectedWrongKeys.value = selectedWrongKeys.value.filter((k) => k !== key)
  } else {
    selectedWrongKeys.value = [...selectedWrongKeys.value, key]
  }
}

function isSelected(item) {
  return selectedWrongKeys.value.includes(`${item.word}@@${item.meaning}`)
}

function closeDetail() {
  stopAudio()
  selectedWord.value = null
}

function stopAudio() {
  if (audioPlayer.value) {
    audioPlayer.value.pause()
    audioPlayer.value = null
  }
}

function speakByBrowser(word) {
  if (!word || !window.speechSynthesis) return
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = 'en-US'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

async function playWordAudio(item) {
  if (!item) return
  stopAudio()

  if (item.audio) {
    try {
      const player = new Audio(item.audio)
      audioPlayer.value = player
      await player.play()
      return
    } catch (error) {
      console.warn('音频播放失败，使用浏览器语音', error)
    }
  }

  speakByBrowser(item.word)
}

async function removeWord(item) {
  await fetch('http://127.0.0.1:5001/wrong/remove', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(item)
  })

  closeDetail()
  await fetchWrongBook()
}

async function toggleFocus(item) {
  await fetch('http://127.0.0.1:5001/wrong/toggle_focus', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      word: item.word,
      meaning: item.meaning,
      isFocus: !item.isFocus
    })
  })

  await fetchWrongBook()
}

async function exportWrongExcel() {
  try {
    const response = await fetch('http://127.0.0.1:5001/wrong/export_excel')
    if (!response.ok) {
      throw new Error('export_failed')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'wrong_words.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('导出错题本失败', error)
    alert('导出失败，请稍后重试')
  }
}

async function importSelectedWrongToBook() {
  if (!importBookId.value) {
    alert('请先选择目标词库')
    return
  }
  if (!selectedWrongItems.value.length) {
    alert('请先勾选要导入的错词')
    return
  }
  const res = await fetch(`http://127.0.0.1:5001/books/${importBookId.value}/import_wrong`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: selectedWrongItems.value.map((item) => ({
        word: item.word,
        meaning: item.meaning,
        pos: item.pos || '未知'
      }))
    })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    alert(data.error || '导入失败')
    return
  }
  selectedWrongKeys.value = []
  alert(`已导入 ${data.count ?? 0} 条错词到目标词库`)
}

function goPractice() {
  const bookId = Number(localStorage.getItem('active-book-id') || 0)
  if (!bookId) {
    alert('请先去词库管理选择词库')
    return
  }
  router.push(`/battle?mode=wrong&bookId=${bookId}`)
}

onMounted(() => {
  fetchBooks()
  fetchWrongBook()
})

watch(selectedWord, (value) => {
  if (value) {
    playWordAudio(value)
  } else if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
})

onBeforeUnmount(() => {
  stopAudio()
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
})
</script>

<template>
  <div class="wrong-page">
    <header class="page-top-bar">
      <span></span>
      <HomeIconButton class="home-btn" @click="router.push('/')" />
    </header>

    <section class="hero-card">
      <div>
        <p class="eyebrow">Word Book</p>
        <h1>错题管理</h1>
        <p class="hero-text">
          把做错的单词集中整理、重点标记，并通过待重练模式形成再次练习的学习闭环。
        </p>
      </div>
    </section>

    <section class="menu-bar">
      <button
        class="menu-button"
        :class="{ active: activeTab === 'all' }"
        @click="activeTab = 'all'"
      >
        <span>错题</span>
        <strong>{{ totalCount }}</strong>
      </button>

      <button
        class="menu-button pending"
        :class="{ active: activeTab === 'pending' }"
        @click="goPractice"
      >
        <span>待重练</span>
        <strong>{{ pendingCount }}</strong>
      </button>
    </section>

    <section class="book-card">
      <div class="section-head">
        <div>
          <h2>{{ activeTab === 'all' ? '全部错题' : '待重练单词' }}</h2>
          <p>{{ activeTab === 'all' ? '点击单词查看详情面板' : '进入练习模式前可先浏览待重练集合' }}</p>
        </div>
        <div class="head-actions">
          <select v-model.number="importBookId" class="import-select">
            <option :value="null">选择导入词库</option>
            <option v-for="book in books" :key="book.id" :value="book.id">{{ book.name }}</option>
          </select>
          <button class="export-button" @click="importSelectedWrongToBook">导入选中错词</button>
          <button class="export-button" @click="exportWrongExcel">导出Excel</button>
        </div>
      </div>

      <div v-if="isLoading" class="empty-state">正在加载错题本...</div>
      <div v-else-if="loadError" class="empty-state">{{ loadError }}</div>

      <div v-else-if="displayedList.length === 0" class="empty-state">
        当前还没有可展示的错题。
      </div>

      <div v-else class="word-list">
        <div class="word-table">
          <div class="table-head table-row">
            <span>选择</span>
            <span>单词</span>
            <span>释义</span>
            <span>错误次数</span>
          </div>

          <button
            v-for="item in displayedList"
            :key="`${item.word}-${item.meaning}`"
            class="table-row table-body-row"
            @click="openDetail(item)"
          >
            <span>
              <input
                type="checkbox"
                :checked="isSelected(item)"
                @click.stop
                @change="toggleSelect(item)"
              />
            </span>
            <span class="word-cell">
              <strong>{{ item.word }}</strong>
              <em v-if="item.isFocus" class="focus-tag">重点</em>
            </span>
            <span class="meaning-cell">{{ item.meaning }}</span>
            <span class="count-cell">{{ item.errorCount }} 次</span>
          </button>
        </div>
      </div>
    </section>

    <section class="heatmap-card">
      <div class="section-head">
        <h2>错误热力图</h2>
        <p>红色表示高频错误，黄色表示中频，绿色表示低频。</p>
      </div>

      <div v-if="heatmapCells.length === 0" class="empty-state">
        目前没有错误热力数据。
      </div>

      <div v-else class="heatmap-grid">
        <div
          v-for="item in heatmapCells"
          :key="`heat-${item.word}-${item.meaning}`"
          class="heat-cell"
          :class="item.level"
        >
          <span class="heat-word">{{ item.word }}</span>
          <span class="heat-count">{{ item.errorCount }}次</span>
        </div>
      </div>

      <div class="legend">
        <span><i class="dot low"></i>低频</span>
        <span><i class="dot medium"></i>中频</span>
        <span><i class="dot high"></i>高频</span>
      </div>
    </section>

    <div v-if="selectedWord" class="overlay" @click.self="closeDetail">
      <div class="detail-panel">
        <div class="detail-head">
          <div>
            <p class="eyebrow">Word Detail</p>
            <h3>{{ selectedWord.word }}</h3>
          </div>
          <button class="ghost-button" @click="closeDetail">关闭</button>
        </div>

        <div class="detail-content">
          <p><span>中文释义</span>{{ selectedWord.meaning }}</p>
          <p><span>来源词书</span>{{ selectedWord.bookName || '未知词书' }}</p>
          <p><span>当前状态</span>{{ formatStatus(selectedWord) }}</p>
          <p><span>错误频率</span>{{ selectedWord.errorCount }} 次</p>
        </div>

        <div class="detail-actions">
          <button class="danger-button" @click="removeWord(selectedWord)">移除</button>
          <button class="focus-button" @click="toggleFocus(selectedWord)">
            {{ selectedWord.isFocus ? '取消重点' : '标记重点' }}
          </button>
          <button class="practice-button" @click="goPractice">开始练习</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrong-page {
  height: 100vh;
  box-sizing: border-box;
  padding: 0 10px 10px;
  background: linear-gradient(180deg, #404652 0%, #474d59 100%);
  color: #e6edf8;
  overflow: hidden;
  display: grid;
  grid-template-rows: 56px auto auto minmax(0, 1fr) minmax(0, 220px);
  gap: 8px;
}

.page-top-bar {
  height: 56px;
  margin: 0 -10px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-card,
.book-card,
.heatmap-card {
  width: min(1240px, 100%);
  margin: 0 auto;
  border-radius: 12px;
  border: 1px solid #3d4350;
  background: #4a505c;
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  align-items: flex-start;
}

.eyebrow {
  margin: 0 0 8px;
  color: #bcd5de;
  font-size: 0.82rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hero-card h1,
.section-head h2,
.detail-head h3 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
}

.hero-card h1 {
  font-size: clamp(1.4rem, 3vw, 2rem);
}

.hero-text {
  max-width: 760px;
  margin: 4px 0 0;
  line-height: 1.6;
  color: #bcd5de;
}

.menu-button,
.table-body-row,
.export-button,
.ghost-button,
.danger-button,
.focus-button,
.practice-button {
  border: none;
  cursor: pointer;
}


.menu-bar {
  width: min(1240px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.menu-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 56px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #3f4654;
  color: #e6edf8;
}

.menu-button strong {
  font-size: 1.35rem;
  font-family: inherit;
}

.menu-button.active {
  background: rgba(242, 153, 74, 0.25);
  color: white;
}

.menu-button.pending {
  background: rgba(217, 119, 6, 0.35);
  color: white;
}

.menu-button.pending.active {
  background: rgba(251, 146, 60, 0.52);
}

.book-card,
.heatmap-card {
  padding: 10px;
  min-height: 0;
  overflow: hidden;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: end;
  margin-bottom: 8px;
}

.section-head p {
  margin: 0;
  color: #bcd5de;
}

.export-button {
  padding: 9px 12px;
  border-radius: 8px;
  background: #26374f;
  color: #fff;
  white-space: nowrap;
}

.head-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.import-select {
  min-width: 180px;
  border-radius: 8px;
  border: 1px solid #5e6675;
  background: #3f4654;
  color: #e6edf8;
  padding: 8px 10px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border-radius: 12px;
  background: #3f4654;
  color: #bcd5de;
}

.word-list {
  max-height: calc(100% - 48px);
  overflow-x: auto;
  overflow-y: auto;
  padding-right: 4px;
}

.word-table {
  min-width: 680px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #5e6675;
  background: #4a505c;
}

.table-row {
  display: grid;
  grid-template-columns: 64px 1fr 2fr 120px;
  gap: 12px;
  align-items: center;
  min-height: 64px;
  padding: 12px 16px;
  text-align: left;
}

.table-head {
  font-weight: 700;
  color: #dbeafe;
  background: #3f4654;
}

.table-body-row {
  width: 100%;
  background: transparent;
  border-radius: 0;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  transition: background 0.16s ease;
  color: #e6edf8;
}

.table-body-row:hover {
  background: rgba(242, 153, 74, 0.14);
}

.word-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.word-cell strong {
  font-size: 1.08rem;
}

.focus-tag {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-style: normal;
  background: rgba(242, 153, 74, 0.22);
  color: #fde7cf;
}

.meaning-cell {
  color: #bcd5de;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count-cell {
  justify-self: center;
  text-align: center;
  color: #dbeafe;
  font-weight: 700;
}

.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 8px;
  max-height: calc(100% - 44px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.heat-cell {
  display: flex;
  min-height: 72px;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px;
  border-radius: 10px;
  color: #e6edf8;
}

.heat-cell.low {
  background: rgba(34, 197, 94, 0.22);
}

.heat-cell.medium {
  background: rgba(245, 158, 11, 0.24);
}

.heat-cell.high {
  background: rgba(239, 68, 68, 0.24);
}

.heat-word {
  font-weight: 700;
  font-size: 0.92rem;
}

.heat-count {
  align-self: flex-end;
  font-size: 0.78rem;
}

.legend {
  display: flex;
  gap: 18px;
  margin-top: 8px;
  color: #cbd5e1;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.low {
  background: #22c55e;
}

.dot.medium {
  background: #f59e0b;
}

.dot.high {
  background: #ef4444;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(2, 6, 23, 0.7);
}

.detail-panel {
  width: min(92vw, 480px);
  border-radius: 14px;
  padding: 16px;
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(148, 163, 184, 0.4);
  box-shadow: 0 20px 40px rgba(2, 6, 23, 0.5);
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
}

.ghost-button {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.9);
  color: #e6edf8;
}

.detail-content {
  display: grid;
  gap: 12px;
  margin-top: 22px;
}

.detail-content p {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}

.detail-content span {
  color: #bcd5de;
}

.detail-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.danger-button,
.focus-button,
.practice-button {
  padding: 12px 10px;
  border-radius: 10px;
  color: white;
}

.danger-button {
  background: #dc2626;
}

.focus-button {
  background: #f59e0b;
}

.practice-button {
  background: #0ea5e9;
}

@media (max-width: 720px) {
  .wrong-page {
    grid-template-rows: auto auto minmax(0, 1fr) minmax(0, 200px);
    padding: 8px;
  }

  .hero-card,
  .section-head,
  .detail-head {
    flex-direction: column;
    align-items: stretch;
  }

  .menu-bar,
  .detail-actions {
    grid-template-columns: 1fr;
  }

  .export-button {
    width: 100%;
  }

  .head-actions {
    width: 100%;
  }

  .word-table {
    min-width: 560px;
  }

  .detail-content p {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
