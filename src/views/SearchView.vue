<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HomeIconButton from '../components/HomeIconButton.vue'

const router = useRouter()
const route = useRoute()

const state = reactive({
  query: '',
  loading: false,
  error: '',
  result: null,
  favorites: new Set()
})

const chatMessages = ref([
  { role: 'ai', text: 'Hi! I am your speaking coach. Say something in English and we can start practicing.' }
])
const speakingLoading = ref(false)
const ttsLoading = ref(false)
const speechStatus = ref('idle')
const speechError = ref('')

const hasResult = computed(() => !!state.result)
const speechSupport = computed(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition))
const speechButtonText = computed(() => {
  if (speechStatus.value === 'recognizing') return '正在识别...'
  if (speakingLoading.value) return 'AI思考中...'
  if (ttsLoading.value) return '语音生成中...'
  return '开始说话'
})

function normalizeResult(data) {
  const tags = data.partOfSpeechTags || []
  return {
    word: data.word || '',
    ukPhonetic: data.ukPhonetic || data.phonetic || '',
    usPhonetic: data.usPhonetic || data.phonetic || '',
    ukAudio: data.ukAudio || '',
    usAudio: data.usAudio || '',
    tags,
    chinese: data.meanings?.[0]?.definition || data.definition || '',
    example: data.example || '',
    exampleZh: data.exampleZh || '',
    collocations: data.collocations || []
  }
}

function playAudio(url) {
  if (!url) return
  const audio = new Audio(url)
  audio.play().catch(() => {})
}

