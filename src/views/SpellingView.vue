<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createStudyTimer } from '../utils/studyTime'
import HomeIconButton from '../components/HomeIconButton.vue'

const router = useRouter()
const route = useRoute()
const shopCards = ref([])
const activeVirtualKey = ref('')
const studyTimer = createStudyTimer()

const currentBookId = computed(() => Number(route.query.bookId || 0))

const state = reactive({
  word: '',
  meaning: '',
  pronunciationHint: '',
  input: '',
  letterStates: [],
  loading: false,
  hasWrong: false,
  hasRecordedWrong: false,
  questionIndex: 0,
  correctCount: 0,
  streak: 0,
  score: 0,
  coins: 0,
  gainMultiplier: 0,
  showEnglish: true,
  dictationMode: true,
  timeLimit: 20,
  timeLeft: 20,
  stageIndex: 0,
  stagesTotal: 3,
  wordsPerStage: 8,
  stageTargets: [180, 260, 360],
  stageScoreStart: 0,
  answersSinceShop: 0,
  isShopOpen: false,
  isSummaryOpen: false,
  isFailed: false,
  isResolvingQuestion: false,
  wordHistory: []
})

const canType = computed(() => !state.isShopOpen && !state.isSummaryOpen && state.stageIndex < state.stagesTotal)
const progressText = computed(() => `${Math.min(state.questionIndex + 1, state.wordsPerStage)}/${state.wordsPerStage}`)
const stageText = computed(() => `${Math.min(state.stageIndex + 1, state.stagesTotal)}/${state.stagesTotal}`)
const accuracyText = computed(() => {
  const done = Math.max(state.correctCount, 1)
  return `${Math.round((state.correctCount / done) * 100)}%`
})
const stageScore = computed(() => state.score - state.stageScoreStart)
const stageTarget = computed(() => state.stageTargets[state.stageIndex] || 0)
const stageTargetText = computed(() => `${stageScore.value}/${stageTarget.value}`)
const timerPercent = computed(() => Math.max(0, (state.timeLeft / state.timeLimit) * 100))
const timerText = computed(() => state.timeLeft.toFixed(1))

const buffPool = [
  { id: 'buff_score', name: '积分增益', desc: '占位：提高积分结算系数', cost: 3 },
  { id: 'buff_time', name: '时间增益', desc: '占位：每题增加可用时间', cost: 3 },
  { id: 'buff_combo', name: '连击增益', desc: '占位：提升连击收益', cost: 4 },
  { id: 'buff_safe', name: '容错增益', desc: '占位：降低失误惩罚', cost: 2 },
  { id: 'buff_luck', name: '幸运增益', desc: '占位：提升金币收益', cost: 2 }
]
const virtualKeys = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

const charRenderList = computed(() => {
  const target = state.word || ''
  const list = []

  for (let i = 0; i < target.length; i += 1) {
    const targetChar = target[i]
    const status = state.letterStates[i] || 'pending'
    const isCorrect = status === 'correct'
    const isWrong = status === 'wrong'

    if (state.dictationMode) {
      list.push({
        text: isCorrect ? targetChar : '_',
        status: isCorrect ? 'correct' : isWrong ? 'wrong' : 'pending'
      })
    } else {
      list.push({
        text: targetChar,
        status: isCorrect ? 'correct' : isWrong ? 'wrong' : 'pending'
      })
    }
  }

  return list
})

