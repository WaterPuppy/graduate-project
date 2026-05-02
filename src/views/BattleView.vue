<template>
  <div class="battle-container">
    <div v-if="gameOver" class="result-screen">
      <h1 v-if="win">挑战成功</h1>
      <h1 v-else>本局结束</h1>
      <p class="result-tip">{{ resultTip }}</p>
      <button @click="restart">再来一局</button>
      <button @click="$router.push('/wrong')">进入错题本</button>
      <HomeIconButton class="home-icon-btn" @click="$router.push('/')" />
    </div>

    <div class="top-actions">
      <button class="top-action-btn" @click="openBackDialog">&lt;</button>
      <button class="top-action-btn" @click="openPauseDialog">暂停游戏</button>
      <HomeIconButton class="top-action-btn danger home-icon-btn" @click="openExitDialog" />
    </div>

    <div class="top-bars">
      <div class="hp-panel">
        <p class="hp-title">玩家 HP</p>
        <div class="hp-bar">
          <div class="hp-inner player" :style="{ width: `${playerHp}%` }"></div>
        </div>
        <p class="hp-value">{{ playerHp }}%</p>
        <p class="counter-line">护盾：{{ playerShield }}</p>
        <p class="counter-line energy">能量：{{ playerEnergy }} / 3</p>
      </div>

      <div class="hp-panel">
        <p class="hp-title">Boss HP · {{ bossStageLabel }}</p>
        <div class="hp-bar">
          <div class="hp-inner boss" :style="{ width: `${bossHp}%` }"></div>
        </div>
        <p class="hp-value">{{ bossHp }}%</p>
        <p class="counter-line">护盾：{{ bossShield }}</p>
      </div>
    </div>

    <div class="character-layer">
      <div class="character-stage">
        <div class="role-lane role-lane-player">
          <div
            class="avatar-slot player-slot"
            :class="{ 'is-hit': playerHitActive, 'is-attack': playerAttackActive }"
          >
            <img :src="playerImageSrc" alt="player" class="avatar-image player-image" />
          </div>
        </div>
        <div class="role-lane role-lane-boss">
          <div class="avatar-slot boss-slot" :class="{ 'is-hit': bossHitActive, 'is-dead': bossDeadActive }">
            <img :src="bossImageSrc" alt="boss" class="avatar-image boss-image" />
          </div>
        </div>
      </div>
    </div>

    <div class="mode-badge">
      {{ isWrongMode ? '待重练模式' : '普通闯关模式' }}
    </div>

    <div class="bottom-left">
      <p class="combo-label">连击</p>
      <p class="combo-value">x{{ combo }}</p>
      <p class="deck-line">抽牌堆：{{ drawPile.length }}</p>
      <p class="deck-line">弃牌堆：{{ discardPile.length }}</p>
      <p class="deck-line">强化：{{ fortifyTurns > 0 ? `${fortifyTurns} 回合` : '无' }}</p>
    </div>

    <div class="bottom-center">
      <div class="question-panel">
        <p class="turn-status" :class="`turn-${currentTurn}`">
          {{
            currentTurn === 'player'
              ? canUseCards
                ? '玩家回合：可打出技能卡并结束回合'
                : '玩家回合：请先答题'
              : currentTurn === 'boss'
                ? '敌方回合：Boss 行动中'
                : '等待回合开始'
          }}
        </p>

        <div v-if="currentTurn === 'player'" class="timer-wrap">
          <div class="timer-bar">
            <div class="timer-fill" :style="{ width: `${turnTimePercent}%` }"></div>
          </div>
          <p class="timer-text">剩余 {{ turnTimeText }} 秒</p>
        </div>

        <p v-if="enemyActionText" class="enemy-action">{{ enemyActionText }}</p>
        <p v-if="playerDebuffText" class="enemy-action">{{ playerDebuffText }}</p>

        <div v-if="loading" class="status-box">题目加载中...</div>
        <div v-else-if="emptyWrongMode" class="status-box empty">
          <p>当前没有待重练单词，先去普通模式做题吧。</p>
          <button class="inline-button" @click="$router.push('/wrong')">查看错题本</button>
        </div>

        <div v-else-if="currentQuestion.word && !gameOver" class="question-box">
          <p class="question">{{ currentQuestion.word }}</p>
          <p class="question-meta">
            <span>读音：{{ currentQuestion.phonetic || '自动播放' }}</span>
            <span>请选择正确释义</span>
          </p>

          <div v-if="!canUseCards" class="options-grid">
            <button
              v-for="(item, index) in currentQuestion.options || []"
              :key="index"
              class="option-button"
              :disabled="!isPlayerTurn || isTurnResolving"
              @click="answer(item)"
            >
              <span class="option-index">{{ index + 1 }}</span>
              <span class="option-text">{{ item }}</span>
            </button>
          </div>
        </div>

        <div v-if="isPlayerTurn && canUseCards" class="hand-panel">
          <p class="hand-title">本回合手牌（可打出多张）</p>
          <div class="hand-grid">
            <button
              v-for="card in handCards"
              :key="card.id"
              class="card-button"
              :disabled="isTurnResolving || playerEnergy < card.cost"
              @click="playCard(card.id)"
            >
              <span class="card-name">{{ card.label }}</span>
              <span class="card-cost">消耗 {{ card.cost }} 能量</span>
            </button>
          </div>
          <button class="end-turn-button" :disabled="isTurnResolving" @click="endPlayerTurn">
            结束玩家回合
          </button>
        </div>
      </div>
    </div>

    <div v-if="currentTurn === 'player' && bossIntent" class="boss-intent-box">
      <p class="boss-intent-title">Boss 意图</p>
      <p class="boss-intent-value">{{ bossIntentLabel }}</p>
    </div>

    <div v-if="showDamage" class="damage">-{{ damage }}</div>

    <div v-if="dialogType" class="dialog-mask">
      <div class="dialog-card">
        <h3>
          {{
            dialogType === 'pause'
              ? '游戏已暂停'
              : dialogType === 'back'
                ? '确认返回上一页'
                : '确认返回首页'
          }}
        </h3>
        <p v-if="dialogType === 'pause'">可以继续游戏，或返回首页结束本局。</p>
        <p v-else-if="dialogType === 'back'">返回上一页将离开当前对局，是否继续？</p>
        <p v-else>返回首页将结束当前对局，是否继续？</p>
        <div class="dialog-actions">
          <button class="dialog-btn" @click="closeDialog">继续游戏</button>
          <button v-if="dialogType === 'back'" class="dialog-btn danger" @click="confirmGoBack">
            返回上一页
          </button>
          <HomeIconButton v-else class="dialog-btn danger home-icon-btn" @click="confirmGoHome" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HomeIconButton from '../components/HomeIconButton.vue'
