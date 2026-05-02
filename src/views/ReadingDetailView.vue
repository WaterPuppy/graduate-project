<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addWordToFavorites, extractWordsFromEnglish } from '../utils/reading'

const route = useRoute()
const router = useRouter()

const showWords = ref(false)
const tip = ref('')
const articleData = ref(null)
const loading = ref(false)

const article = computed(() => {
  return articleData.value
})

const extractedWords = computed(() => {
  if (!article.value) return []
  return extractWordsFromEnglish(article.value.english)
})

function toggleWords() {
  showWords.value = !showWords.value
}

async function collectWord(word) {
  if (!article.value) return
  const result = await addWordToFavorites({
    word,
    source_article_id: article.value.id,
    source_article_title: article.value.title
  })
  tip.value = result.added ? `已加入词库“收藏”: ${word}` : `已存在于“收藏”: ${word}`
  window.setTimeout(() => {
    tip.value = ''
  }, 1200)
}

async function fetchReadingDetail() {
  loading.value = true
  try {
    const id = Number(route.params.id || 0)
    const res = await fetch(`http://127.0.0.1:5001/api/readings/${id}`)
    const data = await res.json()
    articleData.value = res.ok ? data : null
  } catch {
    articleData.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReadingDetail()
})
</script>

<template>
  <main class="detail-page" v-if="article">
    <header class="top-nav">
      <button class="nav-btn" @click="router.push('/reading')">返回</button>
      <h1 class="nav-title">趣味阅读</h1>
      <span class="nav-placeholder" aria-hidden="true"></span>
    </header>

    <section class="title-card">
      <h1>{{ article.title }}</h1>
    </section>

    <section class="block-card content-card">
      <div class="meta-line">英语词源 · {{ article.date }}</div>
      <h2>英文原文</h2>
      <p class="english">{{ article.english }}</p>
      <h2>中文翻译</h2>
      <p class="chinese">{{ article.chinese }}</p>
    </section>

    <section class="action-card">
      <button class="toggle-btn" @click="toggleWords">{{ showWords ? '收起单词' : '文中单词' }}</button>
      <button class="link-btn" @click="router.push('/books')">词库管理</button>
    </section>

    <section v-if="showWords" class="block-card words-card">
      <div class="word-head">
        <h2>文中单词</h2>
      </div>

      <p v-if="tip" class="tip">{{ tip }}</p>

      <div class="words-wrap">
        <button v-for="word in extractedWords" :key="word" class="word-chip" @click="collectWord(word)">{{ word }}</button>
      </div>
    </section>
  </main>

  <main v-else class="detail-page">
    <section class="block-card">
      <p>{{ loading ? '加载中...' : '文章不存在' }}</p>
      <button class="back-btn" @click="router.push('/reading')">返回列表</button>
    </section>
  </main>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding: 6px 12px 20px;
  background: linear-gradient(180deg, #4a4f5b 0%, #505562 100%);
  color: #f5f7fb;
  display: grid;
  grid-template-rows: auto auto auto auto 1fr;
  gap: 10px;
}

.top-nav,
.title-card,
.block-card {
  width: min(980px, 100%);
  margin: 0 auto;
  border-radius: 12px;
  background: #4a4f5b;
  border: 1px solid #3f4451;
  box-shadow: 0 6px 14px rgba(20, 23, 30, 0.35);
}

.top-nav {
  min-height: 54px;
  padding: 0 10px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
}

.nav-btn {
  border: none;
  border-radius: 12px;
  background: #1f4d80;
  color: #eaf2ff;
  padding: 7px 12px;
  font-weight: 700;
  cursor: pointer;
}

.nav-placeholder {
  display: inline-block;
  width: 86px;
  height: 1px;
}

.nav-title {
  margin: 0;
  text-align: center;
  font-size: 1.45rem;
  color: #f5f7fb;
}

.title-card {
  min-height: 40px;
  padding: 0;
}

.title-card h1 {
  margin: 0;
  padding: 0 16px;
  min-height: 40px;
  line-height: 40px;
  font-size: 1.15rem;
  color: #e5e7eb;
}

.block-card {
  padding: 18px 20px;
}

.content-card {
  min-height: 460px;
  line-height: 1.9;
}

.meta-line {
  text-align: right;
  color: #cbd5e1;
  font-size: 0.9rem;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.28);
}

.block-card h2 {
  margin: 10px 0 0;
  font-size: 1.18rem;
  color: #f6c177;
}

.english,
.chinese {
  margin: 12px 0 0;
  line-height: 2;
  font-size: 1.2rem;
  color: #eef2fb;
}

.toggle-btn,
.link-btn,
.word-chip {
  border: none;
  border-radius: 10px;
  cursor: pointer;
}

.action-card {
  width: min(880px, 100%);
  margin: 0 auto;
  border-radius: 12px;
  background: #4a4f5b;
  border: 1px solid #3f4451;
  box-shadow: 0 6px 14px rgba(20, 23, 30, 0.35);
  padding: 10px 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.toggle-btn,
.link-btn {
  background: #444a57;
  color: #e6edf7;
  padding: 9px 10px;
}

.word-head {
  display: block;
}

.tip {
  margin: 10px 0 0;
  color: #86efac;
}

.words-wrap {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 220px;
  overflow: auto;
}

.word-chip {
  background: #3f4654;
  color: #f8fafc;
  padding: 6px 10px;
}

.word-chip:hover {
  background: #f2994a;
}
</style>
