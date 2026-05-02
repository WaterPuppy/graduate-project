<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeIconButton from '../components/HomeIconButton.vue'

const router = useRouter()
const ARTICLE_CATEGORY_ALL = 'all'
const activeCategory = ref(ARTICLE_CATEGORY_ALL)
const readings = ref([])
const loading = ref(false)
const errorText = ref('')

const articleCategories = computed(() => {
  const categorySet = new Set(['英文短文', '电影名句', '我的导入'])
  readings.value.forEach((item) => categorySet.add(item.category || '英文短文'))
  return [{ key: ARTICLE_CATEGORY_ALL, label: '所有分类' }].concat(
    [...categorySet].map((key) => ({ key, label: key }))
  )
})

const filteredArticles = computed(() => {
  if (activeCategory.value === ARTICLE_CATEGORY_ALL) return readings.value
  return readings.value.filter((item) => item.category === activeCategory.value)
})

function openDetail(id) {
  router.push(`/reading/${id}`)
}

async function fetchReadings() {
  loading.value = true
  errorText.value = ''
  try {
    const res = await fetch('http://127.0.0.1:5001/api/readings')
    const data = await res.json()
    if (!res.ok) {
      errorText.value = data.error || '加载文章失败'
      return
    }
    readings.value = Array.isArray(data) ? data : []
  } catch {
    errorText.value = '加载文章失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReadings()
})
</script>

<template>
  <main class="reading-page">
    <header class="top-card">
      <HomeIconButton class="back-btn home-icon-btn" @click="router.push('/')" />
      <h1>趣味阅读</h1>
      <button class="fav-btn import-btn" @click="router.push('/reading/import')">导入文章</button>
      <button class="fav-btn" @click="router.push('/books')">词库管理</button>
    </header>

    <section class="filter-card">
      <button
        v-for="category in articleCategories"
        :key="category.key"
        class="filter-item"
        :class="{ active: activeCategory === category.key }"
        @click="activeCategory = category.key"
      >
        {{ category.label }}
      </button>
    </section>

    <section class="list-wrap">
      <article
        v-for="article in filteredArticles"
        :key="article.id"
        class="article-card"
        @click="openDetail(article.id)"
      >
        <div class="cover">{{ article.title }}</div>
        <div class="meta">
          <h3>{{ article.title }}</h3>
          <p class="line">{{ article.date }} · {{ article.category }}</p>
          <p class="summary">{{ article.summary }}</p>
        </div>
      </article>

      <p v-if="loading" class="empty">加载中...</p>
      <p v-else-if="errorText" class="empty">{{ errorText }}</p>
      <p v-if="!filteredArticles.length" class="empty">当前分类暂无文章</p>
    </section>
  </main>
</template>

<style scoped>
.reading-page {
  min-height: 100vh;
  padding: 20px 14px;
  background: linear-gradient(180deg, #404652 0%, #474d59 100%);
  color: #f5f7fb;
}

.top-card,
.filter-card,
.article-card {
  width: min(980px, 100%);
  margin: 0 auto;
  border-radius: 14px;
  background: #4a505c;
  border: 1px solid #3d4350;
  box-shadow: 0 8px 18px rgba(20, 23, 30, 0.35);
}

.top-card {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 10px;
}

.import-btn {
  background: #1d4ed8;
}

.top-card h1 {
  margin: 0;
  text-align: center;
  font-size: 1.2rem;
}

.back-btn,
.fav-btn,
.filter-item {
  border: none;
  border-radius: 10px;
  background: #26374f;
  color: #e6edf7;
  padding: 8px 12px;
  cursor: pointer;
}


.filter-card {
  margin-top: 14px;
  padding: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-item.active {
  background: #f2994a;
  color: #ffffff;
}

.list-wrap {
  width: min(980px, 100%);
  margin: 14px auto 0;
  display: grid;
  gap: 12px;
}

.article-card {
  padding: 12px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 12px;
  cursor: pointer;
}

.cover {
  min-height: 128px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 10px;
  background: linear-gradient(135deg, #225c66, #ad7b39);
  color: #fff;
  font-weight: 700;
}

.meta h3 {
  margin: 0;
  font-size: 1.3rem;
}

.line {
  margin: 8px 0 0;
  color: #c5cbd7;
}

.summary {
  margin: 12px 0 0;
  color: #edf2fb;
}

.empty {
  margin: 30px 0;
  text-align: center;
  color: #cbd5e1;
}

@media (max-width: 760px) {
  .article-card {
    grid-template-columns: 1fr;
  }
}
</style>