import { createStudyTimer } from '../utils/studyTime'

const route = useRoute()
const router = useRouter()
const studyTimer = createStudyTimer()
const currentBookId = computed(() => Number(route.query.bookId || 0))
const hasSelectedBook = computed(() => currentBookId.value > 0)
const playerImageSrc = '/player.png'
const bossImageSrc = '/boss.png'

const combo = ref(0)
const gameOver = ref(false)
const win = ref(false)
const bossHp = ref(100)
const playerHp = ref(100)
const playerShield = ref(0)
const bossShield = ref(0)
const playerEnergy = ref(0)
const drawPile = ref([])
const discardPile = ref([])
const handCards = ref([])
const fortifyTurns = ref(0)
const damage = ref(0)
const showDamage = ref(false)
const currentQuestion = ref({})
const loading = ref(false)
const emptyWrongMode = ref(false)
const currentTurn = ref('idle')
const turnTimeMs = ref(20000)
const turnTimeLeftMs = ref(20000)
const enemyActionText = ref('')
const isTurnResolving = ref(false)
const canUseCards = ref(false)
const playerWeak = ref(false)
const playerVulnerable = ref(false)
const bossIntent = ref('')
const dialogType = ref('')
const playerAttackActive = ref(false)
const playerHitActive = ref(false)
const bossHitActive = ref(false)
const bossDeadActive = ref(false)
let audioPlayer = null
let turnTimer = null
let cardId = 0
let playerAttackTimer = null
let playerHitTimer = null
let bossHitTimer = null

function clearAnimTimer(timerRef) {
  if (timerRef) {
    window.clearTimeout(timerRef)
  }
  return null
}

function stopAudio() {
  if (audioPlayer) {
    audioPlayer.pause()
    audioPlayer = null
  }
}

