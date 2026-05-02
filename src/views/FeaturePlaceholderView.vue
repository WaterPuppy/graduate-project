<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HomeIconButton from '../components/HomeIconButton.vue'

const route = useRoute()
const router = useRouter()

const title = computed(() => {
  const map = {
    rank: '排名页面',
    search: '搜索页面',
    points: '积分详情',
    reading: '趣味阅读',
    spelling: '单词拼写',
    streak: '学习记录',
    'book-edit': '词书修改'
  }
  return map[route.params.key] || '功能页面'
})
</script>

<template>
  <main class="placeholder-page">
    <section class="card">
      <h1>{{ title }}</h1>
      <p>该页面还未接入完整业务逻辑，当前用于主页入口跳转占位。</p>
      <HomeIconButton class="home-icon-btn" @click="router.push('/')" />
    </section>
  </main>
</template>

<style scoped>
.placeholder-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #404652 0%, #474d59 100%);
}

.card {
  width: min(90vw, 420px);
  background: #4a505c;
  border: 1px solid #3d4350;
  border-radius: 18px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 8px 18px rgba(20, 23, 30, 0.35);
}

.card h1 {
  margin: 0;
  color: #f5f7fb;
  font-size: 1.3rem;
}

.card p {
  margin: 12px 0 0;
  color: #cbd5e1;
}

.card button {
  margin-top: 18px;
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  background: #26374f;
  color: white;
  cursor: pointer;
}

.home-icon-btn {
  width: 42px;
  height: 36px;
  border-radius: 8px !important;
  padding: 0 !important;
  display: grid;
  place-items: center;
  margin: 18px auto 0;
}

</style>
