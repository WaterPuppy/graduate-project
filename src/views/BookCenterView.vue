<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeIconButton from '../components/HomeIconButton.vue'

const router = useRouter()

const books = ref([])
const selectedBookId = ref(null)
const selectedBook = computed(() => books.value.find((b) => b.id === selectedBookId.value) || null)
const bookWords = ref([])
const showCreate = ref(false)
const importInputRef = ref(null)
const importTargetBookId = ref(null)
const audioPlayer = ref(null)

const createForm = reactive({ name: '', tag: '', description: '', cover: '' })
const newWordForm = reactive({ word: '', meaning: '', pos: '未知', phonetic: '' })

async function fetchBooks() {
  const res = await fetch('http://127.0.0.1:5001/books')
  const data = await res.json()
  books.value = data || []
  const cached = Number(localStorage.getItem('active-book-id') || 0)
  if (books.value.some((b) => b.id === cached)) {
    selectedBookId.value = cached
  } else if (books.value.length) {
    selectedBookId.value = books.value[0].id
    localStorage.setItem('active-book-id', String(books.value[0].id))
  } else {
    selectedBookId.value = null
  }
}

async function fetchBookWords() {
  if (!selectedBookId.value) {
    bookWords.value = []
    return
  }
  const res = await fetch(`http://127.0.0.1:5001/books/${selectedBookId.value}/entries`)
  const data = await res.json()
  bookWords.value = data.words || []
}

async function createBook() {
  const name = createForm.name.trim()
  if (!name) {
    alert('请输入词库名称')
    return
  }
  const res = await fetch('http://127.0.0.1:5001/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      tag: createForm.tag.trim(),
      description: createForm.description.trim(),
      cover: createForm.cover.trim()
    })
  })
  if (!res.ok) {
    alert('创建失败')
    return
  }
  const created = await res.json()
  showCreate.value = false
  createForm.name = ''
  createForm.tag = ''
  createForm.description = ''
  createForm.cover = ''
  await fetchBooks()
  selectedBookId.value = created.id
  localStorage.setItem('active-book-id', String(created.id))
  await fetchBookWords()
}

function chooseBook(bookId) {
  selectedBookId.value = bookId
  localStorage.setItem('active-book-id', String(bookId))
  fetchBookWords()
}

async function uploadExcelToBook(bookId, file) {
  if (!bookId || !file) {
    return
  }
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`http://127.0.0.1:5001/books/${bookId}/upload_excel`, {
    method: 'POST',
    body: formData
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    alert(data.error || '上传失败')
    return
  }
  await Promise.all([fetchBooks(), fetchBookWords()])
  alert(`上传成功，导入 ${data.count ?? 0} 条`) 
}

function openImport(bookId) {
  importTargetBookId.value = bookId
  importInputRef.value?.click()
}

async function onSelectImportFile(event) {
  const [file] = event.target.files || []
  const targetBookId = importTargetBookId.value
  event.target.value = ''
  if (!file || !targetBookId) return
  await uploadExcelToBook(targetBookId, file)
}

async function addWordToBook() {
  if (!selectedBookId.value) {
    alert('请先选择词库')
    return
  }
  const word = newWordForm.word.trim()
  const meaning = newWordForm.meaning.trim()
  if (!word || !meaning) {
    alert('请填写单词和释义')
    return
  }
  const res = await fetch(`http://127.0.0.1:5001/books/${selectedBookId.value}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word,
      meaning,
      pos: (newWordForm.pos || '未知').trim(),
      phonetic: newWordForm.phonetic.trim()
    })
  })
  if (!res.ok) {
    alert('新增失败')
    return
  }
  newWordForm.word = ''
  newWordForm.meaning = ''
  newWordForm.pos = '未知'
  newWordForm.phonetic = ''
  await Promise.all([fetchBooks(), fetchBookWords()])
}

async function removeWord(item) {
  const ok = window.confirm(`确认删除 ${item.word} ?`)
  if (!ok) return
  await fetch(`http://127.0.0.1:5001/books/${selectedBookId.value}/entries/${item.id}`, {
    method: 'DELETE'
  })
  await Promise.all([fetchBooks(), fetchBookWords()])
}