function speakByBrowser(word) {
  if (!word || !window.speechSynthesis) return
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = 'en-US'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

async function playQuestionAudio() {
  const audio = currentQuestion.value.audio || ''
  const word = currentQuestion.value.word || ''
  stopAudio()
  if (audio) {
    try {
      const player = new Audio(audio)
      audioPlayer = player
      await player.play()
      return
    } catch (error) {
      console.warn('音频播放失败，回退浏览器语音', error)
    }
  }
  speakByBrowser(word)
}

function triggerPlayerAttack() {
  playerAttackActive.value = false
  playerAttackTimer = clearAnimTimer(playerAttackTimer)
  void document.body.offsetHeight
  playerAttackActive.value = true
  playerAttackTimer = window.setTimeout(() => {
    playerAttackActive.value = false
  }, 380)
}

function triggerPlayerHit() {
  playerHitActive.value = false
  playerHitTimer = clearAnimTimer(playerHitTimer)
  void document.body.offsetHeight
  playerHitActive.value = true
  playerHitTimer = window.setTimeout(() => {
    playerHitActive.value = false
  }, 360)
}

function triggerBossHit() {
  bossHitActive.value = false
  bossHitTimer = clearAnimTimer(bossHitTimer)
  void document.body.offsetHeight
  bossHitActive.value = true
  bossHitTimer = window.setTimeout(() => {
    bossHitActive.value = false
  }, 360)
}

const isWrongMode = computed(() => route.query.mode === 'wrong')
const isPlayerTurn = computed(() => currentTurn.value === 'player')
const turnTimePercent = computed(() => Math.max(0, (turnTimeLeftMs.value / turnTimeMs.value) * 100))
const turnTimeText = computed(() => (turnTimeLeftMs.value / 1000).toFixed(1))
const basePlayerAttack = 8
const basePlayerDefense = 8
const bossIntentDefense = 8
const effectivePlayerAttack = computed(() => {
  const bonus = fortifyTurns.value > 0 ? 2 : 0
  const debuff = playerWeak.value ? 2 : 0
  return Math.max(0, basePlayerAttack + bonus - debuff)
})
const effectivePlayerDefense = computed(() => {
  const bonus = fortifyTurns.value > 0 ? 2 : 0
  const debuff = playerVulnerable.value ? 2 : 0
  return Math.max(0, basePlayerDefense + bonus - debuff)
})
const bossIntentLabel = computed(() => {
  const intentMap = {
    vulnerable: '脆弱（玩家防御减少 2 点）',
    weak: '虚弱（玩家攻击减少 2 点）',
    attack: '攻击（对玩家造成 8 点伤害）',
    defend: '防御（获得 8 点护盾）'
  }
  return intentMap[bossIntent.value] || ''
})
const playerDebuffText = computed(() => {
  const states = []
  if (playerVulnerable.value) states.push('脆弱')
  if (playerWeak.value) states.push('虚弱')
  return states.length ? `玩家负面效果：${states.join('、')}` : ''
})
const bossStageLabel = computed(() => {
  if (bossHp.value > 70) return '阶段 1 (100%-70%)'
  if (bossHp.value > 40) return '阶段 2 (70%-40%)'
  return '阶段 3 (40%-0%)'
})
const resultTip = computed(() => {
  if (win.value && isWrongMode.value) return '答对待重练单词后，会自动标记为已掌握。'
  if (!win.value && isWrongMode.value) return '错题会继续保留在待重练集合中，之后还能再次练习。'
  return '答错的新单词会进入错题本，方便后续反复练习。'
})

function makeDeck() {
  const cards = [
    ...Array.from({ length: 4 }, () => ({ type: 'attack', label: '攻击', cost: 1 })),
    ...Array.from({ length: 4 }, () => ({ type: 'defend', label: '防御', cost: 1 })),
    { type: 'cleanse', label: '净化', cost: 2 },
    { type: 'fortify', label: '强化', cost: 2 }
  ]
  return shuffle(cards).map((card) => ({ ...card, id: ++cardId }))
}

function shuffle(list) {
  const copied = [...list]
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copied[i], copied[j]] = [copied[j], copied[i]]
  }
  return copied
}

function resetDeck() {
  drawPile.value = makeDeck()
  discardPile.value = []
  handCards.value = []
}

