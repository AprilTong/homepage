<script setup lang="ts">
import { defineComponent, h, type PropType, type VNode } from 'vue'

interface TocLink {
  id: string
  text: string
  children?: readonly unknown[]
}

const props = defineProps<{
  links?: readonly unknown[] | null
}>()

function isUsableLink(link: unknown): link is TocLink {
  if (!link || typeof link !== 'object') {
    return false
  }

  const candidate = link as Partial<TocLink>
  return typeof candidate.id === 'string'
    && candidate.id.length > 0
    && !/[\u0000-\u001F\u007F\s]/u.test(candidate.id)
    && typeof candidate.text === 'string'
    && candidate.text.trim().length > 0
}

function renderLinks(links: readonly unknown[], level: number): VNode | null {
  const visibleLinks = links.filter(isUsableLink)

  if (visibleLinks.length === 0) {
    return null
  }

  return h(
    'ol',
    { class: `article-toc__list article-toc__list--level-${level}` },
    visibleLinks.map(link =>
      h('li', { key: link.id }, [
        h('a', { href: `#${link.id}` }, link.text),
        level < 3 && Array.isArray(link.children)
          ? renderLinks(link.children, level + 1)
          : null,
      ]),
    ),
  )
}

const TocTree = defineComponent({
  name: 'ArticleTocTree',
  props: {
    links: {
      type: Array as PropType<readonly unknown[]>,
      required: true,
    },
    level: {
      type: Number,
      required: true,
    },
  },
  setup(listProps) {
    return () => renderLinks(listProps.links, listProps.level)
  },
})

const visibleLinks = computed(() => props.links?.filter(isUsableLink) ?? [])
</script>

<template>
  <nav
    v-if="visibleLinks.length > 0"
    class="article-toc"
    aria-label="文章目录"
  >
    <h2>目录</h2>
    <TocTree :links="visibleLinks" :level="1" />
  </nav>
</template>