function randomCards() {
  const shuffled = [...buffPool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

function openShop() {
  state.isShopOpen = true
  stopTurnTimer()
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  shopCards.value = randomCards()
}

function closeShop() {
  state.isShopOpen = false
  if (canType.value && state.word && state.input.length < state.word.length) {
    startTurnTimer()
  }
}

function refreshShop() {
  if (state.coins < 2) return
  state.coins -= 2
  shopCards.value = randomCards()
}

function buyBuff(card) {
  if (state.coins < card.cost) return
  state.coins -= card.cost
  closeShop()
}

async function fetchSpellingWord() {
  if (!currentBookId.value) return
  state.loading = true
  stopTurnTimer()
  state.input = ''
  state.hasWrong = false
  state.hasRecordedWrong = false
  state.timeLeft = state.timeLimit
  try {
    const query = currentBookId.value ? `?book_id=${currentBookId.value}` : ''
    const res = await fetch(`http://127.0.0.1:5001/spelling_word${query}`)
    const data = await res.json()
    if (data.error) {
      state.word = ''
      state.meaning = ''
      state.pronunciationHint = ''
      return
    }
    state.word = data.word
    state.meaning = data.meaning
    state.pronunciationHint = data.pronunciationHint
    state.letterStates = new Array((data.word || '').length).fill('pending')
    if (state.word && canType.value) {
      startTurnTimer()
    }
  } catch (error) {
    console.error('获取拼写题失败', error)
  } finally {
    state.loading = false
    playPronunciation()
  }
}

function playPronunciation() {
  if (!state.word || !window.speechSynthesis || state.isShopOpen) return
  const utterance = new SpeechSynthesisUtterance(state.word)
  utterance.lang = 'en-US'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function handleGlobalKeydown(event) {
  if (event.key === 'Tab') {
    event.preventDefault()
    state.dictationMode = !state.dictationMode
    return
  }
  if (state.loading || state.hasWrong || !state.word || !canType.value) return
  if (event.ctrlKey || event.metaKey || event.altKey) return

  const key = event.key
  const isChar = key.length === 1
  const isBackspace = key === 'Backspace'
  const isSpace = key === ' '
  if (!isChar && !isBackspace && !isSpace) return
  event.preventDefault()
  setActiveVirtualKey(key)
  applyInputKey(key)
}

function handleGlobalKeyup(event) {
  const key = normalizeVirtualKey(event.key)
  if (activeVirtualKey.value === key) {
    activeVirtualKey.value = ''
  }
}

function normalizeVirtualKey(key) {
  if (key === ' ') return 'Space'
  if (key.length === 1) return key.toUpperCase()
  return key
}

function setActiveVirtualKey(key) {
  activeVirtualKey.value = normalizeVirtualKey(key)
}

function applyInputKey(key) {
  if (state.loading || state.hasWrong || !state.word || !canType.value) return
  if (key === 'Backspace') {
    state.input = state.input.slice(0, -1)
    return
  }
  if (key === 'Space') {
    state.input += ' '
    return
  }
  if (key.length === 1) {
    state.input += key
  }
}

async function addToWrongBook() {
  if (!state.word || state.hasRecordedWrong) return
  state.hasRecordedWrong = true
  await fetch('http://127.0.0.1:5001/wrong', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word: state.word, answer: state.meaning })
  })
}

async function logLearnedWord() {
  if (!state.word) return
  await fetch('http://127.0.0.1:5001/study/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word: state.word,
      bookId: currentBookId.value || null,
      action: 'learn'
    })
  })
}

async function nextQuestion() {
  if (state.stageIndex >= state.stagesTotal) return
  await fetchSpellingWord()
}

let resetTimer = null
let turnTimer = null

function stopTurnTimer() {
  if (turnTimer) {
    window.clearInterval(turnTimer)
    turnTimer = null
  }
}

function startTurnTimer() {
  stopTurnTimer()
  const startedAt = Date.now()
  turnTimer = window.setInterval(() => {
    const elapsed = (Date.now() - startedAt) / 1000
    state.timeLeft = Math.max(0, state.timeLimit - elapsed)
    if (state.timeLeft <= 0) {
      stopTurnTimer()
      void handleQuestionTimeout()
    }
  }, 100)
}

function calculateWordScore() {
  const blankCount = (state.word || '').length
  const blankScore = blankCount * 1
  const remainingTimeScore = 1 + Math.max(0, state.timeLeft)
  const comboMultiplier = 1 + state.streak
  const totalScore = (blankScore + remainingTimeScore) * (comboMultiplier + state.gainMultiplier)
  return Math.max(0, Math.round(totalScore))
}

