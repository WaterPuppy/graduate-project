<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeIconButton from '../components/HomeIconButton.vue'

const router = useRouter()
const tab = ref('image')
const loading = ref(false)
const saving = ref(false)
const errorText = ref('')
const imageFile = ref(null)
const imagePreview = ref('')
const form = reactive({ text: '', title: '' })
const result = reactive({ english: '', chinese: '' })

function onPickImage(event) {
  const file = event?.target?.files?.[0]
  imageFile.value = file || null
  errorText.value = ''
  if (!file) {
    imagePreview.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    imagePreview.value = typeof reader.result === 'string' ? reader.result : ''
  }
  reader.readAsDataURL(file)
}

async function generate() {
  if (tab.value === 'image') {
    if (!imageFile.value) {
      errorText.value = '请先选择一张图片再生成'
      return
    }
    if (!imageFile.value.type?.startsWith('image/')) {
      errorText.value = '请选择有效的图片文件'
      return
    }
  } else {
    if (!form.text.trim()) {
      errorText.value = '请先输入英文文本再生成'
      return
    }
  }

  loading.value = true
  errorText.value = ''
  result.english = ''
  result.chinese = ''
  try {
    let res
    if (tab.value === 'image') {
      const fd = new FormData()
      fd.append('image', imageFile.value)
      res = await fetch('http://127.0.0.1:5001/api/ai/reading/import', { method: 'POST', body: fd })
    } else {
      res = await fetch('http://127.0.0.1:5001/api/ai/reading/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: form.text }),
      })
    }
    const data = await res.json()
    if (!res.ok || !data.success) {
      errorText.value = data.error || '生成失败'
      return
    }
    result.english = data.english || ''
    result.chinese = data.chinese || ''
  } catch {
    errorText.value = '生成失败'
  } finally {
    loading.value = false
  }
}

async function saveReading() {
  if (!result.english || !result.chinese) return
  saving.value = true
  errorText.value = ''
  try {
    const res = await fetch('http://127.0.0.1:5001/api/readings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim() || 'AI导入文章',
        category: '我的导入',
        english: result.english,
        chinese: result.chinese,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      errorText.value = data.error || '保存失败'
      return
    }
    router.push(`/reading/${data.id}`)
  } catch {
    errorText.value = '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="page">
    <header class="top-card">
      <HomeIconButton class="back-btn home-icon-btn" @click="router.push('/')" />
      <h1>导入文章</h1>
      <button class="nav-action-btn" @click="router.push('/reading')">趣味阅读</button>
      <button class="nav-action-btn" @click="router.push('/books')">词库管理</button>
    </header>

    <section class="panel">
      <div class="step-title"><span class="step-badge">1</span>选择导入方式</div>
      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'image' }" @click="tab = 'image'">上传图片</button>
        <button class="tab" :class="{ active: tab === 'text' }" @click="tab = 'text'">粘贴文本</button>
      </div>

      <div class="step-title"><span class="step-badge">2</span>{{ tab === 'image' ? '上传图片' : '输入文本' }}</div>
      <div class="input-stage">
        <template v-if="tab === 'image'">
          <label class="upload-box">
            <input type="file" accept="image/*" class="hidden-input" @change="onPickImage" />
            <template v-if="imagePreview">
              <img :src="imagePreview" class="preview" alt="preview" />
            </template>
            <template v-else>
              <p class="upload-main">将图片拖拽到此处，或点击选择文件</p>
              <p class="upload-sub">支持 JPG、PNG、JPEG 格式</p>
            </template>
          </label>
        </template>
        <template v-else>
          <textarea v-model="form.text" class="textarea textarea-stage" placeholder="请粘贴英文文本"></textarea>
        </template>
      </div>

      <div class="step-title"><span class="step-badge">3</span>文章标题（可选）</div>
      <input v-model="form.title" class="input" placeholder="请输入文章标题，方便管理（可选）" maxlength="100" />

      <button class="btn primary center-btn" :disabled="loading" @click="generate">
        {{ loading ? '生成中...' : '生成中英对照' }}
      </button>
      <p v-if="errorText" class="err">{{ errorText }}</p>
    </section>

    <section v-if="result.english && result.chinese" class="panel">
      <h2>英文原文</h2>
      <p class="content">{{ result.english }}</p>
      <h2>中文翻译</h2>
      <p class="content">{{ result.chinese }}</p>
      <button class="btn primary" :disabled="saving" @click="saveReading">
        {{ saving ? '保存中...' : '保存到趣味阅读' }}
      </button>
    </section>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20px 14px;
  background: linear-gradient(180deg, #404652 0%, #474d59 100%);
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.top-card,
.panel {
  width: min(980px, 100%);
  margin: 0 auto;
  border-radius: 14px;
  background: #4a505c;
  border: 1px solid #3d4350;
  box-shadow: 0 8px 18px rgba(20, 23, 30, 0.35);
}

.top-card {
  width: min(980px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 10px;
  height: 56px;
  padding: 8px 10px;
}

.top-card + .panel {
  margin-top: 28px;
}

.top-card h1 {
  margin: 0;
  text-align: center;
  font-size: 1.08rem;
}

.nav-action-btn {
  border: none;
  border-radius: 10px;
  background: #26374f;
  color: #e6edf7;
  padding: 6px 10px;
  cursor: pointer;
  font-weight: 700;
}

.panel {
  padding: 14px;
}

.step-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 10px;
  color: #e6edf7;
  font-weight: 700;
}

.step-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.25);
  color: #bfdbfe;
  font-size: 0.78rem;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.tab,
.btn {
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  background: #26374f;
  color: #e6edf7;
}

.tab {
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(31, 41, 55, 0.38);
}

.tab.active,
.btn.primary {
  border-color: rgba(251, 146, 60, 0.9);
  background: linear-gradient(135deg, #f2994a, #fb923c);
  color: #ffffff;
}

.upload-box {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  background: rgba(31, 41, 55, 0.35);
  display: grid;
  place-items: center;
  text-align: center;
  padding: 14px;
  margin-bottom: 0;
  cursor: pointer;
}

.hidden-input {
  display: none;
}

.upload-main {
  margin: 0;
  font-size: 1rem;
  color: #dbeafe;
}

.upload-sub {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 0.9rem;
}

.input,
.textarea {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin-bottom: 14px;
  border: 1px solid #64748b;
  border-radius: 10px;
  background: #334155;
  color: #f8fafc;
  padding: 10px;
}

.textarea {
  min-height: 190px;
  max-width: 100%;
  resize: vertical;
}

.input-stage {
  height: 300px;
  margin-bottom: 14px;
}

.textarea-stage {
  width: 100%;
  height: 100%;
  min-height: 300px;
  margin-bottom: 0;
  resize: none;
}

.btn.primary {
  box-shadow: 0 8px 18px rgba(251, 146, 60, 0.35);
}

.center-btn {
  display: block;
  width: min(360px, 100%);
  margin: 4px auto 0;
}

.preview {
  width: min(100%, 460px);
  max-height: 100%;
  border-radius: 10px;
  display: block;
  margin: 0 auto;
  object-fit: contain;
}

.err {
  color: #fca5a5;
  margin: 10px 0 0;
}

h2 {
  margin: 2px 0 8px;
  color: #f6c177;
}

.content {
  white-space: pre-wrap;
  line-height: 1.9;
  margin: 0 0 12px;
}

@media (max-width: 760px) {
  .tabs {
    grid-template-columns: 1fr;
  }
}
</style>
