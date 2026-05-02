<script setup>
const props = defineProps({
  ariaLabel: {
    type: String,
    default: '返回首页',
  },
})

const emit = defineEmits(['click'])
</script>

<template>
  <button class="home-icon-button" type="button" :aria-label="props.ariaLabel" @click="emit('click')">
    <span class="home-glyph" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
.home-icon-button {
  width: 42px;
  min-width: 42px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #4a4f5b;
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
}

.home-glyph {
  position: relative;
  width: 16px;
  height: 16px;
}

.home-glyph::before,
.home-glyph::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
}

.home-glyph::before {
  top: 0;
  width: 12px;
  height: 8px;
  clip-path: polygon(50% 0, 100% 60%, 88% 60%, 88% 100%, 12% 100%, 12% 60%, 0 60%);
}

.home-glyph::after {
  top: 8px;
  width: 10px;
  height: 8px;
  border-radius: 1px;
}
</style>