function drawCards(count) {
  handCards.value = []
  for (let i = 0; i < count; i += 1) {
    if (drawPile.value.length === 0) {
      if (discardPile.value.length === 0) break
      drawPile.value = shuffle(discardPile.value)
      discardPile.value = []
    }
    const nextCard = drawPile.value.shift()
    if (nextCard) handCards.value.push(nextCard)
  }
}

function discardHand() {
  if (handCards.value.length) {
    discardPile.value.push(...handCards.value)
    handCards.value = []
  }
}

async function fetchQuestion() {
  loading.value = true
  emptyWrongMode.value = false
  stopAudio()
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  try {
    const endpoint = isWrongMode.value ? '/wrong_question' : '/question'
    const query = !isWrongMode.value && currentBookId.value ? `?book_id=${currentBookId.value}` : ''
    const res = await fetch(`http://127.0.0.1:5001${endpoint}${query}`)
    const data = await res.json()
    if (data.error === 'no wrong questions') {
      currentQuestion.value = {}
      emptyWrongMode.value = true
      currentTurn.value = 'idle'
      return
    }
    currentQuestion.value = data
    await playQuestionAudio()
  } catch (err) {
    console.error('请求失败：', err)
    currentQuestion.value = {}
    currentTurn.value = 'idle'
  } finally {
    loading.value = false
  }
}

function stopTurnTimer() {
  if (turnTimer) {
    window.clearInterval(turnTimer)
    turnTimer = null
  }
}

function startTurnTimer() {
  stopTurnTimer()
  turnTimeLeftMs.value = turnTimeMs.value
  turnTimer = window.setInterval(() => {
    turnTimeLeftMs.value = Math.max(0, turnTimeLeftMs.value - 100)
    if (turnTimeLeftMs.value === 0) {
      stopTurnTimer()
      handlePlayerTimeout()
    }
  }, 100)
}

function openPauseDialog() {
  if (gameOver.value) return
  dialogType.value = 'pause'
  stopTurnTimer()
}

function openExitDialog() {
  dialogType.value = 'exit'
  stopTurnTimer()
}

function openBackDialog() {
  dialogType.value = 'back'
  stopTurnTimer()
}

function closeDialog() {
  const shouldResumeTimer = dialogType.value && isPlayerTurn.value && !gameOver.value && !loading.value
  dialogType.value = ''
  if (shouldResumeTimer) {
    startTurnTimer()
  }
}

function confirmGoHome() {
  dialogType.value = ''
  stopTurnTimer()
  router.push('/')
}

function confirmGoBack() {
  dialogType.value = ''
  stopTurnTimer()
  router.back()
}

async function saveWrongQuestion() {
  await fetch('http://127.0.0.1:5001/wrong', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentQuestion.value)
  })
}

async function markWrongAsMastered() {
  await fetch('http://127.0.0.1:5001/wrong/mark_mastered', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word: currentQuestion.value.word,
      meaning: currentQuestion.value.answer,
      isMastered: true
    })
  })
}

async function logStudyAction(action) {
  if (!currentQuestion.value.word) return
  await fetch('http://127.0.0.1:5001/study/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word: currentQuestion.value.word,
      bookId: currentBookId.value || null,
      action
    })
  })
}

function pickBossIntent() {
  const intents = ['vulnerable', 'weak', 'attack', 'defend']
  return intents[Math.floor(Math.random() * intents.length)]
}

function applyDamageToBoss(incoming) {
  const absorbed = Math.min(bossShield.value, incoming)
  const actual = incoming - absorbed
  bossShield.value -= absorbed
  bossHp.value = Math.max(0, bossHp.value - actual)
  return { actual, absorbed }
}

function applyDamageToPlayer(incoming) {
  const absorbed = Math.min(playerShield.value, incoming)
  const actual = incoming - absorbed
  playerShield.value -= absorbed
  playerHp.value = Math.max(0, playerHp.value - actual)
  return { actual, absorbed }
}

