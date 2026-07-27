<script setup lang="ts">
const isMenuOpen = ref(false)
const menuToggle = useTemplateRef<HTMLButtonElement>('menuToggle')
const route = useRoute()

const isChatRoute = computed(() => route.path === '/')
const isArticleRoute = computed(() => route.path === '/timeline' || route.path.startsWith('/articles'))
const isAboutRoute = computed(() => route.path === '/about')

function closeMenu() {
  isMenuOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isMenuOpen.value) {
    closeMenu()
    nextTick(() => menuToggle.value?.focus())
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <header class="app-header">
    <NuxtLink
      to="/"
      class="brand"
      data-testid="brand"
      aria-label="April 博客首页"
    >
      <span class="brand__mark" aria-hidden="true">A</span>
      <span>april的记录小屋</span>
    </NuxtLink>

    <button
      ref="menuToggle"
      type="button"
      class="menu-toggle"
      aria-controls="primary-navigation"
      :aria-expanded="isMenuOpen"
      aria-label="切换导航菜单"
      @click="isMenuOpen = !isMenuOpen"
    >
      菜单
    </button>

    <nav
      id="primary-navigation"
      class="primary-nav"
      :class="{ 'is-open': isMenuOpen }"
      aria-label="主导航"
    >
      <NuxtLink
        to="/"
        :class="{ 'is-active': isChatRoute }"
        :aria-current="isChatRoute ? 'page' : undefined"
        @click="closeMenu"
      >Chat</NuxtLink>
      <NuxtLink
        to="/timeline"
        external
        :class="{ 'is-active': isArticleRoute }"
        :aria-current="isArticleRoute ? 'page' : undefined"
        @click="closeMenu"
      >文章</NuxtLink>
      <NuxtLink
        to="/about"
        :class="{ 'is-active': isAboutRoute }"
        :aria-current="isAboutRoute ? 'page' : undefined"
        @click="closeMenu"
      >关于</NuxtLink>
      <a
        href="https://github.com/AprilTong"
        target="_blank"
        rel="noreferrer"
        @click="closeMenu"
      >
        GitHub ↗
      </a>
    </nav>
  </header>
</template>