function completeQuestion() {
  const stageFinished = state.questionIndex + 1 >= state.wordsPerStage
  state.answersSinceShop += 1
  state.questionIndex += 1

  if (stageFinished) {
    if (stageScore.value < stageTarget.value) {
      state.isFailed = true
      state.isSummaryOpen = true
      stopTurnTimer()
      return
    }
    state.stageIndex += 1
    state.questionIndex = 0
    state.answersSinceShop = 0
    state.stageScoreStart = state.score

    if (state.stageIndex >= state.stagesTotal) {
      state.isFailed = false
      state.isSummaryOpen = true
      stopTurnTimer()
      return
    }
  }

  if (state.answersSinceShop >= 4 && !stageFinished) {
    state.answersSinceShop = 0
    openShop()
  }
}

async function handleQuestionTimeout() {
  if (state.isResolvingQuestion || !state.word || state.isSummaryOpen) return
  state.isResolvingQuestion = true
  state.streak = 0
  await addToWrongBook()
  state.wordHistory.push({ word: state.word, meaning: state.meaning, result: '超时' })
  state.input = ''
  state.hasWrong = false
  state.letterStates = new Array(state.word.length).fill('pending')
  completeQuestion()
  if (!state.isSummaryOpen) {
    await nextQuestion()
  }
  state.isResolvingQuestion = false
}

watch(
  () => state.input,
  async (value) => {
    if (!state.word || state.hasWrong || !canType.value || state.isResolvingQuestion) return
    const inputLength = value.length
    if (inputLength === 0) return

    if (inputLength > state.word.length) {
      state.input = value.slice(0, state.word.length)
      return
    }

    const index = inputLength - 1
    const inputChar = value[index]
    const targetChar = state.word[index]
    const isCorrect = inputChar?.toLowerCase() === targetChar?.toLowerCase()

    if (isCorrect) {
      state.letterStates[index] = 'correct'
    } else {
      await addToWrongBook()
      state.letterStates[index] = 'wrong'
      state.hasWrong = true
      state.streak = 0
      if (resetTimer) {
        window.clearTimeout(resetTimer)
      }
      resetTimer = window.setTimeout(() => {
        state.input = ''
        state.hasWrong = false
        state.letterStates = new Array(state.word.length).fill('pending')
      }, 300)
      return
    }

    if (inputLength === state.word.length) {
      state.isResolvingQuestion = true
      stopTurnTimer()
      const earnedScore = calculateWordScore()
      state.correctCount += 1
      state.score += earnedScore
      state.coins += 1
      state.streak += 1
      state.wordHistory.push({ word: state.word, meaning: state.meaning, result: '正确' })
      await logLearnedWord()
      completeQuestion()
      if (!state.isSummaryOpen) {
        await nextQuestion()
      }
      state.isResolvingQuestion = false
    }
  }
)

watch(
  () => state.dictationMode,
  (enabled) => {
    state.showEnglish = !enabled
  },
  { immediate: true }
)

onMounted(() => {
  if (!currentBookId.value) {
    alert('请先选择词库再开始拼写')
    router.push('/books')
    return
  }
  nextQuestion()
  studyTimer.start()
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('keyup', handleGlobalKeyup)
})

onBeforeUnmount(() => {
  studyTimer.stop()
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('keyup', handleGlobalKeyup)
  if (resetTimer) {
    window.clearTimeout(resetTimer)
  }
  stopTurnTimer()
})
</script>