async function removeBook(book) {
  const ok = window.confirm(`确认删除词库「${book.name}」？该词库下单词会一并删除。`)
  if (!ok) return
  const res = await fetch(`http://127.0.0.1:5001/books/${book.id}`, {
    method: 'DELETE'
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    alert(data.error || '删除失败')
    return
  }
  if (selectedBookId.value === book.id) {
    selectedBookId.value = null
    localStorage.removeItem('active-book-id')
  }
  await fetchBooks()
  await fetchBookWords()
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

onMounted(async () => {
  await fetchBooks()
  await fetchBookWords()
})

onBeforeUnmount(() => {
  stopAudio()
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
})
</script>

<template>
  <main class="center-page">
    <header class="page-top-bar">
      <span></span>
      <HomeIconButton class="home-btn" @click="router.push('/')" />
    </header>

    <header class="head-row">
      <div class="head-left">
        <button class="ghost-btn" @click="router.back()">返回上一页</button>
      </div>
      <div class="title-wrap">
        <h1>词库管理</h1>
        <p>本地词库列表、导入、词条增删统一管理</p>
      </div>
      <button class="primary-btn" @click="showCreate = true">新建词库</button>
    </header>

    <section class="list-card">
      <div class="table-head table-row">
        <span>名称</span>
        <span>标签</span>
        <span>描述</span>
        <span>单词数</span>
        <span>操作</span>
      </div>
      <button
        v-for="book in books"
        :key="book.id"
        class="table-row table-body"
        :class="{ active: selectedBookId === book.id }"
        @click="chooseBook(book.id)"
      >
        <span>{{ book.name }}</span>
        <span>{{ book.tag || '未分类' }}</span>
        <span class="desc-col">{{ book.description || '暂无描述' }}</span>
        <span>{{ book.totalCount }}</span>
        <span class="op-col">
          <button class="import-btn" @click.stop="openImport(book.id)">导入</button>
          <button class="delete-book-btn" @click.stop="removeBook(book)">删除</button>
        </span>
      </button>
      <div v-if="!books.length" class="empty-row">暂无词库，点击右上角新建词库</div>
    </section>

    <section class="word-panel">
      <div class="word-head">
        <h2>{{ selectedBook?.name || '未选择词库' }} · 词条</h2>
      </div>

      <div class="add-row">
        <input v-model="newWordForm.word" class="field" placeholder="单词" />
        <input v-model="newWordForm.meaning" class="field" placeholder="释义" />
        <input v-model="newWordForm.pos" class="field" placeholder="词性" />
        <input v-model="newWordForm.phonetic" class="field" placeholder="音标（可选）" />
        <button class="primary-btn" @click="addWordToBook">新增单词</button>
      </div>

      <div class="word-table">
        <div class="word-row head">
          <span>单词</span>
          <span>释义</span>
          <span>来源词书</span>
          <span>读音</span>
          <span>操作</span>
        </div>
        <div v-for="item in bookWords" :key="item.id" class="word-row">
          <span>{{ item.word }}</span>
          <span>{{ item.meaning }}</span>
          <span>{{ selectedBook?.name || '-' }}</span>
          <span class="phonetic-cell">
            <span>{{ item.phonetic || '' }}</span>
            <button class="audio-icon-btn" title="播放读音" @click="playWordAudio(item)">🔊</button>
          </span>
          <button class="danger-btn" @click="removeWord(item)">删除</button>
        </div>
        <div v-if="!bookWords.length" class="empty-row">当前词库暂无词条</div>
      </div>
    </section>

    <div v-if="showCreate" class="mask" @click.self="showCreate = false">
      <div class="modal">
        <h3>创建本地词库</h3>
        <input v-model="createForm.name" class="field" placeholder="词库名称" />
        <input v-model="createForm.tag" class="field" placeholder="标签，例如 考试 / 日常" />
        <input v-model="createForm.description" class="field" placeholder="描述" />
        <input v-model="createForm.cover" class="field" placeholder="封面链接（可选）" />
        <div class="modal-actions">
          <button class="ghost-btn" @click="showCreate = false">取消</button>
          <button class="primary-btn" @click="createBook">创建</button>
        </div>
      </div>
    </div>

    <input
      ref="importInputRef"
      type="file"
      accept=".xlsx"
      class="hidden-import"
      @change="onSelectImportFile"
    />
  </main>
</template>

<style scoped>
.center-page {
  min-height: 100vh;
  padding: 0 18px 18px;
  color: #e6edf8;
  background: linear-gradient(180deg, #404652 0%, #474d59 100%);
  display: grid;
  gap: 14px;
}

.page-top-bar {
  height: 56px;
  margin: 0 -18px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.head-row {
  width: min(1240px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
}

.head-left {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.title-wrap h1 { margin: 0; }
.title-wrap p { margin: 4px 0 0; color: #cbd5e1; }

.list-card,
.word-panel {
  width: min(1240px, 100%);
  margin: 0 auto;
  border-radius: 12px;
  border: 1px solid #3d4350;
  background: #4a505c;
}

.field {
  width: 100%;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid #5e6675;
  background: #3f4654;
  color: #e6edf8;
  padding: 9px 10px;
}

.primary-btn,
.ghost-btn,
.danger-btn {
  border: none;
  border-radius: 8px;
  padding: 9px 12px;
  min-height: 38px;
  box-sizing: border-box;
  color: white;
  cursor: pointer;
  white-space: nowrap;
}

.primary-btn { background: #26374f; }
.ghost-btn { background: #3f4654; }
.danger-btn { background: linear-gradient(90deg, #f2994a, #e18736); }


.list-card {
  max-height: 340px;
  overflow: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 1.2fr .9fr 2fr .7fr .7fr;
  gap: 10px;
  align-items: center;
  padding: 12px;
}

.table-head {
  position: sticky;
  top: 0;
  background: #3f4654;
  font-weight: 700;
}

.table-body {
  width: 100%;
  border: none;
  text-align: left;
  color: #e6edf8;
  background: transparent;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.table-body.active { background: rgba(242, 153, 74, 0.2); }
.desc-col { color: #bcd5de; }
.op-col { color: #f6c177; }
.import-btn {
  border: none;
  border-radius: 6px;
  background: #26374f;
  color: #fff;
  padding: 6px 10px;
  cursor: pointer;
}

.delete-book-btn {
  border: none;
  border-radius: 6px;
  background: linear-gradient(90deg, #f2994a, #e18736);
  color: #fff;
  padding: 6px 10px;
  cursor: pointer;
  margin-left: 8px;
}

.word-panel {
  padding: 12px;
  display: grid;
  gap: 10px;
}

.word-head h2 { margin: 0; }

.add-row {
  display: grid;
  grid-template-columns: 1fr 1.6fr .7fr .9fr auto;
  gap: 8px;
}

.word-table {
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  overflow: hidden;
  min-height: 420px;
  max-height: 420px;
  overflow-y: auto;
  overflow-x: auto;
}

.word-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(220px, 1.8fr) 140px 160px 100px;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.word-row > :nth-child(4),
.word-row > :nth-child(5) {
  justify-self: center;
  text-align: center;
}

.phonetic-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.audio-icon-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 999px;
  background: rgba(242, 153, 74, 0.16);
  color: #f6c177;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  font-size: 0.85rem;
}

.word-row.head {
  font-weight: 700;
  background: #3f4654;
  border-top: none;
}

.empty-row {
  min-height: 320px;
  padding: 18px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bcd5de;
}

.mask {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.7);
  display: grid;
  place-items: center;
  z-index: 20;
}

.modal {
  width: min(460px, 94vw);
  border-radius: 12px;
  padding: 14px;
  background: #4a505c;
  border: 1px solid #3d4350;
  display: grid;
  gap: 10px;
}

.modal h3 { margin: 0; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.hidden-import {
  display: none;
}

@media (max-width: 900px) {
  .table-row { grid-template-columns: 1fr .8fr 1.4fr .6fr .6fr; }
  .add-row { grid-template-columns: 1fr 1fr; }
  .word-row { grid-template-columns: 1fr 1.2fr 120px 140px 90px; }
}

@media (max-width: 640px) {
  .head-row { grid-template-columns: 1fr; }
  .table-row { grid-template-columns: 1fr; }
  .word-row { grid-template-columns: 1fr; }
}
</style>