async function executeBossTurn() {
  if (gameOver.value) return

  currentTurn.value = 'boss'
  isTurnResolving.value = true
  bossShield.value = 0
  await new Promise((resolve) => window.setTimeout(resolve, 500))

  if (bossIntent.value === 'vulnerable') {
    playerVulnerable.value = true
    enemyActionText.value = 'Boss 施加脆弱，玩家防御减少 2 点'
  } else if (bossIntent.value === 'weak') {
    playerWeak.value = true
    enemyActionText.value = 'Boss 施加虚弱，玩家攻击减少 2 点'
  } else if (bossIntent.value === 'attack') {
    const { actual, absorbed } = applyDamageToPlayer(8)
    triggerPlayerHit()
    enemyActionText.value =
      actual > 0
        ? `Boss 攻击造成 ${actual} 点伤害（护盾抵挡 ${absorbed}）`
        : `Boss 攻击被护盾全部抵挡（抵挡 ${absorbed}）`
  } else if (bossIntent.value === 'defend') {
    bossShield.value += bossIntentDefense
    enemyActionText.value = `Boss 防御，获得 ${bossIntentDefense} 点护盾`
  }

  if (playerHp.value === 0) {
    gameOver.value = true
    win.value = false
    currentTurn.value = 'idle'
    isTurnResolving.value = false
    return
  }

  await beginNextPlayerTurn()
}

async function beginNextPlayerTurn() {
  isTurnResolving.value = false
  canUseCards.value = false
  playerEnergy.value = 3
  playerShield.value = 0
  await fetchQuestion()

  if (gameOver.value || emptyWrongMode.value || !currentQuestion.value.word) {
    currentTurn.value = 'idle'
    return
  }

  drawCards(5)
  currentTurn.value = 'player'
  bossIntent.value = pickBossIntent()
  startTurnTimer()
}

async function endPlayerTurn() {
  if (!isPlayerTurn.value || isTurnResolving.value) return
  canUseCards.value = false
  discardHand()
  if (fortifyTurns.value > 0) fortifyTurns.value -= 1
  await executeBossTurn()
}

async function handlePlayerTimeout() {
  if (!isPlayerTurn.value || isTurnResolving.value || gameOver.value) return
  combo.value = 0
  canUseCards.value = false
  enemyActionText.value = '玩家回合超时，视为答题失败'
  discardHand()
  await saveWrongQuestion()
  if (fortifyTurns.value > 0) fortifyTurns.value -= 1
  await executeBossTurn()
}

async function answer(choice) {
  if (loading.value || !currentQuestion.value.word || !isPlayerTurn.value || isTurnResolving.value) return

  isTurnResolving.value = true
  if (choice === currentQuestion.value.answer) {
    combo.value += 1
    triggerPlayerAttack()
    triggerBossHit()
    if (isWrongMode.value) {
      await markWrongAsMastered()
      await logStudyAction('review_correct')
    } else {
      await logStudyAction('learn')
    }
    canUseCards.value = true
    enemyActionText.value = '答题正确，可使用技能卡'
  } else {
    combo.value = 0
    triggerPlayerHit()
    await saveWrongQuestion()
    canUseCards.value = false
    enemyActionText.value = '玩家答错，直接进入 Boss 回合'
    stopTurnTimer()
    discardHand()
    if (fortifyTurns.value > 0) fortifyTurns.value -= 1
    isTurnResolving.value = false
    await executeBossTurn()
    return
  }
  isTurnResolving.value = false
}

async function playCard(cardIdToPlay) {
  if (!canUseCards.value || !isPlayerTurn.value || isTurnResolving.value) return
  const idx = handCards.value.findIndex((card) => card.id === cardIdToPlay)
  if (idx < 0) return
  const card = handCards.value[idx]
  if (card.type === 'cleanse' && combo.value <= 3) {
    enemyActionText.value = '净化需要连击数大于 3 才能使用'
    return
  }
  if (playerEnergy.value < card.cost) return

  playerEnergy.value -= card.cost
  handCards.value.splice(idx, 1)
  discardPile.value.push(card)

  if (card.type === 'attack') {
    const { actual, absorbed } = applyDamageToBoss(effectivePlayerAttack.value)
    triggerPlayerAttack()
    triggerBossHit()
    if (actual > 0) {
      damage.value = actual
      showDamage.value = true
      window.setTimeout(() => (showDamage.value = false), 500)
    }
    enemyActionText.value =
      actual > 0
        ? `攻击卡造成 ${actual} 点伤害（护盾抵挡 ${absorbed}）`
        : `攻击卡被 Boss 护盾全部抵挡（抵挡 ${absorbed}）`
  } else if (card.type === 'defend') {
    const shieldGain = effectivePlayerDefense.value
    playerShield.value += shieldGain
    enemyActionText.value = `防御卡生效，获得 ${shieldGain} 点护盾`
  } else if (card.type === 'cleanse') {
    playerWeak.value = false
    playerVulnerable.value = false
    combo.value -= 3
    enemyActionText.value = '净化卡生效，解除脆弱与虚弱，并消耗 3 连击'
  } else if (card.type === 'fortify') {
    fortifyTurns.value = Math.max(fortifyTurns.value, 3)
    enemyActionText.value = '强化卡生效，攻击与防御 +2，持续三回合'
  }

  if (bossHp.value === 0) {
    bossDeadActive.value = true
    gameOver.value = true
    win.value = true
    currentTurn.value = 'idle'
    stopTurnTimer()
    return
  }
}