function speakByBrowser(text) {
  if (!text || !window.speechSynthesis) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

async function speakAiReply(text) {
  const content = String(text || '').trim()
  if (!content) return
  ttsLoading.value = true
  try {
    const res = await fetch('http://127.0.0.1:5001/api/ai/speaking-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) {
      speakByBrowser(content)
      return
    }
    if (data.audioUrl) {
      const audio = new Audio(data.audioUrl)
      await audio.play()
      return
    }
    if (data.audioBase64) {
      const mime = data.mime || 'audio/mpeg'
      const audio = new Audio(`data:${mime};base64,${data.audioBase64}`)
      await audio.play()
      return
    }
    speakByBrowser(content)
  } catch {
    speakByBrowser(content)
  } finally {
    ttsLoading.value = false
  }
}

async function searchWord() {
  const word = state.query.trim()
  if (!word) {
    state.error = '请输入要查询的单词'
    state.result = null
    return
  }
  state.loading = true
  state.error = ''
  state.result = null
  try {
    const res = await fetch(`http://127.0.0.1:5001/dictionary_search?word=${encodeURIComponent(word)}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (res.status === 404 || data.error === 'not_found') {
        state.error = '未找到该单词'
      } else {
        try {
          const fallbackRes = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
          )
          if (!fallbackRes.ok) {
            state.error = '词典服务暂时不可用，请稍后重试'
            return
          }
          const payload = await fallbackRes.json()
          if (!Array.isArray(payload) || payload.length === 0) {
            state.error = '未找到该单词'
            return
          }
          const entry = payload[0] || {}
          const meanings = entry.meanings || []
          const firstMeaning = meanings[0] || {}
          const firstDef = (firstMeaning.definitions || [])[0] || {}
          let ukPhonetic = ''
          let usPhonetic = ''
          let ukAudio = ''
          let usAudio = ''
          const phonetic = entry.phonetic || ''
          for (const p of entry.phonetics || []) {
            const text = p?.text || ''
            const audio = p?.audio || ''
            const lower = audio.toLowerCase()
            if ((lower.includes('uk') || lower.includes('en-gb')) && !ukAudio) {
              ukAudio = audio
              if (text) ukPhonetic = text
            }
            if ((lower.includes('us') || lower.includes('en-us')) && !usAudio) {
              usAudio = audio
              if (text) usPhonetic = text
            }
          }
          state.result = {
            word: entry.word || word,
            ukPhonetic: ukPhonetic || phonetic,
            usPhonetic: usPhonetic || phonetic,
            ukAudio,
            usAudio,
            tags: meanings.map((m) => m?.partOfSpeech).filter(Boolean),
            chinese: firstDef.definition || '',
            example: firstDef.example || '',
            exampleZh: '',
            collocations: firstDef.example ? [firstDef.example] : []
          }
          return
        } catch {
          state.error = '词典服务暂时不可用，请稍后重试'
          return
        }
      }
      return
    }
    const data = await res.json()
    state.result = normalizeResult(data)
  } catch {
    state.error = '查询失败，请稍后再试'
  } finally {
    state.loading = false
  }
}

function toggleFavorite() {
  const word = state.result?.word || ''
  if (!word) return
  if (state.favorites.has(word)) state.favorites.delete(word)
  else state.favorites.add(word)
}

async function sendSpeakingText(text) {
  const cleaned = String(text || '').trim()
  if (!cleaned) return
  speakingLoading.value = true
  speechError.value = ''
  chatMessages.value.push({ role: 'user', text: cleaned })
  try {
    const res = await fetch('http://127.0.0.1:5001/api/ai/speaking-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleaned })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      speechError.value = data.error || 'AI回复失败，请稍后重试'
      return
    }
    const reply = data.ai_reply || ''
    chatMessages.value.push({ role: 'ai', text: reply })
    await speakAiReply(reply)
  } catch {
    speechError.value = 'AI回复失败，请稍后重试'
  } finally {
    speakingLoading.value = false
  }
}

function startSpeechRecognition() {
  if (!speechSupport.value || speakingLoading.value || speechStatus.value === 'recognizing') return
  speechError.value = ''
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
  console.log('[speech] startSpeechRecognition called', {
    hasCtor: !!Ctor,
    speakingLoading: speakingLoading.value,
    speechStatus: speechStatus.value,
    protocol: window.location.protocol,
    host: window.location.host
  })
  const recognition = new Ctor()
  recognition.lang = 'en-US'
  recognition.interimResults = false
  recognition.continuous = false
  recognition.onstart = () => {
    console.log('[speech] onstart')
    speechStatus.value = 'recognizing'
  }
  recognition.onerror = (event) => {
    console.log('[speech] onerror', {
      error: event?.error || '',
      message: event?.message || '',
      type: event?.type || ''
    })
    speechStatus.value = 'idle'
    const reason = event?.error || 'unknown'
    speechError.value = `语音识别失败：${reason}`
  }
  recognition.onend = () => {
    console.log('[speech] onend')
    speechStatus.value = 'idle'
  }
  recognition.onresult = (event) => {
    console.log('[speech] onresult', event)
    const transcript = event?.results?.[0]?.[0]?.transcript || ''
    sendSpeakingText(transcript)
  }
  try {
    recognition.start()
  } catch (error) {
    console.log('[speech] start() threw', error)
    speechStatus.value = 'idle'
    speechError.value = `语音识别启动失败：${error?.name || 'error'}`
  }
}

function clearChat() {
  chatMessages.value = [
    { role: 'ai', text: 'Hi! I am your speaking coach. Say something in English and we can start practicing.' }
  ]
}

onMounted(() => {
  const initial = (route.query.q || '').toString().trim()
  if (initial) {
    state.query = initial
    searchWord()
  }
})
</script>

<template>
  <main class="search-page">
    <header class="head-card">
      <HomeIconButton class="home-icon-btn" @click="router.push('/')" />
      <h1>智能助手</h1>
      <span></span>
    </header>

    <section class="search-card">
      <div class="search-row">
        <input
          v-model="state.query"
          class="search-input"
          placeholder="输入英文单词，例如 bliss"
          @keyup.enter="searchWord"
        />
        <button class="query-btn" :disabled="state.loading" @click="searchWord">
          {{ state.loading ? '查询中...' : '查询' }}
        </button>
      </div>
      <p v-if="state.error" class="error">{{ state.error }}</p>
    </section>

    <section v-if="hasResult" class="result-card">
      <div class="result-grid">
        <div class="left">
          <h2>{{ state.result.word }}</h2>
          <div class="phonetic-row">
            <span>英 {{ state.result.ukPhonetic || '-' }}</span>
            <button class="audio-btn" @click="playAudio(state.result.ukAudio)">发音</button>
          </div>
          <div class="phonetic-row">
            <span>美 {{ state.result.usPhonetic || '-' }}</span>
            <button class="audio-btn" @click="playAudio(state.result.usAudio)">发音</button>
          </div>
          <div class="tags">
            <span v-for="tag in state.result.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <button class="fav-btn" @click="toggleFavorite">
            {{ state.favorites.has(state.result.word) ? '已收藏' : '收藏单词' }}
          </button>
        </div>
        <div class="right">
          <p><strong>英文释义：</strong>{{ state.result.chinese || '暂无释义' }}</p>
          <p><strong>英文例句：</strong>{{ state.result.example || '暂无例句' }}</p>
          <p><strong>中文翻译：</strong>{{ state.result.exampleZh || '暂无翻译' }}</p>
          <p><strong>常见搭配：</strong>{{ state.result.collocations.join('；') || '暂无搭配' }}</p>
        </div>
      </div>
    </section>
    <p v-else class="light-empty">输入英文单词后，这里会显示释义、例句和发音</p>

    <section class="speaking-card">
      <div class="chat-area">
        <div class="chat-head">
          <div>
            <h3>AI口语陪练</h3>
            <p>和AI老师一起练习英语口语 <span class="beta-tag">Beta</span></p>
          </div>
          <button class="clear-btn" @click="clearChat">清空对话</button>
        </div>
        <div class="chat-list">
          <article
            v-for="(msg, idx) in chatMessages"
            :key="idx"
            class="bubble"
            :class="msg.role === 'user' ? 'user' : 'ai'"
          >
            {{ msg.text }}
          </article>
        </div>
        <p class="tip">AI内容仅供学习参考</p>

        <div class="voice-input-wrap">
          <button class="speak-btn" :disabled="!speechSupport || speakingLoading" @click="startSpeechRecognition">
            {{ speechButtonText }}
          </button>
        </div>
        <p v-if="!speechSupport" class="speech-error">
          当前浏览器不支持语音识别，请使用 Chrome 浏览器
        </p>
        <p v-else-if="speechError" class="speech-error">{{ speechError }}</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.search-page {
  min-height: 100vh;
  padding: 16px;
  background:
    radial-gradient(circle at top left, rgba(251, 191, 36, 0.1), transparent 30%),
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.16), transparent 35%),
    linear-gradient(180deg, #404652 0%, #474d59 100%);
  color: #f5f7fb;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.head-card,
.search-card,
.result-card,
.speaking-card {
  width: min(1280px, 96vw);
  margin: 0 auto;
  border-radius: 14px;
  background: rgba(74, 80, 92, 0.92);
  border: 1px solid #3d4350;
}

.head-card {
  box-shadow: 0 8px 18px rgba(20, 23, 30, 0.28);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  padding: 10px;
}

.head-card h1 {
  margin: 0;
  text-align: center;
}

.search-card {
  padding: 14px;
  box-shadow: 0 8px 18px rgba(20, 23, 30, 0.22);
}

.search-row {
  width: min(780px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.search-input {
  border: 1px solid #5e6675;
  border-radius: 12px;
  padding: 12px;
  font-size: 0.96rem;
  background: #3f4654;
  color: #f8fafc;
}

.query-btn,
.audio-btn,
.fav-btn,
.clear-btn,
.speak-btn {
  border: none;
  border-radius: 10px;
  background: #26374f;
  color: #e6edf7;
  cursor: pointer;
  font-weight: 700;
  box-shadow: 0 6px 12px rgba(20, 23, 30, 0.24);
}

.query-btn {
  padding: 10px 20px;
}

.error {
  margin: 10px auto 0;
  width: min(780px, 100%);
  color: #fca5a5;
}

.light-empty {
  width: min(1280px, 96vw);
  margin: -4px auto 0;
  color: #cbd5e1;
  font-size: 0.92rem;
}

.result-card {
  padding: 28px;
  box-shadow: 0 14px 28px rgba(20, 23, 30, 0.42);
}

.result-grid {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
}

.left,
.right {
  border-radius: 12px;
  background: rgba(63, 70, 84, 0.75);
  padding: 16px;
  display: grid;
  gap: 8px;
}

.left h2 {
  margin: 0 0 10px;
}

.phonetic-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.audio-btn {
  padding: 5px 10px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0;
}

.tag {
  background: rgba(245, 158, 11, 0.25);
  color: #fed7aa;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.82rem;
}

.fav-btn {
  padding: 8px 12px;
}

.right p {
  margin: 0 0 12px;
  line-height: 1.7;
}

.speaking-card {
  padding: 20px;
  box-shadow: 0 10px 20px rgba(20, 23, 30, 0.28);
}

.chat-area {
  border-radius: 12px;
  background: rgba(63, 70, 84, 0.75);
  padding: 14px;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: start;
}

.chat-head h3 {
  margin: 0;
}

.chat-head p {
  margin: 6px 0 0;
  color: #cbd5e1;
  font-size: 0.92rem;
}

.beta-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.22);
  color: #fed7aa;
  font-size: 0.72rem;
  font-weight: 700;
}

.clear-btn {
  padding: 8px 10px;
}

.chat-list {
  margin-top: 8px;
  max-height: 340px;
  min-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.bubble {
  max-width: 70%;
  width: fit-content;
  padding: 10px 12px;
  border-radius: 12px;
  line-height: 1.6;
  border: 1px solid rgba(148, 163, 184, 0.24);
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble.ai {
  align-self: flex-start;
  background: rgba(38, 55, 79, 0.65);
}

.bubble.user {
  align-self: flex-end;
  background: rgba(245, 158, 11, 0.2);
}

.tip {
  margin: 2px 0 0;
  color: #94a3b8;
  font-size: 0.82rem;
}

.voice-input-wrap {
  margin-top: auto;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.speak-btn {
  width: min(360px, calc(100% - 16px));
  height: 48px;
  border-radius: 12px;
  padding: 0 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #f2994a, #fb923c);
  color: #fff;
  margin: 0 auto;
  display: block;
}

.speech-error {
  margin: 0;
  text-align: center;
  color: #fca5a5;
}

@media (max-width: 1000px) {
  .result-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .search-row {
    grid-template-columns: 1fr;
  }
}
</style>