<template>
  <main class="trainer-page">
    <header class="topbar">
      <div class="round-chip">
        <span class="chip-label">Round {{ stageText }}</span>
        <strong>{{ progressText }}</strong>
      </div>
      <div class="score-group">
        <article class="counter-chip">
          <span>🏆 积分</span>
          <strong>{{ state.score }}</strong>
        </article>
        <article class="counter-chip">
          <span>🪙 金币</span>
          <strong>{{ state.coins }}</strong>
        </article>
        <article class="counter-chip target-chip">
          <span>🎯 本回合目标</span>
          <strong>{{ stageTargetText }}</strong>
        </article>
      </div>
      <div class="head-actions">
        <button class="head-btn" @click="playPronunciation">🔊</button>
        <button class="head-btn" @click="state.dictationMode = !state.dictationMode">
          {{ state.dictationMode ? '默写' : '普通' }}
        </button>
        <button class="back-button" @click="router.back()">&times;</button>
      </div>
    </header>

    <section class="center-panel">
      <p v-if="state.loading" class="hint">题目加载中...</p>
      <template v-else-if="state.word && !state.isSummaryOpen">
        <div class="timer-wrap">
          <div class="timer-track">
            <div class="timer-fill" :style="{ width: `${timerPercent}%` }"></div>
          </div>
          <p class="timer-text">剩余 {{ timerText }} 秒</p>
        </div>
        <h1 v-if="state.showEnglish" class="word-title">
          <span
            v-for="(item, index) in charRenderList"
            :key="`title-${index}-${item.text}`"
            class="word-char"
            :class="item.status"
          >
            {{ item.text }}
          </span>
        </h1>
        <p class="label">中文提示</p>
        <p class="meaning">{{ state.meaning }}</p>
        <p class="subhint">{{ state.pronunciationHint }}</p>
      </template>
      <p v-else class="hint">训练结束</p>
    </section>

    <div class="combo-float" :class="{ active: state.streak > 1 }">
      <p class="combo-label">COMBO</p>
      <p class="combo-value">x{{ state.streak }}</p>
    </div>

    <section class="keyboard-panel">
      <div class="stats-inline">
        <span>回合进度 {{ progressText }}</span>
        <span>正确数 {{ state.correctCount }}</span>
        <span>正确率 {{ accuracyText }}</span>
      </div>
      <div class="keyboard-wrap">
        <div v-for="(row, rowIndex) in virtualKeys" :key="`row-${rowIndex}`" class="kb-row">
          <button
            v-for="k in row"
            :key="k"
            class="kb-key"
            :class="{ active: activeVirtualKey === k }"
            :disabled="!canType"
            @click="applyInputKey(k)"
          >
            {{ k }}
          </button>
        </div>
        <div class="kb-row special">
          <button class="kb-key wide" :class="{ active: activeVirtualKey === 'Space' }" :disabled="!canType" @click="applyInputKey('Space')">Space</button>
          <button class="kb-key wide" :class="{ active: activeVirtualKey === 'Backspace' }" :disabled="!canType" @click="applyInputKey('Backspace')">Backspace</button>
        </div>
      </div>
    </section>

    <div v-if="state.isShopOpen" class="modal-mask">
      <div class="modal-card">
        <h3>商店</h3>
        <p class="modal-sub">每 4 次作答进入一次商店。卡片效果为占位符。</p>
        <div class="shop-grid">
          <article v-for="card in shopCards" :key="card.id" class="shop-item">
            <p class="shop-name">{{ card.name }}</p>
            <p class="shop-desc">{{ card.desc }}</p>
            <button class="shop-buy" :disabled="state.coins < card.cost" @click="buyBuff(card)">
              购买 {{ card.cost }} 金币
            </button>
          </article>
        </div>
        <div class="modal-actions">
          <button class="head-btn" :disabled="state.coins < 2" @click="refreshShop">刷新商店（2金币）</button>
          <button class="head-btn" @click="closeShop">继续作答</button>
        </div>
      </div>
    </div>

    <div v-if="state.isSummaryOpen" class="modal-mask">
      <div class="modal-card summary-card">
        <h3>{{ state.isFailed ? '游戏失败' : '通关成功' }}</h3>
        <p class="modal-sub">
          {{ state.isFailed ? '本回合目标分未达成。以下是本局已作答单词与释义。' : '3 回合已完成，以下是本局答题单词与释义。' }}
        </p>
        <div class="summary-list">
          <div v-for="(item, idx) in state.wordHistory" :key="`${idx}-${item.word}`" class="summary-row">
            <strong>{{ item.word }}</strong>
            <span>{{ item.meaning }}（{{ item.result || '已作答' }}）</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="head-btn" @click="router.push('/wrong')">查看错词本</button>
          <HomeIconButton class="head-btn home-icon-btn" @click="router.push('/')" />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.trainer-page {
  min-height: 100vh;
  padding: 10px 8px 10px;
  background: linear-gradient(180deg, #404652 0%, #474d59 100%);
  color: #e2e8f0;
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.topbar {
  width: min(980px, 100%);
  margin: 0 auto;
  padding: 6px 8px;
  border-radius: 14px;
  background: #4a505c;
  border: 1px solid #3d4350;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.round-chip {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 120px;
}

.chip-label {
  font-size: 0.92rem;
  color: #cbd5e1;
}

.round-chip strong {
  font-size: 1.1rem;
  color: #fbbf24;
}

.score-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.counter-chip {
  min-width: 110px;
  border-radius: 10px;
  background: #3f4654;
  border: 1px solid #5e6675;
  padding: 5px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.target-chip {
  min-width: 140px;
}

.counter-chip span {
  color: #cbd5e1;
  font-size: 0.78rem;
}

.counter-chip strong {
  font-size: 1rem;
  color: #f8fafc;
}

.back-button {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: #26374f;
  color: #cbd5e1;
  font-size: 1.2rem;
  cursor: pointer;
}

.head-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.head-btn {
  border: 1px solid #5e6675;
  border-radius: 999px;
  background: #3f4654;
  color: #cbd5e1;
  padding: 5px 8px;
  cursor: pointer;
}


.head-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.center-panel {
  width: min(900px, 100%);
  margin: 0 auto;
  align-self: center;
  padding: 4px 10px;
  display: grid;
  place-items: center;
  gap: 10px;
  text-align: center;
}

.word-title {
  margin: 0;
  font-size: clamp(2rem, 7vw, 3.2rem);
  font-weight: 500;
  letter-spacing: 0.16em;
  color: #f8fafc;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0;
  font-family: 'Courier New', 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace;
  line-height: 1.1;
}

.timer-wrap {
  width: min(360px, 82vw);
  display: grid;
  gap: 8px;
}

.timer-track {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #3f4654;
  overflow: hidden;
}

.timer-fill {
  height: 100%;
  background: linear-gradient(90deg, #f2994a 0%, #e18736 100%);
  transition: width 0.1s linear;
}

.timer-text {
  margin: 0;
  font-size: 0.84rem;
  color: #bae6fd;
}

.word-char {
  display: inline-block;
  min-width: auto;
  height: auto;
  border: none;
  border-radius: 0;
  padding: 0;
  background: transparent;
  transition: color 0.12s ease;
}

.word-char.pending {
  color: #e2e8f0;
}

.word-char.correct {
  color: #4ade80;
  text-shadow: 0 0 10px rgba(74, 222, 128, 0.25);
}

.word-char.wrong {
  color: #fda4af;
}

.label {
  margin: 0;
  font-size: 0.86rem;
  color: #dbeafe;
}

.meaning {
  margin: 0;
  color: #f8fafc;
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  font-weight: 700;
}

.subhint {
  margin: 0;
  color: #dbeafe;
  font-size: 0.9rem;
}

.combo-float {
  position: fixed;
  right: clamp(120px, 18vw, 300px);
  bottom: 210px;
  z-index: 12;
  display: flex;
  align-items: baseline;
  gap: 10px;
  text-align: left;
  pointer-events: none;
  font-family: 'Trebuchet MS', 'Comic Sans MS', 'Arial Black', sans-serif;
}

.combo-float.active {
  animation: comboShake 0.24s ease-in-out infinite alternate;
}

.combo-label {
  margin: 0;
  font-size: 1.05rem;
  letter-spacing: 0.1em;
  color: #fde68a;
  white-space: nowrap;
}

.combo-value {
  margin: 0;
  font-size: clamp(3rem, 6vw, 4.8rem);
  font-weight: 900;
  color: #facc15;
  text-shadow: 0 6px 20px rgba(250, 204, 21, 0.45);
  white-space: nowrap;
}

.keyboard-panel {
  width: min(900px, 100%);
  margin: -14px auto 30px;
  display: grid;
  gap: 8px;
}

.stats-inline {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  color: #dbeafe;
  font-size: 0.9rem;
}

.keyboard-wrap {
  border-radius: 16px;
  background: transparent;
  border: none;
  padding: 0;
  display: grid;
  gap: 6px;
  transform: scale(1.18);
  transform-origin: top center;
}

.kb-row {
  display: flex;
  justify-content: center;
  gap: 6px;
  flex-wrap: nowrap;
}

.kb-key {
  min-width: 40px;
  height: 38px;
  border: none;
  border-radius: 10px;
  background: rgba(30, 41, 59, 0.92);
  color: #e6edf8;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
}

.kb-key.active {
  background: rgba(74, 222, 128, 0.35);
  color: #dcfce7;
  transform: translateY(-1px);
}

.kb-key.wide {
  min-width: 120px;
}

.kb-key:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  display: grid;
  place-items: center;
  z-index: 50;
  padding: 16px;
}

.modal-card {
  width: min(760px, 96vw);
  border-radius: 14px;
  border: 1px solid rgba(71, 85, 105, 0.6);
  background: rgba(15, 23, 42, 0.96);
  padding: 16px;
  display: grid;
  gap: 12px;
}

.summary-card {
  width: min(840px, 96vw);
}

.modal-card h3 {
  margin: 0;
}

.modal-sub {
  margin: 0;
  color: #cbd5e1;
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.shop-item {
  border-radius: 10px;
  padding: 12px;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(71, 85, 105, 0.5);
  display: grid;
  gap: 8px;
}

.shop-name {
  margin: 0;
  font-weight: 700;
}

.shop-desc {
  margin: 0;
  color: #cbd5e1;
  font-size: 0.9rem;
  min-height: 42px;
}

.shop-buy {
  border: 1px solid rgba(56, 189, 248, 0.4);
  border-radius: 8px;
  background: rgba(14, 116, 144, 0.35);
  color: #bae6fd;
  padding: 8px;
  cursor: pointer;
}

.shop-buy:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.summary-list {
  max-height: 46vh;
  overflow: auto;
  border-radius: 10px;
  border: 1px solid rgba(71, 85, 105, 0.45);
}

.summary-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(71, 85, 105, 0.3);
}

.summary-row:last-child {
  border-bottom: none;
}

.hint {
  margin: 0;
  color: #dbeafe;
}

@keyframes comboShake {
  0% { transform: rotate(-1.3deg) translateY(0); }
  100% { transform: rotate(1.3deg) translateY(-2px); }
}

@media (max-width: 760px) {
  .trainer-page {
    padding: 8px 6px 8px;
  }

  .topbar {
    width: 100%;
  }

  .score-group {
    width: 100%;
    flex-wrap: wrap;
    gap: 6px;
  }

  .counter-chip {
    flex: 1;
    min-width: 120px;
  }

  .head-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .combo-float {
    right: 36px;
    bottom: 176px;
  }

  .combo-value {
    font-size: 2.3rem;
  }

  .kb-key {
    min-width: 34px;
    height: 34px;
    font-size: 0.8rem;
  }

  .kb-key.wide {
    min-width: 104px;
  }

  .shop-grid {
    grid-template-columns: 1fr;
  }

  .summary-row {
    grid-template-columns: 1fr;
  }
}
</style>
  .keyboard-panel {
    width: min(96vw, 560px);
    margin-bottom: 16px;
  }

  .keyboard-wrap {
    transform: scale(1.1);
  }