function resetState() {
  stopTurnTimer()
  bossHp.value = 100
  playerHp.value = 100
  playerShield.value = 0
  bossShield.value = 0
  playerEnergy.value = 0
  combo.value = 0
  gameOver.value = false
  win.value = false
  currentQuestion.value = {}
  currentTurn.value = 'idle'
  enemyActionText.value = ''
  isTurnResolving.value = false
  canUseCards.value = false
  playerWeak.value = false
  playerVulnerable.value = false
  bossIntent.value = ''
  playerAttackActive.value = false
  playerHitActive.value = false
  bossHitActive.value = false
  bossDeadActive.value = false
  damage.value = 0
  turnTimeLeftMs.value = turnTimeMs.value
  fortifyTurns.value = 0
  resetDeck()
}

async function restart() {
  resetState()
  await beginNextPlayerTurn()
}

onMounted(() => {
  if (!hasSelectedBook.value) {
    alert('请先选择词库再开始战斗')
    router.push('/books')
    return
  }
  studyTimer.start()
  resetDeck()
  beginNextPlayerTurn()
})

onBeforeUnmount(() => {
  studyTimer.stop()
  stopTurnTimer()
  stopAudio()
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  playerAttackTimer = clearAnimTimer(playerAttackTimer)
  playerHitTimer = clearAnimTimer(playerHitTimer)
  bossHitTimer = clearAnimTimer(bossHitTimer)
})
</script>

<style scoped>
.battle-container {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(242, 153, 74, 0.15), transparent 34%),
    radial-gradient(circle at top right, rgba(99, 102, 241, 0.12), transparent 36%),
    linear-gradient(180deg, #404652 0%, #474d59 100%);
  color: white;
}

