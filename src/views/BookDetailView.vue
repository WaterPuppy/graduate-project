<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HomeIconButton from '../components/HomeIconButton.vue'

const router = useRouter()
const route = useRoute()

const bookId = computed(() => Number(route.params.id || 0))
const activeTab = ref('learned')
const words = ref([])
const loading = ref(false)
const shownSet = ref(new Set())

const tabLabel = computed(() => (activeTab.value === 'learned' ? '已学单词' : '未学单词'))

async function fetchWords(type = activeTab.value) {
  if (!bookId.value) return
  activeTab.value = type
  shownSet.value = new Set()
  loading.value = true
  try {
    const res = await fetch(`http://127.0.0.1:5001/books/${bookId.value}/words?type=${type}`)
    const data = await res.json()
    words.value = data.words || []
  } catch (error) {
    console.error('获取词书列表失败', error)
    words.value = []
  } finally {
    loading.value = false
  }
}

function toggleMeaning(key) {
  const next = new Set(shownSet.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  shownSet.value = next
}

function goStudy() {
  router.push(`/battle?mode=normal&bookId=${bookId.value}`)
}

function goSpelling() {
  router.push(`/spelling?bookId=${bookId.value}`)
}

onMounted(() => {
  fetchWords('learned')
})
</script>

<template>
  <main class="book-page">
    <header class="head">
      <HomeIconButton class="back-btn home-icon-btn" @click="router.push('/')" />
      <h1>词书详情</h1>
      <span class="count-chip">{{ tabLabel }} {{ words.length }} 个</span>
    </header>

    <section class="action-bar">
      <button class="action-btn" @click="goStudy">学习词书</button>
      <button class="action-btn secondary" @click="goSpelling">拼写练习</button>
    </section>

    <section class="switch-bar">
      <button class="switch-btn" :class="{ active: activeTab === 'learned' }" @click="fetchWords('learned')">已学单词</button>
      <button class="switch-btn" :class="{ active: activeTab === 'unlearned' }" @click="fetchWords('unlearned')">未学单词</button>
    </section>

    <section class="list-card">
      <div v-if="loading" class="empty">加载中...</div>
      <div v-else-if="words.length === 0" class="empty">暂无单词</div>
      <div v-else class="list-scroll">
        <article v-for="item in words" :key="`${item.id}`" class="word-row">
          <button class="word-btn" @click="toggleMeaning(item.id)">{{ item.word }}</button>
          <p class="meta">{{ item.phonetic || '暂无音标' }}</p>
          <audio v-if="item.audio" :src="item.audio" controls class="audio" />
          <p class="meaning" :class="{ shown: shownSet.has(item.id) }">{{ item.meaning }}</p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.book-page { min-height: 100vh; padding: 16px; background: linear-gradient(180deg, #404652 0%, #474d59 100%); color:#e2e8f0; }
.head { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:10px; }
.head h1 { margin:0; text-align:center; font-size:1.2rem; }
.back-btn { border:none; border-radius:999px; padding:8px 12px; background:#26374f; color:#cbd5e1; cursor:pointer; }
.home-icon-btn { width:42px; height:36px; border-radius:8px; padding:0; display:grid; place-items:center; }
.count-chip { border-radius:999px; padding:7px 10px; background:rgba(242,153,74,.16); color:#f6c177; font-size:.86rem; }
.action-bar { margin-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.action-btn { border:none; border-radius:12px; padding:10px 12px; background:#26374f; color:#fff; cursor:pointer; }
.action-btn.secondary { background:#3f4654; }
.switch-bar { margin-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.switch-btn { border:none; border-radius:12px; padding:11px 12px; background:#3f4654; color:#cbd5e1; cursor:pointer; }
.switch-btn.active { background:#26374f; color:#fff; font-weight:700; }
.list-card { margin-top:12px; border-radius:16px; background:#4a505c; border:1px solid #3d4350; min-height:calc(100vh - 230px); }
.list-scroll { max-height:calc(100vh - 250px); overflow-y:auto; padding:10px; }
.word-row { padding:12px; border-radius:12px; background:#3f4654; margin-bottom:9px; }
.word-btn { border:none; background:transparent; color:#f6c177; font-size:1.05rem; font-weight:700; cursor:pointer; padding:0; }
.meta { margin:6px 0 0; color:#9fb6d6; font-size:.84rem; }
.audio { margin-top:8px; width:100%; height:30px; }
.meaning { margin:8px 0 0; color:transparent; text-shadow:0 0 7px rgba(148,163,184,.95); user-select:none; transition:.2s; }
.meaning.shown { color:#e2e8f0; text-shadow:none; }
.empty { min-height:calc(100vh - 250px); display:flex; align-items:center; justify-content:center; color:#94a3b8; }
@media (max-width:560px){ .head{grid-template-columns:1fr;} .head h1{order:-1;} .count-chip{justify-self:center;} .action-bar{grid-template-columns:1fr;} }
</style>
