<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getFavoriteWords, removeWordFromFavorites } from '../utils/reading'

const router = useRouter()
const favorites = ref(getFavoriteWords())

const sortedFavorites = computed(() =>
  [...favorites.value].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
)

function refresh() {
  favorites.value = getFavoriteWords()
}

function removeWord(word) {
  removeWordFromFavorites(word)
  refresh()
}
</script>

<template>
  <main class="fav-page">
    <header class="top-card">
      <button class="back-btn" @click="router.push('/reading')">返回阅读</button>
      <h1>收藏词库</h1>
      <button class="back-btn" @click="refresh">刷新</button>
    </header>

    <section class="list-card">
      <div class="row head">
        <span>单词</span>
        <span>来源文章</span>
        <span>收藏时间</span>
        <span>操作</span>
      </div>

      <div v-for="item in sortedFavorites" :key="`${item.word}-${item.created_at}`" class="row">
        <span>{{ item.word }}</span>
        <span>{{ item.source_article_title }}</span>
        <span>{{ item.created_at }}</span>
        <button class="del-btn" @click="removeWord(item.word)">移除</button>
      </div>

      <p v-if="!sortedFavorites.length" class="empty">还没有收藏单词</p>
    </section>
  </main>
</template>

<style scoped>
.fav-page {
  min-height: 100vh;
  padding: 20px 14px;
  background: linear-gradient(180deg, #404652 0%, #474d59 100%);
  color: #f5f7fb;
}

.top-card,
.list-card {
  width: min(980px, 100%);
  margin: 0 auto;
  border-radius: 14px;
  background: #4a505c;
  border: 1px solid #3d4350;
  box-shadow: 0 8px 18px rgba(20, 23, 30, 0.35);
}

.top-card {
  padding: 10px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
}

.top-card h1 {
  margin: 0;
  text-align: center;
  font-size: 1.2rem;
}

.back-btn,
.del-btn {
  border: none;
  border-radius: 10px;
  background: #26374f;
  color: #e6edf7;
  padding: 8px 12px;
  cursor: pointer;
}

.del-btn {
  background: #7f1d1d;
}

.list-card {
  margin-top: 12px;
  overflow: auto;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1.6fr 1.5fr 90px;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.row.head {
  border-top: none;
  font-weight: 700;
  background: #414751;
}

.empty {
  margin: 0;
  padding: 18px;
  text-align: center;
  color: #d1d5db;
}

@media (max-width: 760px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>