.top-bars {
  position: absolute;
  top: 18px;
  left: 20px;
  right: 20px;
  z-index: 4;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.top-actions {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 6;
  display: flex;
  gap: 10px;
}

.top-action-btn {
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  border: 1px solid rgba(226, 232, 240, 0.35);
}

.top-action-btn.danger {
  background: transparent;
  border-color: rgba(242, 153, 74, 0.6);
  color: #fde7cf;
}


.hp-panel {
  width: min(44vw, 320px);
  padding: 12px 14px;
  border-radius: 14px;
  background: #4a505c;
  border: 1px solid #3d4350;
}

.hp-title {
  margin: 0 0 8px;
  font-size: 0.9rem;
}

.hp-value,
.counter-line {
  margin: 8px 0 0;
  font-size: 0.88rem;
  font-weight: 700;
}

.counter-line.energy {
  color: #facc15;
}

.hp-bar {
  width: 100%;
  height: 16px;
  overflow: hidden;
  border-radius: 999px;
  background: #3f4654;
}

.hp-inner {
  height: 100%;
  transition: 0.25s;
}

.hp-inner.player {
  background: linear-gradient(to right, #22c55e, #16a34a);
}

.hp-inner.boss {
  background: linear-gradient(to right, #f97316, #ef4444);
}

.character-layer {
  position: absolute;
  top: 18%;
  left: 0;
  width: 100%;
  pointer-events: none;
  z-index: 2;
}

.character-stage {
  width: min(1180px, calc(100% - clamp(20px, 6vw, 120px)));
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 4vw, 64px);
  align-items: end;
}

.role-lane {
  min-height: clamp(240px, 36vh, 420px);
  display: flex;
  align-items: flex-end;
}

.role-lane-player {
  justify-content: flex-start;
}

.role-lane-boss {
  justify-content: flex-end;
}

.avatar-slot {
  width: min(100%, clamp(190px, 26vw, 340px));
  height: clamp(250px, 38vh, 420px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  background: transparent;
  border: none;
}

.avatar-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  animation: idleFloat 2.4s ease-in-out infinite;
}

.player-image {
  transform-origin: bottom left;
  filter: drop-shadow(0 0 12px rgba(96, 165, 250, 0.35));
}

.boss-image {
  transform-origin: bottom right;
  filter: drop-shadow(0 0 10px rgba(248, 113, 113, 0.28));
}

.player-slot.is-attack .player-image {
  animation:
    playerAttackDash 0.36s ease-out 1,
    idleFloat 2.4s ease-in-out infinite;
}

.player-slot.is-hit .player-image {
  animation:
    playerHitShake 0.32s ease-out 1,
    idleFloat 2.4s ease-in-out infinite;
  filter: drop-shadow(0 0 14px rgba(191, 219, 254, 0.65));
}

.boss-slot.is-hit .boss-image {
  animation:
    bossHitShake 0.34s ease-out 1,
    idleFloat 2.4s ease-in-out infinite;
  filter: drop-shadow(0 0 14px rgba(248, 113, 113, 0.7));
}

.boss-slot.is-dead .boss-image {
  animation: bossDeath 0.9s ease-out forwards;
}

.mode-badge {
  position: absolute;
  top: 98px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(242, 153, 74, 0.2);
  color: #fde7cf;
  font-size: 0.88rem;
}

.bottom-left {
  position: absolute;
  left: 20px;
  bottom: 24px;
  z-index: 4;
  width: min(28vw, 220px);
  border-radius: 16px;
  padding: 12px 14px;
  background: #4a505c;
  border: 1px solid #3d4350;
}

.combo-label,
.deck-line {
  margin: 0;
  font-size: 0.84rem;
  color: rgba(226, 232, 240, 0.85);
}

.deck-line {
  margin-top: 6px;
}

.combo-value {
  margin: 4px 0 8px;
  color: #fb923c;
  font-size: 2rem;
  font-weight: 800;
}

.bottom-center {
  position: absolute;
  left: 50%;
  bottom: 24px;
  z-index: 4;
  transform: translateX(-50%);
  width: min(76vw, 820px);
}

.question-panel {
  border-radius: 20px;
  padding: 18px;
  text-align: center;
  background: rgba(63, 70, 84, 0.22);
  border: 1px solid rgba(226, 232, 240, 0.22);
  backdrop-filter: blur(2px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.22);
}

.turn-status {
  margin: 0 0 10px;
  font-size: 0.92rem;
}

.turn-player {
  color: #86efac;
}

.turn-boss {
  color: #fca5a5;
}

.timer-wrap {
  margin-bottom: 10px;
}

.timer-bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.5);
  overflow: hidden;
}

.timer-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #facc15, #ef4444);
  transition: width 0.1s linear;
}

.timer-text,
.enemy-action {
  margin: 8px 0 0;
  font-size: 0.86rem;
  color: #cbd5e1;
}

.question {
  margin: 0 0 10px;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
}

.question-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  color: rgba(226, 232, 240, 0.85);
  font-size: 0.92rem;
}


.options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.option-button,
.card-button,
.inline-button,
.end-turn-button,
.result-screen button {
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
}

.option-button {
  min-height: 62px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(241, 245, 249, 0.9);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  color: #ffffff;
}

.option-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: #ffffff;
}

.option-index {
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1;
  min-width: 14px;
}

.option-text {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hand-panel {
  margin-top: 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.28);
  padding-top: 12px;
}

.hand-title {
  margin: 0 0 10px;
  font-size: 0.9rem;
}

.hand-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.card-button {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 86px;
  padding: 10px 8px;
  text-align: left;
  background: linear-gradient(135deg, #334155, #1e293b);
}

.card-name {
  font-size: 0.95rem;
  font-weight: 700;
}

.card-cost {
  font-size: 0.78rem;
  color: #f8fafc;
}

.end-turn-button {
  margin-top: 12px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #d97706, #b45309);
}

.boss-intent-box {
  position: absolute;
  right: 20px;
  bottom: 24px;
  z-index: 4;
  width: min(30vw, 240px);
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(127, 29, 29, 0.62);
  border: 1px solid rgba(252, 165, 165, 0.35);
}

.boss-intent-title {
  margin: 0;
  font-size: 0.84rem;
  color: rgba(254, 202, 202, 0.88);
}

.boss-intent-value {
  margin: 6px 0 0;
  font-size: 0.92rem;
  color: #fee2e2;
}

.damage {
  position: absolute;
  top: 35%;
  left: 50%;
  color: #fb7185;
  font-size: 40px;
  transform: translateX(-50%);
  animation: float 0.6s;
}

.hit {
  animation: shake 0.3s;
}

.result-screen {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(2, 6, 23, 0.86);
  font-size: 32px;
}

.result-tip {
  max-width: 360px;
  margin: 12px 0 8px;
  font-size: 16px;
  line-height: 1.6;
  text-align: center;
}

.result-screen button {
  width: min(86vw, 240px);
  margin-top: 14px;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.62);
}

.dialog-card {
  width: min(90vw, 360px);
  border-radius: 14px;
  padding: 18px;
  background: #4a505c;
  border: 1px solid #3d4350;
  box-shadow: 0 12px 30px rgba(20, 23, 30, 0.45);
}

.dialog-card h3 {
  margin: 0 0 8px;
  color: #f8fafc;
}

.dialog-card p {
  margin: 0;
  color: #dbe5f4;
}

.dialog-actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}

.dialog-btn {
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  background: #3f4654;
  color: #eaf2ff;
  cursor: pointer;
}

.dialog-btn.danger {
  background: linear-gradient(90deg, #f2994a, #e18736);
  color: #fff7ed;
}

.inline-button {
  width: min(86vw, 240px);
  padding: 10px 12px;
  margin-top: 10px;
  background: linear-gradient(135deg, #0ea5e9, #1d4ed8);
}

button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

@keyframes idleFloat {
  0% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0); }
}

@keyframes playerAttackDash {
  0% { transform: translateX(0) scale(1); }
  45% { transform: translateX(26px) scale(1.04); }
  100% { transform: translateX(0) scale(1); }
}

@keyframes playerHitShake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  50% { transform: translateX(8px); }
  75% { transform: translateX(-6px); }
  100% { transform: translateX(0); }
}

@keyframes bossHitShake {
  0% { transform: translateX(0); }
  25% { transform: translateX(9px); }
  50% { transform: translateX(-9px); }
  75% { transform: translateX(6px); }
  100% { transform: translateX(0); }
}

@keyframes bossDeath {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(26px) scale(0.9); }
}

@keyframes float {
  from { opacity: 1; transform: translate(-50%, 0); }
  to { opacity: 0; transform: translate(-50%, -60px); }
}

@media (max-width: 900px) {
  .character-layer {
    top: 20%;
  }

  .character-stage {
    width: min(100%, calc(100% - 20px));
    gap: clamp(10px, 2.8vw, 22px);
  }

  .role-lane {
    min-height: clamp(210px, 30vh, 320px);
  }

  .avatar-slot {
    width: min(100%, clamp(140px, 28vw, 230px));
    height: clamp(200px, 30vh, 300px);
  }

  .bottom-center {
    width: min(92vw, 820px);
  }

  .hand-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .top-actions {
    top: 88px;
  }

  .top-bars {
    top: 10px;
    left: 10px;
    right: 10px;
  }

  .hp-panel {
    width: 48%;
    padding: 10px;
  }

  .mode-badge {
    top: 84px;
    font-size: 0.82rem;
  }

  .character-layer {
    top: 22%;
  }

  .character-stage {
    width: calc(100% - 12px);
    gap: 8px;
  }

  .role-lane {
    min-height: 180px;
  }

  .avatar-slot {
    width: min(100%, 44vw);
    height: min(42vh, 240px);
  }

  .bottom-left {
    left: 10px;
    bottom: 12px;
    width: min(40vw, 170px);
    padding: 10px;
  }

  .combo-value {
    font-size: 1.4rem;
  }

  .bottom-center {
    bottom: 12px;
    width: calc(100vw - 20px);
  }

  .question-meta {
    flex-direction: column;
    gap: 4px;
  }

  .options-grid {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .option-button {
    padding: 10px 8px;
    font-size: 0.92rem;
  }

  .hand-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .boss-intent-box {
    right: 10px;
    bottom: 12px;
    width: min(44vw, 200px);
    padding: 10px;
  }
}
</style>
